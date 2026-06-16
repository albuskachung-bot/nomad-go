alter table public.notifications
  add column if not exists action_url text;

notify pgrst, 'reload schema';
