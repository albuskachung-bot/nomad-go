-- NOMAD-GO EDM Phase 1 core tables.
-- Run after public.profiles and public.set_updated_at are available.

begin;

create extension if not exists pgcrypto;

create table if not exists public.edm_settings (
  id uuid primary key default '00000000-0000-0000-0000-000000000001',
  provider text not null default 'none',
  api_key text,
  sender_name text,
  sender_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint edm_settings_provider_check check (provider in ('none', 'sendgrid', 'ses')),
  constraint edm_settings_sender_email_check check (
    sender_email is null
    or sender_email = ''
    or sender_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  )
);

create unique index if not exists edm_settings_singleton_idx
  on public.edm_settings ((true));

insert into public.edm_settings (id, provider)
values ('00000000-0000-0000-0000-000000000001', 'none')
on conflict (id) do nothing;

create table if not exists public.edm_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject text not null,
  content text not null,
  target_segment jsonb not null default '{"audience":"all"}'::jsonb,
  status text not null default 'draft',
  scheduled_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint edm_campaigns_name_not_empty check (length(trim(name)) > 0),
  constraint edm_campaigns_subject_not_empty check (length(trim(subject)) > 0),
  constraint edm_campaigns_content_not_empty check (length(trim(content)) > 0),
  constraint edm_campaigns_status_check check (
    status in ('draft', 'scheduled', 'sending', 'completed')
  ),
  constraint edm_campaigns_target_segment_object_check check (
    jsonb_typeof(target_segment) = 'object'
  )
);

create index if not exists edm_campaigns_status_scheduled_at_idx
  on public.edm_campaigns (status, scheduled_at desc nulls last);

create index if not exists edm_campaigns_created_at_idx
  on public.edm_campaigns (created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_edm_settings_updated_at on public.edm_settings;
create trigger set_edm_settings_updated_at
  before update on public.edm_settings
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_edm_campaigns_updated_at on public.edm_campaigns;
create trigger set_edm_campaigns_updated_at
  before update on public.edm_campaigns
  for each row
  execute function public.set_updated_at();

alter table public.edm_settings enable row level security;
alter table public.edm_campaigns enable row level security;

grant select, insert, update, delete on public.edm_settings to authenticated;
grant select, insert, update, delete on public.edm_campaigns to authenticated;

drop policy if exists edm_settings_super_admin_manage on public.edm_settings;
create policy edm_settings_super_admin_manage
  on public.edm_settings
  for all
  to authenticated
  using (coalesce(public.current_profile_role() = 'super_admin', false))
  with check (coalesce(public.current_profile_role() = 'super_admin', false));

drop policy if exists edm_campaigns_super_admin_manage on public.edm_campaigns;
create policy edm_campaigns_super_admin_manage
  on public.edm_campaigns
  for all
  to authenticated
  using (coalesce(public.current_profile_role() = 'super_admin', false))
  with check (coalesce(public.current_profile_role() = 'super_admin', false));

commit;
