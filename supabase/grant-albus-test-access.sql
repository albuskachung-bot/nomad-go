-- Grant full test access for albus.kachung@gmail.com.
-- Run manually in Supabase SQL Editor after confirming this is the intended project.

create extension if not exists pgcrypto;

alter table public.profiles add column if not exists account_type text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists role text not null default 'member';
alter table public.profiles add column if not exists status text not null default 'pending';
alter table public.profiles add column if not exists is_banned boolean not null default false;
alter table public.profiles add column if not exists is_featured boolean not null default false;
alter table public.profiles add column if not exists is_public boolean not null default false;
alter table public.profiles add column if not exists subscription_plan text not null default 'free';
alter table public.profiles add column if not exists plan_expires_at timestamptz;
alter table public.profiles add column if not exists direct_connect_tokens integer not null default 1;
alter table public.profiles add column if not exists sponsored_until timestamptz;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

alter table public.companies add column if not exists employer_id uuid references public.profiles(id) on delete cascade;
alter table public.companies add column if not exists name text;
alter table public.companies add column if not exists approval_status text not null default 'pending';
alter table public.companies add column if not exists subscription_plan text not null default 'free';
alter table public.companies add column if not exists plan_expires_at timestamptz;
alter table public.companies add column if not exists max_active_jobs integer not null default 1;
alter table public.companies add column if not exists unlocked_applicants_count integer not null default 0;
alter table public.companies add column if not exists free_unlock_limit integer not null default 3;
alter table public.companies add column if not exists applicant_unlock_reset_date timestamptz;
alter table public.companies add column if not exists created_at timestamptz not null default now();
alter table public.companies add column if not exists updated_at timestamptz not null default now();

create unique index if not exists companies_employer_id_key
  on public.companies(employer_id);

create table if not exists public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'recruiter',
  created_at timestamptz not null default now()
);

alter table public.company_members drop constraint if exists company_members_role_check;
alter table public.company_members add constraint company_members_role_check
  check (role in ('admin', 'recruiter'));

create unique index if not exists company_members_company_user_key
  on public.company_members(company_id, user_id);

do $$
declare
  target_email text := 'albus.kachung@gmail.com';
  target_user_id uuid;
  target_company_id uuid;
  far_future timestamptz := '2099-12-31 23:59:59+00';
begin
  select users.id
    into target_user_id
  from auth.users
  where lower(users.email) = lower(target_email)
  limit 1;

  if target_user_id is null then
    raise exception 'Auth user not found for %. Please sign up/login once first.', target_email;
  end if;

  -- Keep account_type as nomad so member/talent behavior remains available.
  -- Employer access is granted through the approved Pro company workspace below.
  insert into public.profiles (
    id,
    role,
    account_type,
    full_name,
    status,
    is_banned,
    is_featured,
    is_public,
    subscription_plan,
    plan_expires_at,
    direct_connect_tokens,
    sponsored_until,
    created_at,
    updated_at
  )
  values (
    target_user_id,
    'super_admin',
    'nomad',
    'Albus Ka Chung',
    'published',
    false,
    true,
    true,
    'vip',
    far_future,
    9999,
    far_future,
    now(),
    now()
  )
  on conflict (id) do update
    set role = 'super_admin',
        account_type = 'nomad',
        full_name = coalesce(nullif(public.profiles.full_name, ''), excluded.full_name),
        status = 'published',
        is_banned = false,
        is_featured = true,
        is_public = true,
        subscription_plan = 'vip',
        plan_expires_at = far_future,
        direct_connect_tokens = 9999,
        sponsored_until = far_future,
        updated_at = now();

  insert into public.companies (
    employer_id,
    name,
    approval_status,
    subscription_plan,
    plan_expires_at,
    max_active_jobs,
    unlocked_applicants_count,
    free_unlock_limit,
    applicant_unlock_reset_date,
    created_at,
    updated_at
  )
  values (
    target_user_id,
    'Albus Test Company',
    'approved',
    'pro',
    far_future,
    9999,
    0,
    9999,
    null,
    now(),
    now()
  )
  on conflict (employer_id) do update
    set name = coalesce(nullif(public.companies.name, ''), excluded.name),
        approval_status = 'approved',
        subscription_plan = 'pro',
        plan_expires_at = far_future,
        max_active_jobs = 9999,
        unlocked_applicants_count = 0,
        free_unlock_limit = 9999,
        applicant_unlock_reset_date = null,
        updated_at = now()
  returning id into target_company_id;

  insert into public.company_members (company_id, user_id, role)
  values (target_company_id, target_user_id, 'admin')
  on conflict (company_id, user_id) do update
    set role = 'admin';

  raise notice 'Granted test access to %, user_id %, company_id %', target_email, target_user_id, target_company_id;
end $$;

notify pgrst, 'reload schema';

-- Rollback, if needed:
-- do $$
-- declare
--   target_email text := 'albus.kachung@gmail.com';
--   target_user_id uuid;
-- begin
--   select id into target_user_id from auth.users where lower(email) = lower(target_email) limit 1;
--
--   update public.profiles
--   set role = 'member',
--       account_type = 'nomad',
--       subscription_plan = 'free',
--       plan_expires_at = null,
--       direct_connect_tokens = 1,
--       sponsored_until = null,
--       is_featured = false,
--       updated_at = now()
--   where id = target_user_id;
--
--   update public.companies
--   set subscription_plan = 'free',
--       plan_expires_at = null,
--       max_active_jobs = 1,
--       free_unlock_limit = 3,
--       approval_status = 'pending',
--       updated_at = now()
--   where employer_id = target_user_id;
-- end $$;
