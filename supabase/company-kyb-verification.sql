-- Company KYB verification fields and private document storage.
-- Run after core-platform-tables.sql and admin-rbac-roles.sql.

begin;

alter table public.companies
  add column if not exists tax_id text,
  add column if not exists verification_doc_url text;

create index if not exists companies_tax_id_idx
  on public.companies (tax_id)
  where tax_id is not null;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'verification_docs',
  'verification_docs',
  false,
  10485760,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array[
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp'
    ];

alter table storage.objects enable row level security;

drop policy if exists verification_docs_insert_own on storage.objects;
drop policy if exists verification_docs_select_owner_or_admin on storage.objects;
drop policy if exists verification_docs_update_own on storage.objects;
drop policy if exists verification_docs_delete_own on storage.objects;

create policy verification_docs_insert_own
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'verification_docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy verification_docs_select_owner_or_admin
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'verification_docs'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1
        from public.profiles
        where profiles.id = auth.uid()
          and profiles.role in ('super_admin', 'editor', 'moderator', 'reviewer')
      )
    )
  );

create policy verification_docs_update_own
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'verification_docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'verification_docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy verification_docs_delete_own
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'verification_docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

commit;
