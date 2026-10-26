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

  -- Explicit required-argument validation (NULLs must never reach the
  -- idempotency lookup or the insert).
  IF p_report_id IS NULL THEN
    RAISE EXCEPTION 'invalid_argument: report_id is required';
  END IF;
  IF p_session_id IS NULL THEN
    RAISE EXCEPTION 'invalid_argument: session_id is required';
  END IF;
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'invalid_argument: reason is required';
  END IF;
  IF p_platform IS NULL OR btrim(p_platform) = '' THEN
    RAISE EXCEPTION 'invalid_argument: platform is required';
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

  -- Idempotent reuse: acknowledge ONLY when the existing report belongs to
  -- this caller AND references the same session. A same-user retry with a
  -- different session_id is a collision, not a retry.
  SELECT * INTO v_existing FROM public.ai_strategy_reports WHERE id = p_report_id;
  IF FOUND THEN
    IF v_existing.reporter_id = v_uid AND v_existing.session_id = p_session_id THEN
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
    -- Concurrent insert won the race: apply the same dual-key verification.
    SELECT * INTO v_existing FROM public.ai_strategy_reports WHERE id = p_report_id;
    IF FOUND AND v_existing.reporter_id = v_uid AND v_existing.session_id = p_session_id THEN
      RETURN jsonb_build_object('ok', true, 'id', v_existing.id);
    END IF;
    RAISE EXCEPTION 'report_id_unavailable';
END;
$$;

REVOKE ALL ON FUNCTION public.report_ai_strategy(uuid, uuid, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.report_ai_strategy(uuid, uuid, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.report_ai_strategy(uuid, uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_ai_strategy(uuid, uuid, text, text, text) TO service_role;