-- ATS in-app messages.
-- Run after core-platform-tables.sql, company-workspaces.sql, and native-ats-applications.sql.

begin;

create extension if not exists pgcrypto;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.messages add column if not exists application_id uuid references public.applications(id) on delete cascade;
alter table public.messages add column if not exists sender_id uuid references public.profiles(id) on delete cascade;
alter table public.messages add column if not exists content text;
alter table public.messages add column if not exists is_read boolean not null default false;
alter table public.messages add column if not exists created_at timestamptz not null default now();

update public.messages
set is_read = coalesce(is_read, false),
    created_at = coalesce(created_at, now())
where is_read is null
   or created_at is null;

alter table public.messages alter column application_id set not null;
alter table public.messages alter column sender_id set not null;
alter table public.messages alter column content set not null;
alter table public.messages alter column is_read set not null;
alter table public.messages alter column created_at set not null;

create index if not exists messages_application_created_at_idx
  on public.messages (application_id, created_at asc);

create index if not exists messages_sender_created_at_idx
  on public.messages (sender_id, created_at desc);

alter table public.messages enable row level security;

revoke all on public.messages from anon;
revoke all on public.messages from authenticated;

grant select, insert on public.messages to authenticated;
grant update (is_read) on public.messages to authenticated;

drop policy if exists messages_participants_select on public.messages;
drop policy if exists messages_participants_insert on public.messages;
drop policy if exists messages_participants_update_read on public.messages;

create policy messages_participants_select
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1
      from public.applications
      join public.jobs on jobs.id = applications.job_id
      where applications.id = messages.application_id
        and (
          applications.user_id = auth.uid()
          or public.is_company_member(jobs.company_id)
          or exists (
            select 1
            from public.companies
            where companies.employer_id = auth.uid()
              and jobs.employer_id = auth.uid()
          )
        )
    )
  );

create policy messages_participants_insert
  on public.messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and length(trim(content)) > 0
    and exists (
      select 1
      from public.applications
      join public.jobs on jobs.id = applications.job_id
      where applications.id = messages.application_id
        and (
          applications.user_id = auth.uid()
          or public.is_company_member(jobs.company_id)
          or exists (
            select 1
            from public.companies
            where companies.employer_id = auth.uid()
              and jobs.employer_id = auth.uid()
          )
        )
    )
  );

create policy messages_participants_update_read
  on public.messages for update
  to authenticated
  using (
    sender_id <> auth.uid()
    and exists (
      select 1
      from public.applications
      join public.jobs on jobs.id = applications.job_id
      where applications.id = messages.application_id
        and (
          applications.user_id = auth.uid()
          or public.is_company_member(jobs.company_id)
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
    sender_id <> auth.uid()
    and is_read = true
    and exists (
      select 1
      from public.applications
      join public.jobs on jobs.id = applications.job_id
      where applications.id = messages.application_id
        and (
          applications.user_id = auth.uid()
          or public.is_company_member(jobs.company_id)
          or exists (
            select 1
            from public.companies
            where companies.employer_id = auth.uid()
              and jobs.employer_id = auth.uid()
          )
        )
    )
  );

commit;
