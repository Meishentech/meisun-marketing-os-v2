-- Phase 1 Batch 11B: soft archive marketing campaigns.
-- Adds lifecycle fields only. v1 remains the campaign management entry until v2 formally takes over.

create extension if not exists "citext";

alter table marketing_campaigns
  add column if not exists archived_at timestamptz;

alter table marketing_campaigns
  add column if not exists archived_by citext references app_user_access(email);

alter table marketing_campaigns
  add column if not exists archive_reason text;

create index if not exists idx_marketing_campaigns_archived
  on marketing_campaigns(archived_at);
