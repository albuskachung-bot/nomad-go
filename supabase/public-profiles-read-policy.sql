alter table public.profiles enable row level security;

grant select on public.profiles to anon, authenticated;

drop policy if exists "Allow public to read public profiles" on public.profiles;
create policy "Allow public to read public profiles"
  on public.profiles
  for select
  using (is_public = true and status = 'published');

notify pgrst, 'reload schema';
