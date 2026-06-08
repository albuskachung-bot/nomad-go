-- Employer jobs management fields
-- Adds status and dashboard metrics required by the employer job console.

alter table public.jobs
  add column if not exists status text not null default 'draft',
  add column if not exists views_count integer not null default 0,
  add column if not exists applicants_count integer not null default 0;

alter table public.jobs
  alter column status set default 'draft',
  alter column views_count set default 0,
  alter column applicants_count set default 0;

update public.jobs
set status = 'draft'
where status is null
   or status not in ('draft', 'pending', 'published', 'closed');

update public.jobs
set views_count = 0
where views_count is null;

update public.jobs
set applicants_count = 0
where applicants_count is null;

alter table public.jobs
  alter column status set not null,
  alter column views_count set not null,
  alter column applicants_count set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'jobs_status_check'
      and conrelid = 'public.jobs'::regclass
  ) then
    alter table public.jobs
      add constraint jobs_status_check
      check (status in ('draft', 'pending', 'published', 'closed'));
  end if;
end $$;

create index if not exists jobs_status_created_at_idx
  on public.jobs (status, created_at desc);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'jobs'
      and column_name = 'company_id'
  ) then
    execute
      'create index if not exists jobs_company_status_created_at_idx on public.jobs (company_id, status, created_at desc)';
  end if;
end $$;
