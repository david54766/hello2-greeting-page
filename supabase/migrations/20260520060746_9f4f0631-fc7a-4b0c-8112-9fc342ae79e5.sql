
ALTER TABLE public.elite_threads ADD COLUMN IF NOT EXISTS image_urls TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.elite_thread_replies ADD COLUMN IF NOT EXISTS image_urls TEXT[] NOT NULL DEFAULT '{}';

INSERT INTO storage.buckets (id, name, public)
VALUES ('elite-images', 'elite-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Elite images are publicly readable" ON storage.objects;
CREATE POLICY "Elite images are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'elite-images');

DROP POLICY IF EXISTS "Elite or admin can upload elite images" ON storage.objects;
CREATE POLICY "Elite or admin can upload elite images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'elite-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND (public.is_elite(auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role))
  );

DROP POLICY IF EXISTS "Owners can delete their elite images" ON storage.objects;
CREATE POLICY "Owners can delete their elite images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'elite-images'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin'::public.app_role))
  );
