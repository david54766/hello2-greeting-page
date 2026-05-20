
ALTER TABLE public.raven_videos ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'General';
CREATE INDEX IF NOT EXISTS idx_raven_videos_category ON public.raven_videos(category);
CREATE INDEX IF NOT EXISTS idx_raven_videos_sort ON public.raven_videos(category, sort_order);

CREATE OR REPLACE FUNCTION public.raven_videos_assign_sort_order()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.sort_order IS NULL OR NEW.sort_order = 0 THEN
    SELECT COALESCE(MAX(sort_order), 0) + 1 INTO NEW.sort_order
      FROM public.raven_videos WHERE category = NEW.category;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_raven_videos_assign_sort ON public.raven_videos;
CREATE TRIGGER trg_raven_videos_assign_sort
BEFORE INSERT ON public.raven_videos
FOR EACH ROW EXECUTE FUNCTION public.raven_videos_assign_sort_order();
