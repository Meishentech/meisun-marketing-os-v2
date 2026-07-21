-- Phase 1 Batch 19: product knowledge archive lifecycle.
--
-- Goal:
-- - Do not hard-delete product_knowledge_items.
-- - Let marketing/admin archive unwanted knowledge items.
-- - Keep archived rows readable by marketing/admin and executive for history.
-- - Hide archived knowledge items from sales/member, including linked resource rows.

alter table public.product_knowledge_items
  add column if not exists archived_at timestamptz;

alter table public.product_knowledge_items
  add column if not exists archived_by citext references public.app_user_access(email) on delete set null;

alter table public.product_knowledge_items
  add column if not exists archive_reason text;

create index if not exists idx_product_knowledge_items_archived
  on public.product_knowledge_items(archived_at);

-- Tighten read policy so sales/member cannot see archived items through REST.
drop policy if exists product_knowledge_items_select_role_scope on public.product_knowledge_items;

create policy product_knowledge_items_select_role_scope
  on public.product_knowledge_items
  for select
  to authenticated
  using (
    public.is_marketing_or_admin()
    or public.is_executive()
    or (
      archived_at is null
      and visibility_status in ('可對外', '僅內部')
    )
  );

-- Keep write policy marketing/admin only. Recreate idempotently in case older policy drifted.
drop policy if exists product_knowledge_items_update_marketing_scope on public.product_knowledge_items;

create policy product_knowledge_items_update_marketing_scope
  on public.product_knowledge_items
  for update
  to authenticated
  using (public.is_marketing_or_admin())
  with check (public.is_marketing_or_admin());

-- Hide resource links for archived knowledge items from sales/member.
drop policy if exists product_knowledge_resource_links_select_role_scope on public.product_knowledge_resource_links;

create policy product_knowledge_resource_links_select_role_scope
  on public.product_knowledge_resource_links
  for select
  to authenticated
  using (
    public.is_marketing_or_admin()
    or public.is_executive()
    or (
      exists (
        select 1
        from public.product_knowledge_items pki
        where pki.id = knowledge_item_id
          and pki.archived_at is null
          and pki.visibility_status in ('可對外', '僅內部')
      )
      and exists (
        select 1
        from public.marketing_resources mr
        where mr.id = resource_id
          and mr.deleted_at is null
          and mr.is_external_usable is true
      )
    )
  );

notify pgrst, 'reload schema';

-- Smoke test 1: columns exist.
-- select column_name, data_type
-- from information_schema.columns
-- where table_schema = 'public'
--   and table_name = 'product_knowledge_items'
--   and column_name in ('archived_at', 'archived_by', 'archive_reason')
-- order by column_name;

-- Smoke test 2: policies exist.
-- select tablename, policyname, cmd, roles, qual, with_check
-- from pg_policies
-- where schemaname = 'public'
--   and tablename in ('product_knowledge_items', 'product_knowledge_resource_links')
--   and policyname in (
--     'product_knowledge_items_select_role_scope',
--     'product_knowledge_items_update_marketing_scope',
--     'product_knowledge_resource_links_select_role_scope'
--   )
-- order by tablename, policyname;

-- Smoke test 3: marketing/admin can archive a test item, member cannot see it.
-- Run this as an admin/marketing SQL Editor session first.
-- insert into public.product_knowledge_items (
--   title, product_line, knowledge_type, summary, evidence_level, visibility_status, owner
-- )
-- values (
--   '19 knowledge archive smoke', '測試', '市場差異化', 'Should be archived', 'C', '可對外', public.current_app_user_email()
-- )
-- on conflict do nothing;
--
-- update public.product_knowledge_items
-- set archived_at = now(),
--     archived_by = public.current_app_user_email(),
--     archive_reason = 'smoke test archive',
--     updated_at = now()
-- where title = '19 knowledge archive smoke';
--
-- select count(*) as archived_rows
-- from public.product_knowledge_items
-- where title = '19 knowledge archive smoke'
--   and archived_at is not null;

