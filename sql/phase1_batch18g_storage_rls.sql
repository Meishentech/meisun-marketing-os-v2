-- Phase 1 Batch 18G: Storage RLS tightening.
--
-- Purpose:
-- - Replace legacy "authenticated can manage entire bucket" Storage policies.
-- - Restrict private resource file downloads to allowed roles and externally usable resources.
-- - Restrict campaign document files to marketing/admin and executive.
-- - Keep uploads, replacements, rollback cleanup, and old-file cleanup available to marketing/admin.
--
-- Review before running live:
-- - Requires Batch 18B helper functions.
-- - Should run after Batch 18E because the marketing_resources lookup relies on active
--   resource rows and role helper behavior already being in place.
-- - This file changes Storage policies only. It does not alter public table columns,
--   public table RLS, bucket public/private status, or file size limits.
-- - Supabase private bucket operations are enforced through storage.objects RLS.

do $$
begin
  if to_regprocedure('public.current_app_user_email()') is null
     or to_regprocedure('public.current_app_user_role()') is null
     or to_regprocedure('public.is_marketing_or_admin()') is null
     or to_regprocedure('public.is_executive()') is null then
    raise exception 'Batch 18B role helper functions are required before running Batch 18G';
  end if;
end $$;

alter table storage.objects enable row level security;

grant select, insert, update, delete on table storage.objects to authenticated;
revoke all privileges on table storage.objects from anon;
revoke all privileges on table storage.objects from public;

drop policy if exists "authenticated manage campaign documents" on storage.objects;
drop policy if exists "authenticated manage marketing resource files" on storage.objects;
drop policy if exists marketing_resource_files_select_role_scope on storage.objects;
drop policy if exists marketing_resource_files_insert_marketing_scope on storage.objects;
drop policy if exists marketing_resource_files_update_marketing_scope on storage.objects;
drop policy if exists marketing_resource_files_delete_marketing_scope on storage.objects;
drop policy if exists campaign_documents_select_role_scope on storage.objects;
drop policy if exists campaign_documents_insert_marketing_scope on storage.objects;
drop policy if exists campaign_documents_update_marketing_scope on storage.objects;
drop policy if exists campaign_documents_delete_marketing_scope on storage.objects;

-- marketing-resource-files:
-- - marketing/admin and executive can sign/download any resource file.
-- - sales/member can sign/download only files linked to active, externally usable resources.
-- - only marketing/admin can upload, overwrite, or delete objects.
create policy marketing_resource_files_select_role_scope
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'marketing-resource-files'
    and (
      public.is_marketing_or_admin()
      or public.is_executive()
      or exists (
        select 1
        from public.marketing_resources mr
        where mr.file_path = name
          and mr.deleted_at is null
          and mr.is_external_usable is true
      )
    )
  );

create policy marketing_resource_files_insert_marketing_scope
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'marketing-resource-files'
    and public.is_marketing_or_admin()
  );

create policy marketing_resource_files_update_marketing_scope
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'marketing-resource-files'
    and public.is_marketing_or_admin()
  )
  with check (
    bucket_id = 'marketing-resource-files'
    and public.is_marketing_or_admin()
  );

create policy marketing_resource_files_delete_marketing_scope
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'marketing-resource-files'
    and public.is_marketing_or_admin()
  );

-- campaign-documents:
-- - marketing/admin and executive can sign/download campaign documents.
-- - sales/member cannot sign/download campaign documents.
-- - only marketing/admin can upload, overwrite, or delete objects.
create policy campaign_documents_select_role_scope
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'campaign-documents'
    and (
      public.is_marketing_or_admin()
      or public.is_executive()
    )
  );

create policy campaign_documents_insert_marketing_scope
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'campaign-documents'
    and public.is_marketing_or_admin()
  );

create policy campaign_documents_update_marketing_scope
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'campaign-documents'
    and public.is_marketing_or_admin()
  )
  with check (
    bucket_id = 'campaign-documents'
    and public.is_marketing_or_admin()
  );

create policy campaign_documents_delete_marketing_scope
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'campaign-documents'
    and public.is_marketing_or_admin()
  );

notify pgrst, 'reload schema';

-- Smoke test 1: Storage object grants and target policies.
select
  has_table_privilege('anon', 'storage.objects', 'select') as anon_can_select_storage_objects,
  has_table_privilege('authenticated', 'storage.objects', 'select') as auth_can_select_storage_objects,
  has_table_privilege('authenticated', 'storage.objects', 'insert') as auth_can_insert_storage_objects,
  has_table_privilege('authenticated', 'storage.objects', 'update') as auth_can_update_storage_objects,
  has_table_privilege('authenticated', 'storage.objects', 'delete') as auth_can_delete_storage_objects;

-- Expected:
-- - anon_can_select_storage_objects = false.
-- - all auth_can_* values = true; row access is restricted by bucket-specific policies.

-- Smoke test 2: Storage policy names are present and old broad policies are gone.
select
  policyname,
  cmd,
  roles,
  qual,
  with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and (
    policyname in (
      'authenticated manage campaign documents',
      'authenticated manage marketing resource files'
    )
    or policyname like 'marketing_resource_files_%'
    or policyname like 'campaign_documents_%'
  )
order by policyname;

-- Expected:
-- - 8 new policies:
--   campaign_documents_(select/insert/update/delete)_...
--   marketing_resource_files_(select/insert/update/delete)_...
-- - old "authenticated manage ..." policies do not appear.

-- Smoke test 3: sales/member cannot see campaign documents and only sees eligible resource files.
-- This uses rollback and returns one result table, so it does not persist data.
--
-- begin;
-- select set_config('request.jwt.claims', '{"email":"vincent@mcttw.com.tw"}', true);
-- set local role authenticated;
-- with attempted_delete as (
--   delete from storage.objects
--   where bucket_id in ('marketing-resource-files', 'campaign-documents')
--   returning id
-- )
-- select
--   current_user as db_user,
--   current_setting('role', true) as active_role,
--   public.current_app_user_email() as email,
--   public.current_app_user_role() as app_role,
--   (select count(*) from storage.objects where bucket_id = 'campaign-documents') as visible_campaign_documents,
--   (select count(*) from storage.objects where bucket_id = 'marketing-resource-files') as visible_resource_files,
--   (
--     select count(*)
--     from public.marketing_resources
--     where deleted_at is null
--       and is_external_usable is true
--       and file_path is not null
--   ) as eligible_resource_rows,
--   (select count(*) from attempted_delete) as deleted_objects;
-- rollback;
--
-- Expected:
-- - db_user = authenticated.
-- - app_role = member.
-- - visible_campaign_documents = 0.
-- - visible_resource_files <= eligible_resource_rows.
-- - deleted_objects = 0.

-- Smoke test 4: executive can see both buckets but cannot mutate objects.
-- This uses rollback and returns one result table, so it does not persist data.
--
-- begin;
-- select set_config('request.jwt.claims', '{"email":"kevin@mcttw.com.tw"}', true);
-- set local role authenticated;
-- with attempted_update as (
--   update storage.objects
--   set metadata = metadata
--   where bucket_id in ('marketing-resource-files', 'campaign-documents')
--   returning id
-- )
-- select
--   current_user as db_user,
--   current_setting('role', true) as active_role,
--   public.current_app_user_email() as email,
--   public.current_app_user_role() as app_role,
--   public.is_executive() as is_executive,
--   (select count(*) from storage.objects where bucket_id = 'campaign-documents') as visible_campaign_documents,
--   (select count(*) from storage.objects where bucket_id = 'marketing-resource-files') as visible_resource_files,
--   (select count(*) from attempted_update) as updated_objects;
-- rollback;
--
-- Expected:
-- - db_user = authenticated.
-- - is_executive = true.
-- - visible_* counts return live counts.
-- - updated_objects = 0.

-- Smoke test 5: admin can read and mutate target bucket objects.
-- This uses rollback and returns one result table, so it does not persist data.
--
-- begin;
-- select set_config('request.jwt.claims', '{"email":"eric@mcttw.com.tw"}', true);
-- set local role authenticated;
-- with attempted_update as (
--   update storage.objects
--   set metadata = metadata
--   where bucket_id in ('marketing-resource-files', 'campaign-documents')
--   returning id
-- )
-- select
--   current_user as db_user,
--   current_setting('role', true) as active_role,
--   public.current_app_user_email() as email,
--   public.current_app_user_role() as app_role,
--   public.is_marketing_or_admin() as is_marketing_or_admin,
--   (select count(*) from storage.objects where bucket_id = 'campaign-documents') as visible_campaign_documents,
--   (select count(*) from storage.objects where bucket_id = 'marketing-resource-files') as visible_resource_files,
--   (select count(*) from attempted_update) as updated_objects;
-- rollback;
--
-- Expected:
-- - db_user = authenticated.
-- - is_marketing_or_admin = true.
-- - visible_* counts return live counts.
-- - updated_objects equals the number of visible target bucket objects when objects exist.
