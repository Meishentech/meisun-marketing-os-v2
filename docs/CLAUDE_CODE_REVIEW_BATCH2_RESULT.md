# Claude Code Review｜Batch 2 公會管理實作結果

審查日期：2026-07-15
審查對象：`sql/phase1_batch2_associations.sql`（commit `e5c4e74`/`01833bd`）、`assets/app.js` 公會管理相關程式碼（commit `f78580d`/`d17572c`）
審查方式：實際讀取目前 repo 內容逐行比對，非憑上次審查文件推測。

---

## 結論摘要

Batch 2 實作品質良好，可以進入 Batch 3。逐項核對下來：SQL 欄位對齊正確、`notes` 欄位問題確實修好了（這其實是**我上一版審查自己給的 SQL 裡的錯誤**，不是 Codex 造成的，這次一併說明）、`view` 多加了 `security_invoker = true` 是超出原本建議的好設計、RLS/grant 符合已定案的 Phase 1 決策。找到 1 個值得注意但不阻塞的風險（`association_stage_options` 全域共用表目前任何角色都能 DELETE）和 1 個功能未完成項（階段百分比還沒接進畫面）。沒有發現會擋住 Batch 3 開始的問題。

---

## 1. SQL 欄位對齊複查

逐分支重新比對 `sql/phase1_batch2_associations.sql` 的 view 定義跟 v1 實際欄位（`schema_v17_associations.sql`、`schema_v19_association_tasks_expenses.sql`）：

| 分支 | 引用欄位 | 對照結果 |
|---|---|---|
| `association_tasks` | `task_name`、`task_type`、`task_status`、`owner`、`due_date`、`progress_pct`、`next_step`、`notes`、`attachment` | ✅ 全部存在，型別相容 |
| `association_events` | `event_name`、`event_type`、`event_status`、`owner`、`event_date`、`result_notes`、`attachment` | ✅ 全部存在；`notes` 已改用 `null::text as notes`，不再引用不存在的欄位 |
| `association_publication_schedules` | `publication_name`、`material_status`、`owner`、`deadline_date`、`result_notes`、`attachment` | ✅ 全部存在；`notes` 同樣改用 `null::text as notes` |

**說明一下 `association_events.notes` 這個問題的來源**：`association_events` 這張表本來就只有 `result_notes`，沒有獨立的 `notes` 欄位——這是我上一版 `CLAUDE_CODE_REVIEW_BATCH2_ASSOCIATIONS.md` 裡自己寫錯的 SQL（event 分支誤引用了 `notes`），Codex 執行時撞到「column notes does not exist」直接抓出來並修正了。現在的修正方式（`null::text as notes`）跟 publication 分支保持一致寫法，是對的，不需要再改。

---

## 2. View 設計是否影響 v1 舊平台

- 沒有對 `association_tasks`/`association_events`/`association_publication_schedules`/`associations`/`association_fee_records`/`association_task_expenses` 做任何 rename、drop column、改型別——確認符合「不影響舊平台」的前提。
- `create or replace view association_cooperation_overview with (security_invoker = true) as ...`——**這個 `security_invoker = true` 是這次實作超出我原本建議的地方，是個好設計**：Postgres 15+ 才有這個選項，效果是這個 view 執行時會套用「呼叫者」的權限與 RLS，而不是「view 擁有者」的權限。現在因為底層三張表的 RLS policy 都是 `using(true)`，這個設定實際上還看不出差異；但等 Phase 2 真的收緊 RLS 時，這個 view 會自動跟著套用新的限制，不用重新建立——算是提前把技術債清掉了。**唯一要注意的是這需要 Supabase 專案的 Postgres 版本 ≥ 15**，如果 migration 執行時報 `unrecognized parameter "security_invoker"`，代表專案版本較舊，需要另外處理（機率低，但驗收時建議把這行的執行結果單獨看一眼）。
- View 命名 `association_cooperation_overview` 沒有跟既有任何表/view 撞名。

---

## 3. RLS / Grant 檢查

### 新表的 RLS/grant 正確且符合已定案的 Phase 1 決策

`association_stage_options`、`association_relationship_tags` 都用 `alter table ... enable row level security;` + `grant select, insert, update, delete ... to authenticated;` + `using(true) with check(true)` 的 policy，這跟 `association_*` 家族既有寫法一致，也符合先前已經定案的決策 #2（Phase 1 資料庫層暫不做角色隔離，只在前端做選單/頁面過濾）——**這不是新出現的安全問題，是照原計畫執行**。

### View 的 grant 正確補上了

`grant select on association_cooperation_overview to authenticated;`（第 128 行）——這正是我上次審查特別提醒容易漏掉的一步（Postgres view 不會自動繼承底層表權限），確認有做，且搭配 `security_invoker = true` 後，實際執行權限檢查會落在呼叫者身上，邏輯一致。

### 一個值得注意但不阻塞的風險：`association_stage_options` 是全域共用設定表，目前任何角色都能刪除

`association_stage_options` 只有 9 筆資料，是**所有使用者共用的階段定義字典**，不是像 `leads`/`association_relationship_tags` 那種「屬於某個人或某個公會」的資料列。目前的 grant 讓任何登入帳號（包含業務）都能直接 `DELETE` 這張表的任何一列。如果有人不小心刪掉一筆（例如透過 REST API 誤操作），會導致**所有人**在公會頁看到的階段百分比顯示都跟著壞掉，影響範圍比一般資料被誤刪更大。

這不是資安漏洞（Phase 1 本來就決定不做角色隔離），是**防呆建議**：可以考慮讓 `association_stage_options` 只開放 `select, insert, update` 給 `authenticated`，`delete` 先不開放（或者乾脆維持現狀，等 Phase 2 一起處理）。這點不影響 Batch 3，是否要現在調整由你決定。

---

## 4. 前端 Fallback 與資料顯示邏輯

### 三層 fallback 設計清楚，正確區分三種狀態

`associationSection()`/`associationTagsSection()` 都做了「有真實資料 → 顯示真實資料」「`dataStatus === 'live'` 但沒資料 → 明確提示尚未從哪張表/view 讀到資料」「還沒連線 → 示範資料」三層判斷，不會像最早的原型那樣把示範假資料誤當成真資料顯示，這正是上次審查提醒過的重點，做得正確。

### 「負責 / 下一步」欄位修正是合理的清晰度提升

比對 `d17572c` 的 diff：原本 `item.next_step || item.notes || item.owner` 三個來源混在一起顯示同一格，如果顯示出來的其實是 `owner`（人名），使用者可能誤以為那是「下一步」的內容。改成 `associationNextStep()` 明確在只有 owner 時加上「負責：」前綴、欄位標題也改成「負責 / 下一步」，這個修正是對的，不需要再調整。

### 發現：`association_stage_options` 目前完全沒有被前端讀取

檢查 `loadExistingData()`（第 1245-1252 行）的 `Promise.all` 清單，抓了 `campaigns`、`resources`、`tenders`、`leads`、`associations`、`association_relationship_tags`、`association_cooperation_overview`，**唯獨沒有抓 `association_stage_options`**。

這代表原本設計「`stage` 欄位 join `association_stage_options` 算出百分比進度」這件事目前還沒接上——畫面上的 `stage` 只用 `statusTone()` 顯示一個有顏色的標籤，而 `statusTone()` 目前只認得 `已追蹤`/`已完成`/`可對外`（綠）、`評估中`/`待確認`/`待付款`/`待核准`（黃）、`已排除`/`逾期`（灰）這些**其他頁面**（招標、預算）用的詞彙，完全沒有涵蓋公會專屬的階段名稱（已確認合作/排期、素材準備中、執行中、已結束、已投稿/截稿、已確認刊出）。實際效果是：公會合作紀錄列表裡，`階段` 這一欄幾乎全部會顯示成沒有顏色的白色標籤（只有剛好等於 `"待確認"` 的列會意外命中黃色），看不出哪些是快完成的、哪些是剛起步的。

**這不是 bug，是 Batch 2 原設計裡「畫面顯示百分比」這塊還沒做完**，不影響資料正確性，只影響公會頁面現在的視覺辨識度。可以現在順手補（抓 `association_stage_options`，用 `entity_type` + `stage` 查出 `pct_value`，比照其他頁面的 `progress()` 進度條 helper 顯示），也可以先跳過留到之後——不阻塞 Batch 3。

### 次要觀察：`associationKpis()` 已經預先寫了「已取消」的過濾邏輯，但資料庫層還沒定義這個值

第 1072 行 `!["已結束", "已完成", "已取消"].includes(item.stage)`——`已結束`/`已完成` 分別對應 event/task 現有的結束狀態，但 `已取消` 目前不存在於 `association_stage_options` 的種子資料、也不是任何來源表的既有預設值。現在這行程式碼是安全的空操作（永遠不會有資料命中「已取消」，所以篩選結果不受影響），但代表前端已經預期未來會有這個狀態。這對應到上次審查列的公開問題（要不要正式定義「已取消」狀態），目前還沒拍板，不影響現在運作，等你們決定要不要正式支援「取消」流程時再處理即可。

---

## 5. Batch 3（多廠商與交付物）開始前的阻塞檢查

**沒有發現會阻塞 Batch 3 開始的問題。**

- Batch 2 的兩張新表、一個 view 完全不觸碰 Batch 3 要用到的任何表（`vendors`/`marketing_campaign_vendors`/`marketing_campaign_vendor_deliverables`/`marketing_campaign_documents`），沒有交集，不會互相干擾。
- 順便確認了 Batch 1（`sql/phase1_batch1_leads.sql`）的 `assigned_sales citext references app_user_access(email)` 寫法正確（第 22、34 行），確認 `citext` FK 慣例已經被正確執行了一次——**Batch 3 的 `meisun_contact`/`owner`/`reviewer` 這類「指派給誰」的欄位，應該延續同一個 `citext references app_user_access(email)` 寫法**，不要改用 `uuid` 或純 `text`。

**非阻塞、建議但不強制的待辦**：
1. 把 `association_stage_options` 接進前端，讓公會合作紀錄顯示真正的百分比進度（第 4 節）。
2. 考慮收回 `association_stage_options` 的 `delete` 權限（第 3 節）。

這兩項都可以跟 Batch 3 平行處理，不需要現在停下來補完才能往下走。
