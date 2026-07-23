
CREATE TABLE public.qa_seed_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_key text NOT NULL UNIQUE,
  description text,
  status text NOT NULL DEFAULT 'active',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  removed_at timestamptz
);
GRANT ALL ON public.qa_seed_batches TO service_role;
ALTER TABLE public.qa_seed_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all_qa_batches" ON public.qa_seed_batches FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE public.qa_seed_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.qa_seed_batches(id) ON DELETE CASCADE,
  auth_user_id uuid,
  email text NOT NULL,
  display_name text,
  tier text,
  purpose text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  removed_at timestamptz
);
GRANT ALL ON public.qa_seed_accounts TO service_role;
ALTER TABLE public.qa_seed_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all_qa_accounts" ON public.qa_seed_accounts FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE public.qa_seed_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.qa_seed_batches(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.qa_seed_accounts(id) ON DELETE CASCADE,
  table_name text NOT NULL,
  record_id text,
  summary jsonb,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  removed_at timestamptz
);
GRANT ALL ON public.qa_seed_records TO service_role;
ALTER TABLE public.qa_seed_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all_qa_records" ON public.qa_seed_records FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX qa_seed_accounts_batch_idx ON public.qa_seed_accounts(batch_id);
CREATE INDEX qa_seed_records_batch_idx ON public.qa_seed_records(batch_id);
CREATE INDEX qa_seed_records_account_idx ON public.qa_seed_records(account_id);
