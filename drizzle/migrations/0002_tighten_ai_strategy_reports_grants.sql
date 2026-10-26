REVOKE ALL ON public.ai_strategy_reports FROM anon;
REVOKE ALL ON public.ai_strategy_reports FROM authenticated;
REVOKE ALL ON public.ai_strategy_reports FROM service_role;

GRANT SELECT ON public.ai_strategy_reports TO authenticated;
GRANT UPDATE (status, admin_notes) ON public.ai_strategy_reports TO authenticated;
GRANT ALL ON public.ai_strategy_reports TO service_role;