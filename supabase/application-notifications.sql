create extension if not exists pgcrypto;

-- Notifications
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'system',
  title text not null default '通知',
  message text not null default '',
  content text not null default '',
  link_url text,
  action_url text,
  metadata jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.notifications
  add column if not exists type text not null default 'system',
  add column if not exists title text not null default '通知',
  add column if not exists message text not null default '',
  add column if not exists content text not null default '',
  add column if not exists link_url text,
  add column if not exists action_url text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists is_read boolean not null default false,
  add column if not exists created_at timestamp with time zone default timezone('utc'::text, now()) not null;

update public.notifications
set
  title = coalesce(nullif(title, ''), '通知'),
  message = coalesce(message, content, ''),
  content = coalesce(nullif(content, ''), message, title, ''),
  metadata = coalesce(metadata, '{}'::jsonb),
  is_read = coalesce(is_read, false),
  created_at = coalesce(created_at, timezone('utc'::text, now()));

alter table public.notifications
  alter column type set not null,
  alter column title set not null,
  alter column message set not null,
  alter column content set not null,
  alter column metadata set not null,
  alter column is_read set not null,
  alter column created_at set not null;

create index if not exists notifications_user_created_at_idx
  on public.notifications(user_id, created_at desc);

create index if not exists notifications_user_unread_idx
  on public.notifications(user_id, is_read, created_at desc);

-- Private Messages / Direct Connect
create table if not exists public.private_messages (
  id uuid default gen_random_uuid() primary key,
  job_id uuid references public.jobs(id) on delete set null,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  is_read boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint private_messages_prevent_self_message check (sender_id <> recipient_id)
);

alter table public.private_messages
  add column if not exists job_id uuid references public.jobs(id) on delete set null,
  add column if not exists sender_id uuid references public.profiles(id) on delete cascade,
  add column if not exists recipient_id uuid references public.profiles(id) on delete cascade,
  add column if not exists content text,
  add column if not exists is_read boolean not null default false,
  add column if not exists created_at timestamp with time zone default timezone('utc'::text, now()) not null;

update public.private_messages
set
  content = coalesce(content, ''),
  is_read = coalesce(is_read, false),
  created_at = coalesce(created_at, timezone('utc'::text, now()));

alter table public.private_messages
  alter column sender_id set not null,
  alter column recipient_id set not null,
  alter column content set not null,
  alter column is_read set not null,
  alter column created_at set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'private_messages_prevent_self_message'
      and conrelid = 'public.private_messages'::regclass
  ) then
    alter table public.private_messages
      add constraint private_messages_prevent_self_message
      check (sender_id <> recipient_id);
  end if;
end $$;

create index if not exists private_messages_sender_created_at_idx
  on public.private_messages(sender_id, created_at desc);

create index if not exists private_messages_recipient_created_at_idx
  on public.private_messages(recipient_id, created_at desc);

create index if not exists private_messages_recipient_unread_idx
  on public.private_messages(recipient_id, is_read, created_at desc);

create index if not exists private_messages_job_created_at_idx
  on public.private_messages(job_id, created_at desc);

-- Row Level Security
alter table public.notifications enable row level security;
alter table public.private_messages enable row level security;

revoke all on public.notifications from anon;
revoke all on public.private_messages from anon;

grant select, update on public.notifications to authenticated;
grant select, insert, update on public.private_messages to authenticated;

drop policy if exists notifications_select_own on public.notifications;
drop policy if exists "Users can view own notifications" on public.notifications;
create policy notifications_select_own
  on public.notifications for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists notifications_mark_own_read on public.notifications;
create policy notifications_mark_own_read
  on public.notifications for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists private_messages_select_participant on public.private_messages;
drop policy if exists "Users can view their messages" on public.private_messages;
create policy private_messages_select_participant
  on public.private_messages for select
  to authenticated
  using ((auth.uid() = sender_id) or (auth.uid() = recipient_id));

drop policy if exists private_messages_insert_own_sender on public.private_messages;
drop policy if exists "Users can insert messages" on public.private_messages;
create policy private_messages_insert_own_sender
  on public.private_messages for insert
  to authenticated
  with check (
    auth.uid() = sender_id
    and sender_id <> recipient_id
    and length(trim(content)) > 0
  );

drop policy if exists private_messages_update_recipient_read on public.private_messages;
create policy private_messages_update_recipient_read
  on public.private_messages for update
  to authenticated
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

notify pgrst, 'reload schema';
