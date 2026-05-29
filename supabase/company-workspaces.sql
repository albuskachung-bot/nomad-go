-- B2B company workspace collaboration and invite system.
-- Run this file in the Supabase SQL Editor before using /dashboard/employer/team.

begin;

create extension if not exists pgcrypto;

alter table public.jobs add column if not exists company_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'jobs_company_id_fkey'
      and conrelid = 'public.jobs'::regclass
  ) then
    alter table public.jobs
      add constraint jobs_company_id_fkey
      foreign key (company_id) references public.companies(id)
      on delete set null
      not valid;
  end if;
end $$;

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
  on public.company_members (company_id, user_id);

create index if not exists company_members_user_id_idx
  on public.company_members (user_id);

create index if not exists company_members_company_role_idx
  on public.company_members (company_id, role);

create table if not exists public.company_invites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  token text not null default encode(gen_random_bytes(32), 'hex'),
  email text,
  status text not null default 'pending',
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_by uuid references public.profiles(id) on delete set null,
  accepted_by uuid references public.profiles(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.company_invites drop constraint if exists company_invites_status_check;
alter table public.company_invites add constraint company_invites_status_check
  check (status in ('pending', 'accepted'));

create unique index if not exists company_invites_token_key
  on public.company_invites (token);

create index if not exists company_invites_company_status_idx
  on public.company_invites (company_id, status, expires_at desc);

create index if not exists company_invites_email_idx
  on public.company_invites (lower(email))
  where email is not null;

create index if not exists jobs_company_id_created_at_idx
  on public.jobs (company_id, created_at desc);

update public.jobs
set company_id = companies.id
from public.companies
where public.jobs.company_id is null
  and public.jobs.employer_id = companies.employer_id;

insert into public.company_members (company_id, user_id, role)
select id, employer_id, 'admin'
from public.companies
where employer_id is not null
on conflict (company_id, user_id) do update
  set role = 'admin';

create or replace function public.ensure_company_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.employer_id is not null then
    insert into public.company_members (company_id, user_id, role)
    values (new.id, new.employer_id, 'admin')
    on conflict (company_id, user_id) do update
      set role = 'admin';
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_company_owner_membership on public.companies;
create trigger ensure_company_owner_membership
  after insert or update of employer_id on public.companies
  for each row
  execute function public.ensure_company_owner_membership();

create or replace function public.is_company_member(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    auth.uid() is not null
    and exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.is_banned = false
    )
    and (
      exists (
        select 1
        from public.companies
        where companies.id = target_company_id
          and companies.employer_id = auth.uid()
      )
      or exists (
        select 1
        from public.company_members
        where company_members.company_id = target_company_id
          and company_members.user_id = auth.uid()
      )
    ),
    false
  )
$$;

create or replace function public.is_company_admin(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    auth.uid() is not null
    and exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.is_banned = false
    )
    and (
      exists (
        select 1
        from public.companies
        where companies.id = target_company_id
          and companies.employer_id = auth.uid()
      )
      or exists (
        select 1
        from public.company_members
        where company_members.company_id = target_company_id
          and company_members.user_id = auth.uid()
          and company_members.role = 'admin'
      )
    ),
    false
  )
$$;

create or replace function public.guard_last_company_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_count integer;
begin
  if tg_op = 'DELETE' and old.role = 'admin' then
    select count(*)
    into admin_count
    from public.company_members
    where company_id = old.company_id
      and role = 'admin';

    if admin_count <= 1 then
      raise exception 'Cannot remove the last company admin';
    end if;
  end if;

  if tg_op = 'UPDATE'
    and old.role = 'admin'
    and new.role is distinct from 'admin'
  then
    select count(*)
    into admin_count
    from public.company_members
    where company_id = old.company_id
      and role = 'admin';

    if admin_count <= 1 then
      raise exception 'Cannot remove the last company admin';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_last_company_admin_update on public.company_members;
create trigger guard_last_company_admin_update
  before update of role on public.company_members
  for each row
  execute function public.guard_last_company_admin();

drop trigger if exists guard_last_company_admin_delete on public.company_members;
create trigger guard_last_company_admin_delete
  before delete on public.company_members
  for each row
  execute function public.guard_last_company_admin();

create or replace function public.get_company_team_members(target_company_id uuid)
returns table (
  user_id uuid,
  email text,
  full_name text,
  avatar_url text,
  role text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    company_members.user_id,
    auth.users.email,
    profiles.full_name,
    profiles.avatar_url,
    company_members.role,
    company_members.created_at
  from public.company_members
  left join public.profiles on profiles.id = company_members.user_id
  left join auth.users on auth.users.id = company_members.user_id
  where company_members.company_id = target_company_id
    and public.is_company_member(target_company_id)
  order by company_members.created_at asc
$$;

create or replace function public.get_company_invite_by_token(target_token text)
returns table (
  invite_id uuid,
  company_id uuid,
  company_name text,
  email text,
  status text,
  expires_at timestamptz,
  is_expired boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    company_invites.id,
    company_invites.company_id,
    companies.name,
    company_invites.email,
    company_invites.status,
    company_invites.expires_at,
    company_invites.expires_at <= now()
  from public.company_invites
  join public.companies on companies.id = company_invites.company_id
  where company_invites.token = target_token
  limit 1
$$;

create or replace function public.accept_company_invite(target_token text)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text;
  invite_row public.company_invites%rowtype;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select *
  into invite_row
  from public.company_invites
  where token = target_token
  for update;

  if invite_row.id is null then
    raise exception 'Invite not found';
  end if;

  if invite_row.status <> 'pending' then
    raise exception 'Invite has already been accepted';
  end if;

  if invite_row.expires_at <= now() then
    raise exception 'Invite has expired';
  end if;

  select email
  into current_email
  from auth.users
  where id = current_user_id;

  if invite_row.email is not null
    and lower(invite_row.email) <> lower(coalesce(current_email, ''))
  then
    raise exception 'Invite email does not match current user';
  end if;

  insert into public.company_members (company_id, user_id, role)
  values (invite_row.company_id, current_user_id, 'recruiter')
  on conflict (company_id, user_id) do nothing;

  update public.company_invites
  set status = 'accepted',
      accepted_by = current_user_id,
      accepted_at = now()
  where id = invite_row.id;

  return invite_row.company_id;
end;
$$;

alter table public.company_members enable row level security;
alter table public.company_invites enable row level security;

revoke all on public.company_members from anon;
revoke all on public.company_invites from anon;
revoke all on public.company_members from authenticated;
revoke all on public.company_invites from authenticated;
grant select, insert, update, delete on public.company_members to authenticated;
grant select, insert, update, delete on public.company_invites to authenticated;

grant execute on function public.get_company_team_members(uuid) to authenticated;
grant execute on function public.get_company_invite_by_token(text) to anon, authenticated;
grant execute on function public.accept_company_invite(text) to authenticated;

drop policy if exists company_members_select_workspace on public.company_members;
drop policy if exists company_members_insert_admin on public.company_members;
drop policy if exists company_members_update_admin on public.company_members;
drop policy if exists company_members_delete_admin on public.company_members;

create policy company_members_select_workspace
  on public.company_members for select
  to authenticated
  using (public.is_company_member(company_id));

create policy company_members_insert_admin
  on public.company_members for insert
  to authenticated
  with check (public.is_company_admin(company_id));

create policy company_members_update_admin
  on public.company_members for update
  to authenticated
  using (public.is_company_admin(company_id))
  with check (public.is_company_admin(company_id));

create policy company_members_delete_admin
  on public.company_members for delete
  to authenticated
  using (public.is_company_admin(company_id));

drop policy if exists company_invites_select_admin on public.company_invites;
drop policy if exists company_invites_insert_admin on public.company_invites;
drop policy if exists company_invites_update_admin on public.company_invites;
drop policy if exists company_invites_delete_admin on public.company_invites;

create policy company_invites_select_admin
  on public.company_invites for select
  to authenticated
  using (public.is_company_admin(company_id));

create policy company_invites_insert_admin
  on public.company_invites for insert
  to authenticated
  with check (public.is_company_admin(company_id));

create policy company_invites_update_admin
  on public.company_invites for update
  to authenticated
  using (public.is_company_admin(company_id))
  with check (public.is_company_admin(company_id));

create policy company_invites_delete_admin
  on public.company_invites for delete
  to authenticated
  using (public.is_company_admin(company_id));

drop policy if exists profiles_company_team_read on public.profiles;
drop policy if exists profiles_company_member_read_applicants on public.profiles;

create policy profiles_company_team_read
  on public.profiles for select
  to authenticated
  using (
    exists (
      select 1
      from public.company_members target_member
      where target_member.user_id = profiles.id
        and public.is_company_member(target_member.company_id)
    )
  );

create policy profiles_company_member_read_applicants
  on public.profiles for select
  to authenticated
  using (
    exists (
      select 1
      from public.applications
      join public.jobs on jobs.id = applications.job_id
      where applications.user_id = profiles.id
        and public.is_company_member(jobs.company_id)
    )
  );

drop policy if exists companies_company_admin_update on public.companies;

create policy companies_company_admin_update
  on public.companies for update
  to authenticated
  using (public.is_company_admin(id))
  with check (public.is_company_admin(id));

drop policy if exists jobs_company_member_read on public.jobs;
drop policy if exists jobs_company_member_insert_pending on public.jobs;
drop policy if exists jobs_company_member_update_pending on public.jobs;

create policy jobs_company_member_read
  on public.jobs for select
  to authenticated
  using (company_id is not null and public.is_company_member(company_id));

create policy jobs_company_member_insert_pending
  on public.jobs for insert
  to authenticated
  with check (
    company_id is not null
    and public.is_company_member(company_id)
    and status = 'pending'
  );

create policy jobs_company_member_update_pending
  on public.jobs for update
  to authenticated
  using (
    company_id is not null
    and public.is_company_member(company_id)
    and status <> 'published'
  )
  with check (
    company_id is not null
    and public.is_company_member(company_id)
    and status = 'pending'
  );

drop policy if exists applications_company_member_read on public.applications;
drop policy if exists applications_company_member_update_status on public.applications;

create policy applications_company_member_read
  on public.applications for select
  to authenticated
  using (
    exists (
      select 1
      from public.jobs
      where jobs.id = applications.job_id
        and public.is_company_member(jobs.company_id)
    )
  );

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

commit;
