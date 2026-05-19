
-- 1) Elite signup requests (pre-account applications)
CREATE TABLE public.elite_signup_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  business_name TEXT NOT NULL,
  state TEXT,
  role TEXT,
  centers_count INTEGER,
  annual_revenue TEXT,
  goals TEXT NOT NULL,
  referral TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  decided_by UUID,
  decided_at TIMESTAMPTZ,
  invited_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.elite_signup_requests ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous visitors) can submit an application
CREATE POLICY "Anyone can submit elite signup request"
ON public.elite_signup_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only admins can read or update
CREATE POLICY "Admins view elite signup requests"
ON public.elite_signup_requests
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update elite signup requests"
ON public.elite_signup_requests
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_elite_signup_requests_updated_at
BEFORE UPDATE ON public.elite_signup_requests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_elite_signup_requests_status ON public.elite_signup_requests(status, created_at DESC);

-- 2) Update handle_new_user to honor intended_tier from signup metadata.
--    Only 'essentials' or 'pro' are valid; anything else (incl. 'elite') -> 'essentials'.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  requested_tier TEXT := COALESCE(NEW.raw_user_meta_data->>'intended_tier', 'essentials');
  resolved_tier public.subscription_tier;
BEGIN
  IF requested_tier IN ('essentials', 'pro') THEN
    resolved_tier := requested_tier::public.subscription_tier;
  ELSIF requested_tier = 'elite' AND (NEW.raw_user_meta_data->>'elite_invited') = 'true' THEN
    resolved_tier := 'elite'::public.subscription_tier;
  ELSE
    resolved_tier := 'essentials'::public.subscription_tier;
  END IF;

  INSERT INTO public.profiles (id, full_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  INSERT INTO public.subscriptions (user_id, tier)
    VALUES (NEW.id, resolved_tier);
  INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$function$;
