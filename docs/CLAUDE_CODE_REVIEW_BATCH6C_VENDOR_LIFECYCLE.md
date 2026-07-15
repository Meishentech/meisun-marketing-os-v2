# Claude Code Review｜Phase 1 Batch 6C 草案：廠商合作編輯 / 取消 / 交付物管理（寫程式前審查）

審查日期：2026-07-15
審查對象：`marketing_campaign_vendors` 編輯/取消、`marketing_campaign_vendor_deliverables` 新增/編輯/取消
審查方式：重新核對 `marketing_campaign_vendors`/`marketing_campaign_vendor_deliverables`（Batch 3+5 實際 schema，含 FK 的 `on delete` 行為）、`marketing_campaign_documents`（Batch 3 加的 `vendor_id`/`deliverable_id`）、`approval_requests`（Batch 4 的通用審核設計）、`all_expenses_overview`（Batch 5 實際 view，會不會受這批影響）、以及 `app_user_access` 的 RLS 政策（v1 `schema_v13_user_access.sql`）。

---

## 是否可以開始

**可以開始，但有一個範圍要先縮小**：`meisun_contact`（廠商合作對接人）跟 `reviewer`/`owner`（交付物負責人/審核人）如果要做成「可以指派給其他同事」，目前的資料庫設計會擋住這個功能——不是 v2 這邊的問題，是 v1 既有的 `app_user_access` RLS 政策本來就只讓每個登入者查得到**自己那一列**，沒辦法查全部使用者清單來做下拉選單。這件事第 3 節詳細說明，建議這批先只做「維持登入者本人」，不要現在就做「指派給別人」，避免牽動 v1 的 RLS 設定。

---

## 建議 Batch 6C 範圍

**編輯 + 取消 + 交付物新增/編輯/取消全部放在同一批，不用拆 6C/6D**——這四項都是圍繞同兩張表（`marketing_campaign_vendors`/`marketing_campaign_vendor_deliverables`）在做，取消動作可以直接沿用 Batch 6A 幫 `sales_requests` 建立的軟取消模式，交付物的新增/編輯也可以沿用 Batch 6B 幫 `product_knowledge_items` 建立的單表單模式，沒有新的複雜度等級需要拆批處理。

**唯一建議明確排除在這批之外的**：`meisun_contact`/`owner`/`reviewer` 指派給其他同事這個功能，因為需要額外處理（第 3 節），先不放進 6C，等之後有需要、也想清楚怎麼處理 v1 那個 RLS 限制後再獨立做。

---

## 需要 SQL

```sql
alter table marketing_campaign_vendors
  add column if not exists cancelled_at timestamptz;
alter table marketing_campaign_vendors
  add column if not exists cancelled_by citext references app_user_access(email);
alter table marketing_campaign_vendors
  add column if not exists cancel_reason text;

alter table marketing_campaign_vendor_deliverables
  add column if not exists cancelled_at timestamptz;
alter table marketing_campaign_vendor_deliverables
  add column if not exists cancelled_by citext references app_user_access(email);
alter table marketing_campaign_vendor_deliverables
  add column if not exists cancel_reason text;

create index if not exists idx_marketing_campaign_vendors_cancelled
  on marketing_campaign_vendors(cancelled_at);
create index if not exists idx_marketing_campaign_vendor_deliverables_cancelled
  on marketing_campaign_vendor_deliverables(cancelled_at);
```

**加了 `cancelled_at` 之後，`all_expenses_overview`（Batch 5 建的 view）要跟著改**，不然取消的廠商合作還是會被算進總支出——這是這批容易漏掉、但一定要一起做的事：

```sql
create or replace view all_expenses_overview
with (security_invoker = true) as
select ... -- budget_items / fee_records / task_expenses 三段不變
union all
select
  mcv.id as source_id,
  'marketing_campaign_vendors'::text as source_table,
  coalesce(v.name, mcv.role_in_project, '未命名廠商費用')::text as title,
  '廠商費用'::text as category,
  coalesce(mcv.actual_amount, mcv.budget_amount)::numeric as amount,
  mcv.budget_amount::numeric as amount_budget,
  mcv.actual_amount::numeric as amount_actual,
  mcv.payment_status,
  mcv.payment_date,
  mcv.campaign_id,
  null::uuid as association_id,
  mcv.vendor_id,
  mcv.meisun_contact::text as owner_contact,
  mcv.created_at,
  mcv.updated_at
from marketing_campaign_vendors mcv
left join vendors v on v.id = mcv.vendor_id
where mcv.cancelled_at is null;  -- 新增這行，排除已取消的廠商合作

grant select on all_expenses_overview to authenticated;
```

（`budget_items`/`fee_records`/`task_expenses` 那三段目前沒有取消機制，維持原樣不用改。）

**不需要對 `marketing_campaign_documents` 或 `approval_requests` 做任何 SQL 異動**——這兩張表的因應方式在第 6 節說明，是應用層邏輯，不是 schema 問題。

---

## 重點檢查逐項說明

### 現有 Schema 是否足夠

編輯功能（項目 1、3）完全不需要新欄位——`role_in_project`/`quote_status`/`budget_amount`/`actual_amount`/`payment_status`/`payment_date`（`marketing_campaign_vendors`）、`deliverable_name`/`owner`/`due_date`/`status`/`reviewer`/`attachment`/`notes`（`marketing_campaign_vendor_deliverables`）全部在 Batch 3/5 就已經建好。取消功能（項目 2、4）需要新增三個欄位到兩張表，如上。

### 哪些操作可以直接 PATCH

`marketing_campaign_vendors` 的六個編輯欄位、`marketing_campaign_vendor_deliverables` 的所有編輯欄位，都是單純 `PATCH .../{table}?id=eq.{id}`，沒有分支邏輯、沒有連動寫入，直接沿用 Batch 6A 已經驗證過的 PATCH 模式即可（記得比照之前的規則，`updated_at` 要前端自己帶入目前時間，這張表跟這整個專案所有表一樣沒有自動觸發）。

### 哪些操作不應 DELETE，不可真刪除的條件

**`marketing_campaign_vendors` 和 `marketing_campaign_vendor_deliverables` 都不建議真刪除，兩張表統一用軟取消，不分情況判斷。**

理由不是「有些情況危險、有些情況安全」這種條件式判斷，是這兩張表本身的角色決定的：

- `marketing_campaign_vendors` 有真實金額欄位（`budget_amount`/`actual_amount`/`payment_status`），是 Batch 5 `all_expenses_overview` 的資料來源之一，真刪除會讓「這筆廠商費用發生過」這件事直接從總支出歷史裡消失，沒有任何方式能事後回補。
- `marketing_campaign_vendor_deliverables` 的 `campaign_vendor_id` 是 `on delete cascade`——**真刪除一筆 `marketing_campaign_vendors` 會自動把底下所有交付物一起刪掉，而且是資料庫層面靜默執行、畫面上不會有任何額外警告**。使用者按下「刪除廠商合作」的當下，可能完全沒意識到連帶會消失的是這個廠商在這個專案下所有的交付物進度紀錄（例如已經標記「已完成」的設計稿交期紀錄）。這是這次審查抓到最需要注意的一點：如果真的要允許刪除，至少要在確認文案裡明確講「連同 N 筆交付物一起刪除」，但更建議的做法還是直接不允許真刪除，用取消取代。

**沒有例外**：即使是剛建立、還沒有任何交付物、金額都是空的廠商合作，也建議統一走取消，不要為了「這筆是乾淨的，可以真刪」另外寫一套判斷邏輯——兩張表各自只維護一套刪除行為（取消），程式碼比較好維護，付出的代價只是資料庫裡多留幾筆狀態是「已取消」的空紀錄，成本很低。

### `approval_requests` 與 `marketing_campaign_documents` 是否會讓刪除變危險

**會，這是支持用取消而不是真刪除的另一個理由：**

- `marketing_campaign_documents.vendor_id`/`deliverable_id` 都是 `on delete set null`——真刪除廠商合作或交付物，不會刪掉文件本身，但文件會**靜默失去跟這次合作/交付物的關聯**（欄位被清成 `null`），之後要查「這份報價單是哪次合作的」會找不到。
- `approval_requests` 完全沒有 FK 約束（刻意設計），真刪除廠商合作後，如果之前有送過「廠商報價送審」（`entity_type='vendor_quote'`、`entity_id` 指向這筆 `marketing_campaign_vendors.id`），這筆審核紀錄會變成指向一個查無此列的孤兒引用——好在 `approval_requests` 本身有存 `title`/`summary`/`amount` 快照（Batch 4 設計時就是為了這個情境），審核紀錄自己讀起來還是有意義的，不會完全看不懂，但已經沒辦法回頭連結到真正的廠商合作明細。

改成取消之後，上面兩個問題都不存在——文件關聯還在（因為原本的列沒有被刪除），`approval_requests` 的 `entity_id` 也還指得到一筆真實存在（只是標記已取消）的資料。

**需要你確認的商業規則**：如果某筆廠商合作有一個**還在待審核**（`approval_requests.status='待審核'`）的報價審核，行銷總監把這筆合作取消時，那筆審核要不要也一起處理？建議做法是前端在取消當下順便檢查 `state.data.approvalRequests` 裡有沒有符合 `entity_type='vendor_quote' && entity_id === 這筆vendor的id && status==='待審核'` 的紀錄，如果有，取消時一併把那筆審核的 `status` 改成 `'需修正'`、`decision_note` 帶一句「廠商合作已取消」，避免總經理待決策中心留著一筆已經沒有意義的待核准項目。這件事不做也不會出錯（只是總經理會看到一筆過時的審核項目），但體驗會比較好，建議一起做，但不是必要條件（第 7 節列為待確認事項）。

### 建議前端最小可用範圍

- **編輯廠商合作**：沿用現有 modal 模式，欄位開放 `role_in_project`/`quote_status`/`budget_amount`/`actual_amount`/`payment_status`/`payment_date`；`meisun_contact` 這批先不放進編輯表單（維持建立時設定的值），對應第 3 節的範圍縮小建議。
- **取消廠商合作**：沿用 `sales_requests` 取消的確認 modal 模式，加一個 `cancel_reason` 文字欄位（選填），送出時 `PATCH cancelled_at/cancelled_by/cancel_reason/updated_at`，並執行上一段建議的「順便處理待審核」邏輯。
- **新增/編輯交付物**：這是第一次做這張表的 CRUD 介面，欄位比照你列的清單（`deliverable_name`/`due_date`/`status`/`attachment`/`notes`），`owner`/`reviewer` 這批同樣先預設帶入登入者本人、不開放指派給別人（理由同第 3 節）。
- **取消交付物**：跟廠商合作取消同一套模式。
- **讀取查詢加上排除已取消的條件**：`loadExistingData()` 讀 `marketing_campaign_vendors`/`marketing_campaign_vendor_deliverables` 的 `safeGET` 呼叫，加上 `&cancelled_at=is.null`，維持現有畫面預設只顯示進行中的合作跟交付物；之後如果想讓行銷總監查「歷史上取消過哪些合作」，可以之後再開一個不加這個過濾條件的清單，這批不急著做。

### `meisun_contact`/`owner`/`reviewer` 為什麼不建議這批做成可指派給別人

重新核對 v1 `schema_v13_user_access.sql`：`app_user_access` 雖然對 `authenticated` 開了欄位級 `grant select`，但同時有一條 RLS policy `app_user_access_own_select`，條件是 `(auth.jwt() ->> 'email')::citext = email`——**任何登入者查這張表，不管怎麼查，都只查得到自己那一列**，沒辦法拉出「目前有哪些人可以被指派」的清單。這代表如果現在要做「meisun_contact 可以改指派給其他同事」這個下拉選單，資料來源會是空的（因為查不到別人），這個功能做出來也不能用。

要解決有兩條路，都不建議在 Batch 6C 順手做：

1. **放寬 `app_user_access` 的 RLS**，讓 `authenticated` 能查到全部使用者的 email（或至少 email + 顯示名稱）——這是修改 v1 既有的安全政策，風險等級跟這整個系列審查到目前為止做過的任何一次異動都不一樣（前面全部是新增 v2 專屬的表跟欄位，這是第一次要動 v1 既有的存取控制設定），需要你們認真評估過再做，不適合當作 Batch 6C 裡的順手小改。
2. **在 v2 自己維護一份小的固定名單**（不查 `app_user_access`，直接寫死幾個已知同事的 email，比照決策 #8「角色矩陣先寫死在程式碼」的精神），風險低很多，但要接受名單要手動維護，人員異動要改程式碼。

這批先維持「對接人/負責人就是建立當下的登入者本人」最簡單，之後真的需要指派給別人再挑一條路徑做，不要在這批倉促決定。

---

## Codex 實作順序

1. **SQL 先行**：`cancelled_at`/`cancelled_by`/`cancel_reason` 加到兩張表 + 索引 + 更新 `all_expenses_overview` 排除已取消的廠商合作。這批需要動 SQL，不像 6A/6B 是純應用層。
2. **編輯廠商合作**：沿用既有 PATCH 模式，風險最低，先做建立信心。
3. **取消廠商合作**：沿用 `sales_requests` 取消模式，加上「順便處理待審核審核單」的邏輯（如果第 7 節那項確認要做）。
4. **新增/編輯交付物**：第一次做這張表的表單，可以參考「新增廠商合作」的表單結構（同樣是掛在某個父層 `marketing_campaign_vendors.id` 底下的子資料）。
5. **取消交付物**：最後做，複雜度最低，模式跟步驟 3 完全一樣。

**每一步做完建議的驗收方式**：步驟 1 做完先查 `information_schema.columns` 確認欄位都在，並手動執行一次 `all_expenses_overview` 的 SELECT 確認排除邏輯生效；步驟 2-5 做完後，各自建一筆測試資料跑過「新增 → 編輯 → 取消」整條路徑，取消後回頭確認 `all_expenses_overview`（如果有金額）跟公會/廠商頁的列表都正確把它排除掉。

---

## 需要你或行銷總監拍板的商業規則

1. **取消廠商合作時，如果有待審核的報價審核單，要不要一起自動處理？**（建議一起做，但不是必要條件）
2. **`meisun_contact`/`owner`/`reviewer` 要不要在近期規劃「可指派給其他同事」，如果要，是選擇放寬 v1 的 RLS 還是在 v2 維護一份固定名單？**（這批先不做，但值得先讓你知道有這個限制存在，早點想清楚方向）
3. **`cancel_reason` 要不要設成必填？** 目前建議選填，如果你希望每次取消都強制留一句原因方便之後回顧，也可以設成必填，只是使用門檻會提高一點。
