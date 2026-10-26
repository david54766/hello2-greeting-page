-- 1) Moderation status columns (additive; direct REST writes land as 'pending')
ALTER TABLE public.elite_threads ADD COLUMN moderation_status text NOT NULL DEFAULT 'pending';
ALTER TABLE public.elite_thread_replies ADD COLUMN moderation_status text NOT NULL DEFAULT 'pending';

-- 2) Backfill already-published rows as approved (they are live today)
UPDATE public.elite_threads SET moderation_status = 'approved';
UPDATE public.elite_thread_replies SET moderation_status = 'approved';

-- 3) Constrain allowed values (after backfill so existing rows satisfy it)
ALTER TABLE public.elite_threads ADD CONSTRAINT elite_threads_moderation_status_check CHECK (moderation_status IN ('pending','approved','rejected'));
ALTER TABLE public.elite_thread_replies ADD CONSTRAINT elite_thread_replies_moderation_status_check CHECK (moderation_status IN ('pending','approved','rejected'));

-- 4) Only the service role (the moderated server path) may write a
--    non-pending moderation_status. Created AFTER the backfill so the
--    migration role is not blocked.
CREATE OR REPLACE FUNCTION public.elite_moderation_status_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.moderation_status IS DISTINCT FROM 'pending'
     AND coalesce(auth.jwt() ->> 'role', '') <> 'service_role' THEN
    RAISE EXCEPTION 'moderation_status_forbidden';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER elite_threads_status_guard
  BEFORE INSERT OR UPDATE ON public.elite_threads
  FOR EACH ROW EXECUTE FUNCTION public.elite_moderation_status_guard();

CREATE TRIGGER elite_replies_status_guard
  BEFORE INSERT OR UPDATE ON public.elite_thread_replies
  FOR EACH ROW EXECUTE FUNCTION public.elite_moderation_status_guard();

-- 5) Extend the content guard: canonical image URLs only, and cover reply updates
CREATE OR REPLACE FUNCTION public.elite_content_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_text text;
  v_url text;
BEGIN
  v_text := lower(coalesce(NEW.body, ''));
  IF TG_TABLE_NAME = 'elite_threads' THEN
    v_text := v_text || ' ' || lower(coalesce(NEW.title, ''));
  END IF;
  IF v_text ~* '\m(nigg(er|a)s?|fagg?ots?|kikes?|chinks?|trann(y|ies))\M'
     OR v_text ~* '\m(porn(hub|o)?|cunts?|blowjobs?|dildos?|rape|molest(s|ed|ing)?|pedo(phile)?)\M'
     OR v_text ~* 'kill\s+your\s?self|\mkys\M|you\s+should\s+die|i''?m\s+going\s+to\s+(kill|hurt)\s+you'
     OR v_text ~* 'shoot\s+(up|them|him|her)|bomb\s+the|behead|lynch' THEN
    RAISE EXCEPTION 'content_rejected: this post may violate our community guidelines';
  END IF;
  IF NEW.image_urls IS NOT NULL THEN
    FOREACH v_url IN ARRAY NEW.image_urls LOOP
      IF v_url !~ '^https://[^/]+/storage/v1/object/public/elite-images/[A-Za-z0-9._/-]+$' THEN
        RAISE EXCEPTION 'content_rejected: invalid image attachment';
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER elite_replies_content_guard_update
  BEFORE UPDATE OF body, image_urls ON public.elite_thread_replies
  FOR EACH ROW EXECUTE FUNCTION public.elite_content_guard();

-- 6) Helper: parent thread author without RLS interplay (for reply policy)
CREATE OR REPLACE FUNCTION public.elite_thread_author(_thread_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT user_id FROM public.elite_threads WHERE id = _thread_id
$$;

REVOKE ALL ON FUNCTION public.elite_thread_author(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.elite_thread_author(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.elite_thread_author(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.elite_thread_author(uuid) TO service_role;

-- 7) Visibility: authors see their own rows (incl. pending), moderators
--    (admins) see everything incl. blocked/pending for review, elite members
--    see approved content except from authors they blocked or who blocked
--    them. Replies are additionally hidden when the PARENT THREAD author is
--    blocked.
DROP POLICY "Elite or admin view threads" ON public.elite_threads;
CREATE POLICY "Elite or admin view threads"
  ON public.elite_threads FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR (
      is_elite(auth.uid())
      AND moderation_status = 'approved'
      AND NOT (user_id = ANY (elite_blocked_user_ids()))
    )
  );

DROP POLICY "Elite or admin view replies" ON public.elite_thread_replies;
CREATE POLICY "Elite or admin view replies"
  ON public.elite_thread_replies FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR (
      is_elite(auth.uid())
      AND moderation_status = 'approved'
      AND NOT (user_id = ANY (elite_blocked_user_ids()))
      AND NOT (public.elite_thread_author(thread_id) = ANY (elite_blocked_user_ids()))
    )
  );