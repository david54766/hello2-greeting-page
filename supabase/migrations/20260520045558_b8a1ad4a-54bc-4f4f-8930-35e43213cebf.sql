CREATE TABLE public.revenue_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  scope_mode TEXT NOT NULL DEFAULT 'portfolio' CHECK (scope_mode IN ('portfolio','center')),
  active_center_id UUID,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  model JSONB NOT NULL DEFAULT '{}'::jsonb,
  goals JSONB NOT NULL DEFAULT '{}'::jsonb,
  skipped BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.revenue_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own revenue profile" ON public.revenue_profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own revenue profile" ON public.revenue_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own revenue profile" ON public.revenue_profiles
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own revenue profile" ON public.revenue_profiles
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins view all revenue profiles" ON public.revenue_profiles
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER revenue_profiles_set_updated_at
  BEFORE UPDATE ON public.revenue_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();