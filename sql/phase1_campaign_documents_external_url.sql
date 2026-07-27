-- Phase 1: allow campaign documents to reference an external URL without requiring a file upload.
-- Run this in the live Supabase SQL Editor before using link-only campaign documents.

alter table public.marketing_campaign_documents
  add column if not exists external_url text;

comment on column public.marketing_campaign_documents.external_url
  is 'Optional external document link, such as Google Drive, Canva, vendor portal, or cloud folder URL.';

notify pgrst, 'reload schema';

-- Smoke test:
-- select column_name, data_type
-- from information_schema.columns
-- where table_schema = 'public'
--   and table_name = 'marketing_campaign_documents'
--   and column_name = 'external_url';
