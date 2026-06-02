-- UGC blog posts for the nomad column.
-- Run after public.profiles and public.set_updated_at are available.

begin;

create extension if not exists pgcrypto;

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  slug text not null unique,
  content text not null,
  tags text[] not null default '{}',
  cover_image_url text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint posts_title_not_empty check (length(trim(title)) > 0),
  constraint posts_slug_not_empty check (length(trim(slug)) > 0),
  constraint posts_content_not_empty check (length(trim(content)) > 0)
);

create index if not exists posts_published_updated_at_idx
  on public.posts (is_published, updated_at desc);

create index if not exists posts_author_updated_at_idx
  on public.posts (author_id, updated_at desc);

create index if not exists posts_tags_gin_idx
  on public.posts using gin (tags);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_posts_updated_at on public.posts;
create trigger set_posts_updated_at
  before update on public.posts
  for each row
  execute function public.set_updated_at();

alter table public.posts enable row level security;

grant select on public.posts to anon, authenticated;
grant insert, update, delete on public.posts to authenticated;

drop policy if exists posts_public_read_published on public.posts;
create policy posts_public_read_published
  on public.posts for select
  to anon, authenticated
  using (is_published = true);

drop policy if exists posts_author_read_own on public.posts;
create policy posts_author_read_own
  on public.posts for select
  to authenticated
  using (auth.uid() = author_id);

drop policy if exists posts_author_insert_own on public.posts;
create policy posts_author_insert_own
  on public.posts for insert
  to authenticated
  with check (auth.uid() = author_id);

drop policy if exists posts_author_update_own on public.posts;
create policy posts_author_update_own
  on public.posts for update
  to authenticated
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

drop policy if exists posts_author_delete_own on public.posts;
create policy posts_author_delete_own
  on public.posts for delete
  to authenticated
  using (auth.uid() = author_id);

commit;
