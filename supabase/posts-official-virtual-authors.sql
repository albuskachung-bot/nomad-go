create extension if not exists pgcrypto;

alter table public.posts
  add column if not exists is_official boolean not null default false;

alter table public.profiles
  drop constraint if exists profiles_id_fkey,
  add column if not exists is_virtual_author boolean not null default false,
  add column if not exists is_public boolean not null default false,
  add column if not exists job_title text,
  add column if not exists banner_url text;

alter table public.profiles
  alter column id set default gen_random_uuid(),
  alter column is_virtual_author set default false,
  alter column is_public set default false;

update public.profiles
set is_virtual_author = false
where is_virtual_author is null;

update public.profiles
set is_public = false
where is_public is null;

alter table public.profiles
  alter column is_virtual_author set not null,
  alter column is_public set not null;

do $$
declare
  author_record record;
  migrated_profile_id uuid;
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'posts'
      and column_name = 'virtual_author_name'
  ) then
    for author_record in execute
      'select distinct
         trim(virtual_author_name) as name,
         nullif(trim(coalesce(virtual_author_title, '''')), '''') as title,
         nullif(trim(coalesce(virtual_author_avatar, '''')), '''') as avatar
       from public.posts
       where virtual_author_name is not null
         and trim(virtual_author_name) <> '''''
    loop
      select id
      into migrated_profile_id
      from public.profiles
      where is_virtual_author = true
        and full_name = author_record.name
      limit 1;

      if migrated_profile_id is null then
        insert into public.profiles (
          id,
          role,
          account_type,
          full_name,
          title,
          job_title,
          avatar_url,
          bio,
          skills,
          status,
          is_public,
          is_virtual_author,
          is_banned,
          is_featured,
          languages,
          work_type,
          social_urls,
          work_experience,
          education
        )
        values (
          gen_random_uuid(),
          'member',
          'nomad',
          author_record.name,
          author_record.title,
          author_record.title,
          author_record.avatar,
          null,
          '{}'::text[],
          'published',
          true,
          true,
          false,
          false,
          '{}'::text[],
          '{}'::text[],
          '{}'::jsonb,
          '[]'::jsonb,
          '[]'::jsonb
        )
        returning id into migrated_profile_id;
      end if;

      execute
        'update public.posts
         set author_id = $1
         where virtual_author_name is not null
           and trim(virtual_author_name) = $2'
      using migrated_profile_id, author_record.name;
    end loop;
  end if;
end;
$$;

alter table public.posts
  drop column if exists virtual_author_name,
  drop column if exists virtual_author_avatar,
  drop column if exists virtual_author_title;

create index if not exists posts_is_official_idx
  on public.posts (is_official);

create index if not exists profiles_virtual_author_idx
  on public.profiles (is_virtual_author, created_at desc);

alter table public.posts enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "Super admins can manage all posts" on public.posts;
create policy "Super admins can manage all posts"
  on public.posts
  for all
  to authenticated
  using (coalesce(public.current_profile_role() = 'super_admin', false))
  with check (coalesce(public.current_profile_role() = 'super_admin', false));

drop policy if exists profiles_super_admin_insert_virtual_author on public.profiles;
create policy profiles_super_admin_insert_virtual_author
  on public.profiles
  for insert
  to authenticated
  with check (
    coalesce(public.current_profile_role() = 'super_admin', false)
    and is_virtual_author = true
  );

drop policy if exists profiles_public_read_published_post_authors on public.profiles;
create policy profiles_public_read_published_post_authors
  on public.profiles
  for select
  to anon, authenticated
  using (
    is_banned = false
    and exists (
      select 1
      from public.posts
      where posts.author_id = profiles.id
        and posts.is_published = true
    )
  );
