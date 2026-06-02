-- Remote culture showcase fields for public company profiles.
-- Run this in Supabase SQL Editor before using the employer culture showcase form.

begin;

alter table public.companies
  add column if not exists tech_stack text[] not null default '{}'::text[],
  add column if not exists team_locations text[] not null default '{}'::text[],
  add column if not exists culture_video_url text;

update public.companies
set tech_stack = '{}'::text[]
where tech_stack is null;

update public.companies
set team_locations = '{}'::text[]
where team_locations is null;

alter table public.companies
  alter column tech_stack set default '{}'::text[],
  alter column tech_stack set not null,
  alter column team_locations set default '{}'::text[],
  alter column team_locations set not null;

create index if not exists companies_tech_stack_gin_idx
  on public.companies using gin (tech_stack);

create index if not exists companies_team_locations_gin_idx
  on public.companies using gin (team_locations);

comment on column public.companies.tech_stack is
  'Public software tools and collaboration stack shown on company profile pages.';

comment on column public.companies.team_locations is
  'Public list of team member cities or countries shown on company profile pages.';

comment on column public.companies.culture_video_url is
  'Public culture video URL, usually a YouTube link, embedded on company profile pages.';

commit;
