-- Company subscription plans and Super Admin override controls.
-- Run after core company tables, profiles, admin-rbac-roles.sql, and company-workspaces.sql.

begin;

alter table public.companies
  add column if not exists subscription_plan text not null default 'free',
  add column if not exists plan_expires_at timestamptz;

update public.companies
set subscription_plan = 'free'
where subscription_plan is null
   or subscription_plan not in ('free', 'pro', 'boost');

alter table public.companies
  drop constraint if exists companies_subscription_plan_check;

alter table public.companies
  add constraint companies_subscription_plan_check
  check (subscription_plan in ('free', 'pro', 'boost'));

create index if not exists companies_subscription_plan_idx
  on public.companies (subscription_plan);

create or replace function public.is_subscription_super_admin()
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

create or replace function public.guard_company_subscription_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') = 'service_role'
    or public.is_subscription_super_admin()
  then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.subscription_plan is distinct from 'free'
      or new.plan_expires_at is not null
    then
      raise exception 'Only super_admin can assign company subscription fields';
    end if;

    return new;
  end if;

  if new.subscription_plan is distinct from old.subscription_plan
    or new.plan_expires_at is distinct from old.plan_expires_at
  then
    raise exception 'Only super_admin can update company subscription fields';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_company_subscription_fields on public.companies;
create trigger guard_company_subscription_fields
  before insert or update of subscription_plan, plan_expires_at on public.companies
  for each row
  execute function public.guard_company_subscription_fields();

alter table public.companies enable row level security;

grant select on public.companies to anon, authenticated;
grant update (subscription_plan, plan_expires_at) on public.companies to authenticated;
grant execute on function public.is_subscription_super_admin() to authenticated;

-- Keep existing public directory and workspace policies intact. These policies add
-- the subscription-specific guarantees without weakening company workspace RLS.
drop policy if exists companies_subscription_company_manager_select on public.companies;
create policy companies_subscription_company_manager_select
  on public.companies for select
  to authenticated
  using (public.is_company_member(id));

drop policy if exists companies_subscription_super_admin_select_all on public.companies;
create policy companies_subscription_super_admin_select_all
  on public.companies for select
  to authenticated
  using (public.is_subscription_super_admin());

drop policy if exists companies_subscription_super_admin_update_all on public.companies;
create policy companies_subscription_super_admin_update_all
  on public.companies for update
  to authenticated
  using (public.is_subscription_super_admin())
  with check (public.is_subscription_super_admin());

commit;
