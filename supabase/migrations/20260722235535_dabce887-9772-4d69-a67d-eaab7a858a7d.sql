create table if not exists public.legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  terms_version text not null,
  privacy_version text not null,
  platform text not null check (platform in ('web', 'android', 'ios')),
  app_version text,
  user_agent text,
  accepted_at timestamptz not null default now(),
  unique (user_id, terms_version, privacy_version)
);
create index if not exists legal_acceptances_user_id_idx on public.legal_acceptances(user_id);
alter table public.legal_acceptances enable row level security;
drop policy if exists "Users view own legal acceptances" on public.legal_acceptances;
create policy "Users view own legal acceptances" on public.legal_acceptances for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users record own legal acceptances" on public.legal_acceptances;
create policy "Users record own legal acceptances" on public.legal_acceptances for insert to authenticated with check ((select auth.uid()) = user_id);
revoke all on public.legal_acceptances from anon;
grant select, insert on public.legal_acceptances to authenticated;
grant all on public.legal_acceptances to service_role;

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  platform text not null check (platform in ('web', 'android', 'ios')),
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'cancelled')),
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id)
);
create index if not exists account_deletion_requests_status_idx on public.account_deletion_requests(status, requested_at);
alter table public.account_deletion_requests enable row level security;
drop policy if exists "Users view own deletion request" on public.account_deletion_requests;
create policy "Users view own deletion request" on public.account_deletion_requests for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users initiate own account deletion" on public.account_deletion_requests;
create policy "Users initiate own account deletion" on public.account_deletion_requests for insert to authenticated with check ((select auth.uid()) = user_id and status = 'pending');
revoke all on public.account_deletion_requests from anon;
grant select, insert on public.account_deletion_requests to authenticated;
grant all on public.account_deletion_requests to service_role;

notify pgrst, 'reload schema';