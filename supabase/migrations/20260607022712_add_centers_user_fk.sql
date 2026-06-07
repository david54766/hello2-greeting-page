DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'centers_user_id_fkey'
      AND conrelid = 'public.centers'::regclass
  ) THEN
    ALTER TABLE public.centers
      ADD CONSTRAINT centers_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES auth.users(id)
      ON DELETE CASCADE;
  END IF;
END $$;
