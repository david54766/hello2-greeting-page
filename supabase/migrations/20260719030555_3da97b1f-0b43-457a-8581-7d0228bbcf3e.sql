
-- Align notification_preferences with new schema
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS email_brief boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS elite_reminders boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ai_product_updates boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS push_alerts boolean NOT NULL DEFAULT true;

-- Align push_tokens with new schema
ALTER TABLE public.push_tokens
  ADD COLUMN IF NOT EXISTS enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS app_version text,
  ADD COLUMN IF NOT EXISTS device_model text;

-- Align push_notification_deliveries with new schema
ALTER TABLE public.push_notification_deliveries
  ADD COLUMN IF NOT EXISTS admin_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS audience text,
  ADD COLUMN IF NOT EXISTS preference_key text,
  ADD COLUMN IF NOT EXISTS sent_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failed_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS skipped_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS error_summary text;

CREATE INDEX IF NOT EXISTS push_deliveries_admin_user_id_idx
  ON public.push_notification_deliveries (admin_user_id);

-- Ensure Data API grants (idempotent)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_tokens TO authenticated;
GRANT ALL ON public.push_tokens TO service_role;
GRANT SELECT ON public.push_notification_deliveries TO authenticated;
GRANT ALL ON public.push_notification_deliveries TO service_role;

-- Allow admins to insert/update delivery log rows
DROP POLICY IF EXISTS "Admins insert deliveries" ON public.push_notification_deliveries;
CREATE POLICY "Admins insert deliveries"
  ON public.push_notification_deliveries
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update deliveries" ON public.push_notification_deliveries;
CREATE POLICY "Admins update deliveries"
  ON public.push_notification_deliveries
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
