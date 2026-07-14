# Claude Code Schema Review｜Phase 1 資料表（寫 SQL 前審查）

審查日期：2026-07-14
審查對象：Phase 1 預計新增的 13 張表、4 個既有表欄位、2 個彙總 view（`docs/phase-1-mvp.md` 現況）
審查方式：實際比對 v1 `marketing-platform` 的既有表結構（`schema.sql` ~ `schema_v26`），確認每張新表的 FK 型別、每個 view 的來源欄位是否真的兜得起來，而不是只確認表名清單。

---

## 結論摘要

13 張新表的範圍是完整的，命名也跟 v1 現有表無衝突。4 項既有表欄位新增全部安全（純 nullable 新增，不影響舊查詢）。但這次逐欄位核對抓到 **1 個會讓 `all_expenses_overview` view 資料不一致的真實問題**：`marketing_campaign_budget_items` 目前完全沒有 `payment_status` 或任何日期欄位，跟另外兩張費用表（`association_fee_records`、`association_task_expenses`）的欄位形狀對不上，view 做出來「狀態」欄位會語意錯亂。詳見第 3 節。

---

## 1. 新表完整性檢查（13 張）

逐表列出建議欄位，FK 型別均已對照 v1 既有表實際定義（`app_user_access.email` 是 `citext`、其餘主鍵均為 `uuid`）。

### 1.1 `leads`

| 欄位 | 型別 | 說明 |
|---|---|---|
| `id` | `uuid primary key default gen_random_uuid()` | |
| `company_name` | `text not null` | |
| `contact_name` | `text` | |
| `contact_phone` | `text` | |
| `contact_email` | `text` | |
| `source_channel` | `text` | 研討會/官網/LINE/Facebook/公會/標案/其他，**需行銷總監確認實際清單**（見第 6 節） |
| `source_campaign_id` | `uuid references marketing_campaigns(id) on delete set null` | |
| `source_association_id` | `uuid references associations(id) on delete set null` | |
| `source_tender_result_id` | `uuid references tender_results(id) on delete set null` | |
| `requirement_note` | `text` | |
| `importance` | `text default '中'` | 高/中/低，比照 `marketing_campaigns.priority` 現有慣例 |
| `assigned_sales` | `citext references app_user_access(email)` | **注意型別是 citext 不是 uuid**，因為 v1 的使用者身分主鍵是 email 不是 uuid |
| `stage` | `text not null default '詢問'` | 詢問/有效名單/業務跟進/形成商機/需主管協助 |
| `next_step` | `text` | |
| `next_followup_date` | `date` | |
| `created_at` / `updated_at` | `timestamptz not null default now()` | |

索引：`(assigned_sales, stage)`（業務「我的名單」查詢用）、`(source_channel, stage)`（Channel 成效報表用）、`(next_followup_date)`（逾期提醒用）。

### 1.2 `lead_follow_ups`

| 欄位 | 型別 | 說明 |
|---|---|---|
| `id` | `uuid primary key default gen_random_uuid()` | |
| `lead_id` | `uuid not null references leads(id) on delete cascade` | |
| `update_note` | `text not null` | |
| `updated_by` | `citext references app_user_access(email)` | |
| `update_date` | `date not null default current_date` | |
| `next_followup_date` | `date` | |
| `created_at` | `timestamptz not null default now()` | |

完全比照既有 `marketing_campaign_risk_updates` 的 pattern，欄位命名也刻意對齊，降低前端寫法差異。

### 1.3 `vendors`

| 欄位 | 型別 | 說明 |
|---|---|---|
| `id` | `uuid primary key default gen_random_uuid()` | |
| `name` | `text not null` | |
| `vendor_type` | `text` | 展覽/裝潢/美編/印刷/公會/場地/其他，**需行銷總監確認是否要 check constraint 或開放自由文字**（見第 6 節） |
| `contact_name` | `text` | |
| `contact_phone` | `text` | |
| `contact_email` | `text` | |
| `notes` | `text` | |
| `created_at` / `updated_at` | `timestamptz not null default now()` | |

### 1.4 `marketing_campaign_vendors`（junction）

| 欄位 | 型別 | 說明 |
|---|---|---|
| `id` | `uuid primary key default gen_random_uuid()` | |
| `campaign_id` | `uuid not null references marketing_campaigns(id) on delete cascade` | |
| `vendor_id` | `uuid not null references vendors(id) on delete restrict` | 用 `restrict` 避免刪除廠商主檔時，正在進行中的專案關聯資料無聲消失 |
| `role_in_project` | `text` | 場地/裝潢/美編/印刷/攝影等，此專案中的角色 |
| `meisun_contact` | `citext references app_user_access(email)` | 美昇對接人 |
| `quote_status` | `text default '待報價'` | 待報價/已報價/待核准/已簽約，跟既有 `budget_items.quote_status` 用語對齊 |
| `budget_amount` | `numeric` | |
| `actual_amount` | `numeric` | |
| `payment_status` | `text default '未請款'` | 未請款/待付款/已付款 |
| `created_at` / `updated_at` | `timestamptz not null default now()` | |

索引：`(campaign_id)`、`(vendor_id)`。

### 1.5 `marketing_campaign_vendor_deliverables`

| 欄位 | 型別 | 說明 |
|---|---|---|
| `id` | `uuid primary key default gen_random_uuid()` | |
| `campaign_vendor_id` | `uuid not null references marketing_campaign_vendors(id) on delete cascade` | **掛在 campaign-vendor 這層，不是直接掛 `vendors`**——同一廠商在不同專案的交付物要能分開追蹤 |
| `deliverable_name` | `text not null` | |
| `owner` | `citext references app_user_access(email)` | |
| `due_date` | `date` | |
| `status` | `text default '未開始'` | 未開始/進行中/待審核/已完成，比照 `association_tasks.task_status` 現有慣例 |
| `reviewer` | `citext references app_user_access(email)` | |
| `attachment` | `text` | |
| `notes` | `text` | |
| `created_at` / `updated_at` | `timestamptz not null default now()` | |

### 1.6 `sales_requests`

| 欄位 | 型別 | 說明 |
|---|---|---|
| `id` | `uuid primary key default gen_random_uuid()` | |
| `request_name` | `text not null` | |
| `requested_by` | `citext references app_user_access(email)` | |
| `lead_id` | `uuid references leads(id) on delete set null` | |
| `request_type` | `text` | 簡報/案例/DM/市場分析/競爭力分析/影片/活動邀請 |
| `priority` | `text default '一般'` | 急件/一般/低 |
| `status` | `text not null default '待處理'` | 待處理/處理中/待業務確認/已完成 |
| `assigned_to` | `citext references app_user_access(email)` | |
| `due_date` | `date` | |
| `description` | `text` | |
| `deliverable_resource_id` | `uuid references marketing_resources(id) on delete set null` | 完成後回填，**是否強制要求成品必須先進 `marketing_resources` 才能標記完成，需業務流程確認**（見第 6 節） |
| `created_at` / `completed_at` | `timestamptz` | `created_at not null default now()`，`completed_at` nullable |

### 1.7 `approval_requests`

| 欄位 | 型別 | 說明 |
|---|---|---|
| `id` | `uuid primary key default gen_random_uuid()` | |
| `entity_type` | `text not null` | `budget_item` / `vendor_quote` / `knowledge_item` 等，**用文字而非 FK**，因為要跨多張表通用 |
| `entity_id` | `uuid not null` | 對應 `entity_type` 指到的那張表的 id，不設實體 FK 約束（跨表通用表的常見取捨） |
| `requested_by` | `citext references app_user_access(email)` | |
| `approver_role` | `text not null` | 對齊決策 #8 的角色寫死清單：`executive`/`marketing`/`admin` |
| `status` | `text not null default '待審核'` | 待審核/已核准/需修正 |
| `decided_by` | `citext references app_user_access(email)` | |
| `decided_at` | `timestamptz` | |
| `decision_note` | `text` | |
| `created_at` | `timestamptz not null default now()` | |

**注意**：`entity_id` 沒有實體 FK 約束是刻意設計（通用審核表的標準取捨），但代表資料完整性要靠應用層保證，不是資料庫層。索引：`(entity_type, entity_id)`、`(status, approver_role)`。

### 1.8 `association_stage_options`

| 欄位 | 型別 | 說明 |
|---|---|---|
| `id` | `uuid primary key default gen_random_uuid()` | |
| `entity_type` | `text not null` | `event` / `publication` |
| `stage_name` | `text not null` | |
| `sort_order` | `integer not null` | |
| `pct_value` | `integer not null` | 0-100 |
| `created_at` / `updated_at` | `timestamptz not null default now()` | |

唯一約束：`unique(entity_type, stage_name)`。初始資料（草案，待行銷總監定案）：
- `event`：待確認(0) → 已確認合作/排期(25) → 素材準備中(50) → 執行中(75) → 已結束(100)
- `publication`：待確認主題(0) → 素材製作中(33) → 已投稿/截稿(66) → 已確認刊出(100)

### 1.9 `association_relationship_tags`

| 欄位 | 型別 | 說明 |
|---|---|---|
| `id` | `uuid primary key default gen_random_uuid()` | |
| `association_id` | `uuid not null references associations(id) on delete cascade` | |
| `tag` | `text not null` | 已入會/未入會/評估中/曾合作/洽談中/講座協辦/期刊合作/活動贊助/年度贊助/暫停合作/待確認/自訂 |
| `created_at` | `timestamptz not null default now()` | |

唯一約束：`unique(association_id, tag)`（避免同一公會重複打同一個標籤）。這是這次補回 Phase 1 的表（前次審查發現漏掉，`phase-1-mvp.md` 已經補上）。

### 1.10-1.13 產品知識庫四表

**`product_knowledge_items`**

| 欄位 | 型別 | 說明 |
|---|---|---|
| `id` | `uuid primary key default gen_random_uuid()` | |
| `title` | `text not null` | |
| `product_line` | `text` | |
| `knowledge_type` | `text not null` | 市場差異化/技術比較/競品分析/客戶異議處理/應用場景/FAQ/簡報說法/資料待確認 |
| `target_segment` | `text` | |
| `use_context` | `text` | |
| `summary` | `text` | |
| `detail` | `text` | |
| `recommended_pitch` | `text` | |
| `prohibited_pitch` | `text` | |
| `external_usable` | `text not null default '需審核'` | 是/否/需審核 |
| `evidence_level` | `text not null default 'C'` | A/B/C/D |
| `owner` | `citext references app_user_access(email)` | |
| `version` | `integer not null default 1` | |
| `related_competitor` | `text` | |
| `approval_status` | — | **不加這個欄位**，審核狀態走共用的 `approval_requests`（`entity_type='knowledge_item'`），避免跟決策 #（approval_requests 設計初衷）重複 |
| `created_at` / `updated_at` | `timestamptz not null default now()` | |

**`product_knowledge_sources`**：`id`、`source_name text not null`、`source_type text`（原廠文件/第三方測試/內部實測/客戶回饋）、`url_or_file text`、`verified_by citext references app_user_access(email)`、`verified_date date`、`created_at`。

**`product_knowledge_item_sources`**（junction）：`id`、`knowledge_item_id uuid not null references product_knowledge_items(id) on delete cascade`、`source_id uuid not null references product_knowledge_sources(id) on delete cascade`，唯一約束 `unique(knowledge_item_id, source_id)`。

**`product_knowledge_resource_links`**（junction，對應決策 #5 雙向關聯）：`id`、`knowledge_item_id uuid not null references product_knowledge_items(id) on delete cascade`、`resource_id uuid not null references marketing_resources(id) on delete cascade`，唯一約束 `unique(knowledge_item_id, resource_id)`。

---

## 2. 既有表新增欄位安全性檢查

| 欄位 | 型別 | 安全性檢查 |
|---|---|---|
| `tender_results.converted_lead_id` | `uuid references leads(id) on delete set null` | 安全——nullable，不影響既有列。**依賴順序**：必須在 `leads` 表建好之後才能加這個欄位，否則 FK 會找不到目標表。 |
| `marketing_campaign_documents.vendor_id` | `uuid references marketing_campaign_vendors(id) on delete set null` | 安全，nullable。**注意 FK 指向 `marketing_campaign_vendors`（junction）而不是 `vendors`（主檔）**——理由同 1.5，文件要能分清楚是「這次合作的哪一次」，不是只知道廠商是誰。 |
| `marketing_campaign_documents.deliverable_id` | `uuid references marketing_campaign_vendor_deliverables(id) on delete set null` | 安全，nullable，依賴 1.5 先建好。 |
| `marketing_campaign_performance.channel` | `text` | 安全，nullable，不影響既有 `lead_count` 等欄位語意，純粹新增維度。 |

四項都是 `add column if not exists` 純新增，不改既有欄位型別、不改預設值、不影響既有 SELECT/INSERT（除非舊程式碼用 `select *` 又用陣列位置對應而非欄位名——已確認 v1 `app.js` 都是用具名欄位讀寫，沒有這個風險）。

---

## 3. 彙總 View 合理性檢查

### 3.1 `association_cooperation_overview`——可行，UNION 三張表即可

```sql
create or replace view association_cooperation_overview as
select
  id, association_id, task_name as item_name, task_type as item_type,
  task_status as stage, owner, due_date, progress_pct, next_step,
  notes, attachment, created_at, updated_at, 'task' as source_table
from association_tasks
union all
select
  id, association_id, event_name, event_type,
  event_status, owner, event_date, null, result_notes,
  notes, attachment, created_at, updated_at, 'event'
from association_events
union all
select
  id, association_id, publication_name, '期刊刊登',
  material_status, owner, deadline_date, null, result_notes,
  null, attachment, created_at, updated_at, 'publication'
from association_publication_schedules;
```

三張來源表欄位型別可以直接對齊（`text`/`date`/`timestamptz` 都相容），`progress_pct` 只有 `association_tasks` 有真實數值，event/publication 這欄位回 `null`，畫面上改用 `stage` 去 join `association_stage_options` 算百分比顯示——這個設計跟第 1.8 節一致，沒有衝突。**可行，建議照此結構實作。**

### 3.2 `all_expenses_overview`——欄位對不齊，需要先補一個欄位

比對三張來源表的實際欄位（已用 `grep` 核對現有 schema 檔案，非推測）：

| 欄位語意 | `marketing_campaign_budget_items` | `association_fee_records` | `association_task_expenses` |
|---|---|---|---|
| 金額 | `amount_twd` | `fee_amount` | `actual_amount` / `budget_amount` |
| **付款狀態** | **沒有這個欄位，只有 `quote_status`（報價階段）** | `payment_status` | `payment_status` |
| **日期** | **完全沒有日期欄位** | `payment_date` / `due_date` | `payment_date` |

`marketing_campaign_budget_items` 現況沒有 `payment_status`、也沒有任何日期欄位。如果直接 UNION，view 的「狀態」欄位對這張表只能顯示 `quote_status`（報價中/已報價這種語意），跟另外兩張表顯示的「已付款/未付款」語意不一樣，總經理看這個彙總表時會誤判——同一欄位「狀態」在不同列代表完全不同的事。「日期」欄位對 `budget_items` 那幾列則永遠是空的，沒辦法排序或篩選逾期項目。

**建議**：在這批 migration 順便給 `marketing_campaign_budget_items` 加兩個 nullable 欄位：`payment_status text`、`payment_date date`（純新增，不影響既有欄位，符合「只新增」原則）。加了之後三張表才有對齊的欄位可以做 UNION，`all_expenses_overview` 這個 view 才有意義。如果不想加欄位，退而求其次的做法是 view 裡把 `budget_items` 的狀態統一顯示成「不適用」而不是硬塞 `quote_status`，但這樣總經理戰情室的「待付款」數字會漏掉行銷案本身的費用項目，只看得到公會那兩張表的付款狀態，準確度會打折。**這點需要你或行銷總監拍板**（見第 6 節）。

---

## 4. 是否影響舊平台——逐項確認

| 檢查項目 | 結果 |
|---|---|
| 不改舊表名 | ✅ 13 張新表 + 2 個 view 全部是新名稱，跟 v1 現有 22 張表無衝突（含這次新發現的 `payment_status`/`payment_date` 建議，也是加欄位不是改表名） |
| 不刪舊欄位 | ✅ 所有變更都是 `add column`，沒有任何 `drop column` |
| 不改舊欄位型別 | ✅ 沒有任何 `alter column ... type` 操作 |
| 只新增表、欄位、index、view | ✅ 全部符合，唯一需要注意的是欄位新增有**依賴順序**（`tender_results.converted_lead_id` 要等 `leads` 建好、`marketing_campaign_documents` 兩個欄位要等 `marketing_campaign_vendors`/`vendor_deliverables` 建好），順序錯了 migration 會直接失敗（FK 找不到目標表），但不會損壞任何既有資料。 |

---

## 5. 建議 Migration 順序與每批驗收方式

| 批次 | 內容 | 驗收方式 |
|---|---|---|
| 0 | （已完成）後端連線骨架、`app_user_access` role 授權 | 確認 `sql/phase1_access_role_grants.sql` 已在 Supabase SQL Editor 執行，登入後 `state.auth.role` 正確帶出。 |
| 1 | `leads`、`lead_follow_ups` | 手動 insert 一筆測試 lead，確認 `assigned_sales` 能對到 `app_user_access` 現有帳號；用 REST API 依 `assigned_sales` 篩選能查回該筆。 |
| 2 | `tender_results.converted_lead_id` | 確認舊的 `tender_results` 查詢（現有招標頁）不受影響；手動把一筆標案的 `converted_lead_id` 指到批次 1 建的測試 lead，確認 FK 生效。 |
| 3 | `association_stage_options`、`association_relationship_tags`、`association_cooperation_overview` view | 執行 view 的 SELECT，確認三種來源（task/event/publication）都各自出現至少一列（用既有測試資料，v1 已有 associations 種子資料）；`association_relationship_tags` insert 兩個不同標籤到同一個 `association_id`，確認 `unique` 約束允許多筆。 |
| 4 | `vendors`、`marketing_campaign_vendors`、`marketing_campaign_vendor_deliverables`、`marketing_campaign_documents.vendor_id`/`deliverable_id` | 建一筆測試 vendor → 掛到一個既有 campaign → 建一筆 deliverable，確認三層關聯查詢得到預期結果；確認既有 `marketing_campaign_documents` 舊資料的 `vendor_id`/`deliverable_id` 都是 `null`（不影響舊文件記錄）。 |
| 5 | `sales_requests`、`approval_requests` | 建一筆測試需求單，`status` 從待處理改到已完成；建一筆測試審核，確認 `entity_type`/`entity_id` 可以指向任一張表且沒有資料庫層報錯（因為刻意不設 FK）。 |
| 6 | 產品知識庫四表 | 建一筆 A 等級知識條目，關聯一個既有 `marketing_resources` 記錄，確認 `product_knowledge_resource_links` 雙向查詢都查得到（從知識條目查資源、從資源查知識條目）。 |
| 7 | `marketing_campaign_budget_items.payment_status`/`payment_date`（待第 6 節確認後才做）+ `all_expenses_overview` view + `marketing_campaign_performance.channel` | 執行 view 的 SELECT，確認三個來源都出現且「狀態」「日期」欄位語意一致（不再是批次前那種語意混雜）。 |

每一批做完，建議同時打開 v1 正式平台（`marketing-a4l.pages.dev`）確認既有頁面正常（因為都是同一個 Supabase project），這比在測試環境驗證更直接。

---

## 6. Codex 寫 SQL 前需要跟你確認的商業規則

1. **`marketing_campaign_budget_items` 要不要加 `payment_status`/`payment_date`？**（第 3.2 節新發現）不加的話 `all_expenses_overview` 的「狀態」「日期」欄位對行銷案費用項目會不準確，只能看到公會那兩張表的付款狀態。
2. **`leads.source_channel` 的正式清單是什麼？** 目前草擬「研討會/官網/LINE/Facebook/公會/標案/其他」，是否有漏掉的通路（例如展會現場掃碼、referral 介紹）。
3. **`vendors.vendor_type` 要不要限定固定清單（check constraint），還是開放自由文字？** 固定清單方便統計但新增類型要改 SQL；自由文字彈性高但可能同義詞打法不一致（例如「美編」vs「設計」）。
4. **`sales_requests.deliverable_resource_id` 是否強制要求成品先進 `marketing_resources` 才能標記完成？** 還是可以只夾附件、不進正式資源庫。
5. **`approval_requests.approver_role` 的判斷金額門檻是多少？** 原始需求提過「需總經理核准金額」，但沒有具體數字（例如超過 10 萬要總經理核准，以下行銷總監自己核准）——這個門檻要行銷總監/總經理定案，才能決定前端什麼時候自動產生一筆 `approval_requests`。
6. **`association_stage_options` 的初始階段清單是否要現在就定案，還是先用草案上線、之後行銷總監自己在系統裡調整？**（依先前決策，系統本來就設計成可編輯，這題主要是問「要不要先給一個更準的初版」）
