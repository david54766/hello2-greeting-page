
CREATE TABLE public.elite_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  business_name text NOT NULL,
  state text,
  role text,
  centers_count integer,
  annual_revenue text,
  goals text NOT NULL,
  referral text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','declined')),
  admin_notes text,
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX elite_applications_one_active_per_user
  ON public.elite_applications(user_id)
  WHERE status IN ('pending','approved');

CREATE INDEX elite_applications_status_idx ON public.elite_applications(status, created_at DESC);

ALTER TABLE public.elite_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own elite applications"
  ON public.elite_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own elite applications"
  ON public.elite_applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all elite applications"
  ON public.elite_applications FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update elite applications"
  ON public.elite_applications FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_elite_applications_updated_at
  BEFORE UPDATE ON public.elite_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
