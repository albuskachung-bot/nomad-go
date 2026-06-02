-- Job screening questions and asynchronous interview answers.
-- Run after core-platform-tables.sql, company-workspaces.sql, and native-ats-applications.sql.

begin;

alter table public.jobs
  add column if not exists screening_questions jsonb not null default '[]'::jsonb;

alter table public.applications
  add column if not exists screening_answers jsonb not null default '[]'::jsonb;

update public.jobs
set screening_questions = '[]'::jsonb
where screening_questions is null;

update public.applications
set screening_answers = '[]'::jsonb
where screening_answers is null;

alter table public.jobs
  alter column screening_questions set default '[]'::jsonb,
  alter column screening_questions set not null;

alter table public.applications
  alter column screening_answers set default '[]'::jsonb,
  alter column screening_answers set not null;

alter table public.jobs
  drop constraint if exists jobs_screening_questions_is_array;

alter table public.jobs
  add constraint jobs_screening_questions_is_array
  check (jsonb_typeof(screening_questions) = 'array');

alter table public.applications
  drop constraint if exists applications_screening_answers_is_array;

alter table public.applications
  add constraint applications_screening_answers_is_array
  check (jsonb_typeof(screening_answers) = 'array');

grant select (screening_questions) on public.jobs to anon, authenticated;
grant insert (screening_questions) on public.jobs to authenticated;
grant update (screening_questions) on public.jobs to authenticated;
grant select (screening_answers) on public.applications to authenticated;
grant insert (screening_answers) on public.applications to authenticated;

drop function if exists public.get_company_applications_with_notes(uuid);

create function public.get_company_applications_with_notes(target_company_id uuid)
returns table (
  id uuid,
  user_id uuid,
  job_id uuid,
  status text,
  resume_url text,
  cover_letter text,
  screening_answers jsonb,
  internal_notes text,
  applicant_email text,
  applied_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    applications.id,
    applications.user_id,
    applications.job_id,
    applications.status,
    applications.resume_url,
    applications.cover_letter,
    applications.screening_answers,
    applications.internal_notes,
    applicant_auth.email,
    applications.applied_at
  from public.applications
  join public.jobs on jobs.id = applications.job_id
  left join auth.users applicant_auth on applicant_auth.id = applications.user_id
  where (
      jobs.company_id = target_company_id
      and public.is_company_member(target_company_id)
    )
    or (
      jobs.company_id is null
      and exists (
        select 1
        from public.companies
        where companies.id = target_company_id
          and companies.employer_id = auth.uid()
          and jobs.employer_id = auth.uid()
      )
    )
  order by applications.applied_at desc
$$;

grant execute on function public.get_company_applications_with_notes(uuid) to authenticated;

comment on column public.jobs.screening_questions is
  'JSON array of employer-defined screening questions shown during one-click apply.';

comment on column public.applications.screening_answers is
  'JSON array of {question, answer} objects submitted by applicants for job screening questions.';

commit;
