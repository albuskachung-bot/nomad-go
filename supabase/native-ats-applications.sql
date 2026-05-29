-- Native one-click apply and ATS support.
-- Run after core-platform-tables.sql and company-workspaces.sql.

begin;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'resumes',
  'resumes',
  false,
  5242880,
  array['application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = 5242880,
    allowed_mime_types = array['application/pdf'];

alter table public.applications add column if not exists resume_url text;
alter table public.applications add column if not exists cover_letter text;

update public.applications
set resume_url = 'legacy/no-resume.pdf'
where resume_url is null;

alter table public.applications alter column resume_url set not null;

alter table public.applications drop constraint if exists applications_status_check;
alter table public.applications add constraint applications_status_check
  check (status in ('pending', 'reviewed', 'interview', 'rejected', 'hired'));

create index if not exists applications_resume_url_idx
  on public.applications (resume_url);

create index if not exists applications_job_id_applied_at_idx
  on public.applications (job_id, applied_at desc);

drop policy if exists applications_owner_insert_pending on public.applications;
create policy applications_owner_insert_pending
  on public.applications for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and status = 'pending'
    and resume_url is not null
    and resume_url like auth.uid()::text || '/%'
    and exists (
      select 1
      from public.jobs
      where jobs.id = applications.job_id
        and jobs.status = 'published'
    )
  );

drop policy if exists applications_employer_update_status on public.applications;
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
    status in ('pending', 'reviewed', 'interview', 'rejected', 'hired')
    and exists (
      select 1
      from public.jobs
      where jobs.id = applications.job_id
        and jobs.employer_id = auth.uid()
    )
  );

drop policy if exists applications_company_member_update_status on public.applications;
create policy applications_company_member_update_status
  on public.applications for update
  to authenticated
  using (
    exists (
      select 1
      from public.jobs
      where jobs.id = applications.job_id
        and public.is_company_member(jobs.company_id)
    )
  )
  with check (
    status in ('pending', 'reviewed', 'interview', 'rejected', 'hired')
    and exists (
      select 1
      from public.jobs
      where jobs.id = applications.job_id
        and public.is_company_member(jobs.company_id)
    )
  );

drop policy if exists resumes_insert_own_pdf on storage.objects;
drop policy if exists resumes_select_owner_or_company_member on storage.objects;

create policy resumes_insert_own_pdf
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = auth.uid()::text
    and lower(right(name, 4)) = '.pdf'
  );

create policy resumes_select_owner_or_company_member
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'resumes'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1
        from public.applications
        join public.jobs on jobs.id = applications.job_id
        where applications.resume_url = storage.objects.name
          and (
            applications.user_id = auth.uid()
            or jobs.employer_id = auth.uid()
            or public.is_company_member(jobs.company_id)
          )
      )
    )
  );

commit;
