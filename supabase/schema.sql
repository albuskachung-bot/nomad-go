create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'member'
    constraint profiles_role_check
    check (role in ('member', 'super_admin', 'editor', 'reviewer')),
  account_type text
    constraint profiles_account_type_check
    check (account_type in ('employer', 'nomad')),
  full_name text,
  title text,
  avatar_url text,
  is_banned boolean not null default false,
  bio text,
  skills text[] not null default '{}',
  location text,
  status text not null default 'pending'
    constraint profiles_status_check
    check (status in ('pending', 'published', 'rejected')),
  is_featured boolean not null default false,
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
  employer_id uuid references public.profiles(id) on delete set null,
  rejection_reason text,
  status text not null default 'pending'
    constraint jobs_status_check
    check (status in ('pending', 'published', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  logo_url text,
  website text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employer_id)
);

create table if not exists public.guides (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  country text not null,
  region text not null,
  summary text not null,
  cover_image_url text,
  monthly_budget_usd integer,
  internet_speed_mbps integer,
  timezone text,
  tags text[] not null default '{}',
  is_featured boolean not null default false,
  status text not null default 'pending'
    constraint guides_status_check
    check (status in ('pending', 'published', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.tools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  description text not null,
  url text,
  pricing text,
  warning text,
  tags text[] not null default '{}',
  is_featured boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.talents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  headline text not null,
  summary text not null,
  portfolio_url text,
  skills text[] not null default '{}',
  location text,
  is_featured boolean not null default false,
  status text not null default 'pending'
    constraint talents_status_check
    check (status in ('pending', 'published', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Storage reminder:
-- Create a public Supabase Storage bucket named "public-assets" in the Supabase dashboard.
-- The Admin CMS uploads hero background images and employers upload company logos into that bucket.
create table if not exists public.site_settings (
  id integer primary key default 1
    constraint site_settings_singleton_check
    check (id = 1),
  hero_title text not null default 'NOMAD-GO 遊牧出發',
  hero_subtitle text not null default '整合遠端職缺、城市指南、工具清單與人才推薦，幫助華語工作者用更清楚的資訊開始全球移動。',
  hero_image_url text not null default 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=85',
  announcement_text text,
  announcement_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_settings (
  key_name text primary key,
  key_value text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  stripe_session_id text not null unique,
  amount integer not null,
  status text not null default 'pending'
    constraint orders_status_check
    check (status in ('pending', 'paid', 'failed')),
  created_at timestamptz not null default now()
);

create table if not exists public.saved_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_type text not null
    constraint saved_items_item_type_check
    check (item_type in ('job', 'guide', 'tool')),
  item_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, item_type, item_id)
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  status text not null default 'pending'
    constraint applications_status_check
    check (status in ('pending', 'reviewed', 'interview', 'rejected', 'hired')),
  resume_url text not null default 'legacy/no-resume.pdf',
  cover_letter text,
  applied_at timestamptz not null default now(),
  unique (user_id, job_id)
);

alter table public.profiles add column if not exists account_type text;
alter table public.profiles drop constraint if exists profiles_account_type_check;
alter table public.profiles add constraint profiles_account_type_check
  check (account_type in ('employer', 'nomad'));

alter table public.profiles add column if not exists role text;
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles alter column role set default 'member';

update public.profiles
set account_type = 'nomad',
    role = 'member'
where role = 'talent';

update public.profiles
set account_type = 'employer',
    role = 'member'
where role = 'employer';

update public.profiles
set role = 'member'
where role is null
   or role = 'user';

update public.profiles
set role = 'super_admin'
where role = 'admin';

update public.profiles
set role = 'editor'
where role = 'moderator';

alter table public.profiles alter column role set not null;
alter table public.profiles add constraint profiles_role_check
  check (role in ('member', 'super_admin', 'editor', 'reviewer'));

alter table public.profiles add column if not exists is_banned boolean not null default false;
alter table public.profiles alter column is_banned set default false;
update public.profiles
set is_banned = false
where is_banned is null;
alter table public.profiles alter column is_banned set not null;

alter table public.profiles add column if not exists status text not null default 'pending';
alter table public.profiles drop constraint if exists profiles_status_check;
alter table public.profiles add constraint profiles_status_check
  check (status in ('pending', 'published', 'rejected'));
alter table public.profiles alter column status set default 'pending';
update public.profiles
set status = 'pending'
where status is null;
alter table public.profiles alter column status set not null;

alter table public.profiles add column if not exists is_featured boolean not null default false;
alter table public.profiles alter column is_featured set default false;
update public.profiles
set is_featured = false
where is_featured is null;
alter table public.profiles alter column is_featured set not null;

alter table public.profiles add column if not exists title text;
alter table public.profiles add column if not exists timezone text;
alter table public.profiles add column if not exists languages text[] not null default '{}';
alter table public.profiles add column if not exists work_type text[] not null default '{}';
alter table public.profiles add column if not exists portfolio_url text;
alter table public.profiles add column if not exists social_urls jsonb not null default '{}'::jsonb;
alter table public.profiles add column if not exists work_experience jsonb not null default '[]'::jsonb;
alter table public.profiles add column if not exists education jsonb not null default '[]'::jsonb;
alter table public.profiles add column if not exists sponsored_until timestamptz;
alter table public.profiles add column if not exists stripe_customer_id text;

alter table public.profiles alter column work_experience set default '[]'::jsonb;
update public.profiles
set work_experience = '[]'::jsonb
where work_experience is null;
alter table public.profiles alter column work_experience set not null;

alter table public.profiles alter column education set default '[]'::jsonb;
update public.profiles
set education = '[]'::jsonb
where education is null;
alter table public.profiles alter column education set not null;

alter table public.site_settings add column if not exists hero_title text not null default 'NOMAD-GO 遊牧出發';
alter table public.site_settings add column if not exists hero_subtitle text not null default '整合遠端職缺、城市指南、工具清單與人才推薦，幫助華語工作者用更清楚的資訊開始全球移動。';
alter table public.site_settings add column if not exists hero_image_url text not null default 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=85';
alter table public.site_settings add column if not exists announcement_text text;
alter table public.site_settings add column if not exists announcement_enabled boolean not null default false;

alter table public.site_settings drop constraint if exists site_settings_singleton_check;
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'site_settings'
      and column_name = 'id'
      and data_type in ('integer', 'bigint', 'smallint')
  ) then
    delete from public.site_settings
    where id <> 1;

    alter table public.site_settings
      add constraint site_settings_singleton_check
      check (id = 1);
  else
    if exists (select 1 from public.site_settings where id = '1') then
      delete from public.site_settings
      where id <> '1';
    else
      update public.site_settings
      set id = '1'
      where id = 'global';

      delete from public.site_settings
      where id <> '1';
    end if;

    alter table public.site_settings
      add constraint site_settings_singleton_check
      check (id = '1');
  end if;
end $$;

alter table public.orders add column if not exists status text not null default 'pending';
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('pending', 'paid', 'failed'));

alter table public.saved_items add column if not exists item_type text not null default 'job';
alter table public.saved_items drop constraint if exists saved_items_item_type_check;
alter table public.saved_items add constraint saved_items_item_type_check
  check (item_type in ('job', 'guide', 'tool'));

alter table public.applications add column if not exists status text not null default 'pending';
alter table public.applications add column if not exists resume_url text not null default 'legacy/no-resume.pdf';
alter table public.applications add column if not exists cover_letter text;
alter table public.applications drop constraint if exists applications_status_check;
alter table public.applications add constraint applications_status_check
  check (status in ('pending', 'reviewed', 'interview', 'rejected', 'hired'));

alter table public.jobs add column if not exists status text not null default 'pending';
alter table public.jobs add column if not exists employer_id uuid references public.profiles(id) on delete set null;
alter table public.jobs add column if not exists rejection_reason text;
alter table public.jobs drop constraint if exists jobs_status_check;
alter table public.jobs add constraint jobs_status_check
  check (status in ('pending', 'published', 'rejected'));

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  logo_url text,
  website text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employer_id)
);

alter table public.guides add column if not exists status text not null default 'pending';
alter table public.guides drop constraint if exists guides_status_check;
alter table public.guides add constraint guides_status_check
  check (status in ('pending', 'published', 'rejected'));

alter table public.talents add column if not exists is_featured boolean not null default false;
alter table public.talents add column if not exists status text not null default 'pending';
alter table public.talents drop constraint if exists talents_status_check;
alter table public.talents add constraint talents_status_check
  check (status in ('pending', 'published', 'rejected'));

create index if not exists jobs_featured_created_at_idx
  on public.jobs (is_featured, created_at desc);

create index if not exists jobs_status_created_at_idx
  on public.jobs (status, created_at desc);

create index if not exists jobs_employer_id_created_at_idx
  on public.jobs (employer_id, created_at desc);

create index if not exists companies_employer_id_idx
  on public.companies (employer_id);

create index if not exists guides_featured_created_at_idx
  on public.guides (is_featured, created_at desc);

create index if not exists guides_status_created_at_idx
  on public.guides (status, created_at desc);

create index if not exists tools_category_created_at_idx
  on public.tools (category, created_at desc);

create index if not exists profiles_role_idx
  on public.profiles (role);

create index if not exists profiles_account_type_idx
  on public.profiles (account_type);

create index if not exists profiles_is_banned_idx
  on public.profiles (is_banned);

create index if not exists profiles_status_updated_at_idx
  on public.profiles (status, updated_at desc);

create index if not exists profiles_featured_updated_at_idx
  on public.profiles (is_featured, updated_at desc);

create index if not exists profiles_sponsored_until_updated_at_idx
  on public.profiles (sponsored_until desc nulls last, updated_at desc);

create index if not exists orders_user_id_created_at_idx
  on public.orders (user_id, created_at desc);

create index if not exists saved_items_user_id_created_at_idx
  on public.saved_items (user_id, created_at desc);

create index if not exists saved_items_user_id_item_type_idx
  on public.saved_items (user_id, item_type, created_at desc);

create unique index if not exists saved_items_user_id_item_type_item_id_key
  on public.saved_items (user_id, item_type, item_id);

create index if not exists applications_user_id_applied_at_idx
  on public.applications (user_id, applied_at desc);

create index if not exists applications_job_id_status_idx
  on public.applications (job_id, status);

create unique index if not exists applications_user_id_job_id_key
  on public.applications (user_id, job_id);

create index if not exists talents_status_created_at_idx
  on public.talents (status, created_at desc);

create index if not exists talents_featured_created_at_idx
  on public.talents (is_featured, created_at desc);

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

drop trigger if exists set_talents_updated_at on public.talents;
create trigger set_talents_updated_at
  before update on public.talents
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_site_settings_updated_at on public.site_settings;
create trigger set_site_settings_updated_at
  before update on public.site_settings
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_platform_settings_updated_at on public.platform_settings;
create trigger set_platform_settings_updated_at
  before update on public.platform_settings
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_companies_updated_at on public.companies;
create trigger set_companies_updated_at
  before update on public.companies
  for each row
  execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    role,
    account_type,
    full_name,
    avatar_url
  ) values (
    new.id,
    'member',
    null,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

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
  select coalesce(
    public.current_profile_role() in ('super_admin', 'editor', 'reviewer'),
    false
  )
$$;

create or replace function public.can_manage_site_settings()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.current_profile_role() in ('super_admin', 'editor'),
    false
  )
$$;

create or replace function public.is_platform_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'super_admin'
  )
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_profile_role() = 'super_admin', false)
$$;

create or replace function public.guard_profile_role_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role = 'super_admin'
    and new.role is distinct from 'super_admin'
    and (select count(*) from public.profiles where role = 'super_admin') <= 1
  then
    raise exception 'Cannot remove the last super_admin';
  end if;

  if new.role is distinct from old.role
    and coalesce(auth.role(), '') <> 'service_role'
    and auth.uid() is not null
    and not public.is_super_admin()
  then
    raise exception 'Only super_admin can change profile roles';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_profile_role_update on public.profiles;
create trigger guard_profile_role_update
  before update of role on public.profiles
  for each row
  execute function public.guard_profile_role_update();

create or replace function public.guard_profile_commercial_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    new.sponsored_until is distinct from old.sponsored_until
    or new.stripe_customer_id is distinct from old.stripe_customer_id
  )
    and coalesce(auth.role(), '') <> 'service_role'
    and auth.uid() is not null
    and not public.is_admin_role()
  then
    raise exception 'Only admin or service role can update commercial profile fields';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_profile_commercial_update on public.profiles;
create trigger guard_profile_commercial_update
  before update of sponsored_until, stripe_customer_id on public.profiles
  for each row
  execute function public.guard_profile_commercial_update();

create or replace function public.guard_profile_admin_fields_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    new.status is distinct from old.status
    or new.is_featured is distinct from old.is_featured
  )
    and coalesce(auth.role(), '') <> 'service_role'
    and auth.uid() is not null
    and not public.is_admin_role()
  then
    raise exception 'Only admin can update profile moderation fields';
  end if;

  if new.is_banned is distinct from old.is_banned
    and coalesce(auth.role(), '') <> 'service_role'
    and auth.uid() is not null
    and not public.is_super_admin()
  then
    raise exception 'Only super_admin can update ban status';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_profile_admin_fields_update on public.profiles;
create trigger guard_profile_admin_fields_update
  before update of status, is_featured, is_banned on public.profiles
  for each row
  execute function public.guard_profile_admin_fields_update();

create or replace function public.set_admin_role_by_email(
  target_email text,
  target_role text
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_user_id uuid;
begin
  if not public.is_super_admin() then
    raise exception 'Only super_admin can update admin roles';
  end if;

  if target_role not in ('member', 'reviewer', 'editor', 'super_admin') then
    raise exception 'target_role must be member, reviewer, editor, or super_admin';
  end if;

  select id
  into target_user_id
  from auth.users
  where lower(email) = lower(target_email)
  limit 1;

  if target_user_id is null then
    raise exception 'No registered user found for email %', target_email;
  end if;

  insert into public.profiles (id, role)
  values (target_user_id, target_role)
  on conflict (id) do update
    set role = excluded.role,
        updated_at = now();
end;
$$;

alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.companies enable row level security;
alter table public.guides enable row level security;
alter table public.tools enable row level security;
alter table public.talents enable row level security;
alter table public.site_settings enable row level security;
alter table public.platform_settings enable row level security;
alter table public.platform_settings force row level security;
alter table public.orders enable row level security;
alter table public.saved_items enable row level security;
alter table public.applications enable row level security;

drop policy if exists profiles_public_read_talent on public.profiles;
drop policy if exists profiles_employer_read_applicants on public.profiles;
drop policy if exists jobs_public_read on public.jobs;
drop policy if exists jobs_employer_read_own on public.jobs;
drop policy if exists jobs_employer_insert_own on public.jobs;
drop policy if exists jobs_employer_update_own_drafts on public.jobs;
drop policy if exists companies_public_read on public.companies;
drop policy if exists companies_employer_manage_own on public.companies;
drop policy if exists applications_employer_read on public.applications;
drop policy if exists site_settings_admin_manage on public.site_settings;
drop policy if exists platform_settings_super_admin_select on public.platform_settings;
drop policy if exists platform_settings_super_admin_insert on public.platform_settings;
drop policy if exists platform_settings_super_admin_update on public.platform_settings;

revoke all on public.platform_settings from anon;
revoke all on public.platform_settings from authenticated;
grant select, insert, update on public.platform_settings to authenticated;

create policy platform_settings_super_admin_select
  on public.platform_settings
  for select
  to authenticated
  using (public.is_platform_super_admin());

create policy platform_settings_super_admin_insert
  on public.platform_settings
  for insert
  to authenticated
  with check (public.is_platform_super_admin());

create policy platform_settings_super_admin_update
  on public.platform_settings
  for update
  to authenticated
  using (public.is_platform_super_admin())
  with check (public.is_platform_super_admin());

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_select_own'
  ) then
    create policy profiles_select_own
      on public.profiles for select
      to authenticated
      using (auth.uid() = id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_insert_own'
  ) then
    create policy profiles_insert_own
      on public.profiles for insert
      to authenticated
      with check (auth.uid() = id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_public_read_talent'
  ) then
    create policy profiles_public_read_talent
      on public.profiles for select
      to anon, authenticated
      using (account_type = 'nomad' and status = 'published' and is_banned = false);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_admin_read'
  ) then
    create policy profiles_admin_read
      on public.profiles for select
      to authenticated
      using (public.is_admin_role());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_employer_read_applicants'
  ) then
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
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_super_admin_update'
  ) then
    create policy profiles_super_admin_update
      on public.profiles for update
      to authenticated
      using (public.is_super_admin())
      with check (public.is_super_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_update_own'
  ) then
    create policy profiles_update_own
      on public.profiles for update
      to authenticated
      using (auth.uid() = id)
      with check (auth.uid() = id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_admin_update'
  ) then
    create policy profiles_admin_update
      on public.profiles for update
      to authenticated
      using (public.is_admin_role())
      with check (public.is_admin_role());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'jobs'
      and policyname = 'jobs_public_read'
  ) then
    create policy jobs_public_read
      on public.jobs for select
      to anon, authenticated
      using (status = 'published');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'jobs'
      and policyname = 'jobs_employer_read_own'
  ) then
    create policy jobs_employer_read_own
      on public.jobs for select
      to authenticated
      using (auth.uid() = employer_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'jobs'
      and policyname = 'jobs_employer_insert_own'
  ) then
    create policy jobs_employer_insert_own
      on public.jobs for insert
      to authenticated
      with check (
        auth.uid() = employer_id
        and status = 'pending'
        and exists (
          select 1
          from public.profiles
          where id = auth.uid()
            and is_banned = false
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'jobs'
      and policyname = 'jobs_employer_update_own_drafts'
  ) then
    create policy jobs_employer_update_own_drafts
      on public.jobs for update
      to authenticated
      using (auth.uid() = employer_id and status <> 'published')
      with check (auth.uid() = employer_id and status = 'pending');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'jobs'
      and policyname = 'jobs_admin_manage'
  ) then
    create policy jobs_admin_manage
      on public.jobs for all
      to authenticated
      using (public.is_admin_role())
      with check (public.is_admin_role());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'companies'
      and policyname = 'companies_public_read'
  ) then
    create policy companies_public_read
      on public.companies for select
      to anon, authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'companies'
      and policyname = 'companies_employer_manage_own'
  ) then
    create policy companies_employer_manage_own
      on public.companies for all
      to authenticated
      using (auth.uid() = employer_id)
      with check (
        auth.uid() = employer_id
        and exists (
          select 1
          from public.profiles
          where id = auth.uid()
            and is_banned = false
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'guides'
      and policyname = 'guides_public_read'
  ) then
    create policy guides_public_read
      on public.guides for select
      to anon, authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'guides'
      and policyname = 'guides_admin_manage'
  ) then
    create policy guides_admin_manage
      on public.guides for all
      to authenticated
      using (public.can_manage_site_settings())
      with check (public.can_manage_site_settings());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'tools'
      and policyname = 'tools_public_read'
  ) then
    create policy tools_public_read
      on public.tools for select
      to anon, authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'talents'
      and policyname = 'talents_public_read_published'
  ) then
    create policy talents_public_read_published
      on public.talents for select
      to anon, authenticated
      using (status = 'published');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'talents'
      and policyname = 'talents_admin_manage'
  ) then
    create policy talents_admin_manage
      on public.talents for all
      to authenticated
      using (public.can_manage_site_settings())
      with check (public.can_manage_site_settings());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'site_settings'
      and policyname = 'site_settings_public_read'
  ) then
    create policy site_settings_public_read
      on public.site_settings for select
      to anon, authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'site_settings'
      and policyname = 'site_settings_admin_manage'
  ) then
    create policy site_settings_admin_manage
      on public.site_settings for update
      to authenticated
      using (public.can_manage_site_settings())
      with check (public.can_manage_site_settings());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'orders'
      and policyname = 'orders_owner_read'
  ) then
    create policy orders_owner_read
      on public.orders for select
      to authenticated
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'orders'
      and policyname = 'orders_owner_insert_pending'
  ) then
    create policy orders_owner_insert_pending
      on public.orders for insert
      to authenticated
      with check (auth.uid() = user_id and status = 'pending');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'orders'
      and policyname = 'orders_admin_read'
  ) then
    create policy orders_admin_read
      on public.orders for select
      to authenticated
      using (public.is_admin_role());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'saved_items'
      and policyname = 'saved_items_owner_manage'
  ) then
    create policy saved_items_owner_manage
      on public.saved_items for all
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'applications'
      and policyname = 'applications_employer_read'
  ) then
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
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'applications'
      and policyname = 'applications_owner_read'
  ) then
    create policy applications_owner_read
      on public.applications for select
      to authenticated
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'applications'
      and policyname = 'applications_owner_insert_pending'
  ) then
    create policy applications_owner_insert_pending
      on public.applications for insert
      to authenticated
      with check (auth.uid() = user_id and status = 'pending');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'applications'
      and policyname = 'applications_admin_manage'
  ) then
    create policy applications_admin_manage
      on public.applications for all
      to authenticated
      using (public.is_admin_role())
      with check (public.is_admin_role());
  end if;
end $$;

update public.profiles
set sponsored_until = '2026-06-24 23:59:59+08'
where id = (
  select id
  from public.profiles
  where account_type = 'nomad'
  order by updated_at desc nulls last, created_at desc
  limit 1
);

insert into public.site_settings (
  id,
  hero_title,
  hero_subtitle,
  hero_image_url,
  announcement_text,
  announcement_enabled
) values (
  1,
  'NOMAD-GO 遊牧出發',
  '整合遠端職缺、城市指南、工具清單與人才推薦，幫助華語工作者用更清楚的資訊開始全球移動。',
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=85',
  'NOMAD-GO 遊牧出發 beta 開放中，歡迎加入華語數位遊牧社群。',
  false
)
on conflict (id) do update
set hero_title = excluded.hero_title,
    hero_subtitle = excluded.hero_subtitle,
    hero_image_url = excluded.hero_image_url,
    updated_at = now();

insert into public.tools (
  name,
  category,
  description,
  url,
  pricing,
  warning,
  tags,
  is_featured
)
select
  seed.name,
  seed.category,
  seed.description,
  seed.url,
  seed.pricing,
  seed.warning,
  seed.tags,
  seed.is_featured
from (
  values
    (
      '全球漫遊 eSIM 上網方案',
      '跨國網路與通訊',
      '提供日本、泰國等地的高速上網方案，隨買隨掃即用，免換實體卡，落地立刻連線上工。',
      'https://example.com/tools/esim',
      null::text,
      '剛剛確認 esim 須於購買後 30 天內完成安裝與啟用，逾期將無法使用。',
      array['eSIM', '上網', '通訊']::text[],
      true
    ),
    (
      'Google AI Pro & Claude.ai',
      '生產力與大腦擴充',
      '強大的 AI 雙引擎。無論是程式碼除錯、文案生成還是複雜資料分析，讓單兵作戰的遊牧者也能擁有一整個大腦智庫團隊。',
      'https://example.com/tools/ai-pro-claude',
      null::text,
      null::text,
      array['AI', '生產力', '資料分析']::text[],
      true
    ),
    (
      '1Password',
      '跨國資安與防護',
      '在海外各地頻繁切換網路與設備時的必備護城河，妥善管理所有高權限帳號密碼，守護異地登入安全。',
      'https://example.com/tools/1password',
      null::text,
      null::text,
      array['資安', '密碼管理', '異地登入']::text[],
      true
    ),
    (
      'Workation 專屬通票 (Hokkaido)',
      '工作環境與差旅',
      '專為前往北海道 (Niseko / Furano) 等滑雪勝地的遊牧者設計。白天享受粉雪，晚上在附設高速 Wi-Fi 的木屋工作區高效產出。',
      'https://example.com/tools/hokkaido-workation',
      null::text,
      null::text,
      array['Workation', '北海道', '差旅']::text[],
      true
    )
) as seed(name, category, description, url, pricing, warning, tags, is_featured)
where not exists (
  select 1
  from public.tools
  where public.tools.name = seed.name
);
