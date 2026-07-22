create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  platform text not null check (platform in ('web', 'android', 'ios')),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'cancelled')),
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id)
);

create index if not exists account_deletion_requests_status_idx
  on public.account_deletion_requests(status, requested_at);

revoke all on table public.account_deletion_requests from anon;
grant select, insert on table public.account_deletion_requests to authenticated;
grant select, insert, update, delete on table public.account_deletion_requests to service_role;

alter table public.account_deletion_requests enable row level security;

create policy "Users view own deletion request"
  on public.account_deletion_requests for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users initiate own account deletion"
  on public.account_deletion_requests for insert
  to authenticated
  with check ((select auth.uid()) = user_id and status = 'pending');

notify pgrst, 'reload schema';