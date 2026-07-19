CREATE TABLE IF NOT EXISTS public.push_notification_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT 'all',
  preference_key TEXT NOT NULL DEFAULT 'push_alerts',
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  error_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.push_notification_deliveries ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON TABLE public.push_notification_deliveries TO authenticated;

DROP POLICY IF EXISTS "Admins view push notification deliveries" ON public.push_notification_deliveries;
CREATE POLICY "Admins view push notification deliveries"
ON public.push_notification_deliveries
FOR SELECT
TO authenticated
USING (public.has_role((select auth.uid()), 'admin'));
