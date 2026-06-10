-- Talent AI usage quota for Freemium plans.
-- Run after profiles and profile-subscription-plans.sql.

begin;

alter table public.profiles
  add column if not exists free_ai_usage_count integer not null default 0,
  add column if not exists quota_reset_date timestamptz default (date_trunc('month', now()) + interval '1 month');

update public.profiles
set free_ai_usage_count = 0
where free_ai_usage_count is null
   or free_ai_usage_count < 0;

update public.profiles
set quota_reset_date = date_trunc('month', now()) + interval '1 month'
where quota_reset_date is null;

alter table public.profiles
  drop constraint if exists profiles_free_ai_usage_count_non_negative;

alter table public.profiles
  add constraint profiles_free_ai_usage_count_non_negative
  check (free_ai_usage_count >= 0);

create index if not exists profiles_ai_quota_reset_date_idx
  on public.profiles (quota_reset_date);

create or replace function public.guard_profile_ai_usage_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') = 'service_role'
    or public.is_profile_subscription_super_admin()
    or current_setting('app.ai_usage_quota_update', true) = 'on'
  then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.free_ai_usage_count := 0;
    new.quota_reset_date := coalesce(
      new.quota_reset_date,
      date_trunc('month', now()) + interval '1 month'
    );

    return new;
  end if;

  if new.free_ai_usage_count is distinct from old.free_ai_usage_count
    or new.quota_reset_date is distinct from old.quota_reset_date
  then
    raise exception 'AI usage quota fields can only be changed by quota RPC or super_admin';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_profile_ai_usage_fields on public.profiles;
create trigger guard_profile_ai_usage_fields
  before insert or update of free_ai_usage_count, quota_reset_date on public.profiles
  for each row
  execute function public.guard_profile_ai_usage_fields();

create or replace function public.consume_ai_usage_quota()
returns table (
  allowed boolean,
  reason text,
  usage_count integer,
  free_limit integer,
  reset_date timestamptz,
  subscription_plan text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_plan text;
  current_plan_expires_at timestamptz;
  current_count integer;
  current_reset_date timestamptz;
  now_value timestamptz := now();
  monthly_free_limit integer := 3;
begin
  if current_user_id is null then
    return query
      select false, 'not_authenticated', 0, monthly_free_limit, null::timestamptz, 'free';
    return;
  end if;

  select
    coalesce(profiles.subscription_plan, 'free'),
    profiles.plan_expires_at,
    coalesce(profiles.free_ai_usage_count, 0),
    profiles.quota_reset_date
  into current_plan, current_plan_expires_at, current_count, current_reset_date
  from public.profiles
  where profiles.id = current_user_id
  for update;

  if not found then
    return query
      select false, 'profile_not_found', 0, monthly_free_limit, null::timestamptz, 'free';
    return;
  end if;

  if current_plan in ('pro', 'vip')
    and (current_plan_expires_at is null or current_plan_expires_at > now_value)
  then
    return query
      select true, null::text, current_count, monthly_free_limit, current_reset_date, current_plan;
    return;
  end if;

  current_plan := 'free';

  if current_reset_date is null or current_reset_date <= now_value then
    current_count := 0;
    current_reset_date := date_trunc('month', now_value) + interval '1 month';
  end if;

  if current_count >= monthly_free_limit then
    return query
      select false, 'quota_exceeded', current_count, monthly_free_limit, current_reset_date, 'free';
    return;
  end if;

  current_count := current_count + 1;

  perform set_config('app.ai_usage_quota_update', 'on', true);

  update public.profiles
  set
    free_ai_usage_count = current_count,
    quota_reset_date = current_reset_date
  where profiles.id = current_user_id;

  return query
    select true, null::text, current_count, monthly_free_limit, current_reset_date, 'free';
end;
$$;

revoke all on function public.consume_ai_usage_quota() from public;
grant execute on function public.consume_ai_usage_quota() to authenticated;

grant select on public.profiles to authenticated;
grant update (free_ai_usage_count, quota_reset_date) on public.profiles to authenticated;

commit;
