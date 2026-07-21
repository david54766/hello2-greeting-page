create table if not exists public.legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  terms_version text not null,
  privacy_version text not null,
  platform text not null check (platform in ('web', 'android', 'ios')),
  app_version text,
  user_agent text,
  accepted_at timestamptz not null default now(),
  constraint legal_acceptances_user_versions_key unique (user_id, terms_version, privacy_version)
);

create index if not exists legal_acceptances_user_id_idx
  on public.legal_acceptances(user_id);

alter table public.legal_acceptances enable row level security;

drop policy if exists "Users view own legal acceptances" on public.legal_acceptances;
create policy "Users view own legal acceptances"
  on public.legal_acceptances
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users record own legal acceptances" on public.legal_acceptances;
create policy "Users record own legal acceptances"
  on public.legal_acceptances
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

grant select, insert on table public.legal_acceptances to authenticated;
grant select, insert, update, delete on table public.legal_acceptances to service_role;
revoke all on table public.legal_acceptances from anon;
