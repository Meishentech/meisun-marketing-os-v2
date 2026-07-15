-- Phase 1 Batch 2: association cooperation stages, tags, and overview.
-- Safe incremental migration:
-- - Adds two new tables for v2 association management.
-- - Adds one read-only overview view across existing association records.
-- - Does not rename, remove, or alter existing v1 association columns.

create extension if not exists "pgcrypto";

create table if not exists association_stage_options (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  stage_name text not null,
  sort_order integer not null,
  pct_value integer not null check (pct_value between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entity_type, stage_name)
);

create table if not exists association_relationship_tags (
  id uuid primary key default gen_random_uuid(),
  association_id uuid not null references associations(id) on delete cascade,
  tag text not null,
  created_at timestamptz not null default now(),
  unique (association_id, tag)
);

create index if not exists idx_association_stage_options_entity_order
  on association_stage_options(entity_type, sort_order);

create index if not exists idx_association_relationship_tags_assoc
  on association_relationship_tags(association_id);

create index if not exists idx_association_relationship_tags_tag
  on association_relationship_tags(tag);

alter table association_stage_options enable row level security;
alter table association_relationship_tags enable row level security;

grant select, insert, update, delete on association_stage_options to authenticated;
grant select, insert, update, delete on association_relationship_tags to authenticated;

drop policy if exists "authenticated manage association stage options" on association_stage_options;
create policy "authenticated manage association stage options"
  on association_stage_options
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "authenticated manage association relationship tags" on association_relationship_tags;
create policy "authenticated manage association relationship tags"
  on association_relationship_tags
  for all
  to authenticated
  using (true)
  with check (true);

insert into association_stage_options (entity_type, stage_name, sort_order, pct_value) values
  ('event', '待確認', 1, 0),
  ('event', '已確認合作/排期', 2, 25),
  ('event', '素材準備中', 3, 50),
  ('event', '執行中', 4, 75),
  ('event', '已結束', 5, 100),
  ('publication', '待確認主題', 1, 0),
  ('publication', '素材製作中', 2, 33),
  ('publication', '已投稿/截稿', 3, 66),
  ('publication', '已確認刊出', 4, 100)
on conflict (entity_type, stage_name) do nothing;

create or replace view association_cooperation_overview
with (security_invoker = true) as
select
  id,
  association_id,
  task_name as item_name,
  task_type as item_type,
  task_status as stage,
  owner,
  due_date,
  progress_pct,
  next_step,
  notes,
  attachment,
  created_at,
  updated_at,
  'task'::text as source_table
from association_tasks

union all

select
  id,
  association_id,
  event_name as item_name,
  event_type as item_type,
  event_status as stage,
  owner,
  event_date as due_date,
  null::integer as progress_pct,
  result_notes as next_step,
  null::text as notes,
  attachment,
  created_at,
  updated_at,
  'event'::text as source_table
from association_events

union all

select
  id,
  association_id,
  publication_name as item_name,
  '期刊刊登'::text as item_type,
  material_status as stage,
  owner,
  deadline_date as due_date,
  null::integer as progress_pct,
  result_notes as next_step,
  null::text as notes,
  attachment,
  created_at,
  updated_at,
  'publication'::text as source_table
from association_publication_schedules;

grant select on association_cooperation_overview to authenticated;

-- Optional smoke tests after running this migration:
-- select entity_type, stage_name, sort_order, pct_value
-- from association_stage_options
-- order by entity_type, sort_order;
--
-- select *
-- from association_cooperation_overview
-- order by due_date asc nulls last, created_at desc
-- limit 20;
