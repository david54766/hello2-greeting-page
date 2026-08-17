CREATE TABLE IF NOT EXISTS public.elite_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT elite_blocks_unique UNIQUE (blocker_id, blocked_id),
  CONSTRAINT elite_blocks_not_self CHECK (blocker_id <> blocked_id)
);
CREATE INDEX IF NOT EXISTS elite_blocks_blocker_idx ON public.elite_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS elite_blocks_blocked_idx ON public.elite_blocks(blocked_id);

GRANT SELECT, INSERT, DELETE ON public.elite_blocks TO authenticated;
GRANT ALL ON public.elite_blocks TO service_role;
ALTER TABLE public.elite_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own blocks" ON public.elite_blocks
  FOR ALL TO authenticated
  USING (blocker_id = auth.uid())
  WITH CHECK (blocker_id = auth.uid());

CREATE POLICY "Admins view all blocks" ON public.elite_blocks
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.elite_content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type text NOT NULL CHECK (content_type IN ('thread', 'reply')),
  content_id uuid NOT NULL,
  reported_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  admin_notes text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  platform text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS elite_content_reports_status_idx ON public.elite_content_reports(status);
CREATE INDEX IF NOT EXISTS elite_content_reports_content_idx ON public.elite_content_reports(content_type, content_id);

GRANT SELECT, INSERT ON public.elite_content_reports TO authenticated;
GRANT UPDATE ON public.elite_content_reports TO authenticated;
GRANT ALL ON public.elite_content_reports TO service_role;
ALTER TABLE public.elite_content_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users create reports" ON public.elite_content_reports
  FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Users view own reports" ON public.elite_content_reports
  FOR SELECT TO authenticated
  USING (reporter_id = auth.uid());

CREATE POLICY "Admins view all reports" ON public.elite_content_reports
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update reports" ON public.elite_content_reports
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER elite_content_reports_updated_at
  BEFORE UPDATE ON public.elite_content_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();