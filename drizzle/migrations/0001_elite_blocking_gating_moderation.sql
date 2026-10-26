-- 1) Elite gating: require active status AND non-expired period (NULL expiry = manual grant, stays valid)
CREATE OR REPLACE FUNCTION public.is_elite(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = _user_id
      AND tier = 'elite'
      AND status = 'active'
      AND (current_period_end IS NULL OR current_period_end > now())
  )
$$;

-- 2) Bidirectional blocking enforced in read policies
DROP POLICY "Elite or admin view threads" ON public.elite_threads;
CREATE POLICY "Elite or admin view threads"
  ON public.elite_threads FOR SELECT TO authenticated
  USING (
    (is_elite(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
    AND NOT (user_id = ANY (elite_blocked_user_ids()))
  );

DROP POLICY "Elite or admin view replies" ON public.elite_thread_replies;
CREATE POLICY "Elite or admin view replies"
  ON public.elite_thread_replies FOR SELECT TO authenticated
  USING (
    (is_elite(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
    AND NOT (user_id = ANY (elite_blocked_user_ids()))
  );

-- 3) Database-level moderation guard on direct writes (conservative; app-layer
--    moderation remains the primary filter). Blocks clearly objectionable text
--    even when a client bypasses the moderated server handlers.
CREATE OR REPLACE FUNCTION public.elite_content_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_text text;
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
  RETURN NEW;
END;
$$;

CREATE TRIGGER elite_threads_content_guard
  BEFORE INSERT OR UPDATE OF title, body ON public.elite_threads
  FOR EACH ROW EXECUTE FUNCTION public.elite_content_guard();

CREATE TRIGGER elite_replies_content_guard
  BEFORE INSERT ON public.elite_thread_replies
  FOR EACH ROW EXECUTE FUNCTION public.elite_content_guard();