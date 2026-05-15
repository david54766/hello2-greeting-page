
CREATE TABLE public.centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  state TEXT,
  city TEXT,
  enrollment_size INTEGER,
  capacity INTEGER,
  tuition_range TEXT,
  staff_count INTEGER,
  ages_served TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.centers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own centers" ON public.centers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own centers" ON public.centers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own centers" ON public.centers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own centers" ON public.centers FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins view all centers" ON public.centers FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_centers_user ON public.centers(user_id);

CREATE TRIGGER centers_set_updated_at BEFORE UPDATE ON public.centers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
