-- Phase 1 Batch 23B - Contractor company tax id
-- Purpose:
-- - Add Taiwan company uniform invoice/business number field to contractor CRM company master.
-- - Pure additive migration; no existing data is modified.

begin;

alter table public.contractor_companies
  add column if not exists tax_id text;

create index if not exists idx_contractor_companies_tax_id
  on public.contractor_companies (tax_id)
  where tax_id is not null;

notify pgrst, 'reload schema';

commit;

-- Smoke test 1: column exists.
-- select column_name, data_type
-- from information_schema.columns
-- where table_schema = 'public'
--   and table_name = 'contractor_companies'
--   and column_name = 'tax_id';

-- Smoke test 2: Data API/RLS still allows authenticated reads.
-- select id, company_name, tax_id
-- from public.contractor_companies
-- where archived_at is null
-- order by updated_at desc nulls last, created_at desc
-- limit 5;
