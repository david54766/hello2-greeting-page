-- Lovable may create placeholder tables when asked for push settings.
-- This migration makes existing tables compatible with the Android/web app
-- without dropping data from any earlier attempt.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.push_tokens (
  id UUID DEFAULT gen_random_uuid()
);

ALTER TABLE public.push_tokens
  ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS token TEXT,
  ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'android',
  ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS app_version TEXT,
  ADD COLUMN IF NOT EXISTS device_model TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

UPDATE public.push_tokens SET id = gen_random_uuid() WHERE id IS NULL;
UPDATE public.push_tokens SET platform = 'android' WHERE platform IS NULL;
UPDATE public.push_tokens SET enabled = true WHERE enabled IS NULL;
UPDATE public.push_tokens SET created_at = now() WHERE created_at IS NULL;
UPDATE public.push_tokens SET updated_at = now() WHERE updated_at IS NULL;

DELETE FROM public.push_tokens a
USING public.push_tokens b
WHERE a.ctid < b.ctid
  AND a.user_id IS NOT NULL
  AND a.token IS NOT NULL
  AND a.user_id = b.user_id
  AND a.token = b.token;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.push_tokens'::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE public.push_tokens ADD CONSTRAINT push_tokens_pkey PRIMARY KEY (id);
  END IF;
END $$;

ALTER TABLE public.push_tokens
  DROP CONSTRAINT IF EXISTS push_tokens_token_key;

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_enabled
  ON public.push_tokens(user_id, enabled);

CREATE UNIQUE INDEX IF NOT EXISTS push_tokens_user_token_key
  ON public.push_tokens(user_id, token);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.push_tokens FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.push_tokens TO authenticated;

DROP TRIGGER IF EXISTS push_tokens_updated_at ON public.push_tokens;
CREATE TRIGGER push_tokens_updated_at
BEFORE UPDATE ON public.push_tokens
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

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
USING (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins manage push tokens" ON public.push_tokens;
CREATE POLICY "Admins manage push tokens"
ON public.push_tokens
FOR ALL
TO authenticated
USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS email_brief BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS elite_reminders BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS ai_product_updates BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS push_alerts BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notification_preferences'
      AND column_name = 'daily_brief'
  ) THEN
    EXECUTE 'UPDATE public.notification_preferences SET email_brief = COALESCE(email_brief, daily_brief)';
  END IF;
END $$;

UPDATE public.notification_preferences SET id = gen_random_uuid() WHERE id IS NULL;
UPDATE public.notification_preferences SET email_brief = true WHERE email_brief IS NULL;
UPDATE public.notification_preferences SET elite_reminders = true WHERE elite_reminders IS NULL;
UPDATE public.notification_preferences SET ai_product_updates = false WHERE ai_product_updates IS NULL;
UPDATE public.notification_preferences SET push_alerts = true WHERE push_alerts IS NULL;
UPDATE public.notification_preferences SET created_at = now() WHERE created_at IS NULL;
UPDATE public.notification_preferences SET updated_at = now() WHERE updated_at IS NULL;

DELETE FROM public.notification_preferences a
USING public.notification_preferences b
WHERE a.ctid < b.ctid
  AND a.user_id IS NOT NULL
  AND a.user_id = b.user_id;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.notification_preferences'::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE public.notification_preferences ADD CONSTRAINT notification_preferences_pkey PRIMARY KEY (id);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS notification_preferences_user_id_key
  ON public.notification_preferences(user_id);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.notification_preferences FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.notification_preferences TO authenticated;

DROP TRIGGER IF EXISTS notification_preferences_updated_at ON public.notification_preferences;
CREATE TRIGGER notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS "Users view own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users view own notification preferences"
ON public.notification_preferences
FOR SELECT
TO authenticated
USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users insert own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users insert own notification preferences"
ON public.notification_preferences
FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users update own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users update own notification preferences"
ON public.notification_preferences
FOR UPDATE
TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users delete own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users delete own notification preferences"
ON public.notification_preferences
FOR DELETE
TO authenticated
USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Admins view all notification preferences" ON public.notification_preferences;
CREATE POLICY "Admins view all notification preferences"
ON public.notification_preferences
FOR SELECT
TO authenticated
USING (public.has_role((select auth.uid()), 'admin'::public.app_role));

CREATE TABLE IF NOT EXISTS public.push_notification_deliveries (
  id UUID DEFAULT gen_random_uuid()
);

ALTER TABLE public.push_notification_deliveries
  ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS admin_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS body TEXT,
  ADD COLUMN IF NOT EXISTS audience TEXT DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS preference_key TEXT DEFAULT 'push_alerts',
  ADD COLUMN IF NOT EXISTS sent_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failed_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS skipped_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS error_summary TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

UPDATE public.push_notification_deliveries SET id = gen_random_uuid() WHERE id IS NULL;
UPDATE public.push_notification_deliveries SET audience = 'all' WHERE audience IS NULL;
UPDATE public.push_notification_deliveries SET preference_key = 'push_alerts' WHERE preference_key IS NULL;
UPDATE public.push_notification_deliveries SET sent_count = 0 WHERE sent_count IS NULL;
UPDATE public.push_notification_deliveries SET failed_count = 0 WHERE failed_count IS NULL;
UPDATE public.push_notification_deliveries SET skipped_count = 0 WHERE skipped_count IS NULL;
UPDATE public.push_notification_deliveries SET created_at = now() WHERE created_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.push_notification_deliveries'::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE public.push_notification_deliveries ADD CONSTRAINT push_notification_deliveries_pkey PRIMARY KEY (id);
  END IF;
END $$;

ALTER TABLE public.push_notification_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.push_notification_deliveries FROM anon;
GRANT SELECT ON TABLE public.push_notification_deliveries TO authenticated;

DROP POLICY IF EXISTS "Admins view push notification deliveries" ON public.push_notification_deliveries;
CREATE POLICY "Admins view push notification deliveries"
ON public.push_notification_deliveries
FOR SELECT
TO authenticated
USING (public.has_role((select auth.uid()), 'admin'::public.app_role));

NOTIFY pgrst, 'reload schema';
