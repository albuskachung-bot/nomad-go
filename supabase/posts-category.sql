alter table public.posts
  add column if not exists category text default 'general';

notify pgrst, 'reload schema';
