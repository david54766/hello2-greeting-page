CREATE TABLE public.ai_strategy_reports (
  id uuid PRIMARY KEY,
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL,
  reason text NOT NULL,
  details text,
  platform text NOT NULL,
  prompt_snapshot text NOT NULL,
  response_snapshot jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_strategy_reports_reason_check CHECK (reason IN ('Unsafe or harmful','Inappropriate content','Inaccurate guidance','Privacy concern','Other')),
  CONSTRAINT ai_strategy_reports_platform_check CHECK (platform IN ('ios','android','web')),
  CONSTRAINT ai_strategy_reports_status_check CHECK (status IN ('pending','reviewed','actioned','dismissed')),
  CONSTRAINT ai_strategy_reports_details_len CHECK (details IS NULL OR length(details) <= 4000)
);

CREATE INDEX ai_strategy_reports_reporter_idx ON public.ai_strategy_reports (reporter_id);
CREATE INDEX ai_strategy_reports_status_created_idx ON public.ai_strategy_reports (status, created_at DESC);

GRANT SELECT ON public.ai_strategy_reports TO authenticated;
GRANT UPDATE (status, admin_notes) ON public.ai_strategy_reports TO authenticated;
GRANT ALL ON public.ai_strategy_reports TO service_role;

ALTER TABLE public.ai_strategy_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reporters view own reports"
  ON public.ai_strategy_reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id);

CREATE POLICY "Admins view all reports"
  ON public.ai_strategy_reports FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update report status"
  ON public.ai_strategy_reports FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.report_ai_strategy(
  p_report_id uuid,
  p_session_id uuid,
  p_reason text,
  p_details text,
  p_platform text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_session public.coaching_sessions%ROWTYPE;
  v_existing public.ai_strategy_reports%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF p_reason NOT IN ('Unsafe or harmful','Inappropriate content','Inaccurate guidance','Privacy concern','Other') THEN
    RAISE EXCEPTION 'invalid_reason';
  END IF;
  IF p_platform NOT IN ('ios','android','web') THEN
    RAISE EXCEPTION 'invalid_platform';
  END IF;
  IF p_details IS NOT NULL AND length(p_details) > 4000 THEN
    RAISE EXCEPTION 'details_too_long';
  END IF;

  SELECT * INTO v_existing FROM public.ai_strategy_reports WHERE id = p_report_id;
  IF FOUND THEN
    IF v_existing.reporter_id = v_uid THEN
      RETURN jsonb_build_object('ok', true, 'id', v_existing.id);
    END IF;
    RAISE EXCEPTION 'report_id_unavailable';
  END IF;

  SELECT * INTO v_session FROM public.coaching_sessions
    WHERE id = p_session_id AND user_id = v_uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'session_not_found';
  END IF;

  INSERT INTO public.ai_strategy_reports
    (id, reporter_id, session_id, reason, details, platform, prompt_snapshot, response_snapshot)
  VALUES
    (p_report_id, v_uid, p_session_id, p_reason, NULLIF(btrim(p_details), ''), p_platform,
     v_session.prompt, v_session.response);

  RETURN jsonb_build_object('ok', true, 'id', p_report_id);
EXCEPTION
  WHEN unique_violation THEN
    SELECT * INTO v_existing FROM public.ai_strategy_reports WHERE id = p_report_id;
    IF FOUND AND v_existing.reporter_id = v_uid THEN
      RETURN jsonb_build_object('ok', true, 'id', v_existing.id);
    END IF;
    RAISE EXCEPTION 'report_id_unavailable';
END;
$$;

REVOKE ALL ON FUNCTION public.report_ai_strategy(uuid, uuid, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.report_ai_strategy(uuid, uuid, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.report_ai_strategy(uuid, uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_ai_strategy(uuid, uuid, text, text, text) TO service_role;