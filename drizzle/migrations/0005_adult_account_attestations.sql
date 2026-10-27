CREATE TABLE public.adult_attestations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  attestation_version text NOT NULL CHECK (char_length(attestation_version) BETWEEN 1 AND 64),
  statement text NOT NULL CHECK (char_length(statement) BETWEEN 1 AND 500),
  platform text NOT NULL DEFAULT 'web' CHECK (platform IN ('web')),
  attested_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, attestation_version)
);
GRANT SELECT ON public.adult_attestations TO authenticated;
GRANT ALL ON public.adult_attestations TO service_role;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.adult_attestations FROM authenticated, anon;
ALTER TABLE public.adult_attestations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view own adult attestations" ON public.adult_attestations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all adult attestations" ON public.adult_attestations
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
COMMENT ON TABLE public.adult_attestations IS 'Self-attestation (18+ and authorized to represent the business) captured by the website signup server function. Not verified age. Written by service role only.';