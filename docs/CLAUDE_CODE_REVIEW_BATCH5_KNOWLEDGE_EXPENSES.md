# Claude Code Review｜Phase 1 Batch 5 草案：產品知識庫 + 費用彙總（寫 SQL 前審查）

審查日期：2026-07-15
審查對象：`product_knowledge_items`、`product_knowledge_sources`、`product_knowledge_item_sources`、`product_knowledge_resource_links`、`all_expenses_overview`
審查方式：重新核對 `marketing_campaign_budget_items`（含 Batch 5 前置的 `payment_status`/`payment_date`）、`association_fee_records`、`association_task_expenses`、`marketing_campaign_vendors`（Batch 3 實際 schema）、`marketing_resources`、`app_user_access` 的目前欄位，逐一確認能否對齊。目前 repo 裡還沒有 Batch 5 的任何草稿，這份文件是設計本身，供 Codex 對齊。

---

## 結論摘要

產品知識庫四表的整體架構可行，但這次重新核對「可對外/僅內部/待確認/禁止使用」這個需求時，發現我最早設計的 `external_usable`（是/否/需審核，三態）**只有三種狀態，對不上你這次明確要的四種狀態**——「僅內部」跟「禁止使用」被壓縮成同一個「否」，實務上這是兩件不同的事（前者是可以內部討論、後者是連內部都不該用）。建議這次改成四態欄位，見第 1 節。費用彙總 view 這邊，四張來源表逐一核對後，`marketing_campaign_vendors` **沒有 `payment_date` 欄位**（跟 `budget_items` 之前的狀況一模一樣），如果不補，廠商費用在總支出總覽裡會永遠沒有日期可以排序或看逾期——這是這次最重要的發現，建議在 Batch 5 一起處理，不要又拖到下一批才發現。

---

## 1. 產品知識庫四表：欄位設計是否足夠

逐項對照你列的七個需求：

| 需求 | 對應設計 |
|---|---|
| 產品差異化、技術比較、市場競爭力分析、FAQ | `knowledge_type` 分類（市場差異化/技術比較/競品分析/客戶異議處理/應用場景/FAQ/簡報說法/資料待確認）——「市場競爭力分析」對應「競品分析」這個既有分類，不用另開 |
| 業務話術 | `recommended_pitch`（建議說法）/ `prohibited_pitch`（不建議說法）兩欄，**不綁定特定 `knowledge_type`**，任何類型的知識條目都能填業務話術，不是只有「簡報說法」這個分類才有 |
| 證據等級 | `evidence_level`：A（已有正式來源）/B（已技術確認）/C（待確認）/D（不可使用） |
| **可對外 / 僅內部 / 待確認 / 禁止使用** | **需要調整**——見下方 |

### 需要調整：`external_usable` 從三態改成四態，並改名 `visibility_status`

我最早的設計是 `external_usable text`（是/否/需審核），這次對照你明確列出的四種狀態（可對外/僅內部/待確認/禁止使用），三態不夠用——「僅內部」跟「禁止使用」原本會被迫都填成「否」，但這兩者在業務端要不要顯示、行銷總監要不要處理是完全不同的意義。建議改成：

```sql
visibility_status text not null default '待確認'
  check (visibility_status in ('可對外', '僅內部', '待確認', '禁止使用'))
```

**這個欄位跟 `evidence_level`是兩個不同的維度，都要保留，不要合併成一個**：`evidence_level` 講的是「這個內容的證據紮不紮實」（客觀），`visibility_status` 講的是「現在核准到什麼程度可以用」（業務/法務決定）。兩者通常相關但不完全綁定——例如證據等級是 A（有正式來源），但行銷總監可能因為策略考量暫時不想對外公開，這時候 `evidence_level='A'` 但 `visibility_status='僅內部'` 是合理的組合，不是資料矛盾。

### 建議完整欄位

```sql
create table if not exists product_knowledge_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  product_line text,
  knowledge_type text not null,
  target_segment text,
  use_context text,
  summary text,
  detail text,
  recommended_pitch text,
  prohibited_pitch text,
  evidence_level text not null default 'C' check (evidence_level in ('A','B','C','D')),
  visibility_status text not null default '待確認' check (visibility_status in ('可對外','僅內部','待確認','禁止使用')),
  related_competitor text,
  owner citext references app_user_access(email),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

`knowledge_type` 沒有加 check 約束——延續 `vendors.vendor_type` 那次的決定（先自由文字，不限制清單），保持一致。`evidence_level`/`visibility_status` 這兩個值域相對穩定（A/B/C/D 這種分級不會常常變動），加 check 約束比較合理，也符合 `doc_type` 那次已經驗證過的模式（有限、穩定的分類清單才加約束；開放式分類不加）。

索引：`(knowledge_type)`、`(evidence_level, visibility_status)`（業務端過濾「只看 A/B 且可對外」時用）。

---

## 2. 是否需要接 `marketing_resources`、正式 DM、簡報、PDF、外部連結

需要，而且原本設計已經涵蓋，分兩條路徑，職責不同：

- **`product_knowledge_resource_links`**：連到系統裡已經有的正式素材（`marketing_resources`——DM、簡報、型錄），這是「這個知識條目可以搭配哪些既有文宣一起用」。
- **`product_knowledge_sources`**：知識條目本身的**證據來源**，不一定是系統裡的正式素材，可能是外部連結、原廠 PDF、內部測試紀錄、客戶回饋——`url_or_file text` 欄位可以放外部 URL，也可以放檔案路徑。

**建議 Phase 1 先不開新的 storage bucket**：`url_or_file` 先當純文字欄位用（外部連結或既有檔案路徑的引用），不做檔案上傳功能。理由：多數證據來源要嘛是外部連結、要嘛本來就已經在 `marketing_resources`（走 `product_knowledge_resource_links` 那條路徑），真正需要「上傳一份原廠 PDF 進系統」的情境應該不多，先不建新 bucket 可以省一批工，之後如果實際用起來發現真的需要上傳功能，再比照 `schema_v14_resource_files.sql`（`marketing-resource-files` bucket）的模式加。這點列在第 9 節請你確認是否同意。

### 建議完整欄位

```sql
create table if not exists product_knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,
  source_type text,
  url_or_file text,
  verified_by citext references app_user_access(email),
  verified_date date,
  created_at timestamptz not null default now()
);

create table if not exists product_knowledge_item_sources (
  id uuid primary key default gen_random_uuid(),
  knowledge_item_id uuid not null references product_knowledge_items(id) on delete cascade,
  source_id uuid not null references product_knowledge_sources(id) on delete cascade,
  unique (knowledge_item_id, source_id)
);

create table if not exists product_knowledge_resource_links (
  id uuid primary key default gen_random_uuid(),
  knowledge_item_id uuid not null references product_knowledge_items(id) on delete cascade,
  resource_id uuid not null references marketing_resources(id) on delete cascade,
  unique (knowledge_item_id, resource_id)
);
```

---

## 3. 對外使用審核：用 `approval_requests`，不自己做一套審核欄位

**同意這個方向，這也是最早 Phase 1 schema 審查就建議過的做法**。`product_knowledge_items` **不加** `approval_status`/`approved_by`/`approved_at` 這類欄位，理由：

- `visibility_status` 欄位本身就是「目前生效的狀態」，不需要重複記錄審核流程。
- 審核**過程**（誰申請、誰核准、什麼時候、核准意見）走 Batch 4 已經建好的共用 `approval_requests`：`entity_type='knowledge_item'`、`entity_id=product_knowledge_items.id`、`title`/`summary` 存申請當下的知識條目標題摘要（沿用 Batch 4 已經確認的「快照」語意，不需要跟來源即時同步）、`approver_role` 建議填 `'marketing'`（對應原始需求「B 級可內部使用，對外需行銷總監確認」）。
- 待某筆 `approval_requests` 的 `status` 變成 `已核准` 時，由應用層把對應 `product_knowledge_items.visibility_status` 更新成 `可對外`——這個更新動作是應用層邏輯，不是資料庫觸發器，維持跟 Batch 4 一致的簡單做法（不引入 trigger，這個階段的資料量跟操作頻率都不需要自動化到那個程度）。

這樣待決策中心（`decisionListSection`）已經有的 `approvalEntityLabel()` 對照表（`knowledge_item` → 「知識 / 文宣審核」）直接就能用，不用等 Batch 5 再回頭改 Batch 4 的程式碼。

---

## 4-6. `all_expenses_overview`：來源、欄位對齊、金額欄位選擇

### 4. 應該 UNION 四個來源，四個都需要

`marketing_campaign_budget_items`（行銷案費用）、`association_fee_records`（公會年費）、`association_task_expenses`（公會任務費用）、`marketing_campaign_vendors`（廠商費用，Batch 3 已加入這個來源）——四張都是總經理「上下半年所有支出」要看到的真實費用來源，缺一個總支出數字就會少算。

### 5. 逐欄位對齊檢查（重新核對實際 schema，非憑印象）

| 統一欄位 | `marketing_campaign_budget_items` | `association_fee_records` | `association_task_expenses` | `marketing_campaign_vendors` |
|---|---|---|---|---|
| `source_id` | `id` | `id` | `id` | `id` |
| `title` | `item_name` | 無獨立欄位，組出 `'公會年費 ' \|\| year` | 無獨立欄位，用 `expense_type` 代替 | 無獨立欄位，**需要 join `vendors.name`** |
| `category` | 固定值 `'行銷案費用'` | 固定值 `'公會年費'` | 固定值 `'公會任務費用'` | 固定值 `'廠商費用'` |
| `amount` | `amount_twd` | `fee_amount` | `coalesce(actual_amount, budget_amount)` | `coalesce(actual_amount, budget_amount)`（見第 6 節） |
| `payment_status` | `payment_status`（Batch 5 前置已補） | `payment_status` | `payment_status` | `payment_status` |
| `payment_date` | `payment_date`（Batch 5 前置已補） | `payment_date` | `payment_date` | **不存在，需要新增** |
| `campaign_id` | `campaign_id` | `null` | `null` | `campaign_id` |
| `association_id` | `null` | `association_id` | `association_id` | `null` |
| `vendor_id` | `null` | `null` | `null` | `vendor_id` |
| `owner_contact` | 無獨立欄位，**需要 join `marketing_campaigns.owner`** | 無獨立欄位，**需要 join `associations.internal_owner`** | 無獨立欄位，**需要 join `associations.internal_owner`** | `meisun_contact`（本來就有） |

三個發現：

1. **`marketing_campaign_vendors` 缺 `payment_date`**——這是本次審查最重要的發現，見下方單獨說明。
2. **`title`/`owner_contact` 有兩張表沒有現成欄位可以直接對應**，需要在 view 裡對各自的分支多做一個 `left join`（budget_items → `marketing_campaigns`、fee_records/task_expenses → `associations`）才能組出有意義的標題跟負責人，不是單純把欄位改名而已。這比 Batch 2 的 `association_cooperation_overview`（三張表本來就同層級、不需要額外 join）複雜一點，但每個分支仍然是一個單純的 `select ... left join ... from ...`，技術上沒有困難。
3. **`vendor_id` 只有 `marketing_campaign_vendors` 這個分支有值**，其他三個分支固定是 `null::uuid`——這是預期中的正常情況，因為只有廠商費用本來就跟廠商有關聯。

### 需要在這批一起修的：`marketing_campaign_vendors.payment_date`

```sql
alter table marketing_campaign_vendors add column if not exists payment_date date;
```

跟 Batch 5 前置補 `budget_items.payment_status`/`payment_date` 是同一種情況、同一種修法——純新增、nullable、不影響既有資料。**如果這次不補，`all_expenses_overview` 裡廠商費用那一類會永遠沒有日期，總經理沒辦法照日期排序或篩選逾期未付的廠商款項**，等於重蹈 `budget_items` 原本的覆轍。建議直接併入這批 migration，不要再拖到下一批才發現。

### 6. `budget_amount`/`actual_amount` 該用哪一個當 `amount`

建議 `coalesce(actual_amount, budget_amount)`——**有實際金額就用實際的，還沒有實支數字就先用預算估計值頂著**，這樣總經理看到的「總支出」數字在專案還沒結案、廠商還沒完成請款流程時，也能看到一個合理的估計數，而不是空白或 0。`association_task_expenses` 剛好是同樣的兩欄位形狀（`budget_amount`/`actual_amount`），用一樣的邏輯處理，兩個分支寫法一致。

如果你希望總經理能同時看到「預算 vs 實支」的落差（而不只是一個合併後的數字），可以在 view 裡額外多留 `amount_budget`/`amount_actual` 兩個欄位（`budget_items`/`fee_records` 因為只有單一金額欄位，這兩欄會是 `null`），這是加分項不是必要項，第 9 節列出來讓你決定要不要。

---

## 7. View 是否需要 `security_invoker` 跟 grant

**兩個都需要，延續 Batch 2 的做法**：

```sql
create or replace view all_expenses_overview
with (security_invoker = true) as
...
;

grant select on all_expenses_overview to authenticated;
```

`security_invoker = true` 讓這個 view 之後 Phase 2 收緊 RLS 時能自動套用呼叫者的權限，不用重建——`association_cooperation_overview` 已經驗證過這個做法可行，這次比照辦理。`grant select` 是 PostgREST 曝露 view 必要的一步，Batch 2 已經證實這步容易漏、但這次事先在草案裡就列出來，不應該再漏掉。

---

## 8. 是否會影響 v1 舊平台

| 檢查項目 | 結果 |
|---|---|
| 不改舊表名 | ✅ 四張新表 + 一個新 view，命名跟現有表無衝突 |
| 不刪欄位 | ✅ 沒有任何刪除操作 |
| 不改欄位型別 | ✅ 沒有 `alter column ... type` |
| 只新增 | ⚠️ 有兩處欄位新增（`marketing_campaign_vendors.payment_date`）——都是 nullable 純新增，不影響既有資料，跟 Batch 5 前置那次的 `budget_items.payment_status`/`payment_date` 是同一種安全等級的異動，這點在第 9 節請你確認是否同意併入這批 |

---

## 9. Codex 寫 SQL 前需要你或行銷總監確認的規則

1. **`marketing_campaign_vendors.payment_date` 要不要在這批一起補？**（第 5 節）不補的話，`all_expenses_overview` 裡廠商費用會永遠沒有日期可排序。
2. **`visibility_status` 改成四態（可對外/僅內部/待確認/禁止使用）是否同意？** 這是這次審查發現原本三態設計不夠用之後的調整建議，需要你確認這四個詞彙是最終要用的字眼，還是有更符合公司內部習慣的講法。
3. **`product_knowledge_sources.url_or_file` 要不要支援真的檔案上傳？** 建議 Phase 1 先只當文字欄位（外部連結或既有檔案引用），不開新 storage bucket，之後真的需要再比照 `marketing-resource-files` 的模式加。
4. **`all_expenses_overview` 要不要額外保留 `amount_budget`/`amount_actual` 兩個明細欄位？**（第 6 節）目前設計是合併成單一 `amount`（優先用實支數字），如果總經理希望在總覽就能看到預算跟實支的落差，需要多加這兩欄。
5. **`evidence_level`/`visibility_status` 出現邏輯上不太合理的組合時（例如 D 但可對外）要不要用資料庫約束擋掉？** 建議先不擋——這兩個欄位本來就是兩個獨立維度，可能有合理的特殊情況（見第 1 節說明），先靠行銷總監人工把關，不在資料庫層加跨欄位的 check 約束，避免限制太死反而擋到正常但少見的情境。
