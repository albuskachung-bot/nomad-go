-- Dynamic platform placements.
-- Run this in Supabase SQL Editor before using /admin/placements.

create extension if not exists pgcrypto;

create table if not exists public.platform_placements (
  id uuid primary key default gen_random_uuid(),
  location text not null,
  title text not null,
  subtitle text,
  image_url text,
  link_url text,
  link_text text,
  is_active boolean not null default false,
  is_marquee boolean default false,
  marquee_speed integer default 15,
  sort_order integer not null default 0
);

alter table public.platform_placements
  add column if not exists location text,
  add column if not exists title text,
  add column if not exists subtitle text,
  add column if not exists image_url text,
  add column if not exists link_url text,
  add column if not exists link_text text,
  add column if not exists is_active boolean not null default false,
  add column if not exists is_marquee boolean default false,
  add column if not exists marquee_speed integer default 15,
  add column if not exists sort_order integer not null default 0;

update public.platform_placements
set is_active = false
where is_active is null;

update public.platform_placements
set sort_order = 0
where sort_order is null;

update public.platform_placements
set is_marquee = false
where is_marquee is null;

update public.platform_placements
set marquee_speed = 15
where marquee_speed is null;

alter table public.platform_placements
  alter column location set not null,
  alter column title set not null,
  alter column is_active set default false,
  alter column is_active set not null,
  alter column is_marquee set default false,
  alter column marquee_speed set default 15,
  alter column sort_order set default 0,
  alter column sort_order set not null;

alter table public.platform_placements
  drop constraint if exists platform_placements_location_check;
alter table public.platform_placements
  add constraint platform_placements_location_check
  check (location in ('announcement_bar', 'hero_banner', 'in_feed_ad'));

create index if not exists platform_placements_location_active_sort_idx
  on public.platform_placements (location, is_active, sort_order);

create or replace function public.is_platform_placements_admin()
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

alter table public.platform_placements enable row level security;

grant select on public.platform_placements to anon, authenticated;
grant insert, update, delete on public.platform_placements to authenticated;

drop policy if exists platform_placements_public_read_active on public.platform_placements;
create policy platform_placements_public_read_active
  on public.platform_placements
  for select
  to anon, authenticated
  using (is_active or public.is_platform_placements_admin());

drop policy if exists platform_placements_admin_insert on public.platform_placements;
create policy platform_placements_admin_insert
  on public.platform_placements
  for insert
  to authenticated
  with check (public.is_platform_placements_admin());

drop policy if exists platform_placements_admin_update on public.platform_placements;
create policy platform_placements_admin_update
  on public.platform_placements
  for update
  to authenticated
  using (public.is_platform_placements_admin())
  with check (public.is_platform_placements_admin());

drop policy if exists platform_placements_admin_delete on public.platform_placements;
create policy platform_placements_admin_delete
  on public.platform_placements
  for delete
  to authenticated
  using (public.is_platform_placements_admin());

notify pgrst, 'reload schema';
