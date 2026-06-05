-- NOMAD-GO EDM Phase 4 A/B testing and dynamic personalization.
-- Run after supabase/edm-analytics-phase3.sql.

begin;

create extension if not exists pgcrypto;

alter table public.edm_campaigns
  add column if not exists is_ab_test boolean not null default false,
  add column if not exists variant_a_subject text,
  add column if not exists variant_b_subject text,
  add column if not exists test_percentage integer not null default 20,
  add column if not exists test_duration_hours integer not null default 24,
  add column if not exists winning_variant text;

alter table public.edm_campaigns
  drop constraint if exists edm_campaigns_status_check,
  add constraint edm_campaigns_status_check check (
    status in ('draft', 'scheduled', 'sending', 'waiting_for_ab_result', 'completed')
  ),
  drop constraint if exists edm_campaigns_ab_test_percentage_check,
  add constraint edm_campaigns_ab_test_percentage_check check (
    test_percentage between 2 and 100
  ),
  drop constraint if exists edm_campaigns_ab_test_duration_check,
  add constraint edm_campaigns_ab_test_duration_check check (
    test_duration_hours >= 1
  ),
  drop constraint if exists edm_campaigns_winning_variant_check,
  add constraint edm_campaigns_winning_variant_check check (
    winning_variant is null or winning_variant in ('a', 'b')
  );

create table if not exists public.edm_dynamic_blocks (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  target_role text not null,
  html_content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint edm_dynamic_blocks_name_not_empty check (length(trim(name)) > 0),
  constraint edm_dynamic_blocks_target_role_not_empty check (length(trim(target_role)) > 0),
  constraint edm_dynamic_blocks_content_not_empty check (length(trim(html_content)) > 0)
);

create table if not exists public.edm_campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.edm_campaigns(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  recipient_email text not null,
  recipient_name text,
  variant text,
  status text not null default 'queued',
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint edm_campaign_recipients_email_not_empty check (length(trim(recipient_email)) > 0),
  constraint edm_campaign_recipients_variant_check check (
    variant is null or variant in ('a', 'b', 'winner')
  ),
  constraint edm_campaign_recipients_status_check check (
    status in ('queued', 'sent', 'waiting_for_ab_result', 'skipped')
  )
);

create unique index if not exists edm_campaign_recipients_campaign_email_idx
  on public.edm_campaign_recipients (campaign_id, recipient_email);

create index if not exists edm_campaign_recipients_campaign_status_idx
  on public.edm_campaign_recipients (campaign_id, status, created_at);

create table if not exists public.edm_campaign_variant_metrics (
  campaign_id uuid not null references public.edm_campaigns(id) on delete cascade,
  variant text not null,
  sent_count integer not null default 0,
  delivered_count integer not null default 0,
  open_count integer not null default 0,
  click_count integer not null default 0,
  bounce_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (campaign_id, variant),
  constraint edm_campaign_variant_metrics_variant_check check (variant in ('a', 'b', 'winner')),
  constraint edm_campaign_variant_metrics_non_negative_check check (
    sent_count >= 0
    and delivered_count >= 0
    and open_count >= 0
    and click_count >= 0
    and bounce_count >= 0
  )
);

alter table public.edm_tracking_logs
  add column if not exists variant text;

alter table public.edm_tracking_logs
  drop constraint if exists edm_tracking_logs_variant_check,
  add constraint edm_tracking_logs_variant_check check (
    variant is null or variant in ('a', 'b', 'winner')
  );

create index if not exists edm_tracking_logs_campaign_variant_event_idx
  on public.edm_tracking_logs (campaign_id, variant, event_type, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_edm_dynamic_blocks_updated_at on public.edm_dynamic_blocks;
create trigger set_edm_dynamic_blocks_updated_at
  before update on public.edm_dynamic_blocks
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_edm_campaign_recipients_updated_at on public.edm_campaign_recipients;
create trigger set_edm_campaign_recipients_updated_at
  before update on public.edm_campaign_recipients
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_edm_campaign_variant_metrics_updated_at on public.edm_campaign_variant_metrics;
create trigger set_edm_campaign_variant_metrics_updated_at
  before update on public.edm_campaign_variant_metrics
  for each row
  execute function public.set_updated_at();

create or replace function public.increment_edm_campaign_variant_metric(
  target_campaign_id uuid,
  target_variant text,
  target_metric text,
  increment_by integer default 1
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if increment_by <= 0 or target_variant is null then
    return;
  end if;

  insert into public.edm_campaign_variant_metrics (campaign_id, variant)
  values (target_campaign_id, target_variant)
  on conflict (campaign_id, variant) do nothing;

  if target_metric = 'sent_count' then
    update public.edm_campaign_variant_metrics
    set sent_count = sent_count + increment_by,
        updated_at = now()
    where campaign_id = target_campaign_id and variant = target_variant;
  elsif target_metric = 'delivered_count' then
    update public.edm_campaign_variant_metrics
    set delivered_count = delivered_count + increment_by,
        updated_at = now()
    where campaign_id = target_campaign_id and variant = target_variant;
  elsif target_metric = 'open_count' then
    update public.edm_campaign_variant_metrics
    set open_count = open_count + increment_by,
        updated_at = now()
    where campaign_id = target_campaign_id and variant = target_variant;
  elsif target_metric = 'click_count' then
    update public.edm_campaign_variant_metrics
    set click_count = click_count + increment_by,
        updated_at = now()
    where campaign_id = target_campaign_id and variant = target_variant;
  elsif target_metric = 'bounce_count' then
    update public.edm_campaign_variant_metrics
    set bounce_count = bounce_count + increment_by,
        updated_at = now()
    where campaign_id = target_campaign_id and variant = target_variant;
  else
    raise exception 'Unsupported EDM variant metric: %', target_metric;
  end if;
end;
$$;

alter table public.edm_dynamic_blocks enable row level security;
alter table public.edm_campaign_recipients enable row level security;
alter table public.edm_campaign_variant_metrics enable row level security;

grant select, insert, update, delete on public.edm_dynamic_blocks to authenticated;
grant select, insert, update, delete on public.edm_campaign_recipients to authenticated;
grant select, insert, update, delete on public.edm_campaign_variant_metrics to authenticated;
grant execute on function public.increment_edm_campaign_variant_metric(uuid, text, text, integer) to authenticated;

drop policy if exists edm_dynamic_blocks_super_admin_manage on public.edm_dynamic_blocks;
create policy edm_dynamic_blocks_super_admin_manage
  on public.edm_dynamic_blocks
  for all
  to authenticated
  using (coalesce(public.current_profile_role() = 'super_admin', false))
  with check (coalesce(public.current_profile_role() = 'super_admin', false));

drop policy if exists edm_campaign_recipients_super_admin_manage on public.edm_campaign_recipients;
create policy edm_campaign_recipients_super_admin_manage
  on public.edm_campaign_recipients
  for all
  to authenticated
  using (coalesce(public.current_profile_role() = 'super_admin', false))
  with check (coalesce(public.current_profile_role() = 'super_admin', false));

drop policy if exists edm_campaign_variant_metrics_super_admin_manage on public.edm_campaign_variant_metrics;
create policy edm_campaign_variant_metrics_super_admin_manage
  on public.edm_campaign_variant_metrics
  for all
  to authenticated
  using (coalesce(public.current_profile_role() = 'super_admin', false))
  with check (coalesce(public.current_profile_role() = 'super_admin', false));

commit;
