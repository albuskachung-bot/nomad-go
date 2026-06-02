-- Optional public brand banner for company profile pages.
-- Banner image files should be uploaded to a public Storage bucket such as "public-assets".

begin;

alter table public.companies
  add column if not exists banner_url text;

comment on column public.companies.banner_url is
  'Public URL for the company brand banner image shown on frontend company pages.';

commit;
