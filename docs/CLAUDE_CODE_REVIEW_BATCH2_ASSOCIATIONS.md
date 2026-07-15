# Claude Code Review｜Phase 1 Batch 2：公會管理升級

審查日期：2026-07-14
審查對象：`association_stage_options`、`association_relationship_tags`、`association_cooperation_overview` view
審查方式：實際重新比對 v1 `marketing-platform` 現行 schema（`schema_v17_associations.sql`、`schema_v19_association_tasks_expenses.sql`、`schema_v20_association_task_campaign_options.sql`），逐欄位確認，非憑印象。

**重要澄清**：實際重讀 `schema_v17`/`schema_v19` 原始檔案後確認，`association_type`/`join_status`/`event_status`/`material_status`/`task_status`/`task_type`/`priority` 等狀態欄位**從一開始就是純自由文字，沒有任何 `check()` 約束**——`schema_v20` 裡那些 `drop constraint if exists xxx_check` 語句其實是防禦性寫法（約束原本就不存在，`drop ... if exists` 是空操作）。這代表 Batch 2 完全不用擔心新的階段名稱/標籤值會撞到既有 check constraint，可以直接用任意文字值。

---

## 1. `association_stage_options` 是否足夠支援公會活動/講座協辦/期刊刊登/活動贊助

先釐清一個關鍵事實：這四種合作型態**實際對應到的物理表只有兩張**，不是四張：

| 合作型態 | 實際落在哪張表 | 區分方式 |
|---|---|---|
| 公會活動 | `association_events` | `event_type` 自由文字 |
| 講座協辦 | `association_events` | `event_type` 自由文字（跟「公會活動」共用同一張表） |
| 活動贊助 | `association_events` | `event_type` 自由文字（同上） |
| 期刊刊登 | `association_publication_schedules` | 獨立一張表，不需要用 type 欄位區分 |

所以 `association_stage_options.entity_type` 設計成 `event` / `publication` 兩種**是夠用的**——公會活動、講座協辦、活動贊助本來就是同一張表（`association_events`）裡不同 `event_type` 值的資料列，物理上共用同一個生命週期（待確認→執行→結束），沒有理由拆成三組不同的階段定義。

**但有一個需要行銷總監確認的地方**：目前設計是「同一個 `entity_type='event'` 底下，所有 `event_type`（公會活動/講座協辦/活動贊助）共用同一組階段」。如果實際運作中，「活動贊助」根本不需要「素材準備中」這個階段（贊助通常不用美昇自己準備素材），或「講座協辦」需要多一個「講師確認」的中間階段，那就要把 `entity_type` 拆更細（例如 `event_sponsorship`、`event_lecture` 分開各自的階段組）。這屬於第 6 節的商業規則確認項目，Phase 1 先用「event 共用一組階段」上線是合理的起點，不建議還沒實際用過就先拆細。

### 建議欄位設計

| 欄位 | 型別 | 說明 |
|---|---|---|
| `id` | `uuid primary key default gen_random_uuid()` | |
| `entity_type` | `text not null` | `event` / `publication`（對應上表兩張物理表） |
| `stage_name` | `text not null` | |
| `sort_order` | `integer not null` | |
| `pct_value` | `integer not null` | 0-100，建議加 `check (pct_value between 0 and 100)` |
| `created_at` / `updated_at` | `timestamptz not null default now()` | |

唯一約束：`unique(entity_type, stage_name)`。

`pct_value` 這個欄位跟其他既有的 status 欄位不同——它是**新設計、不是延續 v17/v19 慣例**的欄位，所以加 `check` 約束不會違反「延續既有自由文字慣例」的原則，反而是必要的資料完整性保護（避免打成 150% 這種明顯錯誤值）。

---

## 2. `association_relationship_tags` 是否支援多標籤、自訂、不入會但合作

### 設計本身是對的，能滿足核心需求

`association_id` + `tag` 這個 junction table 結構，配合 `unique(association_id, tag)`：
- **多標籤**：✅ 同一個 `association_id` 可以有多筆不同 `tag`，沒有上限。
- **自訂**：✅ `tag` 是純文字，沒有 check 約束、沒有 enum，可以打任何值。
- **不入會但仍合作**：✅ 這是最關鍵的一點——`associations.join_status` 目前是單一欄位（例如 `'未入會'`），跟 `association_relationship_tags` 完全獨立。一個公會可以 `join_status = '未入會'`，同時在 `association_relationship_tags` 有 `'講座協辦'`、`'期刊合作'` 兩筆標籤，兩者互不衝突，正確對應「美昇可能未入會但仍有講座協辦、期刊刊登或活動贊助」這個原始需求。

### 需要行銷總監確認的地方：標籤要不要區分「狀態類」跟「描述類」

目前設計是所有標籤一視同仁、可以自由疊加。但草案標籤清單裡混了兩種性質不同的值：

- **狀態類**（邏輯上互斥，同一時間應該只有一個生效）：已入會、未入會、評估中、洽談中、暫停合作、待確認
- **描述類**（可以同時並存，不衝突）：曾合作、講座協辦、期刊合作、活動贊助、年度贊助

如果完全不加限制，可能出現一個公會同時掛著「洽談中」跟「已入會」兩個互斥標籤沒被清掉的情況（沒有人手動移除舊標籤）。這不是資料庫層面能自動解決的問題（要嘛加額外的欄位標記「這組標籤互斥」，要嘛完全交給使用者自律維護）。**Phase 1 建議先不加這個複雜度**，用最簡單的自由標籤上線，如果實際用起來發現常常忘記清舊標籤，Phase 2 再考慮加 `tag_category`（狀態類/描述類）欄位做互斥檢查。這點在第 6 節列成待確認項目，但傾向給「先簡單上線」的建議。

### 建議欄位設計

| 欄位 | 型別 | 說明 |
|---|---|---|
| `id` | `uuid primary key default gen_random_uuid()` | |
| `association_id` | `uuid not null references associations(id) on delete cascade` | |
| `tag` | `text not null` | |
| `created_at` | `timestamptz not null default now()` | |

唯一約束：`unique(association_id, tag)`。

---

## 3. `association_cooperation_overview` view 的 UNION 欄位對齊檢查

逐欄位比對三張來源表的實際型別（已重新核對 `schema_v17`/`schema_v19` 原始檔案）：

| 統一欄位 | `association_tasks` | `association_events` | `association_publication_schedules` |
|---|---|---|---|
| `item_name` | `task_name text` | `event_name text` | `publication_name text` |
| `item_type` | `task_type text` | `event_type text` | 無此欄位，固定填 `'期刊刊登'` |
| `stage` | `task_status text` | `event_status text` | `material_status text` |
| `owner` | `owner text` | `owner text` | `owner text` |
| `due_date` | `due_date date` | `event_date date` | `deadline_date date` |
| `progress_pct` | `progress_pct integer`（有真實值） | 無此欄位 | 無此欄位 |
| `next_step` | `next_step text` | 無此欄位（用 `result_notes` 代替） | 無此欄位（用 `result_notes` 代替） |
| `notes` | `notes text` | `notes text` | 無此欄位（publication 沒有獨立 notes，只有 `result_notes`） |
| `attachment` | `attachment text` | `attachment text` | `attachment text` |

三張表的型別（`text`/`date`/`integer`/`timestamptz`）彼此相容，**可以直接 UNION**，但要注意兩個技術細節：

1. `progress_pct`：`association_tasks` 有真實整數值，`association_events`/`association_publication_schedules` 沒有這個欄位，UNION 時要補 `null::integer`（明確轉型，避免 Postgres 對裸 `null` 字面值的型別推斷在跨分支時出錯）。
2. `item_type`：`association_publication_schedules` 沒有對應欄位，補 `'期刊刊登'::text` 常數。

### 建議 SQL

```sql
create or replace view association_cooperation_overview as
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
  notes,
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
```

`progress_pct` 對 event/publication 兩個分支永遠是 `null`，畫面上要顯示百分比時，改用 `stage` 去 join `association_stage_options`（`entity_type = source_table`、`stage_name = stage`）取得 `pct_value`——這是刻意的設計，`view` 本身不內建這個 join，理由：把「原始階段名稱」跟「顯示用百分比」分開，之後如果行銷總監調整了 `association_stage_options` 的階段定義，不用重新跑資料，畫面顯示會自動反映最新對照表。

**沒有找到既有名稱 `association_cooperation_overview` 的衝突**，可以直接建立。

---

## 4. 是否會影響舊平台

| 檢查項目 | 結果 |
|---|---|
| 不改舊表名 | ✅ 兩張新表 + 一個新 view，命名跟現有 22 張表無衝突 |
| 不刪欄位 | ✅ 沒有對 `association_tasks`/`association_events`/`association_publication_schedules`/`associations`/`association_fee_records`/`association_task_expenses` 做任何刪除操作 |
| 不改欄位型別 | ✅ 這批完全不碰既有表的欄位定義，只是新建表 + 新建 view 去讀它們 |
| 只新增 | ✅ 符合 |

這批比 Batch 1（vendor/leads）更單純，因為完全不需要對既有表加欄位，純粹是「兩張新表 + 一個唯讀 view」。

---

## 5. 建議 SQL 結構、Index、RLS/Grant、驗收方式

### 5.1 完整建表 SQL

```sql
-- association_stage_options
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

alter table association_stage_options enable row level security;

grant select, insert, update, delete on association_stage_options to authenticated;

drop policy if exists "authenticated manage association stage options" on association_stage_options;
create policy "authenticated manage association stage options"
  on association_stage_options for all to authenticated
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

-- association_relationship_tags
create table if not exists association_relationship_tags (
  id uuid primary key default gen_random_uuid(),
  association_id uuid not null references associations(id) on delete cascade,
  tag text not null,
  created_at timestamptz not null default now(),
  unique (association_id, tag)
);

alter table association_relationship_tags enable row level security;

grant select, insert, update, delete on association_relationship_tags to authenticated;

drop policy if exists "authenticated manage association relationship tags" on association_relationship_tags;
create policy "authenticated manage association relationship tags"
  on association_relationship_tags for all to authenticated
  using (true)
  with check (true);

create index if not exists idx_association_relationship_tags_assoc
  on association_relationship_tags(association_id);

create index if not exists idx_association_relationship_tags_tag
  on association_relationship_tags(tag);
```

（`association_cooperation_overview` 的 view SQL 見第 3 節。）

**RLS/Grant 寫法沿用 `association_*` 家族既有慣例**——比對過 `schema_v17_associations.sql`，這個家族用的是 `grant ... to authenticated;` + 簡單 `create policy ... for all to authenticated using(true) with check(true);`，跟 `tender_*` 家族用的 `do $$ if not exists ... $$` 包裝寫法不一樣。上面的 SQL 已經照 `association_*` 家族的風格寫，Codex 不用另外決定要用哪種寫法。

### 5.2 View 需要額外的 GRANT

**容易漏掉的一步**：Postgres 的 view 預設不會自動繼承底層表的存取權限透過 PostgREST 曝露出去，需要對 view 本身額外下一次 `grant select`：

```sql
grant select on association_cooperation_overview to authenticated;
```

沒有這行，即使底層三張表都有 `authenticated` 權限，PostgREST 呼叫 `GET /rest/v1/association_cooperation_overview` 還是會收到權限錯誤（42501），因為 PostgREST 檢查的是 view 這個 relation 自己的 grant，不會往下追溯底層表。

### 5.3 驗收方式

1. **`association_stage_options`**：執行 `select * from association_stage_options order by entity_type, sort_order;`，確認 9 筆種子資料都在、`pct_value` 依序遞增（0/25/50/75/100 和 0/33/66/100）。
2. **`association_relationship_tags`**：對同一個既有 `association_id`（例如 v17 種子資料裡的「台北市冷凍空調技師公會」）insert 兩筆不同標籤（例如 `'未入會'` 跟 `'講座協辦'`），確認兩筆都成功、且再 insert 一次重複的 `'未入會'` 會被 `unique` 約束擋下——這個測試直接驗證「不入會但仍合作」這個核心情境資料庫層面是通的。
3. **`association_cooperation_overview`**：v17 種子資料只建了 `associations` 這張表本身，沒有帶入任何 task/event/publication 測試資料，所以**先手動 insert 三張來源表各一筆測試資料**（分別掛在同一個 `association_id` 下），再執行 `select * from association_cooperation_overview where association_id = '...';`，確認三種 `source_table`（task/event/publication）都各出現一列，且 `progress_pct` 只有 task 那列有值、其餘為 `null`。
4. **PostgREST 存取測試**：登入後用瀏覽器或 REST client 呼叫 `GET {SB}/rest/v1/association_cooperation_overview`，確認回傳 200 而不是 403（驗證第 5.2 節的 view grant 有生效）。
5. **回歸測試**：打開 v1 正式平台（`marketing-a4l.pages.dev`）的公會管理頁，確認既有功能（公會列表、費用記錄、既有任務/活動/期刊排程）都正常，因為這批完全沒有動這幾張表的結構。

---

## 6. Codex 寫 SQL 前需要跟你/行銷總監確認的公會流程規則

1. **`association_stage_options.entity_type` 要不要拆更細？** 目前「公會活動」「講座協辦」「活動贊助」共用同一組 `event` 階段。如果贊助類活動不需要「素材準備中」，或講座協辦需要多一個「講師確認」階段，就要拆成更細的 `entity_type`（例如 `event_sponsorship`/`event_lecture`）。建議 Phase 1 先用共用的一組上線，實際用過再決定要不要拆。
2. **關係標籤要不要區分「狀態類（互斥）」跟「描述類（可並存）」？** 目前完全自由不限制，可能出現舊標籤沒清掉的情況（例如同時掛著「洽談中」跟「已入會」）。建議 Phase 1 先簡單上線，靠使用者自己維護，不在資料庫層做互斥檢查。
3. **期刊刊登要不要有比 4 階段更細的定義？** 目前草案是「待確認主題→素材製作中→已投稿/截稿→已確認刊出」，這組已經確認過可以再由行銷總監自行在系統裡調整，這裡只是再次確認 Phase 1 上線的初版是否夠用。
4. **要不要有「已取消」狀態？** 現有 `task_status`/`event_status`/`material_status` 都是自由文字，沒有預設的「已取消」值。如果活動臨時取消，是要新增一個正式的「已取消」狀態值（這樣 `association_cooperation_overview` 顯示時才能一致地過濾掉），還是用 `notes` 欄位註記就好、不特別處理？這會影響公會合作紀錄列表要不要預設隱藏已取消項目。
5. **`association_cooperation_overview` 在畫面上要不要有預設排序？** 目前 view 沒有內建 `order by`，是三個來源表原始順序疊加。是要依 `due_date` 排序（最快到期的在最上面），還是依 `source_table` 分組顯示（活動一區、期刊一區）？這屬於前端呈現邏輯，但會影響要不要在 view 裡多留一個排序輔助欄位。
