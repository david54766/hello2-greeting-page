ALTER TABLE public.centers REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.centers;