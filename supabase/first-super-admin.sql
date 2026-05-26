-- Replace founder@example.com with the Google account email used by the founder.
-- Run this after the founder has completed the first Google login in Supabase Auth.

insert into public.profiles (
  id,
  role,
  full_name,
  avatar_url
)
select
  users.id,
  'super_admin',
  coalesce(users.raw_user_meta_data->>'full_name', users.raw_user_meta_data->>'name'),
  users.raw_user_meta_data->>'avatar_url'
from auth.users
  as users
where lower(users.email) = lower('albus.kachung@gmail.com')
on conflict (id) do update
  set role = 'super_admin',
      full_name = coalesce(
        public.profiles.full_name,
        excluded.full_name
      ),
      avatar_url = coalesce(
        public.profiles.avatar_url,
        excluded.avatar_url
      ),
      updated_at = now();
