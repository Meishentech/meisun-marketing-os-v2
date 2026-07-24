-- Phase 1 Batch 23C: contractor company web research fields.
--
-- Purpose:
-- - Store verified public company information found by company-name web research.
-- - Keep source URLs and research status explicit so imported CRM data is not overwritten silently.
-- - No grants or RLS policy changes are needed; contractor_companies already has role-scoped policies.

alter table public.contractor_companies
  add column if not exists public_profile text,
  add column if not exists company_intro text,
  add column if not exists web_research_status text not null default '待查證',
  add column if not exists web_research_sources text[] not null default '{}',
  add column if not exists web_researched_at timestamptz,
  add column if not exists web_researched_by citext references public.app_user_access(email) on delete set null;

create index if not exists idx_contractor_companies_web_research_status
  on public.contractor_companies (web_research_status)
  where archived_at is null;

notify pgrst, 'reload schema';

-- Smoke test 1: columns exist.
-- select column_name, data_type
-- from information_schema.columns
-- where table_schema = 'public'
--   and table_name = 'contractor_companies'
--   and column_name in (
--     'public_profile',
--     'company_intro',
--     'web_research_status',
--     'web_research_sources',
--     'web_researched_at',
--     'web_researched_by'
--   )
-- order by column_name;

-- Smoke test 2: table is still readable and status can be counted.
-- select web_research_status, count(*)
-- from public.contractor_companies
-- where archived_at is null
-- group by web_research_status
-- order by web_research_status;
