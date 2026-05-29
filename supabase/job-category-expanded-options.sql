-- Expanded job category options.
-- Run this if jobs.category has the previous jobs_category_check constraint.

begin;

alter table public.jobs alter column category set default '其他 (Other)';

update public.jobs
set category = case category
  when '軟體工程' then '軟體與系統工程 (Software & Engineering)'
  when '產品設計' then 'UI/UX 與視覺設計 (Design & UI/UX)'
  when '行銷企劃' then '數位行銷與公關 (Marketing & PR)'
  when '營運管理' then '產品與專案管理 (Product & Project Management)'
  when '客戶服務' then '客戶成功與支援 (Customer Success & Support)'
  when '其他' then '其他 (Other)'
  else coalesce(category, '其他 (Other)')
end;

alter table public.jobs drop constraint if exists jobs_category_check;
alter table public.jobs add constraint jobs_category_check
  check (
    category in (
      '軟體與系統工程 (Software & Engineering)',
      '產品與專案管理 (Product & Project Management)',
      'UI/UX 與視覺設計 (Design & UI/UX)',
      '數位行銷與公關 (Marketing & PR)',
      '內容與影音創作 (Content & Media)',
      '數據與人工智慧 (Data & AI)',
      '業務與商業開發 (Sales & BD)',
      '客戶成功與支援 (Customer Success & Support)',
      '人資與行政招募 (HR & Admin)',
      '財務與法務 (Finance & Legal)',
      '其他 (Other)'
    )
  );

commit;
