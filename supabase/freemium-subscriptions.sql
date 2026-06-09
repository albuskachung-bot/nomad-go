-- NOMAD-GO Freemium subscription foundation.
-- Run this in Supabase SQL Editor.

create extension if not exists pgcrypto;

-- 1. 擴充現有 users/profiles 表 (假設名為 profiles)
alter table public.profiles
add column if not exists plan_type text default 'free', -- 'free', 'pro', 'vip'
add column if not exists direct_connect_tokens integer default 1; -- 免費版預設 1 個 token

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
