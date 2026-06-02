-- Company freemium quota controls for active jobs and applicant contact unlocks.
-- Run after company-workspaces.sql, company-subscription-plans.sql, and ATS application tables.

begin;

alter table public.companies
  add column if not exists max_active_jobs integer not null default 1,
  add column if not exists unlocked_applicants_count integer not null default 0,
  add column if not exists free_unlock_limit integer not null default 3,
  add column if not exists applicant_unlock_reset_date timestamptz default (date_trunc('month', now()) + interval '1 month');

update public.companies
set
  max_active_jobs = greatest(coalesce(max_active_jobs, 1), 1),
  unlocked_applicants_count = greatest(coalesce(unlocked_applicants_count, 0), 0),
  free_unlock_limit = greatest(coalesce(free_unlock_limit, 3), 0),
  applicant_unlock_reset_date = coalesce(
    applicant_unlock_reset_date,
    date_trunc('month', now()) + interval '1 month'
  );

alter table public.companies
  drop constraint if exists companies_max_active_jobs_positive,
  drop constraint if exists companies_unlocked_applicants_count_non_negative,
  drop constraint if exists companies_free_unlock_limit_non_negative;

alter table public.companies
  add constraint companies_max_active_jobs_positive
    check (max_active_jobs >= 1),
  add constraint companies_unlocked_applicants_count_non_negative
    check (unlocked_applicants_count >= 0),
  add constraint companies_free_unlock_limit_non_negative
    check (free_unlock_limit >= 0);

create index if not exists companies_applicant_unlock_reset_date_idx
  on public.companies (applicant_unlock_reset_date);

create table if not exists public.company_applicant_unlocks (
  company_id uuid not null references public.companies(id) on delete cascade,
  application_id uuid not null references public.applications(id) on delete cascade,
  applicant_id uuid not null references public.profiles(id) on delete cascade,
  unlocked_by uuid references public.profiles(id) on delete set null,
  contact_email text,
  unlocked_at timestamptz not null default now(),
  primary key (company_id, application_id)
);

create index if not exists company_applicant_unlocks_applicant_id_idx
  on public.company_applicant_unlocks (applicant_id);

alter table public.company_applicant_unlocks enable row level security;

drop policy if exists company_applicant_unlocks_company_member_select on public.company_applicant_unlocks;
create policy company_applicant_unlocks_company_member_select
  on public.company_applicant_unlocks for select
  to authenticated
  using (public.is_company_member(company_id));

drop function if exists public.unlock_company_applicant(uuid);

create function public.unlock_company_applicant(target_application_id uuid)
returns table (
  allowed boolean,
  reason text,
  application_id uuid,
  applicant_id uuid,
  applicant_email text,
  unlocked_count integer,
  unlock_limit integer,
  reset_date timestamptz,
  subscription_plan text,
  already_unlocked boolean,
  portfolio_url text,
  social_urls jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_company_id uuid;
  target_applicant_id uuid;
  target_email text;
  target_portfolio_url text;
  target_social_urls jsonb;
  company_plan text;
  current_unlock_count integer;
  current_unlock_limit integer;
  current_reset_date timestamptz;
  now_value timestamptz := now();
  has_existing_unlock boolean;
begin
  if current_user_id is null then
    return query
      select false, 'not_authenticated', target_application_id, null::uuid, null::text, 0, 3, null::timestamptz, 'free', false, null::text, '{}'::jsonb;
    return;
  end if;

  select
    coalesce(jobs.company_id, owner_company.id),
    applications.user_id,
    applicant_auth.email,
    applicant_profile.portfolio_url,
    to_jsonb(coalesce(applicant_profile.social_urls, '{}'::jsonb))
  into
    target_company_id,
    target_applicant_id,
    target_email,
    target_portfolio_url,
    target_social_urls
  from public.applications
  join public.jobs on jobs.id = applications.job_id
  left join public.companies owner_company
    on jobs.company_id is null
   and owner_company.employer_id = jobs.employer_id
  left join auth.users applicant_auth
    on applicant_auth.id = applications.user_id
  left join public.profiles applicant_profile
    on applicant_profile.id = applications.user_id
  where applications.id = target_application_id
  limit 1;

  if target_company_id is null or not public.is_company_member(target_company_id) then
    return query
      select false, 'not_found', target_application_id, null::uuid, null::text, 0, 3, null::timestamptz, 'free', false, null::text, '{}'::jsonb;
    return;
  end if;

  select exists (
    select 1
    from public.company_applicant_unlocks
    where company_applicant_unlocks.company_id = target_company_id
      and company_applicant_unlocks.application_id = target_application_id
  )
  into has_existing_unlock;

  select
    coalesce(companies.subscription_plan, 'free'),
    coalesce(companies.unlocked_applicants_count, 0),
    coalesce(companies.free_unlock_limit, 3),
    companies.applicant_unlock_reset_date
  into
    company_plan,
    current_unlock_count,
    current_unlock_limit,
    current_reset_date
  from public.companies
  where companies.id = target_company_id
  for update;

  if has_existing_unlock then
    return query
      select true, null::text, target_application_id, target_applicant_id, target_email, current_unlock_count, current_unlock_limit, current_reset_date, company_plan, true, target_portfolio_url, coalesce(target_social_urls, '{}'::jsonb);
    return;
  end if;

  if company_plan not in ('pro', 'boost') then
    if current_reset_date is null or current_reset_date <= now_value then
      current_unlock_count := 0;
      current_reset_date := date_trunc('month', now_value) + interval '1 month';
    end if;

    if current_unlock_count >= current_unlock_limit then
      return query
        select false, 'unlock_limit_reached', target_application_id, target_applicant_id, null::text, current_unlock_count, current_unlock_limit, current_reset_date, company_plan, false, null::text, '{}'::jsonb;
      return;
    end if;

    current_unlock_count := current_unlock_count + 1;

    update public.companies
    set
      unlocked_applicants_count = current_unlock_count,
      applicant_unlock_reset_date = current_reset_date
    where companies.id = target_company_id;
  end if;

  insert into public.company_applicant_unlocks (
    company_id,
    application_id,
    applicant_id,
    unlocked_by,
    contact_email
  )
  values (
    target_company_id,
    target_application_id,
    target_applicant_id,
    current_user_id,
    target_email
  )
  on conflict (company_id, application_id) do update
  set
    unlocked_by = excluded.unlocked_by,
    contact_email = excluded.contact_email,
    unlocked_at = now();

  return query
    select true, null::text, target_application_id, target_applicant_id, target_email, current_unlock_count, current_unlock_limit, current_reset_date, company_plan, false, target_portfolio_url, coalesce(target_social_urls, '{}'::jsonb);
end;
$$;

grant execute on function public.unlock_company_applicant(uuid) to authenticated;

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
  contact_unlocked boolean,
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
    case
      when unlocks.application_id is not null then applicant_auth.email
      else null
    end as applicant_email,
    (unlocks.application_id is not null) as contact_unlocked,
    applications.applied_at
  from public.applications
  join public.jobs on jobs.id = applications.job_id
  left join auth.users applicant_auth on applicant_auth.id = applications.user_id
  left join public.company_applicant_unlocks unlocks
    on unlocks.company_id = target_company_id
   and unlocks.application_id = applications.id
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
