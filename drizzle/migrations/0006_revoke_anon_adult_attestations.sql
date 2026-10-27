REVOKE ALL ON public.adult_attestations FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.adult_attestations FROM authenticated;