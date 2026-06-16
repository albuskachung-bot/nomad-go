alter table public.profiles drop constraint if exists profiles_account_type_check;
alter table public.profiles add constraint profiles_account_type_check
  check (account_type in ('employer', 'nomad', 'talent'));

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
