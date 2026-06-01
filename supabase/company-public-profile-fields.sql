-- Public company profile fields for frontend company pages.
-- Run after core-platform-tables.sql.

begin;

alter table public.companies
  add column if not exists industry text,
  add column if not exists company_size text,
  add column if not exists hq_location text,
  add column if not exists remote_policy text,
  add column if not exists perks_tags text[] not null default '{}';

commit;
