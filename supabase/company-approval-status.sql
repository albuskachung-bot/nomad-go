begin;

do $$
declare
  approval_status_column_exists boolean;
begin
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'companies'
      and column_name = 'approval_status'
  )
  into approval_status_column_exists;

  alter table public.companies
    add column if not exists approval_status text default 'pending';

  if approval_status_column_exists then
    update public.companies
    set approval_status = 'approved'
    where approval_status is null;
  else
    update public.companies
    set approval_status = 'approved';
  end if;
end;
$$;

update public.companies
set approval_status = 'pending'
where approval_status not in ('pending', 'approved', 'rejected');

alter table public.companies
  alter column approval_status set default 'pending',
  alter column approval_status set not null;

alter table public.companies
  drop constraint if exists companies_approval_status_check;

alter table public.companies
  add constraint companies_approval_status_check
  check (approval_status in ('pending', 'approved', 'rejected'));

create index if not exists companies_approval_status_created_at_idx
  on public.companies (approval_status, created_at desc);

commit;
