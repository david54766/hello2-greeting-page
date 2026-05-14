
CREATE OR REPLACE FUNCTION public.claim_first_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  admin_exists boolean;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE role = 'admin') INTO admin_exists;
  IF admin_exists THEN RETURN false; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_any_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE role = 'admin') $$;

CREATE TABLE public.elite_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  topic text NOT NULL,
  preferred_times text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.elite_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users insert own elite requests" ON public.elite_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users view own elite requests" ON public.elite_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all elite requests" ON public.elite_requests FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update elite requests" ON public.elite_requests FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE TRIGGER elite_requests_updated_at BEFORE UPDATE ON public.elite_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.templates (title, description, category, tier_required, is_elite, storage_path)
SELECT * FROM (VALUES
  ('New Hire Onboarding Checklist', 'A 30-day onboarding sequence for new childcare staff.', 'hiring'::template_category, 'essentials'::subscription_tier, false, 'starter/onboarding-checklist.pdf'),
  ('Tour-to-Enrollment Script', 'Word-for-word script that converts tours into signed enrollments.', 'enrollment'::template_category, 'pro'::subscription_tier, false, 'starter/tour-script.pdf'),
  ('Parent Conflict Response Templates', 'Email + in-person scripts for the 8 most common parent complaints.', 'operations'::template_category, 'pro'::subscription_tier, false, 'starter/parent-conflict.pdf'),
  ('Annual Tuition Increase Letter', 'Positions the increase around value, not cost. Ready to send.', 'enrollment'::template_category, 'pro'::subscription_tier, false, 'starter/tuition-increase.pdf'),
  ('Director SOP Library', 'The 22 SOPs every director should run weekly.', 'operations'::template_category, 'elite'::subscription_tier, true, 'starter/director-sops.pdf'),
  ('Acquisition Due Diligence Pack', 'Buyer checklist for evaluating a center acquisition.', 'operations'::template_category, 'elite'::subscription_tier, true, 'starter/acquisition-dd.pdf')
) AS v(title, description, category, tier_required, is_elite, storage_path)
WHERE NOT EXISTS (SELECT 1 FROM public.templates);
