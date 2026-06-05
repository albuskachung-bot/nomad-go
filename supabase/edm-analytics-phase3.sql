-- NOMAD-GO EDM Phase 3 analytics and tracking tables.
-- Run after supabase/edm-phase1.sql.

begin;

create extension if not exists pgcrypto;

create table if not exists public.edm_campaign_metrics (
  campaign_id uuid primary key references public.edm_campaigns(id) on delete cascade,
  sent_count integer not null default 0,
  delivered_count integer not null default 0,
  open_count integer not null default 0,
  click_count integer not null default 0,
  bounce_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint edm_campaign_metrics_non_negative_check check (
    sent_count >= 0
    and delivered_count >= 0
    and open_count >= 0
    and click_count >= 0
    and bounce_count >= 0
  )
);

create table if not exists public.edm_tracking_logs (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.edm_campaigns(id) on delete cascade,
  recipient_email text not null,
  event_type text not null,
  url text,
  created_at timestamptz not null default now(),
  constraint edm_tracking_logs_email_not_empty check (length(trim(recipient_email)) > 0),
  constraint edm_tracking_logs_event_type_check check (
    event_type in ('delivered', 'open', 'click', 'bounce', 'spam_report')
  )
);

create index if not exists edm_tracking_logs_campaign_event_idx
  on public.edm_tracking_logs (campaign_id, event_type, created_at desc);

create index if not exists edm_tracking_logs_campaign_url_idx
  on public.edm_tracking_logs (campaign_id, url)
  where url is not null;

create index if not exists edm_tracking_logs_recipient_idx
  on public.edm_tracking_logs (lower(recipient_email), created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_edm_campaign_metrics_updated_at on public.edm_campaign_metrics;
create trigger set_edm_campaign_metrics_updated_at
  before update on public.edm_campaign_metrics
  for each row
  execute function public.set_updated_at();

create or replace function public.increment_edm_campaign_metric(
  target_campaign_id uuid,
  target_metric text,
  increment_by integer default 1
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if increment_by <= 0 then
    return;
  end if;

  insert into public.edm_campaign_metrics (campaign_id)
  values (target_campaign_id)
  on conflict (campaign_id) do nothing;

  if target_metric = 'sent_count' then
    update public.edm_campaign_metrics
    set sent_count = sent_count + increment_by,
        updated_at = now()
    where campaign_id = target_campaign_id;
  elsif target_metric = 'delivered_count' then
    update public.edm_campaign_metrics
    set delivered_count = delivered_count + increment_by,
        updated_at = now()
    where campaign_id = target_campaign_id;
  elsif target_metric = 'open_count' then
    update public.edm_campaign_metrics
    set open_count = open_count + increment_by,
        updated_at = now()
    where campaign_id = target_campaign_id;
  elsif target_metric = 'click_count' then
    update public.edm_campaign_metrics
    set click_count = click_count + increment_by,
        updated_at = now()
    where campaign_id = target_campaign_id;
  elsif target_metric = 'bounce_count' then
    update public.edm_campaign_metrics
    set bounce_count = bounce_count + increment_by,
        updated_at = now()
    where campaign_id = target_campaign_id;
  else
    raise exception 'Unsupported EDM metric: %', target_metric;
  end if;
end;
$$;

alter table public.edm_campaign_metrics enable row level security;
alter table public.edm_tracking_logs enable row level security;

grant select, insert, update, delete on public.edm_campaign_metrics to authenticated;
grant select, insert, update, delete on public.edm_tracking_logs to authenticated;
grant execute on function public.increment_edm_campaign_metric(uuid, text, integer) to authenticated;

drop policy if exists edm_campaign_metrics_super_admin_manage on public.edm_campaign_metrics;
create policy edm_campaign_metrics_super_admin_manage
  on public.edm_campaign_metrics
  for all
  to authenticated
  using (coalesce(public.current_profile_role() = 'super_admin', false))
  with check (coalesce(public.current_profile_role() = 'super_admin', false));

drop policy if exists edm_tracking_logs_super_admin_manage on public.edm_tracking_logs;
create policy edm_tracking_logs_super_admin_manage
  on public.edm_tracking_logs
  for all
  to authenticated
  using (coalesce(public.current_profile_role() = 'super_admin', false))
  with check (coalesce(public.current_profile_role() = 'super_admin', false));

commit;
