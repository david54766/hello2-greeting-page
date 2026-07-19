CREATE TABLE IF NOT EXISTS public.push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL DEFAULT 'android',
  enabled BOOLEAN NOT NULL DEFAULT true,
  app_version TEXT,
  device_model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_enabled
  ON public.push_tokens(user_id, enabled);

DROP TRIGGER IF EXISTS push_tokens_updated_at ON public.push_tokens;
CREATE TRIGGER push_tokens_updated_at
BEFORE UPDATE ON public.push_tokens
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.push_tokens TO authenticated;

DROP POLICY IF EXISTS "Users view own push tokens" ON public.push_tokens;
CREATE POLICY "Users view own push tokens"
ON public.push_tokens
FOR SELECT
TO authenticated
USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users insert own push tokens" ON public.push_tokens;
CREATE POLICY "Users insert own push tokens"
ON public.push_tokens
FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users update own push tokens" ON public.push_tokens;
CREATE POLICY "Users update own push tokens"
ON public.push_tokens
FOR UPDATE
TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users delete own push tokens" ON public.push_tokens;
CREATE POLICY "Users delete own push tokens"
ON public.push_tokens
FOR DELETE
TO authenticated
USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Admins view all push tokens" ON public.push_tokens;
CREATE POLICY "Admins view all push tokens"
ON public.push_tokens
FOR SELECT
TO authenticated
USING (public.has_role((select auth.uid()), 'admin'));

DROP POLICY IF EXISTS "Admins manage push tokens" ON public.push_tokens;
CREATE POLICY "Admins manage push tokens"
ON public.push_tokens
FOR ALL
TO authenticated
USING (public.has_role((select auth.uid()), 'admin'))
WITH CHECK (public.has_role((select auth.uid()), 'admin'));
