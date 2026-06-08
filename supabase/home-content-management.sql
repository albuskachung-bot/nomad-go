-- Homepage city guides and featured talent management.
-- Run this in Supabase SQL Editor before using /admin/city-guides and /admin/talents.

create extension if not exists pgcrypto;

create table if not exists public.city_guides (
  id uuid primary key default gen_random_uuid(),
  city_name text not null,
  country text not null,
  budget_est text not null,
  internet_speed text not null,
  timezone text not null,
  image_url text not null,
  is_active boolean not null default false,
  sort_order integer not null default 0
);

create table if not exists public.talent_pool (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  job_title text not null,
  timezone text not null,
  available_hours text not null,
  skills text[] not null default '{}',
  avatar_url text,
  is_active boolean not null default false,
  sort_order integer not null default 0
);

alter table public.city_guides
  add column if not exists city_name text,
  add column if not exists country text,
  add column if not exists budget_est text,
  add column if not exists internet_speed text,
  add column if not exists timezone text,
  add column if not exists image_url text,
  add column if not exists is_active boolean not null default false,
  add column if not exists sort_order integer not null default 0;

alter table public.talent_pool
  add column if not exists full_name text,
  add column if not exists job_title text,
  add column if not exists timezone text,
  add column if not exists available_hours text,
  add column if not exists skills text[] not null default '{}',
  add column if not exists avatar_url text,
  add column if not exists is_active boolean not null default false,
  add column if not exists sort_order integer not null default 0;

update public.city_guides set is_active = false where is_active is null;
update public.city_guides set sort_order = 0 where sort_order is null;
update public.city_guides set city_name = '' where city_name is null;
update public.city_guides set country = '' where country is null;
update public.city_guides set budget_est = '' where budget_est is null;
update public.city_guides set internet_speed = '' where internet_speed is null;
update public.city_guides set timezone = '' where timezone is null;
update public.city_guides set image_url = '' where image_url is null;
update public.talent_pool set is_active = false where is_active is null;
update public.talent_pool set sort_order = 0 where sort_order is null;
update public.talent_pool set full_name = '' where full_name is null;
update public.talent_pool set job_title = '' where job_title is null;
update public.talent_pool set timezone = '' where timezone is null;
update public.talent_pool set available_hours = '' where available_hours is null;
update public.talent_pool set skills = '{}' where skills is null;

alter table public.city_guides
  alter column city_name set not null,
  alter column country set not null,
  alter column budget_est set not null,
  alter column internet_speed set not null,
  alter column timezone set not null,
  alter column image_url set not null,
  alter column is_active set default false,
  alter column is_active set not null,
  alter column sort_order set default 0,
  alter column sort_order set not null;

alter table public.talent_pool
  alter column full_name set not null,
  alter column job_title set not null,
  alter column timezone set not null,
  alter column available_hours set not null,
  alter column skills set default '{}',
  alter column skills set not null,
  alter column is_active set default false,
  alter column is_active set not null,
  alter column sort_order set default 0,
  alter column sort_order set not null;

create index if not exists city_guides_active_sort_idx
  on public.city_guides (is_active, sort_order);

create index if not exists talent_pool_active_sort_idx
  on public.talent_pool (is_active, sort_order);

create or replace function public.is_home_content_admin()
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
      and role in ('super_admin', 'editor')
  )
$$;

alter table public.city_guides enable row level security;
alter table public.talent_pool enable row level security;

grant select on public.city_guides to anon, authenticated;
grant insert, update, delete on public.city_guides to authenticated;
grant select on public.talent_pool to anon, authenticated;
grant insert, update, delete on public.talent_pool to authenticated;

drop policy if exists city_guides_public_read_active on public.city_guides;
create policy city_guides_public_read_active
  on public.city_guides
  for select
  to anon, authenticated
  using (is_active or public.is_home_content_admin());

drop policy if exists city_guides_admin_insert on public.city_guides;
create policy city_guides_admin_insert
  on public.city_guides
  for insert
  to authenticated
  with check (public.is_home_content_admin());

drop policy if exists city_guides_admin_update on public.city_guides;
create policy city_guides_admin_update
  on public.city_guides
  for update
  to authenticated
  using (public.is_home_content_admin())
  with check (public.is_home_content_admin());

drop policy if exists city_guides_admin_delete on public.city_guides;
create policy city_guides_admin_delete
  on public.city_guides
  for delete
  to authenticated
  using (public.is_home_content_admin());

drop policy if exists talent_pool_public_read_active on public.talent_pool;
create policy talent_pool_public_read_active
  on public.talent_pool
  for select
  to anon, authenticated
  using (is_active or public.is_home_content_admin());

drop policy if exists talent_pool_admin_insert on public.talent_pool;
create policy talent_pool_admin_insert
  on public.talent_pool
  for insert
  to authenticated
  with check (public.is_home_content_admin());

drop policy if exists talent_pool_admin_update on public.talent_pool;
create policy talent_pool_admin_update
  on public.talent_pool
  for update
  to authenticated
  using (public.is_home_content_admin())
  with check (public.is_home_content_admin());

drop policy if exists talent_pool_admin_delete on public.talent_pool;
create policy talent_pool_admin_delete
  on public.talent_pool
  for delete
  to authenticated
  using (public.is_home_content_admin());
