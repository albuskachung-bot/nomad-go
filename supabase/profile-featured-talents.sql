alter table public.profiles
add column if not exists is_featured_talent boolean default false,
add column if not exists featured_sort_order integer default 0;

update public.profiles
set
  is_featured_talent = coalesce(is_featured_talent, false),
  featured_sort_order = coalesce(featured_sort_order, 0);

alter table public.profiles
alter column is_featured_talent set default false,
alter column featured_sort_order set default 0;

create index if not exists profiles_featured_talent_idx
  on public.profiles(is_featured_talent, featured_sort_order, created_at desc);

create or replace view public.public_talents
with (security_barrier = true)
as
select
  id,
  account_type,
  full_name,
  title,
  coalesce(job_title, title) as job_title,
  avatar_url,
  skills,
  location,
  timezone,
  work_type,
  (
    coalesce(is_featured_talent, false)
    or coalesce(sponsored_until > now(), false)
  ) as is_featured,
  updated_at,
  status,
  is_public,
  coalesce(is_featured_talent, false) as is_featured_talent,
  coalesce(featured_sort_order, 0) as featured_sort_order
from public.profiles
where account_type in ('talent', 'nomad')
  and status = 'published'
  and is_public = true
  and coalesce(is_banned, false) = false;

grant select on public.public_talents to anon, authenticated;

notify pgrst, 'reload schema';
