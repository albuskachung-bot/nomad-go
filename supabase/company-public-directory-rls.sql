-- Public company directory RLS.
-- Run after core-platform-tables.sql, admin-rbac-roles.sql, and company-workspaces.sql.

begin;

drop policy if exists companies_public_read on public.companies;
create policy companies_public_read
  on public.companies for select
  to anon, authenticated
  using (approval_status = 'approved');

drop policy if exists companies_company_member_read on public.companies;
create policy companies_company_member_read
  on public.companies for select
  to authenticated
  using (public.is_company_member(id));

commit;
