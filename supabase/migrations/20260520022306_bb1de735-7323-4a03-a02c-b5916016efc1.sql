
CREATE TABLE public.raven_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT,
  duration_seconds INTEGER,
  published BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.raven_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view published videos"
  ON public.raven_videos FOR SELECT TO authenticated
  USING (published = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage videos"
  ON public.raven_videos FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_raven_videos_updated
  BEFORE UPDATE ON public.raven_videos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO storage.buckets (id, name, public)
  VALUES ('raven-videos', 'raven-videos', false);

CREATE POLICY "Authenticated read raven videos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'raven-videos');

CREATE POLICY "Admins write raven videos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'raven-videos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update raven videos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'raven-videos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete raven videos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'raven-videos' AND has_role(auth.uid(), 'admin'::app_role));
