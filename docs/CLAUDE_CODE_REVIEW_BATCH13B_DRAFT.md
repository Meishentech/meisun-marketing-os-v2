# Claude Code Review｜Batch 13B 草案審查：v2 任務 / 預算 / 文件管理

審查日期：2026-07-17
審查對象：`docs/V1_DISABLE_AND_FULL_V2_MIGRATION_PLAN.md` 的 Batch 13B 段落，交叉核對 `V1_TO_V2_MIGRATION_PLAN.md`、`CLAUDE_CODE_REVIEW_BATCH13A_DRAFT.md`、`CLAUDE_CODE_REVIEW_BATCH13A_V1_RESULT.md`、`BATCH13_IMPORT_PRECHECK_DRAFT.md` 五份文件的既有決策是否一致
審查方式：查了 `marketing_campaign_tasks`/`budget_items`/`documents` 三張表完整目前欄位（含 v1 原始 schema + v2 陸續補的欄位）、`all_expenses_overview` 現行 view 定義、v1 `HANDOFF.md` 裡記錄的實際文件上傳歷史（用來判斷真實使用習慣，不只看 schema），並確認 v2 目前**沒有任何「行銷案詳情頁」這種鑽取單一案子的頁面架構**，這點會直接影響第 4 題的答案，也是這次審查最重要的發現。

---

## 結論先講：這批比表面上看起來大一級，因為「行銷案詳情頁」在 v2 目前根本不存在

先講審查範圍裡最關鍵的一個現況落差：草案（包含更早的 `BATCH13_IMPORT_PRECHECK_DRAFT.md`）預設寫法都是「行銷案詳情頁手機優先，任務/預算/文件要能在手機完整操作」——**但 v2 現在沒有任何「點進某個行銷案、看這個案子專屬內容」的頁面**。`campaignDetailCardsSection()`（`app.js:882`）只是一組寫死的靜態卡片（「任務/里程碑」「合作廠商」「預算/補助」「成效/名單」四張說明卡，內容從專案最早期就沒改過），不是真的可以點進去、依 `campaign_id` 過濾的詳情頁。v2 從 Batch 1 到 Batch 12B 為止，所有模組（廠商合作、資源、知識庫、業務需求單）都是**同一種架構：扁平列表 + modal 編輯單筆**，從來沒有「鑽進某一筆父記錄、看它專屬子資料」這種頁面模式。

這代表 Batch 13B 不是「幫三張表加 CRUD」這麼單純，是要先決定：**要不要在 v2 建立這個專案第一個「詳情頁」架構**（v1 現在的 `campaignDetail(id)` 就是這種頁面），還是**延續 v2 目前一路用的扁平列表模式**（任務/預算/文件各自是獨立列表，用「所屬行銷案」欄位＋篩選下拉呈現，不做成鑽取頁面）。這題會直接決定第 4 題的手機版設計方向，也會影響整批的工作量，建議在動工前明確拍板，不要let它在寫程式的過程中才被動決定。

**我的建議是選扁平列表**，理由：
1. 跟 v2 從 Batch 1 走到現在的架構完全一致，不用發明新模式、不用另外設計手機版的頁面切換/返回邏輯。
2. 實際資料量從 v1 `HANDOFF.md` 記錄可以看到不大（一次匯入約 41 筆任務、23 筆預算明細，分布在約 6 個行銷案），扁平列表配「所屬行銷案」欄位＋篩選下拉完全夠用，不需要鑽取頁面才能維持可讀性。
3. 詳情頁架構是這個系列目前唯一沒做過的新模式，如果之後要做（例如任務/預算/文件的量真的變大），可以晚一點再做，不會因為 Batch 13B 先選扁平列表而回不去。

若你或行銷總監評估後還是想要 v1 那種「進入案子、看到底下所有東西」的詳情頁體驗，也可以，但那應該是一個**獨立、更大的批次**（可能要叫 Batch 13B-detail-page 或直接併入更晚的批次），不建議跟「先把三張表的基本 CRUD 接上」揉在同一批，會讓範圍失控。

---

## 逐題回答

### 1. tasks / budget_items / documents 要補哪些 SQL 欄位

查了三張表目前**完整**欄位（v1 原始 schema + v2 陸續補的部分，不是只看 v1 最初建表當時的樣子）：

**`marketing_campaign_tasks`**（目前：`id`/`campaign_id`/`seq`/`task_name`/`planned_start`/`planned_end`/`owner`/`status`/`completion_pct`/`expected_output`/`notes`/`created_at`，v2 完全沒補過欄位）：

```sql
alter table marketing_campaign_tasks add column if not exists cancelled_at timestamptz;
alter table marketing_campaign_tasks add column if not exists cancelled_by citext references app_user_access(email);
alter table marketing_campaign_tasks add column if not exists cancel_reason text;
create index if not exists idx_marketing_campaign_tasks_cancelled on marketing_campaign_tasks(cancelled_at);
```

**`marketing_campaign_budget_items`**（目前：v1 原始欄位 + Batch 5 補的 `payment_status`/`payment_date` 兩個，這兩個已經在用於 `all_expenses_overview`）：

```sql
alter table marketing_campaign_budget_items add column if not exists cancelled_at timestamptz;
alter table marketing_campaign_budget_items add column if not exists cancelled_by citext references app_user_access(email);
alter table marketing_campaign_budget_items add column if not exists cancel_reason text;
create index if not exists idx_marketing_campaign_budget_items_cancelled on marketing_campaign_budget_items(cancelled_at);
```

**`marketing_campaign_documents`**（目前：v1 原始欄位 + Batch 3 補的 `vendor_id`/`deliverable_id` 兩個外鍵，`doc_type` check 約束已經在 Batch 3 擴充成 10 個值：`報價單/合約/設計稿/印刷檔/施工照片/完工照片/攤位設計圖/大會文件/廠商資料/其他`——**做文件類型下拉選單時直接用這 10 個，不要只用 v1 最初的 5 個，那已經是舊版約束**）：

```sql
alter table marketing_campaign_documents add column if not exists archived_at timestamptz;
alter table marketing_campaign_documents add column if not exists archived_by citext references app_user_access(email);
alter table marketing_campaign_documents add column if not exists archive_reason text;
create index if not exists idx_marketing_campaign_documents_archived on marketing_campaign_documents(archived_at);
```

**RLS/grant 不需要異動**：三張表現在都是 `for all using (auth.role() = 'authenticated')`（`marketing_campaign_documents` 是較新的 `to authenticated using(true) with check(true)` 寫法，功能等價，只是語法年代不同），已經是全權限給 authenticated，跟這個專案 Phase 1「不擴大 RLS 工程」的既定原則一致，不用額外處理。

### 2. `all_expenses_overview` 如何排除已取消預算

現行 view（`sql/phase1_batch6c_vendor_lifecycle.sql`）裡 `marketing_campaign_budget_items` 這個分支目前是：

```sql
from marketing_campaign_budget_items mbi
left join marketing_campaigns mc on mc.id = mbi.campaign_id
```

比照同一個 view 裡 `marketing_campaign_vendors` 分支已經在用的做法（`where mcv.cancelled_at is null`），Batch 13B 補上 `cancelled_at` 欄位後，改成：

```sql
from marketing_campaign_budget_items mbi
left join marketing_campaigns mc on mc.id = mbi.campaign_id
where mbi.cancelled_at is null
```

只需要這一行改動，不用重寫整個 view。`create or replace view` 記得連同其他三個 union 分支（association_fee_records/association_task_expenses/marketing_campaign_vendors 那三段）一起貼進新的 migration，不能只 replace 一段（PostgreSQL 的 `create or replace view` 是整個 view 定義一起換，複製整份 `all_expenses_overview` 目前完整定義、改這一行、存成新的 migration 檔案）。

### 3. 文件換檔是否保留歷史版本，或沿用資源庫換檔清舊檔

**這題有一個比「二選一」更好的答案，從 v1 實際使用紀錄裡看出來的**：v1 `HANDOFF.md` 記錄「10月空調展」那次匯入，文件是「開國報價單、**攤位設計 v1**、**攤位設計 v2**、大會參展申請表」——**攤位設計 v1 跟 v2 是兩筆獨立的文件紀錄，不是同一筆文件換檔案覆蓋過去**。這代表 v1 使用者實際的操作習慣，本來就是「新版本＝新增一筆文件」而不是「編輯既有那筆、替換裡面的檔案」，文件表本身也早就有 `version_note` 這個欄位在支援這件事。

**建議 Batch 13B 直接延續這個已經在用的真實模式**：「上傳新版本」＝新增一筆文件（新的 `version_note`，例如「v2」「2026-07 修訂版」），不是覆蓋既有那筆的 `file_path`。這樣完全不用在「保留歷史」跟「換檔清舊檔」之間二選一——每個版本本來就是獨立一筆，封存（`archived_at`）套用在單筆層級就好（例如「攤位設計 v1」封存起來、「攤位設計 v2」維持有效）,天然就有版本歷史，也不會跟 Batch 9B 資源庫「編輯同一筆、換掉裡面檔案」的模式衝突——**因為文件的實際使用情境本來就跟資源庫不一樣（資源庫的『新版本』通常是同一份文宣的更新，文件的『新版本』常常是要保留舊版本本身的，例如報價異動歷程）**，兩者不需要用同一套規則，這不是不一致，是分別對應各自的真實需求。

如果之後真的有「編輯既有這筆文件的中繼資料（標題/備註）但不換檔案」的需求，那走一般的 `PATCH` 更新欄位即可，不牽涉檔案替換，不受這題影響。

### 4. v2 手機版行銷案詳情頁怎麼放任務 / 預算 / 文件

見開頭結論——建議先拍板「扁平列表」還是「詳情頁」，我建議扁平列表。如果採用扁平列表，手機版設計上不需要特別的新元件：

- 「行銷案任務」「行銷案預算」「行銷案文件」可以做成三個獨立區塊（或甚至三個獨立 nav 項目，比照「合作廠商 / 交付物」現在的模式），各自是 `type:"table"` 搭配既有的 `data-label` 手機轉卡片機制。
- 每一列補一個「所屬行銷案」欄位（用 `campaignName()`，這個函式已經在 Batch 11B 改成會正確處理已封存案子的名稱查詢，文件審查時不用重新確認這件事）。
- 篩選下拉用 `campaignOptions()` 現成的函式（`app.js:1832`，Batch 12B 已經在用），不用重新設計行銷案下拉選單邏輯。
- 新增/編輯 modal 個別欄位不多（任務跟預算都在 10 欄以內），不會遇到 Batch 12B 那種 23 欄位需要視覺分區的問題，維持現有 `.form-grid` 單頁表單即可。

### 5. Batch 13B 完成後，v1 哪些按鈕要停用

**明確要停用**（延續 Batch 13A 已經對 `delDocument()` 做的模式）：
- `delTask()`
- `delBudgetItem()`
- 文件刪除維持 Batch 13A 已經停用的狀態（不用重做，確認沒有被後續改動打開回去即可）

**建議這批一併考慮、比 Batch 12A/12B 當時的判斷更進一步**：Batch 12A/12B 讓 v1 的行銷案「新增/編輯」保留，理由是**當時 v1 仍是任務/預算/文件唯一的管理入口**——但 Batch 13B 上線後，這個理由對任務/預算/文件三個子模組本身就不成立了（v2 這批做完之後，任務/預算/文件在 v2 也能新增/編輯，不再是「v1 獨有」）。建議 Batch 13B 完成後：
- v1 任務/預算/文件的「新增」「編輯」也一併加提示或停用（不只是刪除），比照這批對 `delDocument()` 的處理力度，不要只停刪除、放著新增編輯繼續在 v1 進行造成兩邊資料不同步的困惑。
- 這個決定不影響 `delCampaign()`/行銷案新增編輯本身的現況（那些留給 Batch 14 之後，行銷案主檔以外的其他子模組——風險、成效——還沒搬完前，v1 行銷案本身的新增/編輯依然要保留）。

---

## 需要你或行銷總監拍板的事

1. **任務/預算/文件要做成扁平列表還是詳情頁**（第 4 點，這是這批最重要的待拍板事項，會決定工作量跟後續維護模式）。
2. Batch 13B 完成後，v1 任務/預算/文件的新增/編輯是否也要一併停用（不只刪除），還是先跟 Batch 12A/12B 一樣只處理刪除、新增編輯留到之後——這題我建議這批就一起處理，但最終決定權在你。

---

## 2026-07-17（同日稍晚）：第 4 點已拍板——混合架構

第 4 點「扁平列表 vs 詳情頁」討論後拍板結果是**兩者混合，不是二選一**：

- **案件管理主體採詳情頁**：點進某個行銷案，看到並管理它底下的任務/預算/文件（滿足「深耕單一案子」）。
- **「行銷專案管理」頁最上方加功能卡片置頂**（例如「即將到期任務」「款項支付」），點進卡片後進入**跨案子的扁平列表**（滿足「跨案子巡檢」，不用逐一點開每個案子確認）。

這個設計把我原本在「扁平列表 vs 詳情頁」二選一裡各自的缺點都補上了：詳情頁不再犧牲跨案巡檢能力（卡片入口頂替），扁平列表也不用當成任務/預算/文件的主要管理介面（詳情頁才是）。

**動工前建議先定義清楚，避免範圍跑掉**：

1. **卡片點進去的扁平列表建議唯讀（巡檢用），不做完整編輯**——列出符合條件的跨案子任務/預算清單，點某一列直接導去該案子的詳情頁進行實際編輯，不要在扁平列表裡也做一套完整的新增/編輯，否則同一批資料要維護兩套編輯介面。
2. **詳情頁本身盡量精簡，不發明新元件**：三個區塊（任務/預算/文件）內部沿用既有的列表 + modal 模式，只是多一個 `campaign_id` 篩選，把「這是這個專案第一個詳情頁架構」的新鮮感控制在「頁面導覽層級」，不要連內部元件都重新設計，手機版風險才會低。
3. **手機版返回動線要明確驗收**：「行銷專案管理列表 → 案子詳情頁 → 任務編輯 modal」至少兩層導覽，動工完成後照 `MOBILE_ACCEPTANCE_CHECKLIST.md` 特別驗這段，不能只驗證單一層級的表單可操作。
4. **「即將到期」「待付款」的判斷標準要在動工前定義**（例如到期任務是「7 天內到期」還是「本週」；待付款是 `payment_status != 已付款` 還是要排除已取消的項目），這是實作細節但會直接影響卡片數字對不對得起來，建議寫進 Batch 13B 正式規格，不要留給實作時臨場決定。

其餘四題（SQL 欄位、`all_expenses_overview` 排除已取消預算、文件版本延續「新版本＝新增一筆」的既有真實使用模式）跟這個架構決定無關，維持原本建議不變。

---

## 建議動工順序

1. SQL migration（三張表補欄位 + `all_expenses_overview` 改寫，兩者可以同一份 migration 檔）。
2. 拍板扁平列表 vs 詳情頁（阻塞後續 UI 設計，建議最先確定）。
3. v2 任務管理（新增/編輯/取消，含「所屬行銷案」欄位跟篩選）。
4. v2 預算管理（同上，取消後確認 `all_expenses_overview` 正確排除）。
5. v2 文件管理（上傳走「新版本＝新增一筆」模式，封存單筆）。
6. 手機版驗收（比照既有 `MOBILE_ACCEPTANCE_CHECKLIST.md`，這批因為沿用既有元件，風險比 Batch 12B 低）。
7. v1 對應按鈕停用（含新增/編輯，依上面拍板結果決定範圍）。
