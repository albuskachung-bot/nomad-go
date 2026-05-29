-- Structured job posting fields for employer job form.
-- Run this before publishing jobs with the new /dashboard/employer/jobs form.

begin;

alter table public.jobs add column if not exists category text;
alter table public.jobs add column if not exists experience_level text;
alter table public.jobs add column if not exists employment_type text;
alter table public.jobs add column if not exists responsibilities text;
alter table public.jobs add column if not exists requirements text;
alter table public.jobs add column if not exists nice_to_haves text;
alter table public.jobs add column if not exists benefits text;

update public.jobs
set category = coalesce(category, '其他'),
    experience_level = coalesce(experience_level, '中階 (Mid-Level)'),
    employment_type = coalesce(employment_type, job_type, '全職 (Full-time)'),
    responsibilities = coalesce(responsibilities, description),
    requirements = coalesce(requirements, ''),
    nice_to_haves = coalesce(nice_to_haves, ''),
    benefits = coalesce(benefits, '')
where category is null
   or experience_level is null
   or employment_type is null
   or responsibilities is null
   or requirements is null
   or nice_to_haves is null
   or benefits is null;

alter table public.jobs alter column category set default '其他';
alter table public.jobs alter column experience_level set default '中階 (Mid-Level)';
alter table public.jobs alter column employment_type set default '全職 (Full-time)';
alter table public.jobs alter column responsibilities set default '';
alter table public.jobs alter column requirements set default '';
alter table public.jobs alter column nice_to_haves set default '';
alter table public.jobs alter column benefits set default '';

alter table public.jobs drop constraint if exists jobs_category_check;
alter table public.jobs add constraint jobs_category_check
  check (category in ('軟體工程', '行銷企劃', '產品設計', '營運管理', '客戶服務', '其他'));

alter table public.jobs drop constraint if exists jobs_experience_level_check;
alter table public.jobs add constraint jobs_experience_level_check
  check (experience_level in ('實習 (Intern)', '初階 (Junior)', '中階 (Mid-Level)', '資深 (Senior)', '主管 (Lead/Manager)'));

alter table public.jobs drop constraint if exists jobs_employment_type_check;
alter table public.jobs add constraint jobs_employment_type_check
  check (employment_type in ('全職 (Full-time)', '兼職 (Part-time)', '約聘 (Contract)', '接案 (Freelance)'));

create index if not exists jobs_category_status_created_at_idx
  on public.jobs (category, status, created_at desc);

create index if not exists jobs_employment_type_status_created_at_idx
  on public.jobs (employment_type, status, created_at desc);

commit;
