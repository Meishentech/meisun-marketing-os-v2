-- Phase 1 Batch 10: soft archive marketing resources.
-- Keeps resources available for historical references while removing them from active lists.

create extension if not exists "citext";

alter table marketing_resources
  add column if not exists deleted_at timestamptz;

alter table marketing_resources
  add column if not exists deleted_by citext references app_user_access(email);
