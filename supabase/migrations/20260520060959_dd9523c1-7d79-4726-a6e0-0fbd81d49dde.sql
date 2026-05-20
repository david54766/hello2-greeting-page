
CREATE TABLE IF NOT EXISTS public.cookie_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  session_id text,
  choice text NOT NULL CHECK (choice IN ('accepted','essential')),
  policy_version text NOT NULL,
  user_agent text,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cookie_consents_user_id_idx ON public.cookie_consents(user_id);
CREATE INDEX IF NOT EXISTS cookie_consents_created_at_idx ON public.cookie_consents(created_at DESC);

ALTER TABLE public.cookie_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view cookie consents" ON public.cookie_consents;
CREATE POLICY "Admins view cookie consents"
  ON public.cookie_consents FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Users view own cookie consents" ON public.cookie_consents;
CREATE POLICY "Users view own cookie consents"
  ON public.cookie_consents FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
