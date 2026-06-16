-- Public company profile fields for frontend company pages.
-- Run after core-platform-tables.sql.

begin;

alter table public.companies
  add column if not exists description text,
  add column if not exists logo_url text,
  add column if not exists website_url text,
  add column if not exists industry text,
  add column if not exists company_size text,
  add column if not exists hq_location text,
  add column if not exists remote_policy text,
  add column if not exists perks_tags text[] not null default '{}';

alter table public.companies enable row level security;

drop policy if exists "Allow public to read approved companies" on public.companies;
create policy "Allow public to read approved companies"
  on public.companies for select
  using (approval_status = 'approved');

notify pgrst, 'reload schema';

commit;
