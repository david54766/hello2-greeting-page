CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email_brief BOOLEAN NOT NULL DEFAULT true,
  elite_reminders BOOLEAN NOT NULL DEFAULT true,
  ai_product_updates BOOLEAN NOT NULL DEFAULT false,
  push_alerts BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS notification_preferences_updated_at ON public.notification_preferences;
CREATE TRIGGER notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.notification_preferences TO authenticated;

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
USING (public.has_role((select auth.uid()), 'admin'));
