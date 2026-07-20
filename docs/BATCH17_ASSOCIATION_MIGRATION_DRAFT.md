# Batch 17 草案：公會管理完整搬遷

建立日期：2026-07-20

## 背景

Batch 11 到 Batch 15 已讓 V2 接手：行銷資源、行銷案主檔、任務/預算/文件、風險/追蹤紀錄、成效資料、Channel 成效、週報摘要，且已完成 V1 對應 8 張表新增/編輯入口全面凍結。

目前決策：招標工具先不處理，接下來優先完成公會管理、權限治理、成功案例庫、新聞/文案營運，**公會管理是最高優先**。V2 最終要取代 V1。

公會管理是目前 V1 唯一還保留完整 CRUD（含真刪除）且範圍橫跨 8 張表的模組，也是目前規模最大的單一搬遷對象。

## 1. V1 公會相關表盤點（直接查 schema 檔案 + app.js 確認，非推測）

### 8 張表，確認齊全，沒有遺漏

| 表 | 用途 | 建立於 |
| --- | --- | --- |
| `associations` | 公會主檔 | `schema_v17_associations.sql` |
| `association_fee_records` | 年費/會費紀錄 | `schema_v17_associations.sql` |
| `association_benefits` | 會員權益 | `schema_v17_associations.sql` |
| `association_publication_schedules` | 期刊刊登排程 | `schema_v17_associations.sql` |
| `association_events` | 活動（會員大會/協辦/講座/展覽/餐會） | `schema_v17_associations.sql` |
| `association_notes` | 自由備註 | `schema_v18_association_notes.sql` |
| `association_tasks` | 公會任務 | `schema_v19_association_tasks_expenses.sql` |
| `association_task_expenses` | 任務費用 | `schema_v19_association_tasks_expenses.sql` |

用戶列的 8 張表跟實際 schema 完全一致，沒有找到第 9 張表。

### Storage bucket：沒有

所有 `attachment` / `receipt_attachment` 欄位（`association_fee_records`、`association_publication_schedules`、`association_events`、`association_notes`、`association_task_expenses`）在 V1 `app.js` 裡都是**純文字輸入框**（例如 `document.getElementById('ap-attachment').value.trim()`），全站搜尋 `uploadStorageFile`/`getSignedUrl` 沒有任何一筆跟公會相關——V1 從來沒有真的做過公會附件上傳，欄位只是讓使用者貼網址或檔名。**這代表 Batch17 不需要處理任何 Storage bucket 遷移**，除非決定順便把這批附件欄位升級成真上傳（見「需要拍板」第6題）。

### 容易被忽略的跨表關聯（三處，Batch17 必須保留）

1. `marketing_campaigns.association_id` / `association_activity_type`（`schema_v21_campaign_associations.sql`）——**V2 已經在用**：`campaignFormHtml()` 的行銷案表單本來就有「關聯公會」下拉與活動類型欄位（`assets/app.js:4784-4789`）。
2. `association_tasks.marketing_campaign_id`——公會任務可以反向關聯到行銷案。
3. `association_publication_schedules.task_id` / `association_events.task_id`——期刊排程、活動都可以掛在某個公會任務底下（V1 UI 有對應下拉，`setAssocTaskSelect`）。

Batch17 的 SQL 跟 UI 都要保留這三條關聯，不能因為專注在「公會」而漏接「公會↔行銷案」的既有橋接。

### V1 刪除風險：`associations` 真刪除會 cascade 掉全部 7 張子表

查了完整 FK 定義：`association_fee_records`、`association_benefits`、`association_publication_schedules`、`association_events`、`association_notes`、`association_tasks`、`association_task_expenses` 全部是 `references associations(id) on delete cascade`。V1 `delAssociation()` 的確認文字只提到「相關年費、權益、期刊與活動紀錄也會刪除」，**沒有提到備註、任務、任務費用也會一起被清空**——實際刪除範圍比 UI 文案講的還大。這是目前全公司資料庫裡 cascade 半徑最大的一個真刪除按鈕，比之前凍結過的任何一個都嚴重，應列為最高優先凍結項目。

`association_tasks` 刪除則是 `on delete set null` 波及 `association_publication_schedules.task_id` / `association_events.task_id` / `association_task_expenses.task_id`——不會砍資料，但會讓期刊/活動/費用紀錄悄悄斷開跟原任務的關聯。

## 2. V2 目前已經有什麼

### 資料層

- `association_stage_options`（Batch2）：event/publication 兩種階段的百分比對照表，已 seed 9 筆（`待確認→已結束`、`待確認主題→已確認刊出`）。Grant 只給了 `select, insert, update`，**沒有 delete 權限**——這個設計本身沒問題（階段選項不該被隨便刪），但目前 V2 前端完全沒有讀這張表來畫進度條或階段徽章，是已建好但沒接上 UI 的基礎設施。
- `association_relationship_tags`（Batch2）：`unique(association_id, tag)`，**這就是使用者要的多標籤機制，資料模型已經是對的，不用重新設計**——一個公會可以有多筆 tag row，天生支援「已入會＋講座協辦＋年度贊助」同時成立。但目前沒有任何 seed 資料、沒有任何新增/移除 tag 的 UI 或 action handler。
- `association_cooperation_overview`（Batch2 view）：把 `association_tasks` / `association_events` / `association_publication_schedules` 三張表 union 成一個「合作紀錄時間軸」，`security_invoker=true` 跟 `grant select` 都有。**只涵蓋 3 張表，`association_fee_records`／`association_benefits`／`association_notes`／`association_task_expenses` 完全沒進這個 view**，而且因為 V1 這幾張表目前沒有生命週期欄位，view 也還沒有任何 `cancelled_at is null` 過濾。

### 前端層

- `marketing:associations` 頁面存在，兩個 section：
  - `associationSection()`：讀 `association_cooperation_overview`，純表格顯示，唯讀。
  - `associationTagsSection()`：讀 `association_relationship_tags`，沒有標籤時 fallback 顯示 `join_status`，純顯示，唯讀。
- **全站搜尋 `action === "*association*"`，零筆結果**——目前沒有任何一個公會相關的新增/編輯/封存/標籤管理的 action handler 或 modal 函式。V2 對公會模組目前是 100% 唯讀。

值得注意：`associationTagsSection()` 的 demo/fallback 資料（`state.dataStatus` 不是 live 時顯示的假資料，`assets/app.js:2293`）裡已經寫著「已入會、未入會、洽談中、講座協辦、期刊合作、活動贊助」——這組詞彙在專案早期就被設想過，只是從來沒有變成真正的 seed 資料或 UI，可以直接拿來當這次多標籤的起始詞彙表。

## 3. 完成度總表

| 表 / 功能 | V1 | V2 |
| --- | --- | --- |
| `associations` 主檔 CRUD | 完整（含真刪除） | 無 |
| `association_relationship_tags` 標籤管理 | 不存在（V1 用單值 `join_status` + 自訂選項） | 資料模型存在，唯讀顯示，無新增/移除 |
| `association_fee_records` | 完整 CRUD | 無，甚至沒有唯讀 |
| `association_benefits` | 完整 CRUD | 無，甚至沒有唯讀 |
| `association_publication_schedules` | 完整 CRUD | 唯讀（透過 overview view） |
| `association_events` | 完整 CRUD | 唯讀（透過 overview view） |
| `association_notes` | 完整 CRUD | 無，甚至沒有唯讀 |
| `association_tasks` | 完整 CRUD | 唯讀（透過 overview view） |
| `association_task_expenses` | 完整 CRUD | 無，甚至沒有唯讀，但**已經在 `all_expenses_overview` 裡被彙總**（見下方 SQL 章節） |
| `association_stage_options` | 不適用（V1 沒有這個概念） | 資料存在，前端完全沒用 |

結論：V2 目前對公會模組是「兩張表唯讀、六張表連唯讀都沒有」，跟任務/預算/文件/風險當初動工前的狀態相比，公會管理的起點更接近零。

## 4. 建議 `archived_*` 還是 `cancelled_*`

沿用整個專案已經驗證過的判斷原則（「會被退休的主檔/檔案型記錄」用 `archived_*`；「會被喊卡的個別可執行項目」用 `cancelled_*`），逐表對照最相近的既有先例：

| 表 | 建議 | 理由（對照既有表） |
| --- | --- | --- |
| `associations` | `archived_*` | 跟 `marketing_campaigns`／`marketing_resources` 同類：主檔退休，不是「這件事沒發生」。 |
| `association_benefits` | `archived_*` | 比較像「這項權益不再適用」的目錄型記錄，不是被取消的動作。 |
| `association_fee_records` | `cancelled_*` | 跟 `marketing_campaign_budget_items` 同類：一筆可能建錯或作廢的年度費用項目。 |
| `association_publication_schedules` | `cancelled_*` | 跟 `marketing_campaign_tasks` 同類：排定的期刊排程可能被喊卡。 |
| `association_events` | `cancelled_*` | 同上，活動可能被取消。 |
| `association_notes` | `cancelled_*` | 為了跟其餘子表一致，備註也不做真刪除；語意上比較弱但沿用同一套規則對使用者最好理解。 |
| `association_tasks` | `cancelled_*` | 直接對應 `marketing_campaign_tasks`。 |
| `association_task_expenses` | `cancelled_*` | 直接對應 `marketing_campaign_budget_items`。 |

## 5. SQL 範圍

### 新增欄位（8 張表 × 3 欄位 = 24 欄）

```sql
create extension if not exists "citext";

-- archived_* : associations, association_benefits
alter table associations
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by citext references app_user_access(email),
  add column if not exists archive_reason text;

alter table association_benefits
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by citext references app_user_access(email),
  add column if not exists archive_reason text;

-- cancelled_* : 其餘 6 張表
alter table association_fee_records
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by citext references app_user_access(email),
  add column if not exists cancel_reason text;

alter table association_publication_schedules
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by citext references app_user_access(email),
  add column if not exists cancel_reason text;

alter table association_events
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by citext references app_user_access(email),
  add column if not exists cancel_reason text;

alter table association_notes
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by citext references app_user_access(email),
  add column if not exists cancel_reason text;

alter table association_tasks
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by citext references app_user_access(email),
  add column if not exists cancel_reason text;

alter table association_task_expenses
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by citext references app_user_access(email),
  add column if not exists cancel_reason text;

-- index（跟既有命名慣例一致）
create index if not exists idx_associations_archived on associations(archived_at);
create index if not exists idx_association_benefits_archived on association_benefits(archived_at);
create index if not exists idx_association_fee_records_cancelled on association_fee_records(cancelled_at);
create index if not exists idx_association_publications_cancelled on association_publication_schedules(cancelled_at);
create index if not exists idx_association_events_cancelled on association_events(cancelled_at);
create index if not exists idx_association_notes_cancelled on association_notes(cancelled_at);
create index if not exists idx_association_tasks_cancelled on association_tasks(cancelled_at);
create index if not exists idx_association_task_expenses_cancelled on association_task_expenses(cancelled_at);

notify pgrst, 'reload schema';
```

不需要新的 `grant`：8 張表在 v17-v19 建表時就已經 `enable row level security` 並 `grant select/insert/update/delete to authenticated`，新增欄位會自動被既有 policy 涵蓋，不需要額外授權（這點在 Batch13B/14B/14C 都已經驗證過同樣的規則）。

### 兩個既有 view 需要跟著改，這是本批容易被漏掉的地方

**`association_cooperation_overview` 要重建**，補上三個 union 分支的 `cancelled_at is null` 過濾：

```sql
create or replace view association_cooperation_overview
with (security_invoker = true) as
select ... from association_tasks where cancelled_at is null
union all
select ... from association_events where cancelled_at is null
union all
select ... from association_publication_schedules where cancelled_at is null;

grant select on association_cooperation_overview to authenticated;
```

**`all_expenses_overview` 也要跟著改**——我查過現有定義，這個 view 的四個來源之一就是 `association_fee_records`，另一個是 `association_task_expenses`（`sql/phase1_batch5_knowledge_expenses.sql` 建立時就已經納入）。等這批 SQL 幫這兩張表加上 `cancelled_at` 之後，`all_expenses_overview` 對應的兩個 union 分支必須補上 `where afr.cancelled_at is null` / `where ate.cancelled_at is null`，否則會重演 Batch13B 當初 `marketing_campaign_budget_items` 那次「取消了但金額還在總表裡」的問題。**這件事必須在 17B 就做，不能拖到 17D 才處理**，因為 `all_expenses_overview` 現在已經是 production 在用的彙總表，任何時候欄位跟 view 不同步都會讓總經理看到錯誤的支出數字。

### Live smoke test（比照既有格式）

```sql
select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'associations' and column_name in ('archived_at','archived_by','archive_reason'))
    or (table_name = 'association_benefits' and column_name in ('archived_at','archived_by','archive_reason'))
    or (table_name in ('association_fee_records','association_publication_schedules','association_events','association_notes','association_tasks','association_task_expenses')
        and column_name in ('cancelled_at','cancelled_by','cancel_reason'))
  )
order by table_name, column_name;
-- 預期：24 列（8 張表 × 3 欄）。
```

## 6. V1 停用時間點

沿用 Batch11A→15 建立的兩段式節奏：

- **17A（立即）：只凍結 8 個 `del*` 真刪除函式**（`delAssociation`/`delAssocFee`/`delAssocBenefit`/`delAssocTask`/`delAssocExpense`/`delAssocPub`/`delAssocEvent`/`delAssocNote`），不需要等任何 SQL 或 V2 前端進度，因為這是目前公司資料庫裡 cascade 半徑最大的刪除操作。新增/編輯全部保留，避免公會管理在 V2 做完前出現空窗期。
- **17G（V2 全部 CRUD 完成並驗收後）：仿照 Batch15 的「全部一次凍結」，同時停用 V1 全部 8 張表的新增/編輯**，不用像最早幾批那樣分次收斂——現在已經證明「V2 全部做完再一次凍結」比逐項判斷更省事也更不容易漏。

## 7. V2 UI 分頁/區塊建議

建議比照 Batch13B 建立的「列表頁 + 詳情頁」模式（公會列表 → 點進單一公會詳情頁），而不是沿用 V1 現在的 tab 切換（`ASSOC_TAB` 狀態機）。理由：V2 目前唯一的多子表詳情頁範例（行銷案詳情）已經證明「同頁面直向堆疊區塊」在手機上比切 tab 更好操作，且不用重新發明一套導覽模式。

### 公會列表頁（`marketing:associations`）

- 公會主檔列表：名稱、類型、關係標籤（多個 chip）、內部負責人、操作（詳情/編輯/封存）。
- 頂部可加一組「跨公會巡檢卡片」，比照行銷案的模式：例如「本月到期年費」「進行中任務」「待確認活動」。

### 公會詳情頁（新頁面，比照 `campaignDetailSections()` 架構）

1. 基本資料（名稱、類型、聯絡人、地址、網站/LINE、內部負責人）+ 關係標籤管理（新增/移除 tag，用 datalist 建議既有詞彙，做法比照 `performanceChannelSuggestions()`）。
2. 任務（`association_tasks`，可選填關聯行銷案）。
3. 任務費用（`association_task_expenses`，掛在單一任務底下，比照 `marketing_campaign_budget_items` 的表單模式）。
4. 活動（`association_events`，可選填關聯任務）。
5. 期刊排程（`association_publication_schedules`，可選填關聯任務）。
6. 年費/會費（`association_fee_records`）。
7. 會員權益（`association_benefits`）。
8. 備註（`association_notes`）。

每個區塊沿用「進行中列表 + 已取消/已封存收合區塊」的既有模式，不新建元件。

## 8. 手機版風險

- **7 個實體都要各自一組「已取消/已封存」收合區塊，公會詳情頁會比行銷案詳情頁（5組）更長**——建議在動工前決定要不要把「已取消/已封存」合併成同一個「歷史紀錄」收合區塊（用類型欄位區分），而不是 7 個各自獨立的收合框，避免重演 Batch14/15 手機驗收提過的「單一頁面過長」問題。這點建議在 17C 開始前先拍板，不要留到實作時才發現。
- **多標籤 chip 的手機排版是全新的 UI 元素**——目前 V2 沒有任何「一格顯示多個可換行 chip」的既有樣式可以直接複用（`tag()` 目前都是單一狀態徽章，不是多值列表），這是本批唯一需要新寫 CSS、而不是沿用既有 `.table`/`.mini-card` 規則的地方，驗收時要特別注意 chip 換行不擠壓、新增/移除 chip 的按鈕在手機上好點。
- 其餘（modal 底部按鈕、表格轉卡片、data-label）沿用已經驗證過的既有機制，風險低。

## 9. 建議拆批

不建議一次做完，拆成 7 個子批次：

1. **17A**：V1 八個 `del*` 函式全部凍結（無需 SQL，立即可做）。
2. **17B**：SQL migration——8 張表補生命週期欄位、重建 `association_cooperation_overview`、更新 `all_expenses_overview` 過濾。審查通過後跑 live + smoke test。
3. **17C**：V2 公會主檔新增/編輯/封存 + 關係標籤新增/移除（多標籤機制，最優先，因為其他子表都要掛在公會底下）。
4. **17D**：V2 任務 + 任務費用 CRUD（比照行銷案任務/預算模式）。
5. **17E**：V2 活動 + 期刊排程 CRUD（含關聯任務下拉）。
6. **17F**：V2 年費 + 會員權益 + 備註 CRUD。
7. **17G**：手機版驗收 + V1 新增/編輯全面停用。

## 需要你 / 行銷總監拍板的問題

1. **`join_status`（單值）跟 `association_relationship_tags`（多值）的關係**：已拍板保留兩個並存維度。`join_status` 回答「目前跟公會的正式關係」（已入會/未入會/洽談中/暫停合作）；標籤回答「實際上在做哪些合作」（講座協辦/期刊合作/年度贊助/純活動合作）。17C 表單需同時保留 `join_status` 與多標籤管理。
2. **公會詳情頁的「歷史紀錄」收合區塊**：已拍板合併成一個歷史紀錄區塊，依類型區分，不做 7 個各自獨立收合框。
3. **`association_stage_options`（event/publication 進度百分比）**：已拍板接上 UI，但放在 17E 活動 + 期刊排程 CRUD 一起做，不塞進 17C/17D。
4. **附件欄位要不要順便升級成真檔案上傳**：已拍板本批先維持 V1 既有純文字欄位，不新增 Storage bucket；真檔案上傳留到公會 CRUD 穩定後再獨立設計。
5. **子批次優先順序**：我建議「主檔+標籤 → 任務+費用 → 活動+期刊 → 年費+權益+備註」，如果總監實務上更常先處理年費（例如年費到期是最常見的緊急事項），順序可以調整，只是任務通常是其他表的掛載點，建議至少任務要排在活動/期刊之前。
