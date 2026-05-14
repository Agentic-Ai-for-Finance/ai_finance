create extension if not exists pgcrypto;

create or replace function public.requesting_user_id()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(auth.jwt() ->> 'sub', ''),
    nullif(current_setting('request.jwt.claim.sub', true), '')
  );
$$;

create table if not exists public.app_user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,
  email text,
  role text not null default 'user' check (role in ('user', 'admin')),
  default_institution_codes text[] not null default '{}',
  phone_number text,
  phone_verified_at timestamptz,
  created_at timestamptz not null default timezone('America/Santiago', now()),
  updated_at timestamptz not null default timezone('America/Santiago', now())
);

create table if not exists public.app_audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  user_role text,
  event_type text not null,
  route text not null,
  outcome text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('America/Santiago', now())
);

create index if not exists app_user_profiles_user_id_idx
  on public.app_user_profiles (user_id);

create index if not exists app_audit_logs_user_id_idx
  on public.app_audit_logs (user_id);

create index if not exists app_audit_logs_created_at_idx
  on public.app_audit_logs (created_at desc);

alter table public.app_user_profiles enable row level security;
alter table public.app_audit_logs enable row level security;

drop policy if exists "app_user_profiles_select_own" on public.app_user_profiles;
create policy "app_user_profiles_select_own"
  on public.app_user_profiles
  for select
  using (user_id = public.requesting_user_id());

drop policy if exists "app_user_profiles_insert_own" on public.app_user_profiles;
create policy "app_user_profiles_insert_own"
  on public.app_user_profiles
  for insert
  with check (user_id = public.requesting_user_id());

drop policy if exists "app_user_profiles_update_own" on public.app_user_profiles;
create policy "app_user_profiles_update_own"
  on public.app_user_profiles
  for update
  using (user_id = public.requesting_user_id())
  with check (user_id = public.requesting_user_id());

drop policy if exists "app_audit_logs_select_own" on public.app_audit_logs;
create policy "app_audit_logs_select_own"
  on public.app_audit_logs
  for select
  using (user_id = public.requesting_user_id());

grant select, insert, update on public.app_user_profiles to authenticated;
grant select on public.app_audit_logs to authenticated;
