-- Dynamic site settings and editable Footer.
-- Run this in Supabase SQL Editor before using /admin/settings.

create table if not exists public.site_settings (
  id integer primary key default 1,
  hero_title text not null default 'NOMAD-GO 遊牧出發',
  hero_subtitle text not null default '整合遠端職缺、城市指南、工具清單與人才推薦，幫助華語工作者用更清楚的資訊開始全球移動。',
  hero_image_url text not null default 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=85',
  announcement_text text,
  announcement_enabled boolean not null default false,
  footer_description text not null default '為華語遠端工作者整理職缺、城市情報與出發工具，讓每一次移動都更有掌握。',
  contact_email text not null default 'hello@nomad-go.example',
  social_links jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_settings add column if not exists hero_title text not null
  default 'NOMAD-GO 遊牧出發';
alter table public.site_settings add column if not exists hero_subtitle text not null
  default '整合遠端職缺、城市指南、工具清單與人才推薦，幫助華語工作者用更清楚的資訊開始全球移動。';
alter table public.site_settings add column if not exists hero_image_url text not null
  default 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=85';
alter table public.site_settings add column if not exists announcement_text text;
alter table public.site_settings add column if not exists announcement_enabled boolean not null
  default false;
alter table public.site_settings add column if not exists footer_description text not null
  default '為華語遠端工作者整理職缺、城市情報與出發工具，讓每一次移動都更有掌握。';
alter table public.site_settings add column if not exists contact_email text not null
  default 'hello@nomad-go.example';
alter table public.site_settings add column if not exists social_links jsonb not null
  default '{}'::jsonb;
alter table public.site_settings add column if not exists updated_at timestamptz not null
  default now();

alter table public.site_settings drop constraint if exists site_settings_singleton_check;
delete from public.site_settings where id <> 1;
alter table public.site_settings
  add constraint site_settings_singleton_check check (id = 1);

insert into public.site_settings (
  id,
  footer_description,
  contact_email,
  social_links
) values (
  1,
  '為華語遠端工作者整理職缺、城市情報與出發工具，讓每一次移動都更有掌握。',
  'hello@nomad-go.example',
  jsonb_build_object(
    'instagram', '',
    'threads', ''
  )
)
on conflict (id) do update
set footer_description = coalesce(public.site_settings.footer_description, excluded.footer_description),
    contact_email = coalesce(public.site_settings.contact_email, excluded.contact_email),
    social_links = coalesce(public.site_settings.social_links, excluded.social_links),
    updated_at = now();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_site_settings_updated_at on public.site_settings;
create trigger set_site_settings_updated_at
  before update on public.site_settings
  for each row
  execute function public.set_updated_at();

create or replace function public.is_site_settings_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'super_admin'
  )
$$;

alter table public.site_settings enable row level security;

grant select on public.site_settings to anon, authenticated;
grant update on public.site_settings to authenticated;

drop policy if exists site_settings_public_read on public.site_settings;
create policy site_settings_public_read
  on public.site_settings
  for select
  to anon, authenticated
  using (true);

drop policy if exists site_settings_admin_manage on public.site_settings;
drop policy if exists site_settings_super_admin_update on public.site_settings;
create policy site_settings_super_admin_update
  on public.site_settings
  for update
  to authenticated
  using (public.is_site_settings_super_admin())
  with check (public.is_site_settings_super_admin());
