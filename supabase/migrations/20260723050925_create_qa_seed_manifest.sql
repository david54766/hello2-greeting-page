create table public.qa_seed_batches (
  id uuid primary key default gen_random_uuid(),
  batch_key text not null unique,
  description text not null,
  status text not null default 'active'
    check (status in ('active', 'failed', 'removed')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  removed_at timestamptz
);

create table public.qa_seed_accounts (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.qa_seed_batches(id) on delete cascade,
  auth_user_id uuid references auth.users(id) on delete set null,
  email text not null,
  display_name text not null,
  tier public.subscription_tier not null,
  purpose text not null,
  status text not null default 'active'
    check (status in ('active', 'removed')),
  created_at timestamptz not null default now(),
  removed_at timestamptz,
  unique (batch_id, email)
);

create table public.qa_seed_records (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.qa_seed_batches(id) on delete cascade,
  account_id uuid references public.qa_seed_accounts(id) on delete cascade,
  table_name text not null,
  record_id uuid,
  summary jsonb not null default '{}'::jsonb,
  status text not null default 'active'
    check (status in ('active', 'removed')),
  created_at timestamptz not null default now(),
  removed_at timestamptz
);

create index qa_seed_accounts_batch_id_idx
  on public.qa_seed_accounts(batch_id);
create index qa_seed_records_batch_id_idx
  on public.qa_seed_records(batch_id);
create index qa_seed_records_account_id_idx
  on public.qa_seed_records(account_id);

alter table public.qa_seed_batches enable row level security;
alter table public.qa_seed_accounts enable row level security;
alter table public.qa_seed_records enable row level security;

create policy "Admins view QA seed batches"
  on public.qa_seed_batches for select to authenticated
  using (public.has_role((select auth.uid()), 'admin'::public.app_role));
create policy "Admins view QA seed accounts"
  on public.qa_seed_accounts for select to authenticated
  using (public.has_role((select auth.uid()), 'admin'::public.app_role));
create policy "Admins view QA seed records"
  on public.qa_seed_records for select to authenticated
  using (public.has_role((select auth.uid()), 'admin'::public.app_role));

revoke all on public.qa_seed_batches from anon, authenticated;
revoke all on public.qa_seed_accounts from anon, authenticated;
revoke all on public.qa_seed_records from anon, authenticated;
grant select on public.qa_seed_batches to authenticated;
grant select on public.qa_seed_accounts to authenticated;
grant select on public.qa_seed_records to authenticated;
grant all on public.qa_seed_batches to service_role;
grant all on public.qa_seed_accounts to service_role;
grant all on public.qa_seed_records to service_role;

notify pgrst, 'reload schema';
