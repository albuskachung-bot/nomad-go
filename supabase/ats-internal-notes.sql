-- ATS internal notes and employer-only review updates.
-- Run after company-workspaces.sql and native-ats-applications.sql.

begin;

alter table public.applications add column if not exists internal_notes text;

-- RLS is row-level, not column-level. To keep applicants from reading
-- internal_notes on their own rows, expose direct table SELECT only for
-- applicant-safe columns and return internal_notes through a guarded RPC.
revoke select on public.applications from anon;
revoke select on public.applications from authenticated;
revoke update on public.applications from anon;
revoke update on public.applications from authenticated;

grant select (
  id,
  user_id,
  job_id,
  status,
  resume_url,
  cover_letter,
  applied_at
) on public.applications to authenticated;

grant insert (
  user_id,
  job_id,
  status,
  resume_url,
  cover_letter,
  applied_at
) on public.applications to authenticated;

grant update (
  status,
  internal_notes
) on public.applications to authenticated;

drop policy if exists applications_admin_manage on public.applications;
drop policy if exists applications_employer_update_status on public.applications;
drop policy if exists applications_company_member_update_status on public.applications;
drop policy if exists applications_company_member_update_review on public.applications;

create policy applications_company_member_update_review
  on public.applications for update
  to authenticated
  using (
    exists (
      select 1
      from public.jobs
      where jobs.id = applications.job_id
        and (
          public.is_company_member(jobs.company_id)
          or exists (
            select 1
            from public.companies
            where companies.employer_id = auth.uid()
              and jobs.employer_id = auth.uid()
          )
        )
    )
  )
  with check (
    status in ('pending', 'reviewed', 'interview', 'rejected', 'hired')
    and exists (
      select 1
      from public.jobs
      where jobs.id = applications.job_id
        and (
          public.is_company_member(jobs.company_id)
          or exists (
            select 1
            from public.companies
            where companies.employer_id = auth.uid()
              and jobs.employer_id = auth.uid()
          )
        )
    )
  );

create or replace function public.get_company_applications_with_notes(target_company_id uuid)
returns table (
  id uuid,
  user_id uuid,
  job_id uuid,
  status text,
  resume_url text,
  cover_letter text,
  internal_notes text,
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
    applications.internal_notes,
    applications.applied_at
  from public.applications
  join public.jobs on jobs.id = applications.job_id
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

commit;
