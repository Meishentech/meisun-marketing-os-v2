-- Phase 1 Batch 20: remove test / smoke / demo data from live project.
--
-- Run this once from the Supabase SQL Editor after confirming the platform is
-- officially enabled. This removes rows that were created for smoke tests or
-- early demos. It does not create any test data.
--
-- Matching rule:
-- - English smoke/test/demo/codex markers.
-- - Chinese 測試 / 示範 markers.
-- - Batch-style rows used during phase validation.
--
-- Important:
-- - This deletes database rows only. It does not directly delete Storage
--   objects; Supabase Storage objects should be removed via Storage API/UI when
--   needed.
-- - Review the final smoke-test counts after running. Expected count = 0 for
--   every listed table.

begin;

create temp table if not exists cleanup_test_patterns (
  pattern text primary key
) on commit drop;

insert into cleanup_test_patterns (pattern) values
  ('%smoke%'),
  ('%test%'),
  ('%demo%'),
  ('%codex%'),
  ('%batch %'),
  ('%batch-%'),
  ('%batch_%'),
  ('%測試%'),
  ('%示範%'),
  ('%假資料%'),
  ('%rls_smoke%'),
  ('%SMOKE測試Channel%')
on conflict do nothing;

-- Clear FK pointers before deleting matching leads/resources.
update tender_results
set converted_lead_id = null
where converted_lead_id in (
  select l.id
  from leads l
  where exists (
    select 1
    from cleanup_test_patterns p
    where coalesce(l.company_name, '') ilike p.pattern
       or coalesce(l.contact_name, '') ilike p.pattern
       or coalesce(l.contact_email, '') ilike p.pattern
       or coalesce(l.source_channel, '') ilike p.pattern
       or coalesce(l.requirement_note, '') ilike p.pattern
       or coalesce(l.next_step, '') ilike p.pattern
  )
);

update sales_requests
set deliverable_resource_id = null
where deliverable_resource_id in (
  select mr.id
  from marketing_resources mr
  where exists (
    select 1
    from cleanup_test_patterns p
    where coalesce(mr.title, '') ilike p.pattern
       or coalesce(mr.file_name, '') ilike p.pattern
       or coalesce(mr.resource_url, '') ilike p.pattern
       or coalesce(mr.canva_url, '') ilike p.pattern
       or coalesce(mr.file_path, '') ilike p.pattern
       or coalesce(mr.notes, '') ilike p.pattern
       or coalesce(mr.tags::text, '') ilike p.pattern
  )
);

-- Knowledge/resource relationship tables.
delete from product_knowledge_resource_links pkr
where pkr.knowledge_item_id in (
  select pki.id
  from product_knowledge_items pki
  where exists (
    select 1
    from cleanup_test_patterns p
    where coalesce(pki.title, '') ilike p.pattern
       or coalesce(pki.summary, '') ilike p.pattern
       or coalesce(pki.detail, '') ilike p.pattern
       or coalesce(pki.recommended_pitch, '') ilike p.pattern
       or coalesce(pki.prohibited_pitch, '') ilike p.pattern
       or coalesce(pki.related_competitor, '') ilike p.pattern
  )
)
or pkr.resource_id in (
  select mr.id
  from marketing_resources mr
  where exists (
    select 1
    from cleanup_test_patterns p
    where coalesce(mr.title, '') ilike p.pattern
       or coalesce(mr.file_name, '') ilike p.pattern
       or coalesce(mr.resource_url, '') ilike p.pattern
       or coalesce(mr.canva_url, '') ilike p.pattern
       or coalesce(mr.file_path, '') ilike p.pattern
       or coalesce(mr.notes, '') ilike p.pattern
       or coalesce(mr.tags::text, '') ilike p.pattern
  )
);

delete from product_knowledge_item_sources pkis
where pkis.knowledge_item_id in (
  select pki.id
  from product_knowledge_items pki
  where exists (
    select 1
    from cleanup_test_patterns p
    where coalesce(pki.title, '') ilike p.pattern
       or coalesce(pki.summary, '') ilike p.pattern
       or coalesce(pki.detail, '') ilike p.pattern
  )
)
or pkis.source_id in (
  select pks.id
  from product_knowledge_sources pks
  where exists (
    select 1
    from cleanup_test_patterns p
    where coalesce(pks.source_name, '') ilike p.pattern
       or coalesce(pks.source_type, '') ilike p.pattern
       or coalesce(pks.url_or_file, '') ilike p.pattern
  )
);

delete from product_knowledge_sources pks
where exists (
  select 1
  from cleanup_test_patterns p
  where coalesce(pks.source_name, '') ilike p.pattern
     or coalesce(pks.source_type, '') ilike p.pattern
     or coalesce(pks.url_or_file, '') ilike p.pattern
);

delete from product_knowledge_items pki
where exists (
  select 1
  from cleanup_test_patterns p
  where coalesce(pki.title, '') ilike p.pattern
     or coalesce(pki.summary, '') ilike p.pattern
     or coalesce(pki.detail, '') ilike p.pattern
     or coalesce(pki.recommended_pitch, '') ilike p.pattern
     or coalesce(pki.prohibited_pitch, '') ilike p.pattern
     or coalesce(pki.related_competitor, '') ilike p.pattern
);

delete from marketing_resources mr
where exists (
  select 1
  from cleanup_test_patterns p
  where coalesce(mr.title, '') ilike p.pattern
     or coalesce(mr.file_name, '') ilike p.pattern
     or coalesce(mr.resource_url, '') ilike p.pattern
     or coalesce(mr.canva_url, '') ilike p.pattern
     or coalesce(mr.file_path, '') ilike p.pattern
     or coalesce(mr.notes, '') ilike p.pattern
     or coalesce(mr.tags::text, '') ilike p.pattern
);

-- Sales data.
delete from lead_follow_ups lfu
where exists (
  select 1
  from cleanup_test_patterns p
  where coalesce(lfu.update_note, '') ilike p.pattern
)
or lfu.lead_id in (
  select l.id
  from leads l
  where exists (
    select 1
    from cleanup_test_patterns p
    where coalesce(l.company_name, '') ilike p.pattern
       or coalesce(l.contact_name, '') ilike p.pattern
       or coalesce(l.contact_email, '') ilike p.pattern
       or coalesce(l.source_channel, '') ilike p.pattern
       or coalesce(l.requirement_note, '') ilike p.pattern
       or coalesce(l.next_step, '') ilike p.pattern
  )
);

delete from sales_requests sr
where exists (
  select 1
  from cleanup_test_patterns p
  where coalesce(sr.request_name, '') ilike p.pattern
     or coalesce(sr.request_type, '') ilike p.pattern
     or coalesce(sr.description, '') ilike p.pattern
)
or sr.lead_id in (
  select l.id
  from leads l
  where exists (
    select 1
    from cleanup_test_patterns p
    where coalesce(l.company_name, '') ilike p.pattern
       or coalesce(l.contact_name, '') ilike p.pattern
       or coalesce(l.contact_email, '') ilike p.pattern
       or coalesce(l.source_channel, '') ilike p.pattern
       or coalesce(l.requirement_note, '') ilike p.pattern
       or coalesce(l.next_step, '') ilike p.pattern
  )
);

delete from leads l
where exists (
  select 1
  from cleanup_test_patterns p
  where coalesce(l.company_name, '') ilike p.pattern
     or coalesce(l.contact_name, '') ilike p.pattern
     or coalesce(l.contact_email, '') ilike p.pattern
     or coalesce(l.source_channel, '') ilike p.pattern
     or coalesce(l.requirement_note, '') ilike p.pattern
     or coalesce(l.next_step, '') ilike p.pattern
);

delete from approval_requests ar
where exists (
  select 1
  from cleanup_test_patterns p
  where coalesce(ar.entity_type, '') ilike p.pattern
     or coalesce(ar.title, '') ilike p.pattern
     or coalesce(ar.summary, '') ilike p.pattern
     or coalesce(ar.decision_note, '') ilike p.pattern
);

-- Campaign child data and campaign master rows.
delete from marketing_campaign_risk_updates mru
where exists (
  select 1
  from cleanup_test_patterns p
  where coalesce(mru.update_note, '') ilike p.pattern
)
or mru.risk_id in (
  select mr.id
  from marketing_campaign_risks mr
  where exists (
    select 1
    from cleanup_test_patterns p
    where coalesce(mr.title, '') ilike p.pattern
       or coalesce(mr.description, '') ilike p.pattern
       or coalesce(mr.resolution_note, '') ilike p.pattern
  )
);

delete from marketing_campaign_vendor_deliverables mcvd
where exists (
  select 1
  from cleanup_test_patterns p
  where coalesce(mcvd.deliverable_name, '') ilike p.pattern
     or coalesce(mcvd.attachment, '') ilike p.pattern
     or coalesce(mcvd.notes, '') ilike p.pattern
)
or mcvd.campaign_vendor_id in (
  select mcv.id
  from marketing_campaign_vendors mcv
  left join vendors v on v.id = mcv.vendor_id
  left join marketing_campaigns mc on mc.id = mcv.campaign_id
  where exists (
    select 1
    from cleanup_test_patterns p
    where coalesce(mcv.role_in_project, '') ilike p.pattern
       or coalesce(v.name, '') ilike p.pattern
       or coalesce(v.notes, '') ilike p.pattern
       or coalesce(mc.name, '') ilike p.pattern
  )
);

delete from marketing_campaign_documents mcd
where exists (
  select 1
  from cleanup_test_patterns p
  where coalesce(mcd.title, '') ilike p.pattern
     or coalesce(mcd.file_name, '') ilike p.pattern
     or coalesce(mcd.file_path, '') ilike p.pattern
     or coalesce(mcd.notes, '') ilike p.pattern
     or coalesce(mcd.version_note, '') ilike p.pattern
)
or mcd.campaign_id in (
  select mc.id
  from marketing_campaigns mc
  where exists (
    select 1
    from cleanup_test_patterns p
    where coalesce(mc.name, '') ilike p.pattern
       or coalesce(mc.notes, '') ilike p.pattern
  )
);

delete from marketing_campaign_tasks mct
where exists (
  select 1
  from cleanup_test_patterns p
  where coalesce(mct.task_name, '') ilike p.pattern
     or coalesce(mct.owner, '') ilike p.pattern
     or coalesce(mct.expected_output, '') ilike p.pattern
     or coalesce(mct.notes, '') ilike p.pattern
     or coalesce(mct.cancel_reason, '') ilike p.pattern
)
or mct.campaign_id in (
  select mc.id
  from marketing_campaigns mc
  where exists (
    select 1
    from cleanup_test_patterns p
    where coalesce(mc.name, '') ilike p.pattern
       or coalesce(mc.notes, '') ilike p.pattern
  )
);

delete from marketing_campaign_budget_items mbi
where exists (
  select 1
  from cleanup_test_patterns p
  where coalesce(mbi.item_name, '') ilike p.pattern
     or coalesce(mbi.budget_nature, '') ilike p.pattern
     or coalesce(mbi.basis_note, '') ilike p.pattern
     or coalesce(mbi.cancel_reason, '') ilike p.pattern
)
or mbi.campaign_id in (
  select mc.id
  from marketing_campaigns mc
  where exists (
    select 1
    from cleanup_test_patterns p
    where coalesce(mc.name, '') ilike p.pattern
       or coalesce(mc.notes, '') ilike p.pattern
  )
);

delete from marketing_campaign_risks mr
where exists (
  select 1
  from cleanup_test_patterns p
  where coalesce(mr.title, '') ilike p.pattern
     or coalesce(mr.description, '') ilike p.pattern
     or coalesce(mr.resolution_note, '') ilike p.pattern
     or coalesce(mr.archive_reason, '') ilike p.pattern
)
or mr.campaign_id in (
  select mc.id
  from marketing_campaigns mc
  where exists (
    select 1
    from cleanup_test_patterns p
    where coalesce(mc.name, '') ilike p.pattern
       or coalesce(mc.notes, '') ilike p.pattern
  )
);

delete from marketing_campaign_performance mcp
where exists (
  select 1
  from cleanup_test_patterns p
  where coalesce(mcp.channel, '') ilike p.pattern
     or coalesce(mcp.notes, '') ilike p.pattern
)
or mcp.campaign_id in (
  select mc.id
  from marketing_campaigns mc
  where exists (
    select 1
    from cleanup_test_patterns p
    where coalesce(mc.name, '') ilike p.pattern
       or coalesce(mc.notes, '') ilike p.pattern
  )
);

delete from marketing_campaign_vendors mcv
where exists (
  select 1
  from cleanup_test_patterns p
  where coalesce(mcv.role_in_project, '') ilike p.pattern
     or coalesce(mcv.cancel_reason, '') ilike p.pattern
)
or mcv.campaign_id in (
  select mc.id
  from marketing_campaigns mc
  where exists (
    select 1
    from cleanup_test_patterns p
    where coalesce(mc.name, '') ilike p.pattern
       or coalesce(mc.notes, '') ilike p.pattern
  )
)
or mcv.vendor_id in (
  select v.id
  from vendors v
  where exists (
    select 1
    from cleanup_test_patterns p
    where coalesce(v.name, '') ilike p.pattern
       or coalesce(v.contact_name, '') ilike p.pattern
       or coalesce(v.contact_email, '') ilike p.pattern
       or coalesce(v.notes, '') ilike p.pattern
  )
);

delete from marketing_campaigns mc
where exists (
  select 1
  from cleanup_test_patterns p
  where coalesce(mc.name, '') ilike p.pattern
     or coalesce(mc.notes, '') ilike p.pattern
     or coalesce(mc.archive_reason, '') ilike p.pattern
);

delete from vendors v
where not exists (
  select 1 from marketing_campaign_vendors mcv where mcv.vendor_id = v.id
)
and exists (
  select 1
  from cleanup_test_patterns p
  where coalesce(v.name, '') ilike p.pattern
     or coalesce(v.contact_name, '') ilike p.pattern
     or coalesce(v.contact_email, '') ilike p.pattern
     or coalesce(v.notes, '') ilike p.pattern
);

-- Association data.
delete from association_relationship_tags art
where exists (
  select 1
  from cleanup_test_patterns p
  where coalesce(art.tag, '') ilike p.pattern
)
or art.association_id in (
  select a.id
  from associations a
  where exists (
    select 1
    from cleanup_test_patterns p
    where coalesce(a.name, '') ilike p.pattern
       or coalesce(a.notes, '') ilike p.pattern
       or coalesce(a.archive_reason, '') ilike p.pattern
  )
);

delete from association_task_expenses ate
where exists (
  select 1
  from cleanup_test_patterns p
  where coalesce(ate.expense_type, '') ilike p.pattern
     or coalesce(ate.notes, '') ilike p.pattern
     or coalesce(ate.receipt_attachment, '') ilike p.pattern
     or coalesce(ate.cancel_reason, '') ilike p.pattern
)
or ate.association_id in (
  select a.id
  from associations a
  where exists (
    select 1
    from cleanup_test_patterns p
    where coalesce(a.name, '') ilike p.pattern
       or coalesce(a.notes, '') ilike p.pattern
       or coalesce(a.archive_reason, '') ilike p.pattern
  )
);

delete from association_tasks ast
where exists (
  select 1
  from cleanup_test_patterns p
  where coalesce(ast.task_name, '') ilike p.pattern
     or coalesce(ast.description, '') ilike p.pattern
     or coalesce(ast.next_step, '') ilike p.pattern
     or coalesce(ast.required_materials, '') ilike p.pattern
     or coalesce(ast.notes, '') ilike p.pattern
     or coalesce(ast.attachment, '') ilike p.pattern
     or coalesce(ast.cancel_reason, '') ilike p.pattern
)
or ast.association_id in (
  select a.id
  from associations a
  where exists (
    select 1
    from cleanup_test_patterns p
    where coalesce(a.name, '') ilike p.pattern
       or coalesce(a.notes, '') ilike p.pattern
       or coalesce(a.archive_reason, '') ilike p.pattern
  )
);

delete from association_events ae
where exists (
  select 1
  from cleanup_test_patterns p
  where coalesce(ae.event_name, '') ilike p.pattern
     or coalesce(ae.location, '') ilike p.pattern
     or coalesce(ae.organizer, '') ilike p.pattern
     or coalesce(ae.required_materials, '') ilike p.pattern
     or coalesce(ae.result_notes, '') ilike p.pattern
     or coalesce(ae.attachment, '') ilike p.pattern
     or coalesce(ae.cancel_reason, '') ilike p.pattern
)
or ae.association_id in (
  select a.id
  from associations a
  where exists (
    select 1
    from cleanup_test_patterns p
    where coalesce(a.name, '') ilike p.pattern
       or coalesce(a.notes, '') ilike p.pattern
       or coalesce(a.archive_reason, '') ilike p.pattern
  )
);

delete from association_publication_schedules aps
where exists (
  select 1
  from cleanup_test_patterns p
  where coalesce(aps.publication_name, '') ilike p.pattern
     or coalesce(aps.ad_spec, '') ilike p.pattern
     or coalesce(aps.topic, '') ilike p.pattern
     or coalesce(aps.required_materials, '') ilike p.pattern
     or coalesce(aps.result_notes, '') ilike p.pattern
     or coalesce(aps.attachment, '') ilike p.pattern
     or coalesce(aps.cancel_reason, '') ilike p.pattern
)
or aps.association_id in (
  select a.id
  from associations a
  where exists (
    select 1
    from cleanup_test_patterns p
    where coalesce(a.name, '') ilike p.pattern
       or coalesce(a.notes, '') ilike p.pattern
       or coalesce(a.archive_reason, '') ilike p.pattern
  )
);

delete from association_fee_records afr
where exists (
  select 1
  from cleanup_test_patterns p
  where coalesce(afr.notes, '') ilike p.pattern
     or coalesce(afr.receipt_attachment, '') ilike p.pattern
     or coalesce(afr.cancel_reason, '') ilike p.pattern
)
or afr.association_id in (
  select a.id
  from associations a
  where exists (
    select 1
    from cleanup_test_patterns p
    where coalesce(a.name, '') ilike p.pattern
       or coalesce(a.notes, '') ilike p.pattern
       or coalesce(a.archive_reason, '') ilike p.pattern
  )
);

delete from association_benefits ab
where exists (
  select 1
  from cleanup_test_patterns p
  where coalesce(ab.benefit_name, '') ilike p.pattern
     or coalesce(ab.description, '') ilike p.pattern
     or coalesce(ab.notes, '') ilike p.pattern
     or coalesce(ab.archive_reason, '') ilike p.pattern
)
or ab.association_id in (
  select a.id
  from associations a
  where exists (
    select 1
    from cleanup_test_patterns p
    where coalesce(a.name, '') ilike p.pattern
       or coalesce(a.notes, '') ilike p.pattern
       or coalesce(a.archive_reason, '') ilike p.pattern
  )
);

delete from association_notes an
where exists (
  select 1
  from cleanup_test_patterns p
  where coalesce(an.note_title, '') ilike p.pattern
     or coalesce(an.note, '') ilike p.pattern
     or coalesce(an.attachment, '') ilike p.pattern
     or coalesce(an.cancel_reason, '') ilike p.pattern
)
or an.association_id in (
  select a.id
  from associations a
  where exists (
    select 1
    from cleanup_test_patterns p
    where coalesce(a.name, '') ilike p.pattern
       or coalesce(a.notes, '') ilike p.pattern
       or coalesce(a.archive_reason, '') ilike p.pattern
  )
);

delete from associations a
where exists (
  select 1
  from cleanup_test_patterns p
  where coalesce(a.name, '') ilike p.pattern
     or coalesce(a.notes, '') ilike p.pattern
     or coalesce(a.archive_reason, '') ilike p.pattern
);

commit;

notify pgrst, 'reload schema';

-- Smoke test: every count should be 0 after cleanup.
with cleanup_test_patterns(pattern) as (
  values
    ('%smoke%'),
    ('%test%'),
    ('%demo%'),
    ('%codex%'),
    ('%batch %'),
    ('%batch-%'),
    ('%batch_%'),
    ('%測試%'),
    ('%示範%'),
    ('%假資料%'),
    ('%rls_smoke%'),
    ('%SMOKE測試Channel%')
),
remaining as (
  select 'approval_requests' as table_name, count(*) as remaining_count
  from approval_requests ar
  where exists (select 1 from cleanup_test_patterns p where coalesce(ar.title, '') ilike p.pattern or coalesce(ar.summary, '') ilike p.pattern or coalesce(ar.decision_note, '') ilike p.pattern)
  union all
  select 'sales_requests', count(*)
  from sales_requests sr
  where exists (select 1 from cleanup_test_patterns p where coalesce(sr.request_name, '') ilike p.pattern or coalesce(sr.request_type, '') ilike p.pattern or coalesce(sr.description, '') ilike p.pattern)
  union all
  select 'leads', count(*)
  from leads l
  where exists (select 1 from cleanup_test_patterns p where coalesce(l.company_name, '') ilike p.pattern or coalesce(l.contact_name, '') ilike p.pattern or coalesce(l.contact_email, '') ilike p.pattern or coalesce(l.source_channel, '') ilike p.pattern or coalesce(l.requirement_note, '') ilike p.pattern or coalesce(l.next_step, '') ilike p.pattern)
  union all
  select 'product_knowledge_items', count(*)
  from product_knowledge_items pki
  where exists (select 1 from cleanup_test_patterns p where coalesce(pki.title, '') ilike p.pattern or coalesce(pki.summary, '') ilike p.pattern or coalesce(pki.detail, '') ilike p.pattern)
  union all
  select 'marketing_resources', count(*)
  from marketing_resources mr
  where exists (select 1 from cleanup_test_patterns p where coalesce(mr.title, '') ilike p.pattern or coalesce(mr.file_name, '') ilike p.pattern or coalesce(mr.resource_url, '') ilike p.pattern or coalesce(mr.canva_url, '') ilike p.pattern or coalesce(mr.file_path, '') ilike p.pattern or coalesce(mr.notes, '') ilike p.pattern or coalesce(mr.tags::text, '') ilike p.pattern)
  union all
  select 'marketing_campaigns', count(*)
  from marketing_campaigns mc
  where exists (select 1 from cleanup_test_patterns p where coalesce(mc.name, '') ilike p.pattern or coalesce(mc.notes, '') ilike p.pattern or coalesce(mc.archive_reason, '') ilike p.pattern)
  union all
  select 'marketing_campaign_child_tables', (
    (select count(*) from marketing_campaign_tasks mct where exists (select 1 from cleanup_test_patterns p where coalesce(mct.task_name, '') ilike p.pattern or coalesce(mct.expected_output, '') ilike p.pattern or coalesce(mct.notes, '') ilike p.pattern or coalesce(mct.cancel_reason, '') ilike p.pattern))
    + (select count(*) from marketing_campaign_budget_items mbi where exists (select 1 from cleanup_test_patterns p where coalesce(mbi.item_name, '') ilike p.pattern or coalesce(mbi.basis_note, '') ilike p.pattern or coalesce(mbi.cancel_reason, '') ilike p.pattern))
    + (select count(*) from marketing_campaign_documents mcd where exists (select 1 from cleanup_test_patterns p where coalesce(mcd.title, '') ilike p.pattern or coalesce(mcd.file_name, '') ilike p.pattern or coalesce(mcd.file_path, '') ilike p.pattern or coalesce(mcd.notes, '') ilike p.pattern))
    + (select count(*) from marketing_campaign_risks mr where exists (select 1 from cleanup_test_patterns p where coalesce(mr.title, '') ilike p.pattern or coalesce(mr.description, '') ilike p.pattern or coalesce(mr.resolution_note, '') ilike p.pattern or coalesce(mr.archive_reason, '') ilike p.pattern))
    + (select count(*) from marketing_campaign_risk_updates mru where exists (select 1 from cleanup_test_patterns p where coalesce(mru.update_note, '') ilike p.pattern or coalesce(mru.cancel_reason, '') ilike p.pattern))
    + (select count(*) from marketing_campaign_performance mcp where exists (select 1 from cleanup_test_patterns p where coalesce(mcp.channel, '') ilike p.pattern or coalesce(mcp.notes, '') ilike p.pattern))
  )
  union all
  select 'vendor_tables', (
    (select count(*) from vendors v where exists (select 1 from cleanup_test_patterns p where coalesce(v.name, '') ilike p.pattern or coalesce(v.contact_name, '') ilike p.pattern or coalesce(v.contact_email, '') ilike p.pattern or coalesce(v.notes, '') ilike p.pattern))
    + (select count(*) from marketing_campaign_vendors mcv where exists (select 1 from cleanup_test_patterns p where coalesce(mcv.role_in_project, '') ilike p.pattern or coalesce(mcv.cancel_reason, '') ilike p.pattern))
    + (select count(*) from marketing_campaign_vendor_deliverables mcvd where exists (select 1 from cleanup_test_patterns p where coalesce(mcvd.deliverable_name, '') ilike p.pattern or coalesce(mcvd.attachment, '') ilike p.pattern or coalesce(mcvd.notes, '') ilike p.pattern))
  )
  union all
  select 'association_tables', (
    (select count(*) from associations a where exists (select 1 from cleanup_test_patterns p where coalesce(a.name, '') ilike p.pattern or coalesce(a.notes, '') ilike p.pattern or coalesce(a.archive_reason, '') ilike p.pattern))
    + (select count(*) from association_relationship_tags art where exists (select 1 from cleanup_test_patterns p where coalesce(art.tag, '') ilike p.pattern))
    + (select count(*) from association_tasks ast where exists (select 1 from cleanup_test_patterns p where coalesce(ast.task_name, '') ilike p.pattern or coalesce(ast.description, '') ilike p.pattern or coalesce(ast.notes, '') ilike p.pattern))
    + (select count(*) from association_task_expenses ate where exists (select 1 from cleanup_test_patterns p where coalesce(ate.expense_type, '') ilike p.pattern or coalesce(ate.notes, '') ilike p.pattern))
    + (select count(*) from association_events ae where exists (select 1 from cleanup_test_patterns p where coalesce(ae.event_name, '') ilike p.pattern or coalesce(ae.result_notes, '') ilike p.pattern))
    + (select count(*) from association_publication_schedules aps where exists (select 1 from cleanup_test_patterns p where coalesce(aps.publication_name, '') ilike p.pattern or coalesce(aps.topic, '') ilike p.pattern or coalesce(aps.result_notes, '') ilike p.pattern))
    + (select count(*) from association_fee_records afr where exists (select 1 from cleanup_test_patterns p where coalesce(afr.notes, '') ilike p.pattern or coalesce(afr.cancel_reason, '') ilike p.pattern))
    + (select count(*) from association_benefits ab where exists (select 1 from cleanup_test_patterns p where coalesce(ab.benefit_name, '') ilike p.pattern or coalesce(ab.description, '') ilike p.pattern or coalesce(ab.notes, '') ilike p.pattern))
    + (select count(*) from association_notes an where exists (select 1 from cleanup_test_patterns p where coalesce(an.note_title, '') ilike p.pattern or coalesce(an.note, '') ilike p.pattern))
  )
)
select *
from remaining
order by table_name;
