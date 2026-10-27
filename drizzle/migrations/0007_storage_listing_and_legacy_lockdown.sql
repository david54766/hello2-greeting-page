-- Helpers (SECURITY DEFINER, fixed search_path) created before the policies that use them.
CREATE OR REPLACE FUNCTION public.elite_image_visible(_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR split_part(_name, '/', 1) = auth.uid()::text
    OR (
      public.is_elite(auth.uid()) AND (
        EXISTS (SELECT 1 FROM public.elite_threads t, unnest(t.image_urls) u
                WHERE t.moderation_status = 'approved'
                  AND split_part(u, '/storage/v1/object/public/elite-images/', 2) = _name
                  AND t.user_id <> ALL (public.elite_blocked_user_ids()))
        OR EXISTS (SELECT 1 FROM public.elite_thread_replies r, unnest(r.image_urls) u
                WHERE r.moderation_status = 'approved'
                  AND split_part(u, '/storage/v1/object/public/elite-images/', 2) = _name
                  AND r.user_id <> ALL (public.elite_blocked_user_ids()))
      )
    )
  )
$$;

CREATE OR REPLACE FUNCTION public.can_download_template(_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL
    AND _name ~ '^[A-Za-z0-9._-]+(/[A-Za-z0-9._-]+)*$'
    AND _name !~ '(^|/)\.\.?(/|$)'
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR EXISTS (
        SELECT 1 FROM public.templates tp
        JOIN public.subscriptions s ON s.user_id = auth.uid()
        WHERE tp.storage_path = _name
          AND s.status = 'active'
          AND (s.current_period_end IS NULL OR s.current_period_end > now())
          AND s.tier >= tp.tier_required
          AND (NOT tp.is_elite OR s.tier = 'elite')
      )
    )
$$;

REVOKE EXECUTE ON FUNCTION public.elite_image_visible(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_download_template(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.elite_image_visible(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_download_template(text) TO authenticated, service_role;

-- elite-images: remove anonymous/general listing. Bucket stays public, so known URLs still load.
DROP POLICY IF EXISTS "Elite images are publicly readable" ON storage.objects;
CREATE POLICY "Elite images visible to authorized members" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'elite-images' AND public.elite_image_visible(name));

-- templates: signing/download requires live membership at the template's tier (admins always).
DROP POLICY IF EXISTS "Auth read templates" ON storage.objects;
CREATE POLICY "Members read templates for their tier" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'templates' AND public.can_download_template(name));

-- Legacy scheduling tables: admin-only reads (existing admin ALL policies remain). Rows untouched.
DROP POLICY IF EXISTS "Authenticated view availability" ON public.raven_availability;
DROP POLICY IF EXISTS "Authenticated view settings" ON public.raven_meeting_settings;