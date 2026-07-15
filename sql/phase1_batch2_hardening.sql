-- Phase 1 Batch 2 hardening: protect shared association stage definitions.
-- Run after phase1_batch2_associations.sql if it was already applied.
-- Keeps authenticated users able to read/create/update stage options, but prevents accidental deletes.

revoke delete on association_stage_options from authenticated;

-- Optional verification:
-- select has_table_privilege('authenticated', 'public.association_stage_options', 'delete') as authenticated_can_delete_stage_options;
