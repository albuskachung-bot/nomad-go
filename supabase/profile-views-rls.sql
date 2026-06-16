-- Fix profile_views RLS for employer profile-view tracking.
-- Run this in Supabase SQL Editor.

alter table public.profile_views enable row level security;

grant select, insert on public.profile_views to authenticated;

drop policy if exists "Allow inserts for profile_views" on public.profile_views;
drop policy if exists "Allow users to see their own views" on public.profile_views;

create policy "Allow inserts for profile_views"
  on public.profile_views
  for insert
  to authenticated
  with check (auth.role() = 'authenticated');

create policy "Allow users to see their own views"
  on public.profile_views
  for select
  to authenticated
  using (
    auth.uid() = target_user_id
    or auth.uid() = viewer_company_id
    or exists (
      select 1
      from public.companies
      where companies.id = profile_views.viewer_company_id
        and companies.employer_id = auth.uid()
    )
    or exists (
      select 1
      from public.company_members
      where company_members.company_id = profile_views.viewer_company_id
        and company_members.user_id = auth.uid()
    )
  );

create index if not exists idx_profile_views_viewer_company
  on public.profile_views(viewer_company_id);

notify pgrst, 'reload schema';
