-- Dynamic frontend/admin data sources.
-- Run this in Supabase SQL Editor before removing mock fallbacks.

create extension if not exists pgcrypto;

-- 建立職缺表 (供前台與後台管理使用)
create table if not exists public.jobs (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  company_name text not null,
  description text,
  tags text[] default '{}',
  location text,
  employment_type text,
  status text default 'draft', -- 允許狀態: 'draft', 'published', 'closed'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 建立交易紀錄表 (供財務控制台使用)
create table if not exists public.transactions (
  id uuid default gen_random_uuid() primary key,
  transaction_id text not null,
  company_name text not null,
  tax_id text,
  plan_name text,
  amount integer not null default 0,
  status text default 'Pending', -- 允許狀態: 'Success', 'Failed', 'Refunded'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

notify pgrst, 'reload schema';
