-- NOMAD-GO EDM Phase 5 omnichannel fallback and list hygiene.
-- Run after supabase/edm-ab-dynamic-phase4.sql.

begin;

create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists communication_preferences jsonb not null default '{
    "email": true,
    "sms": true,
    "whatsapp": true
  }'::jsonb,
  add column if not exists email_bounced boolean not null default false,
  add column if not exists last_opened_at timestamptz,
  add column if not exists edm_lifecycle_tags text[] not null default '{}';

create index if not exists profiles_email_bounced_idx
  on public.profiles (email_bounced);

create index if not exists profiles_last_opened_at_idx
  on public.profiles (last_opened_at)
  where last_opened_at is not null;

create index if not exists profiles_edm_lifecycle_tags_idx
  on public.profiles using gin (edm_lifecycle_tags);

alter table public.edm_automation_rules
  add column if not exists is_critical boolean not null default false,
  add column if not exists fallback_delay_hours integer not null default 24,
  add column if not exists fallback_message text;

alter table public.edm_automation_rules
  drop constraint if exists edm_automation_rules_trigger_check,
  add constraint edm_automation_rules_trigger_check check (
    event_trigger in (
      'cart_abandoned',
      'esim_expiry_reminder',
      'pre_trip',
      're_engagement'
    )
  ),
  drop constraint if exists edm_automation_rules_fallback_delay_hours_check,
  add constraint edm_automation_rules_fallback_delay_hours_check check (
    fallback_delay_hours >= 0
  );

update public.edm_automation_rules
set
  is_critical = true,
  fallback_delay_hours = 24,
  fallback_message = coalesce(
    fallback_message,
    '重要提醒：請回到 NOMAD-GO 查看你的最新通知與行前準備事項。'
  )
where event_trigger in ('esim_expiry_reminder', 'pre_trip');

insert into public.edm_automation_rules (
  name,
  event_trigger,
  delay_hours,
  email_subject,
  email_content,
  is_active,
  is_critical,
  fallback_delay_hours,
  fallback_message
)
select
  '最後挽回',
  're_engagement',
  0,
  '{{user_name}}，還想繼續收到 NOMAD-GO 精選內容嗎？',
  '<p>Hi {{user_name}},</p><p>你已經一段時間沒有開啟 NOMAD-GO 的電子報。我們整理了近期最受歡迎的遠端職缺、城市指南與出發工具，歡迎回來看看。</p><p>若不想再收到此類內容，也可以更新通知偏好。</p>',
  true,
  false,
  24,
  null
where not exists (
  select 1 from public.edm_automation_rules
  where event_trigger = 're_engagement'
);

alter table public.edm_automation_logs
  add column if not exists recipient_email text,
  add column if not exists email_sent_at timestamptz,
  add column if not exists opened_at timestamptz,
  add column if not exists fallback_channel text,
  add column if not exists fallback_sent_at timestamptz;

alter table public.edm_automation_logs
  drop constraint if exists edm_automation_logs_fallback_channel_check,
  add constraint edm_automation_logs_fallback_channel_check check (
    fallback_channel is null or fallback_channel in ('whatsapp', 'sms')
  );

create index if not exists edm_automation_logs_critical_fallback_idx
  on public.edm_automation_logs (rule_id, triggered_at, fallback_sent_at)
  where status = 'sent';

create index if not exists edm_automation_logs_opened_at_idx
  on public.edm_automation_logs (opened_at)
  where opened_at is not null;

alter table public.edm_tracking_logs
  alter column campaign_id drop not null,
  add column if not exists automation_log_id uuid references public.edm_automation_logs(id) on delete set null,
  add column if not exists automation_rule_id uuid references public.edm_automation_rules(id) on delete set null;

alter table public.edm_tracking_logs
  drop constraint if exists edm_tracking_logs_tracking_source_check,
  add constraint edm_tracking_logs_tracking_source_check check (
    campaign_id is not null or automation_log_id is not null
  );

create index if not exists edm_tracking_logs_automation_log_event_idx
  on public.edm_tracking_logs (automation_log_id, event_type, created_at desc)
  where automation_log_id is not null;

create index if not exists edm_tracking_logs_automation_rule_event_idx
  on public.edm_tracking_logs (automation_rule_id, event_type, created_at desc)
  where automation_rule_id is not null;

create table if not exists public.edm_omnichannel_settings (
  id uuid primary key default '00000000-0000-0000-0000-000000000002'::uuid,
  provider text not null default 'twilio',
  account_sid text,
  auth_token text,
  messaging_service_sid text,
  sms_from text,
  whatsapp_from text,
  enabled_channels jsonb not null default '{"sms": false, "whatsapp": false}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint edm_omnichannel_settings_provider_check check (
    provider in ('twilio', 'none')
  )
);

create table if not exists public.edm_omnichannel_logs (
  id uuid primary key default gen_random_uuid(),
  automation_log_id uuid references public.edm_automation_logs(id) on delete set null,
  automation_rule_id uuid references public.edm_automation_rules(id) on delete set null,
  campaign_id uuid references public.edm_campaigns(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  recipient_email text,
  recipient_phone text,
  channel text not null,
  provider text not null default 'twilio',
  provider_message_id text,
  status text not null default 'sent',
  message text not null,
  conversion_event text,
  conversion_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint edm_omnichannel_logs_channel_check check (
    channel in ('whatsapp', 'sms')
  ),
  constraint edm_omnichannel_logs_status_check check (
    status in ('queued', 'sent', 'delivered', 'failed', 'skipped')
  ),
  constraint edm_omnichannel_logs_message_not_empty check (length(trim(message)) > 0)
);

create index if not exists edm_omnichannel_logs_channel_status_idx
  on public.edm_omnichannel_logs (channel, status, created_at desc);

create index if not exists edm_omnichannel_logs_rule_idx
  on public.edm_omnichannel_logs (automation_rule_id, created_at desc)
  where automation_rule_id is not null;

drop trigger if exists set_edm_omnichannel_settings_updated_at on public.edm_omnichannel_settings;
create trigger set_edm_omnichannel_settings_updated_at
  before update on public.edm_omnichannel_settings
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_edm_omnichannel_logs_updated_at on public.edm_omnichannel_logs;
create trigger set_edm_omnichannel_logs_updated_at
  before update on public.edm_omnichannel_logs
  for each row
  execute function public.set_updated_at();

alter table public.edm_omnichannel_settings enable row level security;
alter table public.edm_omnichannel_logs enable row level security;

grant select, insert, update, delete on public.edm_omnichannel_settings to authenticated;
grant select, insert, update, delete on public.edm_omnichannel_logs to authenticated;

drop policy if exists edm_omnichannel_settings_super_admin_manage on public.edm_omnichannel_settings;
create policy edm_omnichannel_settings_super_admin_manage
  on public.edm_omnichannel_settings
  for all
  to authenticated
  using (coalesce(public.current_profile_role() = 'super_admin', false))
  with check (coalesce(public.current_profile_role() = 'super_admin', false));

drop policy if exists edm_omnichannel_logs_super_admin_manage on public.edm_omnichannel_logs;
create policy edm_omnichannel_logs_super_admin_manage
  on public.edm_omnichannel_logs
  for all
  to authenticated
  using (coalesce(public.current_profile_role() = 'super_admin', false))
  with check (coalesce(public.current_profile_role() = 'super_admin', false));

commit;
