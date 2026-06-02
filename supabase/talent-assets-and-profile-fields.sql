-- Talent profile foundation: public assets bucket and profile detail fields.
-- Run this in the Supabase SQL Editor.

begin;

insert into storage.buckets (id, name, "public")
values ('talent_assets', 'talent_assets', true)
on conflict (id) do update
set "public" = excluded."public";

alter table storage.objects enable row level security;

drop policy if exists talent_assets_public_select on storage.objects;
create policy talent_assets_public_select
on storage.objects
for select
to public
using (bucket_id = 'talent_assets');

drop policy if exists talent_assets_owner_insert on storage.objects;
create policy talent_assets_owner_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'talent_assets'
  and owner = auth.uid()
);

drop policy if exists talent_assets_owner_update on storage.objects;
create policy talent_assets_owner_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'talent_assets'
  and owner = auth.uid()
)
with check (
  bucket_id = 'talent_assets'
  and owner = auth.uid()
);

drop policy if exists talent_assets_owner_delete on storage.objects;
create policy talent_assets_owner_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'talent_assets'
  and owner = auth.uid()
);

alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists banner_url text,
  add column if not exists job_title text,
  add column if not exists bio text,
  add column if not exists skills text[] default '{}'::text[],
  add column if not exists location text,
  add column if not exists timezone text,
  add column if not exists work_type text[] default '{}'::text[],
  add column if not exists portfolio_url text,
  add column if not exists is_public boolean default false;

update public.profiles
set skills = '{}'::text[]
where skills is null;

update public.profiles
set work_type = '{}'::text[]
where work_type is null;

update public.profiles
set is_public = false
where is_public is null;

alter table public.profiles
  alter column skills set default '{}'::text[],
  alter column skills set not null,
  alter column work_type set default '{}'::text[],
  alter column work_type set not null,
  alter column is_public set default false,
  alter column is_public set not null;

comment on column public.profiles.avatar_url is
  'Public avatar image URL for talent profile pages.';

comment on column public.profiles.banner_url is
  'Public banner image URL for talent profile pages.';

comment on column public.profiles.job_title is
  'Professional headline shown on public talent profile pages.';

comment on column public.profiles.is_public is
  'Controls whether a talent profile can be shown in public talent listings.';

commit;
