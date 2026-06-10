-- NOMAD-GO Freemium subscription foundation.
-- Run this in Supabase SQL Editor.

create extension if not exists pgcrypto;

-- 1. 擴充現有 users/profiles 表，subscription_plan 是唯一訂閱權威欄位。
alter table public.profiles
add column if not exists subscription_plan text not null default 'free',
add column if not exists plan_expires_at timestamptz,
add column if not exists direct_connect_tokens integer not null default 1; -- 免費版預設 1 個 token

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'plan_type'
  ) then
    execute $migration$
      update public.profiles
      set subscription_plan = case
        when plan_type in ('pro', 'vip') then plan_type
        else 'free'
      end
      where subscription_plan is null
         or subscription_plan = 'free'
    $migration$;

    alter table public.profiles drop column plan_type;
  end if;
end $$;

alter table public.profiles
drop constraint if exists profiles_subscription_plan_check;

alter table public.profiles
add constraint profiles_subscription_plan_check
check (subscription_plan in ('free', 'pro', 'vip'));

-- 2. 建立履歷瀏覽紀錄表
create table if not exists public.profile_views (
  id uuid default gen_random_uuid() primary key,
  viewer_company_id uuid not null, -- 誰來看的 (企業 ID)
  viewer_company_name text not null, -- 企業名稱 (去關聯化便於讀取)
  target_user_id uuid not null, -- 被看的人 (遊牧人才 ID)
  viewed_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 建立索引加速查詢
create index if not exists idx_profile_views_target on public.profile_views(target_user_id);

notify pgrst, 'reload schema';
