# Batch 13B 正式規格：V2 行銷案詳情、任務、預算、文件管理

建立日期：2026-07-17

## 目標

Batch 13B 讓 V2 接手 V1 行銷案詳情頁最常用的三個子模組：

- 任務 / 里程碑：`marketing_campaign_tasks`
- 預算明細：`marketing_campaign_budget_items`
- 文件附件：`marketing_campaign_documents`

此批完成後，行銷總監應能在 V2 針對單一行銷案管理任務、預算與文件；同時也能從行銷案總覽快速巡檢跨案子的到期任務與待付款項目。

## 已拍板架構

採用「詳情頁 + 巡檢卡片」混合架構。

### 1. 詳情頁作為主要管理入口

從「行銷專案管理」列表點進單一行銷案，進入行銷案詳情頁。

詳情頁包含：

- 行銷案主檔摘要。
- 任務 / 里程碑區塊。
- 預算明細區塊。
- 文件附件區塊。

三個子區塊都沿用既有 V2 模式：列表 + modal 新增 / 編輯 / 取消或封存。不要為詳情頁重新發明新的表單元件。

### 2. 頂部卡片作為跨案巡檢入口

在「行銷專案管理」頁頂部新增巡檢卡片，例如：

- 即將到期任務
- 待付款項目
- 文件待補或待確認

點卡片後進入跨案子的扁平巡檢列表。

巡檢列表定位：

- 只讀巡檢，不做完整新增 / 編輯。
- 列出符合條件的跨案子資料。
- 點任一列直接進入該行銷案詳情頁，再由詳情頁進行實際編輯。

這樣避免同一批資料同時有兩套編輯介面。

## 判斷標準

### 即將到期任務

卡片與巡檢列表納入：

- `cancelled_at is null`。
- 狀態不是 `已完成`。
- `planned_end` 已逾期，或在今天起 7 天內到期。

排序：

1. 已逾期優先。
2. `planned_end` 由近到遠。
3. 同一天時依行銷案名稱與 `seq` 排序。

### 待付款項目

卡片與巡檢列表納入：

- `cancelled_at is null`。
- `payment_status` 不是 `已付款`。
- `payment_status` 不是 `不需付款`。
- 金額欄位至少有一個有效金額：`amount_twd`、`amount_rmb` 或可轉成付款追蹤的既有金額欄位。

優先顯示：

- `payment_status = '待付款'`。
- 有 `payment_date` 且已逾期或最近到期。
- 金額較高者。

### 文件待補 / 待確認

此卡片可在 Batch 13B 視工作量決定是否納入第一版。

若納入，建議條件：

- `archived_at is null`。
- 文件類型是關鍵文件：`報價單`、`合約`、`設計稿`、`攤位設計圖`、`大會文件`。
- 依行銷案狀態與文件缺口判斷待補。

若第一版不做此卡片，仍需在詳情頁完成文件新增 / 編輯 / 封存。

## SQL 規格

### 任務軟取消

```sql
alter table marketing_campaign_tasks add column if not exists cancelled_at timestamptz;
alter table marketing_campaign_tasks add column if not exists cancelled_by citext references app_user_access(email);
alter table marketing_campaign_tasks add column if not exists cancel_reason text;
create index if not exists idx_marketing_campaign_tasks_cancelled on marketing_campaign_tasks(cancelled_at);
```

### 預算明細軟取消

```sql
alter table marketing_campaign_budget_items add column if not exists cancelled_at timestamptz;
alter table marketing_campaign_budget_items add column if not exists cancelled_by citext references app_user_access(email);
alter table marketing_campaign_budget_items add column if not exists cancel_reason text;
create index if not exists idx_marketing_campaign_budget_items_cancelled on marketing_campaign_budget_items(cancelled_at);
```

### 文件封存

```sql
alter table marketing_campaign_documents add column if not exists archived_at timestamptz;
alter table marketing_campaign_documents add column if not exists archived_by citext references app_user_access(email);
alter table marketing_campaign_documents add column if not exists archive_reason text;
create index if not exists idx_marketing_campaign_documents_archived on marketing_campaign_documents(archived_at);
```

### 費用彙總 view

`all_expenses_overview` 的 `marketing_campaign_budget_items` 分支需排除已取消預算項目：

```sql
from marketing_campaign_budget_items mbi
left join marketing_campaigns mc on mc.id = mbi.campaign_id
where mbi.cancelled_at is null
```

注意：`create or replace view all_expenses_overview` 必須貼完整 view 定義，不可只替換單一 union 分支。

## 文件版本規則

Batch 13B 採用「新版本 = 新增一筆文件」。

原因：

- V1 既有資料已經使用這個模式，例如「攤位設計 v1」與「攤位設計 v2」是兩筆獨立文件。
- `marketing_campaign_documents.version_note` 本來就是支援版本註記。
- 報價、合約、設計圖這類文件通常需要保留歷史版本，不適合像資源庫那樣用新檔覆蓋舊檔。

規則：

- 新版本請新增一筆文件，不覆蓋既有 `file_path`。
- 編輯文件只修改標題、類型、版本註記、備註、廠商 / 交付物關聯等中繼資料。
- 若某份文件不再使用，改為封存該筆文件。
- Phase 1 不做文件還原。

## V2 UI 規格

### 行銷案詳情頁

入口：

- 從行銷專案列表點專案名稱或「查看詳情」進入。
- 從巡檢列表點某列進入對應行銷案詳情頁。

頁面區塊：

- 頂部：返回行銷專案管理、專案名稱、狀態、重要性、期間、預算摘要。
- 任務 / 里程碑：列表、新增、編輯、取消、已取消清單。
- 預算明細：列表、新增、編輯、取消、已取消清單。
- 文件附件：列表、新增、編輯中繼資料、封存、已封存清單。

### 巡檢列表

巡檢列表只讀。

必備欄位：

- 所屬行銷案。
- 項目名稱。
- 狀態。
- 日期或付款日。
- 負責人或窗口。
- 下一步。

操作：

- 點列進入該行銷案詳情頁。
- 不在巡檢列表內開編輯 modal。

## 手機版驗收

必驗動線：

1. 行銷專案管理列表 → 點行銷案 → 詳情頁。
2. 詳情頁 → 新增任務 / 編輯任務 / 取消任務。
3. 詳情頁 → 新增預算 / 編輯付款狀態 / 取消預算。
4. 詳情頁 → 新增文件 / 編輯文件中繼資料 / 封存文件。
5. 行銷專案管理頂部卡片 → 巡檢列表 → 點列進入行銷案詳情頁。
6. 詳情頁返回行銷專案管理時，不迷失目前所在位置。

手機版要求：

- 返回按鈕固定在詳情頁頂部，文案為「返回行銷專案」。
- Modal 可捲動，底部操作按鈕可觸達。
- 已取消 / 已封存清單預設收合。
- 巡檢列表在手機上轉成卡片，不使用橫向捲動作為主要操作方式。

## V1 同步停用

Batch 13B 完成並驗收後，V1 應同步處理：

- 停用 `delTask()`。
- 停用 `delBudgetItem()`。
- 確認 `delDocument()` 仍維持 Batch 13A 已停用狀態。
- 建議同步停用任務 / 預算 / 文件新增與編輯，或至少在操作前提示「此功能已移至 V2 管理」。

若本批工作量需要拆分，至少要在 V2 對應子模組完成後，立刻停用 V1 同一子模組的刪除。

## 動工順序

1. 建立 SQL migration。
2. V2 載入任務 / 預算 / 文件資料。
3. 建立行銷案詳情頁導覽。
4. 實作任務管理。
5. 實作預算管理與 `all_expenses_overview` 驗收。
6. 實作文件管理與封存。
7. 實作巡檢卡片與只讀巡檢列表。
8. 手機版驗收。
9. V1 對應入口停用。

## 需要 Claude Code 實作前複查的重點

1. SQL 欄位與 view 定義是否完整。
2. 詳情頁資料載入是否會誤排除已封存行銷案名稱。
3. 巡檢列表是否保持只讀，沒有第二套編輯邏輯。
4. 文件新增是否遵守「新版本 = 新增一筆」。
5. V1 停用範圍是否與 V2 已完成能力一致。
