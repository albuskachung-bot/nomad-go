-- Platform API credential vault.
-- Run in Supabase SQL Editor before using /admin/billing Gateway Settings.

create table if not exists public.platform_settings (
  key_name text primary key,
  key_value text not null default '',
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_platform_settings_updated_at on public.platform_settings;
create trigger set_platform_settings_updated_at
  before update on public.platform_settings
  for each row
  execute function public.set_updated_at();

create or replace function public.is_platform_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'super_admin'
  )
$$;

alter table public.platform_settings enable row level security;
alter table public.platform_settings force row level security;

revoke all on public.platform_settings from anon;
revoke all on public.platform_settings from authenticated;
grant select, insert, update on public.platform_settings to authenticated;

drop policy if exists platform_settings_super_admin_select on public.platform_settings;
create policy platform_settings_super_admin_select
  on public.platform_settings
  for select
  to authenticated
  using (public.is_platform_super_admin());

drop policy if exists platform_settings_super_admin_insert on public.platform_settings;
create policy platform_settings_super_admin_insert
  on public.platform_settings
  for insert
  to authenticated
  with check (public.is_platform_super_admin());

drop policy if exists platform_settings_super_admin_update on public.platform_settings;
create policy platform_settings_super_admin_update
  on public.platform_settings
  for update
  to authenticated
  using (public.is_platform_super_admin())
  with check (public.is_platform_super_admin());
