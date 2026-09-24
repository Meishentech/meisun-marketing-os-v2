-- Phase 1 Batch 24: add missing March 2026 VIP factory visit campaign.
--
-- Source:
-- - source-assets/marketing-plans/美的DN20260120263月訪廠_2026.4.28.xls
-- - Sheet "Inv.", cell C16: "2026 3月VIP訪廠"
-- - DN No.: 202601
-- - Amount: CNY 30053.35
--
-- Purpose:
-- - Restore the missing March factory visit in V2 marketing campaign items.
-- - Add reimbursement_info columns for campaign-level and budget-item-level
--   reimbursement records.
-- - Keep the insert idempotent; re-running this SQL will not create duplicates.
-- - Record the factory-approved reimbursement: CNY 30053.35 completed,
--   reimbursement form EC260622620960.
-- - Preserve remaining uncertainty: exact visit dates and TWD exchange rate still
--   remain pending confirmation.

alter table public.marketing_campaigns
  add column if not exists reimbursement_info text;

comment on column public.marketing_campaigns.reimbursement_info
  is 'Campaign-level reimbursement record, including approved amount, reimbursement form number, and notes.';

alter table public.marketing_campaign_budget_items
  add column if not exists reimbursement_info text;

comment on column public.marketing_campaign_budget_items.reimbursement_info
  is 'Budget item reimbursement record, including approved amount, reimbursement form number, and notes.';

alter table public.marketing_campaign_documents
  drop constraint if exists marketing_campaign_documents_doc_type_check;

alter table public.marketing_campaign_documents
  add constraint marketing_campaign_documents_doc_type_check
  check (doc_type in (
    '核銷資料',
    '報價單',
    '合約',
    '設計稿',
    '印刷檔',
    '施工照片',
    '完工照片',
    '攤位設計圖',
    '大會文件',
    '廠商資料',
    '其他'
  ));

do $$
declare
  target_campaign_id uuid;
  target_reimbursement_info text := '原廠已同意：CNY 30053.35 已完成報銷；報銷單號 EC260622620960。';
begin
  select id
    into target_campaign_id
  from public.marketing_campaigns
  where lower(name) in (
      lower('2026 3月VIP訪廠'),
      lower('3月VIP訪廠'),
      lower('3月份VIP訪廠')
    )
    or (name ilike '%3月%' and name ilike '%訪廠%')
    or (name ilike '%3月份%' and name ilike '%訪廠%')
  order by created_at desc
  limit 1;

  if target_campaign_id is null then
    insert into public.marketing_campaigns (
      name,
      status,
      priority,
      partner,
      purpose,
      planned_start,
      planned_end,
      midea_budget_code,
      payment_status,
      claim_status,
      reimbursement_info,
      owner,
      owner_unit,
      notes,
      sort_order,
      created_at,
      updated_at
    )
    values (
      '2026 3月VIP訪廠',
      '結案',
      '中',
      'Midea Building Technology',
      'VIP 客戶訪廠與技術交流，支援商用空調、大型冰水主機產品導入與後續商機追蹤。',
      date '2026-03-01',
      date '2026-03-31',
      'DN 202601',
      '已付款',
      '已完成報銷；報銷單號 EC260622620960',
      target_reimbursement_info,
      'eric@mcttw.com.tw',
      '行銷',
      '來源檔僅確認月份級活動：美的DN20260120263月訪廠_2026.4.28.xls；Inv. 工作表 C16「2026 3月VIP訪廠」，DN 202601，金額 CNY 30053.35。原廠已同意完成報銷，報銷單號 EC260622620960。實際起訖日與台幣匯率待確認。',
      coalesce((select min(sort_order) - 10 from public.marketing_campaigns where sort_order is not null), 10),
      now(),
      now()
    )
    returning id into target_campaign_id;
  else
    update public.marketing_campaigns
    set
      status = '結案',
      midea_budget_code = coalesce(nullif(midea_budget_code, ''), 'DN 202601'),
      partner = coalesce(nullif(partner, ''), 'Midea Building Technology'),
      purpose = coalesce(
        nullif(purpose, ''),
        'VIP 客戶訪廠與技術交流，支援商用空調、大型冰水主機產品導入與後續商機追蹤。'
      ),
      planned_start = coalesce(planned_start, date '2026-03-01'),
      planned_end = coalesce(planned_end, date '2026-03-31'),
      payment_status = '已付款',
      claim_status = '已完成報銷；報銷單號 EC260622620960',
      reimbursement_info = target_reimbursement_info,
      owner = coalesce(nullif(owner, ''), 'eric@mcttw.com.tw'),
      owner_unit = coalesce(nullif(owner_unit, ''), '行銷'),
      notes = case
        when coalesce(notes, '') ilike '%EC260622620960%' then notes
        else concat_ws(
          E'\n',
          nullif(notes, ''),
          '補充來源：美的DN20260120263月訪廠_2026.4.28.xls；Inv. 工作表 C16「2026 3月VIP訪廠」，DN 202601，金額 CNY 30053.35。原廠已同意完成報銷，報銷單號 EC260622620960。'
        )
      end,
      archived_at = null,
      archived_by = null,
      archive_reason = null,
      updated_at = now()
    where id = target_campaign_id;
  end if;

  insert into public.marketing_campaign_budget_items (
    campaign_id,
    seq,
    item_name,
    budget_nature,
    amount_twd,
    exchange_rate,
    amount_rmb,
    basis_note,
    quote_status,
    payment_status,
    payment_date,
    is_subsidy_applicable,
    subsidy_application_status,
    subsidy_reimbursement_status,
    subsidy_missing_notes,
    reimbursement_info,
    created_at
  )
  select
    target_campaign_id,
    1,
    'DN 202601：2026 3月VIP訪廠',
    '訪廠 / 差旅',
    null,
    null,
    30053.35,
    '來源檔：美的DN20260120263月訪廠_2026.4.28.xls；Inv. 工作表 C16，總價 CNY 30053.35。原廠已同意完成報銷，報銷單號 EC260622620960；台幣匯率待確認。',
    '已核定',
    '已付款',
    null,
    true,
    '已核准',
    '已核銷',
    null,
    target_reimbursement_info,
    now()
  where not exists (
    select 1
    from public.marketing_campaign_budget_items
    where campaign_id = target_campaign_id
      and (
        item_name = 'DN 202601：2026 3月VIP訪廠'
        or (item_name ilike '%DN 202601%' and item_name ilike '%訪廠%')
        or (item_name ilike '%3月%' and item_name ilike '%訪廠%')
      )
  );

  update public.marketing_campaign_budget_items
  set
    amount_rmb = coalesce(amount_rmb, 30053.35),
    basis_note = case
      when coalesce(basis_note, '') ilike '%EC260622620960%' then basis_note
      else concat_ws(
        E'\n',
        nullif(basis_note, ''),
        '原廠已同意完成報銷：CNY 30053.35；報銷單號 EC260622620960。'
      )
    end,
    quote_status = '已核定',
    payment_status = '已付款',
    is_subsidy_applicable = true,
    subsidy_application_status = '已核准',
    subsidy_reimbursement_status = '已核銷',
    subsidy_missing_notes = null,
    reimbursement_info = target_reimbursement_info
  where campaign_id = target_campaign_id
    and (
      item_name = 'DN 202601：2026 3月VIP訪廠'
      or (item_name ilike '%DN 202601%' and item_name ilike '%訪廠%')
      or (item_name ilike '%3月%' and item_name ilike '%訪廠%')
    );
end $$;

-- Smoke test after execution:
select
  id,
  name,
  status,
  priority,
  midea_budget_code,
  planned_start,
  planned_end,
  payment_status,
  claim_status,
  reimbursement_info,
  archived_at
from public.marketing_campaigns
where name = '2026 3月VIP訪廠'
   or (name ilike '%3月%' and name ilike '%訪廠%')
   or (name ilike '%3月份%' and name ilike '%訪廠%')
order by created_at desc;

select
  c.name as campaign_name,
  b.item_name,
  b.budget_nature,
  b.amount_twd,
  b.exchange_rate,
  b.amount_rmb,
  b.quote_status,
  b.payment_status,
  b.subsidy_application_status,
  b.subsidy_reimbursement_status,
  b.reimbursement_info
from public.marketing_campaign_budget_items b
join public.marketing_campaigns c on c.id = b.campaign_id
where c.name = '2026 3月VIP訪廠'
   or (c.name ilike '%3月%' and c.name ilike '%訪廠%')
   or (c.name ilike '%3月份%' and c.name ilike '%訪廠%')
order by b.seq, b.created_at;
