-- Talent subscription plans and Super Admin override controls.
-- Run after profiles and admin-rbac-roles.sql.

begin;

alter table public.profiles
  add column if not exists subscription_plan text not null default 'free',
  add column if not exists plan_expires_at timestamptz;

update public.profiles
set subscription_plan = 'free'
where subscription_plan is null
   or subscription_plan not in ('free', 'pro', 'vip');

update public.profiles
set subscription_plan = 'vip',
    plan_expires_at = sponsored_until
where sponsored_until is not null
  and sponsored_until > now()
  and subscription_plan = 'free';

alter table public.profiles
  drop constraint if exists profiles_subscription_plan_check;

alter table public.profiles
  add constraint profiles_subscription_plan_check
  check (subscription_plan in ('free', 'pro', 'vip'));

create index if not exists profiles_subscription_plan_idx
  on public.profiles (subscription_plan);

create index if not exists profiles_subscription_plan_created_at_idx
  on public.profiles (subscription_plan, created_at desc);

create or replace function public.is_profile_subscription_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    auth.uid() is not null
    and exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'super_admin'
        and coalesce(profiles.is_banned, false) = false
    ),
    false
  )
$$;

create or replace function public.guard_profile_subscription_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') = 'service_role'
    or public.is_profile_subscription_super_admin()
  then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.subscription_plan is distinct from 'free'
      or new.plan_expires_at is not null
    then
      raise exception 'Only super_admin can assign profile subscription fields';
    end if;

    return new;
  end if;

  if new.subscription_plan is distinct from old.subscription_plan
    or new.plan_expires_at is distinct from old.plan_expires_at
  then
    raise exception 'Only super_admin can update profile subscription fields';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_profile_subscription_fields on public.profiles;
create trigger guard_profile_subscription_fields
  before insert or update of subscription_plan, plan_expires_at on public.profiles
  for each row
  execute function public.guard_profile_subscription_fields();

alter table public.profiles enable row level security;

grant select on public.profiles to authenticated;
grant update (subscription_plan, plan_expires_at) on public.profiles to authenticated;
grant execute on function public.is_profile_subscription_super_admin() to authenticated;

-- RLS is row-level, while the trigger above enforces the subscription columns.
-- These policies keep normal users scoped to their own row and give Super Admins
-- the rows required for the plan override console.
drop policy if exists profiles_subscription_select_own on public.profiles;
create policy profiles_subscription_select_own
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists profiles_subscription_super_admin_select_all on public.profiles;
create policy profiles_subscription_super_admin_select_all
  on public.profiles for select
  to authenticated
  using (public.is_profile_subscription_super_admin());

drop policy if exists profiles_subscription_super_admin_update_all on public.profiles;
create policy profiles_subscription_super_admin_update_all
  on public.profiles for update
  to authenticated
  using (public.is_profile_subscription_super_admin())
  with check (public.is_profile_subscription_super_admin());

commit;
