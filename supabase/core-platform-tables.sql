-- Core platform tables required before running company-workspaces.sql.
-- Run this in Supabase SQL Editor if companies/jobs/applications do not exist yet.

begin;

create extension if not exists pgcrypto;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  website text,
  description text,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.companies add column if not exists employer_id uuid references public.profiles(id) on delete cascade;
alter table public.companies add column if not exists name text;
alter table public.companies add column if not exists website text;
alter table public.companies add column if not exists description text;
alter table public.companies add column if not exists logo_url text;
alter table public.companies add column if not exists created_at timestamptz not null default now();
alter table public.companies add column if not exists updated_at timestamptz not null default now();

update public.companies
set name = '未命名公司'
where name is null;

alter table public.companies alter column name set not null;

create unique index if not exists companies_employer_id_key
  on public.companies (employer_id);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid references public.profiles(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  title text not null,
  company text not null default '未命名公司',
  location text not null,
  work_type text,
  job_type text not null default '未指定',
  salary_range text,
  tags text[] not null default '{}',
  description text not null default '',
  apply_url text,
  is_featured boolean not null default false,
  status text not null default 'pending',
  rejection_reason text,
  created_at timestamptz not null default now()
);

alter table public.jobs add column if not exists employer_id uuid references public.profiles(id) on delete set null;
alter table public.jobs add column if not exists company_id uuid references public.companies(id) on delete set null;
alter table public.jobs add column if not exists title text;
alter table public.jobs add column if not exists company text not null default '未命名公司';
alter table public.jobs add column if not exists location text;
alter table public.jobs add column if not exists work_type text;
alter table public.jobs add column if not exists job_type text not null default '未指定';
alter table public.jobs add column if not exists salary_range text;
alter table public.jobs add column if not exists tags text[] not null default '{}';
alter table public.jobs add column if not exists description text not null default '';
alter table public.jobs add column if not exists apply_url text;
alter table public.jobs add column if not exists is_featured boolean not null default false;
alter table public.jobs add column if not exists status text not null default 'pending';
alter table public.jobs add column if not exists rejection_reason text;
alter table public.jobs add column if not exists created_at timestamptz not null default now();

update public.jobs
set title = coalesce(title, '未命名職缺'),
    company = coalesce(company, '未命名公司'),
    location = coalesce(location, 'Remote'),
    work_type = coalesce(work_type, job_type, '未指定'),
    job_type = coalesce(job_type, work_type, '未指定'),
    tags = coalesce(tags, '{}'),
    description = coalesce(description, ''),
    status = coalesce(status, 'pending');

alter table public.jobs alter column title set not null;
alter table public.jobs alter column company set not null;
alter table public.jobs alter column location set not null;
alter table public.jobs alter column job_type set not null;
alter table public.jobs alter column tags set not null;
alter table public.jobs alter column description set not null;
alter table public.jobs alter column status set not null;

alter table public.jobs drop constraint if exists jobs_status_check;
alter table public.jobs add constraint jobs_status_check
  check (status in ('pending', 'published', 'rejected'));

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending',
  resume_url text not null default 'legacy/no-resume.pdf',
  cover_letter text,
  applied_at timestamptz not null default now()
);

alter table public.applications add column if not exists job_id uuid references public.jobs(id) on delete cascade;
alter table public.applications add column if not exists user_id uuid references public.profiles(id) on delete cascade;
alter table public.applications add column if not exists status text not null default 'pending';
alter table public.applications add column if not exists resume_url text not null default 'legacy/no-resume.pdf';
alter table public.applications add column if not exists cover_letter text;
alter table public.applications add column if not exists applied_at timestamptz not null default now();

update public.applications
set status = coalesce(status, 'pending'),
    resume_url = coalesce(resume_url, 'legacy/no-resume.pdf');

alter table public.applications alter column job_id set not null;
alter table public.applications alter column user_id set not null;
alter table public.applications alter column status set not null;
alter table public.applications alter column resume_url set not null;
alter table public.applications alter column applied_at set not null;

alter table public.applications drop constraint if exists applications_status_check;
alter table public.applications add constraint applications_status_check
  check (status in ('pending', 'reviewed', 'interview', 'rejected', 'hired'));

create unique index if not exists applications_user_id_job_id_key
  on public.applications (user_id, job_id);

create index if not exists companies_employer_id_idx
  on public.companies (employer_id);

create index if not exists jobs_employer_id_created_at_idx
  on public.jobs (employer_id, created_at desc);

create index if not exists jobs_company_id_created_at_idx
  on public.jobs (company_id, created_at desc);

create index if not exists jobs_status_created_at_idx
  on public.jobs (status, created_at desc);

create index if not exists applications_job_id_status_idx
  on public.applications (job_id, status);

create index if not exists applications_user_id_applied_at_idx
  on public.applications (user_id, applied_at desc);

create index if not exists applications_resume_url_idx
  on public.applications (resume_url);

alter table public.companies enable row level security;
alter table public.jobs enable row level security;
alter table public.applications enable row level security;

commit;
