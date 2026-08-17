CREATE OR REPLACE FUNCTION public.elite_blocked_user_ids()
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(DISTINCT other), ARRAY[]::uuid[])
  FROM (
    SELECT blocked_id AS other FROM public.elite_blocks WHERE blocker_id = auth.uid()
    UNION
    SELECT blocker_id AS other FROM public.elite_blocks WHERE blocked_id = auth.uid()
  ) s
$$;

REVOKE ALL ON FUNCTION public.elite_blocked_user_ids() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.elite_blocked_user_ids() FROM anon;
GRANT EXECUTE ON FUNCTION public.elite_blocked_user_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.elite_blocked_user_ids() TO service_role;