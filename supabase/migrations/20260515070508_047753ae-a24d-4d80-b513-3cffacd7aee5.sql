-- Add timezone to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'America/New_York';

-- Daily recommendations table
CREATE TABLE IF NOT EXISTS public.daily_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  for_date DATE NOT NULL,
  recommendation TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, for_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_recs_user_date ON public.daily_recommendations(user_id, for_date DESC);

ALTER TABLE public.daily_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own daily recs"
  ON public.daily_recommendations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own daily recs"
  ON public.daily_recommendations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all daily recs"
  ON public.daily_recommendations FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));