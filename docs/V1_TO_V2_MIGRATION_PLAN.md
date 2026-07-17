# 美昇 Marketing OS v1 → v2 搬遷計畫

建立日期：2026-07-17

## 結論

v2 已經開始接手共用資料表，特別是 `marketing_resources`。下一步不應直接新增大型功能，而要先用分批方式把 v1 仍在管理的能力移到 v2，並在每批之前處理「v1 真刪除」造成的資料風險。

建議 Batch 11 的定位是「搬遷盤點與治理凍結」，後續再依序做功能搬遷。最先要處理的不是新增畫面，而是明確規定：凡是已由 v2 接手或已被 v2 新功能引用的資料，不再從 v1 刪除。

## 目前判斷

- v1 專案位置：`/Users/yikaihuang/Documents/美昇 Marketing OS 專案/marketing-platform`
- v2 專案位置：`/Users/yikaihuang/Documents/美昇 Marketing OS 專案/meisun-marketing-os-v2`
- 兩者使用同一個 Supabase project：`apgrclmrkarxlajmhnpa`
- v1 正式網址：`https://marketing-a4l.pages.dev`
- v2 正式網址：`https://meisun-marketing-os-v2.pages.dev`

## 搬遷原則

0. **V2 最終取代 V1**
   2026-07-17 使用者已確認：V1 可以朝資料管理入口逐步停用前進，所有行銷管理資料未來都轉到 V2 管理。詳見 `V1_DISABLE_AND_FULL_V2_MIGRATION_PLAN.md`。

1. **先凍結危險操作，再搬功能**
   v1 目前多處使用真刪除，部分資料表有 `on delete cascade`。只要 v2 開始引用這些資料，v1 真刪除就可能靜默清掉 v2 關聯。

2. **v2 接手後只做軟封存 / 軟取消**
   v2 已在業務需求、廠商合作、交付物、資源管理採用這個原則。後續搬遷不應重新引入真刪除。

3. **共用資料表先不雙邊寫入**
   例如 `marketing_campaigns` 現在 v2 只讀、v1 寫入。若 v2 開始新增 / 編輯行銷案，就要同步決定 v1 是否改唯讀或停用同功能。

4. **每批都要手機優先驗收**
   所有新管理功能都要能在手機完成新增、編輯、封存、查看歷史與錯誤處理。

5. **每批都請 Claude 先做草案審查**
   尤其是涉及共用表、外鍵、刪除、Storage、排程或服務金鑰的功能。

## v1 功能盤點

| v1 功能 | 主要資料表 / 機制 | v2 現況 | 搬遷狀態 |
|---|---|---|---|
| 行銷案管理 | `marketing_campaigns` | v2 總經理 / 行銷總監只讀總覽 | 尚未搬完整管理 |
| 行銷案任務 / 里程碑 | `marketing_campaign_tasks` | v2 只顯示專案摘要，未管理任務 | 尚未搬 |
| 行銷案預算明細 | `marketing_campaign_budget_items` | v2 讀入費用彙總，已補付款欄位 | 尚未搬完整 CRUD |
| 行銷案文件附件 | `marketing_campaign_documents` + `campaign-documents` bucket | v2 只讀部分廠商文件關聯 | 尚未搬完整上傳 / 編輯 |
| 風險與待決事項 | `marketing_campaign_risks`、`marketing_campaign_risk_updates` | v2 有 `approval_requests`，但尚未接 v1 風險表 | 尚未搬 |
| 行銷成效 | `marketing_campaign_performance` | v2 Channel / 商機頁多為摘要，未接完整成效表 | 尚未搬 |
| 行銷資源庫 | `marketing_resources` + `marketing-resource-files` bucket | v2 已可新增 / 編輯 / 封存 / 下載 | 已開始接手 |
| 對外素材 | `marketing_resources.is_external_usable` | v2 業務資源頁已可用 | 已搬核心能力 |
| 公會管理 | `associations`、`association_fee_records`、`association_benefits`、`association_publication_schedules`、`association_events`、`association_notes`、`association_tasks`、`association_task_expenses` | v2 有公會總覽、標籤、合作 overview，但 CRUD 未完整 | 部分搬 |
| 投標工具 | `tender_projects`、`tender_keywords`、`tender_results`、`tender_scan_runs`、GitHub Action / script | v2 讀標案結果，管理能力未完整 | 尚未搬 |
| 新聞蒐集 | `marketing_news_keywords`、Cloudflare Function `/api/news` | v2 未做 | 尚未搬 |
| 每週文案彙整 | `marketing_content_drafts`、GitHub Action、Claude API | v2 未做 | 尚未搬 |
| 成功案例 | `marketing_case_studies` + `case-study-photos` bucket | v2 未做 | 尚未搬 |
| 帳號 / 密碼 | `app_user_access`、Supabase Auth | v2 已用角色登入與 eric 視角切換 | 部分共用 |

## 共用資料表與風險

| 資料表 / 功能 | v1 狀態 | v2 狀態 | 風險 | 建議 |
|---|---|---|---|---|
| `marketing_resources` | v1 可新增 / 編輯 / 真刪除 | v2 已新增 / 編輯 / 封存 | 高：v1 真刪除會 cascade 清掉 v2 知識庫關聯 | 立即停止用 v1 刪除資源；下一批可在 v1 隱藏或停用刪除按鈕 |
| `product_knowledge_resource_links` | v1 不知道此表存在 | v2 正式使用 | 高：依賴 `marketing_resources` | 保持 v2 管理，v1 不處理 |
| `marketing_campaigns` | v1 完整 CRUD，且可真刪除 | v2 只讀 | 高：刪除行銷案會 cascade 任務、預算、文件、風險、成效等子表 | v2 做行銷案管理前，先設計行銷案封存欄位 |
| `marketing_campaign_tasks` | v1 完整 CRUD / 真刪除 | v2 未管理 | 中高：任務是進度與專案追蹤核心 | 搬到 v2 時改軟取消 |
| `marketing_campaign_budget_items` | v1 完整 CRUD / 真刪除 | v2 費用彙總讀取 | 中高：刪除會影響總經理費用彙總 | 搬到 v2 時改軟取消或保留歷史 |
| `marketing_campaign_documents` | v1 完整 CRUD / 真刪除 | v2 部分關聯廠商 | 中：刪除會造成附件追溯斷點 | 搬到 v2 時改封存附件 |
| `marketing_campaign_risks` / updates | v1 完整 CRUD / 真刪除 | v2 未接 | 中：未來可整合到總經理待決策中心 | 先只讀整合，再決定是否取代 |
| `marketing_campaign_performance` | v1 完整 CRUD / 真刪除 | v2 未完整接 | 中：總經理 Channel 成效需要此資料 | 搬到 v2 的 Channel 成效 |
| 公會系列表 | v1 完整 CRUD / 真刪除 | v2 部分讀取與新標籤 / 階段 | 中高：v2 已建立 overview 與標籤邏輯 | 先搬公會 CRUD，再處理 v1 刪除風險 |
| `tender_*` | v1 管理與掃描 | v2 讀結果 | 中：涉及排程、腳本、通知 | UI 可搬到 v2，排程腳本可暫留原 repo |
| `marketing_content_drafts` / `marketing_news_keywords` | v1 管理 | v2 未接 | 低到中：較獨立 | 排在核心管理後 |
| `marketing_case_studies` | v1 管理 | v2 未接 | 低到中：業務會需要案例素材 | 可在資源 / 知識庫穩定後搬 |

## V1 真刪除清單

以下 v1 操作目前會送出 `DELETE`，搬遷時需要逐一評估改成封存、軟取消，或暫時停用：

- 行銷案：`marketing_campaigns`
- 行銷案任務：`marketing_campaign_tasks`
- 行銷案預算明細：`marketing_campaign_budget_items`
- 行銷案風險：`marketing_campaign_risks`
- 風險追蹤：`marketing_campaign_risk_updates`
- 行銷案文件：`marketing_campaign_documents`
- 行銷成效：`marketing_campaign_performance`
- 行銷資源：`marketing_resources`
- 公會主檔：`associations`
- 公會年費：`association_fee_records`
- 公會權益：`association_benefits`
- 公會任務：`association_tasks`
- 公會任務費用：`association_task_expenses`
- 公會期刊：`association_publication_schedules`
- 公會活動：`association_events`
- 公會備註：`association_notes`
- 標案專案：`tender_projects`
- 標案關鍵字：`tender_keywords`
- 文案草稿：`marketing_content_drafts`
- 新聞關鍵字：`marketing_news_keywords`
- 成功案例：`marketing_case_studies`

## 建議批次

### Batch 11A：V1 危險操作凍結

目的：先降低共用資料被 v1 真刪除破壞的風險。

執行狀態：已完成。v1 commit：`cf354f3 Disable v1 resource deletion`。

已完成範圍：

- v1 行銷資源庫停用 `delResource()` 刪除按鈕。
- v1 `delResource()` 函式改為提示，不再送出 `DELETE marketing_resources`。
- v1 Dashboard 可用素材、行銷資源庫、對外素材三處查詢都加上 `deleted_at=is.null`，排除 v2 已封存資源。
- v1 `HANDOFF.md` 已記錄資源庫逐步改由 v2 接手。

未納入此批：

- 其他 v1 真刪除功能仍維持原狀，避免一次動太多。
- 行銷案封存與 v1 行銷案查詢過濾留到 Batch 11B / 12 前拍板。

### Batch 11B：行銷案管理資料模型補齊

目的：讓 v2 可以接手 `marketing_campaigns` 前先有安全生命週期。

執行狀態：已完成。v2 commit：`b44c448 Add campaign archive model`。Claude 複查：`CLAUDE_CODE_REVIEW_BATCH11B_RESULT.md`，五項驗證通過。

已完成範圍：

- `marketing_campaigns` 新增 `archived_at`、`archived_by`、`archive_reason`。
- v2 行銷案列表排除已封存行銷案，但總經理歷史查詢可看只讀清單。
- 暫不做 v2 新增行銷案，先處理封存模型與已封存顯示。
- v1 暫時不過濾已封存行銷案。原因：v1 目前仍是行銷案主要管理入口，若 v2 先建封存模型就讓 v1 同步隱藏，可能造成行銷案在舊平台突然消失。待 Batch 12 正式接手行銷案新增 / 編輯時，再決定 v1 是否改唯讀、加提示或同步排除封存行銷案。

### Batch 12：v2 行銷案新增 / 編輯

目的：把 v1 最核心的行銷案主檔管理搬到 v2。

動工前審查文件：`BATCH12_CAMPAIGN_CRUD_DRAFT.md`。Claude 草案審查：`CLAUDE_CODE_REVIEW_BATCH12_DRAFT.md`。

### Batch 12A：V1 行銷案刪除停用

執行狀態：已完成。v1 commit：`45d93db Disable v1 campaign deletion`。Claude 複查：`CLAUDE_CODE_REVIEW_BATCH12A_V1_RESULT.md`，四項驗證通過。

目的：搶在 v2 新增 / 編輯行銷案主檔前，先停用 v1 的 `delCampaign()` 真刪除，避免 `DELETE marketing_campaigns` 觸發二層 cascade，清掉 v2 已建立的 `marketing_campaign_vendors` 與 `marketing_campaign_vendor_deliverables`。

已完成範圍：

- v1 行銷案 modal 的刪除按鈕改為停用狀態。
- v1 `delCampaign()` 函式改為提示，不再送出 `DELETE marketing_campaigns`。
- v1 `HANDOFF.md` 已記錄行銷案生命週期逐步改由 v2 接手。

未納入此批：

- v1 新增 / 編輯行銷案仍保留，供任務、預算、文件、風險、成效等子模組過渡期使用。
- v1 暫時仍不排除已封存行銷案。
- v2 行銷案新增 / 編輯 modal 留到 Batch 12B。

### Batch 12B：V2 行銷案主檔新增 / 編輯 / 封存

執行狀態：已完成。v2 commit：`7b71c5b Add v2 campaign CRUD`。Claude 複查：`CLAUDE_CODE_REVIEW_BATCH12B_RESULT.md`，五項驗證通過。此批不需要 SQL，沿用 Batch 11B 已建立的 `archived_at`、`archived_by`、`archive_reason`。

已完成範圍：

- v2 新增 / 編輯 `marketing_campaigns` 主檔。
- 欄位包含：名稱、狀態、重要性、預算、實支、補助、負責人、負責單位、外包廠商、關聯公會、活動型態、期間、目的、備註。
- eric/admin 可用視角切換測試不同角色。
- v1 行銷案新增 / 編輯可暫時保留，但需公告主要入口改 v2。
- v2 不做真刪除，既有案子只能封存；封存後進入 Batch 11B 的已封存清單。
- 新增時 `sort_order` 複製 v1 邏輯：查目前最小值再減 10，讓新案在手動排序清單前方。
- `association_activity_type` 使用自由文字輸入搭配建議值，不鎖死固定選單。

### Batch 13A：舊匯入腳本與 v1 子模組真刪除前置處理

動工前審查文件：`BATCH13_IMPORT_PRECHECK_DRAFT.md`。Claude 草案審查：`CLAUDE_CODE_REVIEW_BATCH13A_DRAFT.md`。Claude 實作複查：`CLAUDE_CODE_REVIEW_BATCH13A_V1_RESULT.md`，五項驗證通過。

目的：在 v2 接手任務 / 預算 / 文件前，先避免 v1 舊腳本或 v1 子模組刪除按鈕破壞後續軟取消 / 封存模型。

已確認風險：

- `scripts/import-campaign-details.mjs` 在 `--apply` 模式下會整批 DELETE `marketing_campaign_tasks` 與 `marketing_campaign_budget_items` 後重建。
- `scripts/seed-exhibition-oct2026.mjs` 在 `--apply` 模式下會整批 DELETE `marketing_campaign_tasks`、`marketing_campaign_budget_items`、`marketing_campaign_documents`，並重新上傳文件到 `campaign-documents` bucket。
- v1 `delTask()`、`delBudgetItem()`、`delDocument()` 仍會真刪除；其中 `delDocument()` 還會先刪 Storage 檔案。

建議先請 Claude Code 判斷：

- 是否先替兩支舊腳本加第二層破壞性授權旗標。結論：應加。
- 是否在 Batch 13A 同步停用 v1 任務 / 預算 / 文件刪除。結論：只停用文件刪除；任務 / 預算刪除留到 Batch 13B。
- Batch 13B 的任務 / 預算 / 文件軟取消欄位命名與費用彙總規則。

Batch 13A 實作範圍：

- v1 `scripts/import-campaign-details.mjs` 與 `scripts/seed-exhibition-oct2026.mjs` 加上 `--allow-destructive-reimport` 第二層旗標；只帶 `--apply` 時直接拒絕，不送資料庫或 Storage 請求。
- v1 `delDocument()` 停用，不再 `DELETE marketing_campaign_documents`，也不再刪除 `campaign-documents` Storage 檔案。
- v1 `delTask()` 與 `delBudgetItem()` 保留現況，避免 Batch 13B 上線前行銷總監失去任務 / 預算修正入口。

使用者最新決策：

- V1 資料管理入口可以逐步停用，後續目標是所有資料轉到 V2 管理。
- 每個模組在 V2 完成同等管理能力後，V1 對應新增 / 編輯 / 刪除應停用或改成導向 V2。

### Batch 13：任務 / 預算 / 文件搬遷

目的：接手 v1 行銷案詳情頁最常用的三個子模組。

建議範圍：

- `marketing_campaign_tasks`：新增 / 編輯 / 軟取消。
- `marketing_campaign_budget_items`：新增 / 編輯 / 軟取消，納入總經理費用彙總。
- `marketing_campaign_documents`：上傳 / 替換 / 封存，保留歷史。
- 手機上要能在行銷案詳情內切換任務、預算、文件。

### Batch 14：風險 / 待決策整合

目的：把 v1 `marketing_campaign_risks` 與 v2 `approval_requests` 的總經理待決策中心整合。

建議方向：

- 先只讀 v1 風險與追蹤，顯示在總經理待決策中心。
- 再決定是否用 `approval_requests` 取代部分風險審核。
- 不要一開始就合併資料表，先做顯示層整合。

### Batch 15：行銷成效 / Channel 成效接真資料

目的：讓總經理與行銷總監看到真實成效，而不是摘要或推估。

建議範圍：

- 接 `marketing_campaign_performance`。
- 補每個 channel / campaign 的轉換指標。
- 支援行銷總監新增 / 編輯成效資料。
- 業務端只看與資料使用有關的結果，不看完整管理欄位。

### Batch 16：公會管理完整搬遷

目的：把 v1 公會 CRUD 搬到 v2，並整合 v2 已建立的彈性標籤與階段。

建議範圍：

- 公會主檔、年費、權益、任務、任務費用、期刊、活動、備註。
- 原則上全部採軟取消或封存，不再真刪除。
- 需要重新確認 v2 的 `association_cooperation_overview` 是否能涵蓋所有公會資料。

### Batch 17：投標工具管理搬遷

目的：讓行銷總監在 v2 管理標案監測，業務在 v2 使用結果。

建議範圍：

- `tender_projects`、`tender_keywords` 的新增 / 編輯 / 停用。
- `tender_results` 狀態更新與轉名單流程。
- GitHub Action / 掃描腳本可先留在 v1 repo 或獨立腳本，不急著搬到 v2 前端 repo。

### Batch 18：新聞 / 文案 / 成功案例

目的：搬遷較獨立的內容營運功能。

建議順序：

1. 成功案例庫，因為業務與知識庫會用到。
2. 新聞關鍵字與新聞蒐集。
3. 每週文案草稿與自動排程。

## 立即操作建議

1. 口頭提醒行銷總監：資源庫已改由 v2 管理，不要再從 v1 刪除資源。
2. 下一批先請 Claude 審查 Batch 11A：是否只停用 v1 資源刪除就足夠，還是要同步讓 v1 隱藏 `deleted_at is not null` 的資源。
3. Batch 11A 通過後，再進 Batch 11B / 12 的行銷案主檔接手。

## 給 Claude 的複查重點

- 重新核對 v1 `delResource()` 是否仍為最高優先風險。
- 確認 `marketing_campaigns` 若改封存，是否會影響 v1 現有排序、Dashboard、匯出 CSV。
- 確認 `marketing_campaign_tasks`、`marketing_campaign_budget_items`、`marketing_campaign_documents`、`marketing_campaign_risks` 的外鍵 cascade 風險。
- 確認 Batch 12 若開始寫入 `marketing_campaigns`，v1 是否會直接看到 v2 新資料，以及是否需要先停用 v1 新增入口。
- 檢查是否有任何 v1 腳本仍會 bulk DELETE 再重建資料，特別是 `scripts/import-campaign-details.mjs` 與 `scripts/seed-exhibition-oct2026.mjs`。
