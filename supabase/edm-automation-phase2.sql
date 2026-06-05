-- NOMAD-GO EDM Phase 2 marketing automation tables.
-- Run after supabase/edm-phase1.sql.

begin;

create extension if not exists pgcrypto;

alter table public.orders
  add column if not exists product_type text,
  add column if not exists departure_at timestamptz;

create index if not exists orders_status_product_created_at_idx
  on public.orders (status, product_type, created_at desc);

create index if not exists orders_departure_at_idx
  on public.orders (departure_at)
  where departure_at is not null;

create table if not exists public.edm_automation_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  event_trigger text not null,
  delay_hours integer not null default 0,
  email_subject text not null,
  email_content text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint edm_automation_rules_name_not_empty check (length(trim(name)) > 0),
  constraint edm_automation_rules_delay_hours_check check (delay_hours >= 0),
  constraint edm_automation_rules_subject_not_empty check (length(trim(email_subject)) > 0),
  constraint edm_automation_rules_content_not_empty check (length(trim(email_content)) > 0),
  constraint edm_automation_rules_trigger_check check (
    event_trigger in ('cart_abandoned', 'esim_expiry_reminder', 'pre_trip')
  )
);

create table if not exists public.edm_automation_logs (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.edm_automation_rules(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  reference_id text,
  triggered_at timestamptz not null default now(),
  status text not null default 'sent',
  constraint edm_automation_logs_status_check check (
    status in ('sent', 'failed', 'skipped')
  )
);

create unique index if not exists edm_automation_logs_rule_user_reference_idx
  on public.edm_automation_logs (rule_id, user_id, reference_id)
  where reference_id is not null;

create index if not exists edm_automation_rules_active_trigger_idx
  on public.edm_automation_rules (is_active, event_trigger);

create index if not exists edm_automation_logs_rule_triggered_at_idx
  on public.edm_automation_logs (rule_id, triggered_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_edm_automation_rules_updated_at on public.edm_automation_rules;
create trigger set_edm_automation_rules_updated_at
  before update on public.edm_automation_rules
  for each row
  execute function public.set_updated_at();

insert into public.edm_automation_rules (
  name,
  event_trigger,
  delay_hours,
  email_subject,
  email_content,
  is_active
)
select
  '購物車挽回',
  'cart_abandoned',
  24,
  '{{user_name}}，你的 NOMAD-GO 訂單還在等待完成',
  '<p>Hi {{user_name}},</p><p>你先前建立的訂單尚未完成付款。若仍需要遠端工作或出發工具支援，可以回到 NOMAD-GO 繼續完成。</p>',
  true
where not exists (
  select 1 from public.edm_automation_rules
  where event_trigger = 'cart_abandoned'
);

insert into public.edm_automation_rules (
  name,
  event_trigger,
  delay_hours,
  email_subject,
  email_content,
  is_active
)
select
  'eSIM 效期提醒',
  'esim_expiry_reminder',
  672,
  '{{user_name}}，你的 eSIM 即將超過安裝期限',
  '<p>Hi {{user_name}},</p><p>提醒你：eSIM 須於購買後 30 天內完成安裝與啟用，逾期將無法使用。</p><p>若你尚未安裝，請盡快依照購買通知中的步驟完成設定。</p>',
  true
where not exists (
  select 1 from public.edm_automation_rules
  where event_trigger = 'esim_expiry_reminder'
);

insert into public.edm_automation_rules (
  name,
  event_trigger,
  delay_hours,
  email_subject,
  email_content,
  is_active
)
select
  '行前通知',
  'pre_trip',
  72,
  '{{user_name}}，出發前 3 天準備清單',
  '<p>Hi {{user_name}},</p><p>距離你的出發時間約剩 3 天。請再次確認目的地天氣、網路工具、簽證與保險資訊。</p><ul><li>查看目的地天氣與體感溫度</li><li>確認 eSIM 或漫遊方案可用</li><li>備份護照、住宿與交通資料</li></ul>',
  true
where not exists (
  select 1 from public.edm_automation_rules
  where event_trigger = 'pre_trip'
);

alter table public.edm_automation_rules enable row level security;
alter table public.edm_automation_logs enable row level security;

grant select, insert, update, delete on public.edm_automation_rules to authenticated;
grant select, insert, update, delete on public.edm_automation_logs to authenticated;

drop policy if exists edm_automation_rules_super_admin_manage on public.edm_automation_rules;
create policy edm_automation_rules_super_admin_manage
  on public.edm_automation_rules
  for all
  to authenticated
  using (coalesce(public.current_profile_role() = 'super_admin', false))
  with check (coalesce(public.current_profile_role() = 'super_admin', false));

drop policy if exists edm_automation_logs_super_admin_manage on public.edm_automation_logs;
create policy edm_automation_logs_super_admin_manage
  on public.edm_automation_logs
  for all
  to authenticated
  using (coalesce(public.current_profile_role() = 'super_admin', false))
  with check (coalesce(public.current_profile_role() = 'super_admin', false));

commit;
