-- Employer Console schema patch
-- Run this in the Supabase SQL Editor when Employer Dashboard pages report
-- missing tables or columns such as: column jobs.employer_id does not exist.

begin;

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'member',
  account_type text,
  full_name text,
  title text,
  avatar_url text,
  bio text,
  skills text[] not null default '{}',
  location text,
  status text not null default 'pending',
  is_featured boolean not null default false,
  is_banned boolean not null default false,
  timezone text,
  languages text[] not null default '{}',
  work_type text[] not null default '{}',
  portfolio_url text,
  social_urls jsonb not null default '{}'::jsonb,
  work_experience jsonb not null default '[]'::jsonb,
  education jsonb not null default '[]'::jsonb,
  sponsored_until timestamptz,
  stripe_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists role text not null default 'member';
alter table public.profiles add column if not exists account_type text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists title text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists skills text[] not null default '{}';
alter table public.profiles add column if not exists location text;
alter table public.profiles add column if not exists status text not null default 'pending';
alter table public.profiles add column if not exists is_featured boolean not null default false;
alter table public.profiles add column if not exists is_banned boolean not null default false;
alter table public.profiles add column if not exists timezone text;
alter table public.profiles add column if not exists languages text[] not null default '{}';
alter table public.profiles add column if not exists work_type text[] not null default '{}';
alter table public.profiles add column if not exists portfolio_url text;
alter table public.profiles add column if not exists social_urls jsonb not null default '{}'::jsonb;
alter table public.profiles add column if not exists work_experience jsonb not null default '[]'::jsonb;
alter table public.profiles add column if not exists education jsonb not null default '[]'::jsonb;
alter table public.profiles add column if not exists sponsored_until timestamptz;
alter table public.profiles add column if not exists stripe_customer_id text;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('member', 'super_admin', 'editor', 'reviewer'));

alter table public.profiles drop constraint if exists profiles_account_type_check;
alter table public.profiles add constraint profiles_account_type_check
  check (account_type in ('employer', 'nomad'));

alter table public.profiles drop constraint if exists profiles_status_check;
alter table public.profiles add constraint profiles_status_check
  check (status in ('pending', 'published', 'rejected'));

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null,
  name text not null,
  logo_url text,
  website text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.companies add column if not exists employer_id uuid;
alter table public.companies add column if not exists name text;
alter table public.companies add column if not exists logo_url text;
alter table public.companies add column if not exists website text;
alter table public.companies add column if not exists description text;
alter table public.companies add column if not exists created_at timestamptz not null default now();
alter table public.companies add column if not exists updated_at timestamptz not null default now();

update public.companies
set name = '未命名公司'
where name is null;

alter table public.companies alter column name set not null;

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  company text not null,
  location text not null,
  job_type text not null,
  salary_range text,
  tags text[] not null default '{}',
  description text not null,
  apply_url text,
  is_featured boolean not null default false,
  employer_id uuid,
  company_id uuid,
  rejection_reason text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.jobs add column if not exists title text;
alter table public.jobs add column if not exists company text;
alter table public.jobs add column if not exists location text;
alter table public.jobs add column if not exists job_type text;
alter table public.jobs add column if not exists salary_range text;
alter table public.jobs add column if not exists tags text[] not null default '{}';
alter table public.jobs add column if not exists description text;
alter table public.jobs add column if not exists apply_url text;
alter table public.jobs add column if not exists is_featured boolean not null default false;
alter table public.jobs add column if not exists employer_id uuid;
alter table public.jobs add column if not exists company_id uuid;
alter table public.jobs add column if not exists rejection_reason text;
alter table public.jobs add column if not exists status text not null default 'pending';
alter table public.jobs add column if not exists created_at timestamptz not null default now();

update public.jobs
set title = coalesce(title, '未命名職缺'),
    company = coalesce(company, '未命名公司'),
    location = coalesce(location, 'Remote'),
    job_type = coalesce(job_type, '未指定'),
    description = coalesce(description, ''),
    status = coalesce(status, 'pending'),
    tags = coalesce(tags, '{}');

alter table public.jobs alter column title set not null;
alter table public.jobs alter column company set not null;
alter table public.jobs alter column location set not null;
alter table public.jobs alter column job_type set not null;
alter table public.jobs alter column description set not null;
alter table public.jobs alter column status set not null;
alter table public.jobs alter column tags set not null;

alter table public.jobs drop constraint if exists jobs_status_check;
alter table public.jobs add constraint jobs_status_check
  check (status in ('pending', 'published', 'rejected'));

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  job_id uuid not null,
  status text not null default 'pending',
  applied_at timestamptz not null default now()
);

alter table public.applications add column if not exists user_id uuid;
alter table public.applications add column if not exists job_id uuid;
alter table public.applications add column if not exists status text not null default 'pending';
alter table public.applications add column if not exists applied_at timestamptz not null default now();

update public.applications
set status = coalesce(status, 'pending');

alter table public.applications alter column status set not null;
alter table public.applications alter column applied_at set not null;

alter table public.applications drop constraint if exists applications_status_check;
alter table public.applications add constraint applications_status_check
  check (status in ('pending', 'reviewed', 'interview'));

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'companies_employer_id_fkey'
      and conrelid = 'public.companies'::regclass
  ) then
    alter table public.companies
      add constraint companies_employer_id_fkey
      foreign key (employer_id) references public.profiles(id)
      on delete cascade
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'jobs_employer_id_fkey'
      and conrelid = 'public.jobs'::regclass
  ) then
    alter table public.jobs
      add constraint jobs_employer_id_fkey
      foreign key (employer_id) references public.profiles(id)
      on delete set null
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'jobs_company_id_fkey'
      and conrelid = 'public.jobs'::regclass
  ) then
    alter table public.jobs
      add constraint jobs_company_id_fkey
      foreign key (company_id) references public.companies(id)
      on delete set null
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'applications_user_id_fkey'
      and conrelid = 'public.applications'::regclass
  ) then
    alter table public.applications
      add constraint applications_user_id_fkey
      foreign key (user_id) references public.profiles(id)
      on delete cascade
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'applications_job_id_fkey'
      and conrelid = 'public.applications'::regclass
  ) then
    alter table public.applications
      add constraint applications_job_id_fkey
      foreign key (job_id) references public.jobs(id)
      on delete cascade
      not valid;
  end if;
end $$;

create unique index if not exists companies_employer_id_key
  on public.companies (employer_id);

create index if not exists jobs_employer_id_created_at_idx
  on public.jobs (employer_id, created_at desc);

create index if not exists jobs_company_id_idx
  on public.jobs (company_id);

create index if not exists jobs_status_created_at_idx
  on public.jobs (status, created_at desc);

create index if not exists applications_job_id_status_idx
  on public.applications (job_id, status);

create index if not exists applications_user_id_applied_at_idx
  on public.applications (user_id, applied_at desc);

create unique index if not exists applications_user_id_job_id_key
  on public.applications (user_id, job_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_companies_updated_at on public.companies;
create trigger set_companies_updated_at
  before update on public.companies
  for each row
  execute function public.set_updated_at();

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
  select coalesce(public.current_profile_role() in ('super_admin', 'editor', 'reviewer'), false)
$$;

alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.jobs enable row level security;
alter table public.applications enable row level security;

drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_employer_read_applicants on public.profiles;
drop policy if exists profiles_admin_read on public.profiles;
drop policy if exists profiles_admin_update on public.profiles;

create policy profiles_select_own
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy profiles_update_own
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy profiles_employer_read_applicants
  on public.profiles for select
  to authenticated
  using (
    exists (
      select 1
      from public.applications
      join public.jobs on jobs.id = applications.job_id
      where applications.user_id = profiles.id
        and jobs.employer_id = auth.uid()
    )
  );

create policy profiles_admin_read
  on public.profiles for select
  to authenticated
  using (public.is_admin_role());

create policy profiles_admin_update
  on public.profiles for update
  to authenticated
  using (public.is_admin_role())
  with check (public.is_admin_role());

drop policy if exists companies_public_read on public.companies;
drop policy if exists companies_employer_manage_own on public.companies;
drop policy if exists companies_admin_manage on public.companies;

create policy companies_public_read
  on public.companies for select
  to anon, authenticated
  using (true);

create policy companies_employer_manage_own
  on public.companies for all
  to authenticated
  using (auth.uid() = employer_id)
  with check (
    auth.uid() = employer_id
    and exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.is_banned = false
    )
  );

create policy companies_admin_manage
  on public.companies for all
  to authenticated
  using (public.is_admin_role())
  with check (public.is_admin_role());

drop policy if exists jobs_public_read on public.jobs;
drop policy if exists jobs_employer_read_own on public.jobs;
drop policy if exists jobs_employer_insert_own on public.jobs;
drop policy if exists jobs_employer_update_own_drafts on public.jobs;
drop policy if exists jobs_employer_update_own_pending on public.jobs;
drop policy if exists jobs_admin_manage on public.jobs;

create policy jobs_public_read
  on public.jobs for select
  to anon, authenticated
  using (status = 'published');

create policy jobs_employer_read_own
  on public.jobs for select
  to authenticated
  using (auth.uid() = employer_id);

create policy jobs_employer_insert_own
  on public.jobs for insert
  to authenticated
  with check (
    auth.uid() = employer_id
    and status = 'pending'
    and exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.is_banned = false
    )
  );

create policy jobs_employer_update_own_pending
  on public.jobs for update
  to authenticated
  using (auth.uid() = employer_id and status <> 'published')
  with check (auth.uid() = employer_id and status = 'pending');

create policy jobs_admin_manage
  on public.jobs for all
  to authenticated
  using (public.is_admin_role())
  with check (public.is_admin_role());

drop policy if exists applications_owner_read on public.applications;
drop policy if exists applications_owner_insert_pending on public.applications;
drop policy if exists applications_employer_read on public.applications;
drop policy if exists applications_employer_update_status on public.applications;
drop policy if exists applications_admin_manage on public.applications;

create policy applications_owner_read
  on public.applications for select
  to authenticated
  using (auth.uid() = user_id);

create policy applications_owner_insert_pending
  on public.applications for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and status = 'pending'
    and exists (
      select 1
      from public.jobs
      where jobs.id = applications.job_id
        and jobs.status = 'published'
    )
  );

create policy applications_employer_read
  on public.applications for select
  to authenticated
  using (
    exists (
      select 1
      from public.jobs
      where jobs.id = applications.job_id
        and jobs.employer_id = auth.uid()
    )
  );

create policy applications_employer_update_status
  on public.applications for update
  to authenticated
  using (
    exists (
      select 1
      from public.jobs
      where jobs.id = applications.job_id
        and jobs.employer_id = auth.uid()
    )
  )
  with check (
    status in ('pending', 'reviewed', 'interview')
    and exists (
      select 1
      from public.jobs
      where jobs.id = applications.job_id
        and jobs.employer_id = auth.uid()
    )
  );

create policy applications_admin_manage
  on public.applications for all
  to authenticated
  using (public.is_admin_role())
  with check (public.is_admin_role());

commit;
