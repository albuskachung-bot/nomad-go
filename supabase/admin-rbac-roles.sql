-- Admin RBAC migration for NOMAD-GO.
-- Run this in Supabase SQL Editor before using /admin/team.

alter table public.profiles add column if not exists role text;
alter table public.profiles add column if not exists account_type text;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles alter column role set default 'member';

update public.profiles
set account_type = 'nomad',
    role = 'member'
where role = 'talent';

update public.profiles
set account_type = 'employer',
    role = 'member'
where role = 'employer';

update public.profiles
set role = 'super_admin'
where role = 'admin';

update public.profiles
set role = 'editor'
where role = 'moderator';

update public.profiles
set role = 'member'
where role is null
   or role = 'user';

alter table public.profiles alter column role set not null;
alter table public.profiles add constraint profiles_role_check
  check (role in ('member', 'super_admin', 'editor', 'reviewer'));

create index if not exists profiles_role_idx
  on public.profiles (role);

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid()
$$;

create or replace function public.is_admin_role()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.current_profile_role() in ('super_admin', 'editor', 'reviewer'),
    false
  )
$$;

create or replace function public.can_manage_site_settings()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.current_profile_role() in ('super_admin', 'editor'),
    false
  )
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_profile_role() = 'super_admin', false)
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    role,
    account_type,
    full_name,
    avatar_url
  ) values (
    new.id,
    'member',
    null,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

create or replace function public.guard_profile_role_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role = 'super_admin'
    and new.role is distinct from 'super_admin'
    and (select count(*) from public.profiles where role = 'super_admin') <= 1
  then
    raise exception 'Cannot remove the last super_admin';
  end if;

  if new.role is distinct from old.role
    and coalesce(auth.role(), '') <> 'service_role'
    and auth.uid() is not null
    and not public.is_super_admin()
  then
    raise exception 'Only super_admin can change profile roles';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_profile_role_update on public.profiles;
create trigger guard_profile_role_update
  before update of role on public.profiles
  for each row
  execute function public.guard_profile_role_update();

create or replace function public.set_admin_role_by_email(
  target_email text,
  target_role text
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_user_id uuid;
begin
  if not public.is_super_admin() then
    raise exception 'Only super_admin can update admin roles';
  end if;

  if target_role not in ('member', 'reviewer', 'editor', 'super_admin') then
    raise exception 'target_role must be member, reviewer, editor, or super_admin';
  end if;

  select id
  into target_user_id
  from auth.users
  where lower(email) = lower(target_email)
  limit 1;

  if target_user_id is null then
    raise exception 'No registered user found for email %', target_email;
  end if;

  insert into public.profiles (id, role)
  values (target_user_id, target_role)
  on conflict (id) do update
    set role = excluded.role,
        updated_at = now();
end;
$$;

drop policy if exists guides_admin_manage on public.guides;
create policy guides_admin_manage
  on public.guides for all
  to authenticated
  using (public.can_manage_site_settings())
  with check (public.can_manage_site_settings());

drop policy if exists talents_admin_manage on public.talents;
create policy talents_admin_manage
  on public.talents for all
  to authenticated
  using (public.can_manage_site_settings())
  with check (public.can_manage_site_settings());

drop policy if exists site_settings_admin_manage on public.site_settings;
drop policy if exists site_settings_super_admin_update on public.site_settings;
create policy site_settings_super_admin_update
  on public.site_settings for update
  to authenticated
  using (coalesce(public.current_profile_role() = 'super_admin', false))
  with check (coalesce(public.current_profile_role() = 'super_admin', false));
