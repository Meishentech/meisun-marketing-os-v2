# Claude Code Review｜Phase 1 Batch 3 草案：多廠商與交付物（寫 SQL 前審查）

審查日期：2026-07-15
審查對象：`vendors`、`marketing_campaign_vendors`、`marketing_campaign_vendor_deliverables`、`marketing_campaign_documents.vendor_id`/`deliverable_id`
審查方式：實際重新比對 v1 `marketing-platform` 現行 schema（`schema_v9_documents.sql`、`schema.sql`、`schema_v13_user_access.sql`），並套用 Batch 1（`sql/phase1_batch1_leads.sql`）、Batch 2（`sql/phase1_batch2_associations.sql`、`sql/phase1_batch2_hardening.sql`）實際落地後學到的經驗。目前 repo 裡還沒有 Batch 3 的任何草稿，這份文件就是草案本身，供 Codex 動 SQL 前對齊。

---

## 結論摘要

Batch 3 三張新表 + 既有表兩個欄位新增，整體可行、不影響舊平台。這次重新核對抓到 **1 個之前沒發現的真實問題**：`marketing_campaign_documents.doc_type` 有 `check` 約束，目前允許的值（報價單/攤位設計圖/大會文件/廠商資料/其他）**不包含合約、設計稿、印刷檔、施工照片、完工照片**——這些正是原始 wireframe（p.17）明確要記錄的廠商文件類型，如果不擴充這個 check 約束，掛上 `vendor_id`/`deliverable_id` 後這些文件還是只能硬塞進「廠商資料」或「其他」，分類功能形同虛設。另外，Batch 3 **不需要像 Batch 2 那樣另外建一個 UNION view**，因為三張表是乾淨的 FK 鏈，PostgREST 原生的 resource embedding 就能直接查出巢狀結果，這點可以幫 Codex 省一批工。

---

## 1. 三張新表欄位設計

### 1.1 `vendors`（全域主檔）

| 欄位 | 型別 | 說明 |
|---|---|---|
| `id` | `uuid primary key default gen_random_uuid()` | |
| `name` | `text not null` | |
| `vendor_type` | `text` | 展覽/裝潢/美編/印刷/場地/攝影影音/其他，**建議不加 check 約束**（理由見第 6 節） |
| `contact_name` | `text` | |
| `contact_phone` | `text` | |
| `contact_email` | `text` | |
| `notes` | `text` | |
| `created_at` / `updated_at` | `timestamptz not null default now()` | |

索引：`create index if not exists idx_vendors_type on vendors(vendor_type);`（供依廠商類型篩選用）。

### 1.2 `marketing_campaign_vendors`（junction：這次專案跟這個廠商的合作關係）

| 欄位 | 型別 | 說明 |
|---|---|---|
| `id` | `uuid primary key default gen_random_uuid()` | |
| `campaign_id` | `uuid not null references marketing_campaigns(id) on delete cascade` | |
| `vendor_id` | `uuid not null references vendors(id) on delete restrict` | 用 `restrict` 避免刪除廠商主檔時，正在進行中的專案關聯資料無聲消失——如果真的要刪除廠商，要先處理掉關聯資料，這是刻意的保護 |
| `role_in_project` | `text` | 這次專案中的角色（場地/裝潢/美編/印刷/攝影） |
| `meisun_contact` | `citext references app_user_access(email)` | **注意型別是 `citext` 不是 `uuid`**——延續 Batch 1 `leads.assigned_sales` 已經驗證過的正確寫法，因為 v1 的使用者身分主鍵是 `app_user_access.email`（citext），不是 uuid |
| `quote_status` | `text default '待報價'` | 待報價/已報價/待核准/已簽約 |
| `budget_amount` | `numeric` | |
| `actual_amount` | `numeric` | |
| `payment_status` | `text default '未請款'` | 未請款/待付款/已付款 |
| `created_at` / `updated_at` | `timestamptz not null default now()` | |

索引：`(campaign_id)`、`(vendor_id)`。

**需要確認**：同一個廠商能不能在同一個專案裡出現兩次、擔任不同角色？（例如同一家公司同時是「印刷廠」又是「美編」）如果不行，要加 `unique(campaign_id, vendor_id)`；如果可以，就不加，維持現況。見第 6 節。

### 1.3 `marketing_campaign_vendor_deliverables`

| 欄位 | 型別 | 說明 |
|---|---|---|
| `id` | `uuid primary key default gen_random_uuid()` | |
| `campaign_vendor_id` | `uuid not null references marketing_campaign_vendors(id) on delete cascade` | **掛在 1.2 這張 junction 上，不是直接掛 `vendors`**——同一廠商在不同專案的交付物要能分開追蹤，這點延續先前 Phase 1 schema review 的設計，沒有變動 |
| `deliverable_name` | `text not null` | |
| `owner` | `citext references app_user_access(email)` | |
| `due_date` | `date` | |
| `status` | `text default '未開始'` | 未開始/進行中/待審核/已完成，比照既有 `association_tasks.task_status` 慣例 |
| `reviewer` | `citext references app_user_access(email)` | |
| `attachment` | `text` | |
| `notes` | `text` | |
| `created_at` / `updated_at` | `timestamptz not null default now()` | |

索引：`(campaign_vendor_id)`、`(status, due_date)`（供「逾期交付物」查詢用，這是總經理摘要要看的指標之一）。

---

## 2. 既有表新增欄位：發現一個之前沒抓到的問題

### 2.1 `marketing_campaign_documents.vendor_id` / `deliverable_id`——欄位本身沒問題

```sql
alter table marketing_campaign_documents add column if not exists vendor_id uuid references marketing_campaign_vendors(id) on delete set null;
alter table marketing_campaign_documents add column if not exists deliverable_id uuid references marketing_campaign_vendor_deliverables(id) on delete set null;
```

**特別注意 FK 目標**：欄位叫 `vendor_id`，但 FK 指向的是 `marketing_campaign_vendors.id`（這次專案的廠商合作關係），**不是** `vendors.id`（全域廠商主檔）。這是刻意的——文件已經有 `campaign_id`（`not null`），如果 `vendor_id` 又直接指回全域 `vendors` 表，遇到同一廠商在同一專案有多個角色（第 1.2 節那個待確認的情境）時會分不清這份文件屬於哪一次合作關係。指向 `marketing_campaign_vendors.id` 才能精確定位。這點容易因為欄位命名直覺而接錯 FK 目標，Codex 寫 SQL 時要特別留意。

### 2.2 新發現：`doc_type` check 約束沒有涵蓋廠商文件類型

重新核對 `schema_v9_documents.sql` 原始檔案：

```sql
doc_type text not null default '其他' check (doc_type in ('報價單','攤位設計圖','大會文件','廠商資料','其他')),
```

目前只允許這 5 種值。對照原始 wireframe（p.17）明確列出的廠商相關文件：**報價單、合約、設計稿、印刷檔、施工照片、完工照片**——「合約」「印刷檔」「施工照片」「完工照片」都不在允許清單裡，「設計稿」勉強可以對到「攤位設計圖」但語意偏窄（不是所有廠商設計稿都跟攤位有關，例如期刊廣告設計稿）。

如果 Batch 3 只加 `vendor_id`/`deliverable_id` 兩個欄位、不動這個 check 約束，使用者上傳廠商合約時系統會直接拒絕（違反 check 約束報錯），或被迫全部分類成「廠商資料」，讓分類功能失去意義。

**建議一併擴充這個 check 約束**：

```sql
alter table marketing_campaign_documents drop constraint if exists marketing_campaign_documents_doc_type_check;
alter table marketing_campaign_documents add constraint marketing_campaign_documents_doc_type_check
  check (doc_type in ('報價單','合約','設計稿','印刷檔','施工照片','完工照片','攤位設計圖','大會文件','廠商資料','其他'));
```

這個操作技術上是「先刪再建約束」，但**不刪除任何欄位、不改變欄位型別、不影響任何既有資料**——新清單是舊清單的超集合，既有資料的 `doc_type` 值全部仍然合法，只是放寬允許範圍，符合「不破壞既有功能」的精神，但技術上不是單純的 `add column`，需要你確認是否要一併納入這批 migration（第 6 節）。

---

## 3. 是否需要額外的彙總 view——不需要，這點跟 Batch 2 不一樣

Batch 2 的 `association_cooperation_overview` 需要另建 view，是因為三張來源表（task/event/publication）彼此**沒有 FK 關聯**，是三個獨立的「合作紀錄」，只能用 `UNION ALL` 硬併起來。

Batch 3 的情況不同：`vendors` → `marketing_campaign_vendors` → `marketing_campaign_vendor_deliverables` 是一條**乾淨的 FK 鏈**，彼此有明確的父子關係。這種情況下，PostgREST 原生支援用 resource embedding 直接查出巢狀結果，不需要另外建 view：

```
GET /rest/v1/marketing_campaign_vendors?campaign_id=eq.xxx&select=*,vendors(name,vendor_type),marketing_campaign_vendor_deliverables(*)
```

一次 REST 呼叫就能拿到「這個專案的所有廠商 + 每個廠商的交付物」巢狀資料，前端不用像 Batch 2 那樣自己在 JS 裡做 `sortCooperations` 之類的合併邏輯。**這點可以幫 Codex 省掉一個 view + 一組前端合併程式碼**，Batch 3 應該比 Batch 2 簡單。

（第 5 節的「總經理摘要欄位」如果之後需要一次查出跨專案的彙總數字，那類「彙總」query 用一般的 REST 查詢加 `select=count()` 或前端聚合就夠了，不需要為了這個新建 view。）

---

## 4. 是否會影響舊平台

| 檢查項目 | 結果 |
|---|---|
| 不改舊表名 | ✅ 三張新表命名跟現有 22+ 張表無衝突 |
| 不刪欄位 | ✅ 沒有對 `marketing_campaign_documents`/`marketing_campaigns`/`app_user_access` 做任何刪除操作 |
| 不改欄位型別 | ✅ 沒有任何 `alter column ... type` |
| 只新增 | ⚠️ **有一項例外**：第 2.2 節的 `doc_type` check 約束需要「刪除再重建」，不是純粹的新增。技術上不影響既有資料（新清單涵蓋舊清單），但嚴格來說不是「只新增」——這點需要你明確同意才能做，不建議 Codex 自己判斷後直接決定做或跳過。 |

---

## 5. 建議 SQL 結構、Index、RLS/Grant

### RLS/Grant 寫法：延續 Batch 1/2 已經建立的 v2 自有慣例，不是照抄 v1 最舊的寫法

v1 現有程式碼裡其實有兩種不同時期的 RLS 寫法：`marketing_campaign_tasks`/`marketing_campaign_documents` 這批（`schema.sql`~`v9`）完全沒有下明確的 `grant` 語句，只靠 `enable row level security` + policy；而 Batch 1（`leads`）、Batch 2（`associations`）都額外下了明確的 `grant select,insert,update,delete ... to authenticated;`。**建議 Batch 3 延續 Batch 1/2 的做法**（明確 grant），這是 v2 這批新表已經一致採用、且實際驗證過可以動作的寫法，不需要回頭模仿更早期可能依賴專案預設權限、沒有寫明的舊風格。

```sql
create table if not exists vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  vendor_type text,
  contact_name text,
  contact_phone text,
  contact_email text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists marketing_campaign_vendors (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references marketing_campaigns(id) on delete cascade,
  vendor_id uuid not null references vendors(id) on delete restrict,
  role_in_project text,
  meisun_contact citext references app_user_access(email),
  quote_status text default '待報價',
  budget_amount numeric,
  actual_amount numeric,
  payment_status text default '未請款',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists marketing_campaign_vendor_deliverables (
  id uuid primary key default gen_random_uuid(),
  campaign_vendor_id uuid not null references marketing_campaign_vendors(id) on delete cascade,
  deliverable_name text not null,
  owner citext references app_user_access(email),
  due_date date,
  status text default '未開始',
  reviewer citext references app_user_access(email),
  attachment text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vendors_type on vendors(vendor_type);
create index if not exists idx_marketing_campaign_vendors_campaign on marketing_campaign_vendors(campaign_id);
create index if not exists idx_marketing_campaign_vendors_vendor on marketing_campaign_vendors(vendor_id);
create index if not exists idx_marketing_campaign_vendor_deliverables_cv on marketing_campaign_vendor_deliverables(campaign_vendor_id);
create index if not exists idx_marketing_campaign_vendor_deliverables_status on marketing_campaign_vendor_deliverables(status, due_date);

alter table vendors enable row level security;
alter table marketing_campaign_vendors enable row level security;
alter table marketing_campaign_vendor_deliverables enable row level security;

grant select, insert, update, delete on vendors to authenticated;
grant select, insert, update, delete on marketing_campaign_vendors to authenticated;
grant select, insert, update, delete on marketing_campaign_vendor_deliverables to authenticated;

drop policy if exists "authenticated manage vendors" on vendors;
create policy "authenticated manage vendors" on vendors
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated manage campaign vendors" on marketing_campaign_vendors;
create policy "authenticated manage campaign vendors" on marketing_campaign_vendors
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated manage campaign vendor deliverables" on marketing_campaign_vendor_deliverables;
create policy "authenticated manage campaign vendor deliverables" on marketing_campaign_vendor_deliverables
  for all to authenticated using (true) with check (true);

alter table marketing_campaign_documents add column if not exists vendor_id uuid references marketing_campaign_vendors(id) on delete set null;
alter table marketing_campaign_documents add column if not exists deliverable_id uuid references marketing_campaign_vendor_deliverables(id) on delete set null;

create index if not exists idx_marketing_campaign_documents_vendor on marketing_campaign_documents(vendor_id);
create index if not exists idx_marketing_campaign_documents_deliverable on marketing_campaign_documents(deliverable_id);
```

（`doc_type` check 約束擴充見第 2.2 節，待你確認後再加進這批或另開一個 hardening 檔，比照 Batch 2 用 `sql/phase1_batch2_hardening.sql` 補救的模式。）

**這次沒有全域共用設定表**（不像 Batch 2 的 `association_stage_options` 全站共用），三張新表的資料都是「屬於某個專案的資料」，不會出現 Batch 2 那種「誤刪一筆全站都壞」的風險，所以這次不需要額外收回 `delete` 權限。

---

## 6. Codex 寫 SQL 前需要跟你/行銷總監確認的規則

1. **`doc_type` check 約束要不要在這批一起擴充？**（第 2.2 節）不擴充的話，廠商合約、印刷檔、施工/完工照片這些文件類型上傳時會被資料庫拒絕或被迫分類成「其他」。
2. **同一個廠商能不能在同一個專案裡掛兩次、擔任不同角色？** 如果不行，`marketing_campaign_vendors` 要加 `unique(campaign_id, vendor_id)`；如果可以（例如同一家公司同時做印刷又做美編），維持現況不加限制。
3. **`vendors.vendor_type` 要不要限定固定清單？** 延續上一輪 Phase 1 schema review 的建議，先開放自由文字，避免新類型要改 SQL，但如果行銷總監覺得統計時類型打法不一致會困擾（例如「美編」vs「設計」各打各的），可以之後再加 check 約束或前端下拉選單限制輸入。
4. **`marketing_campaign_vendors.budget_amount`/`actual_amount` 之後要不要併入 `all_expenses_overview`？**（Batch 6 才會建這個 view，這裡先標記）如果總經理希望「總支出」也包含廠商費用，Batch 6 的彙總 view 要記得加這張表當第四個 UNION 分支，不只是原本規劃的三張費用表。這裡先提醒，不影響 Batch 3 本身。
