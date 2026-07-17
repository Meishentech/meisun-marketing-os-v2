# Claude Code Review｜Batch 12 草案：v2 行銷案主檔新增/編輯（寫程式前審查）

審查日期：2026-07-17
審查對象：`docs/BATCH12_CAMPAIGN_CRUD_DRAFT.md`
審查方式：逐一核對 v1（`marketing-platform`，已 `git pull` 到最新）的 `saveCampaign()`/`delCampaign()` 實際程式碼、`marketing_campaigns` 完整 schema 演進（`schema.sql` + `v3`/`v6`/`v15`/`v21` 增量）、`marketing_campaign_vendors`/`marketing_campaign_vendor_deliverables` 的外鍵定義、`all_expenses_overview` 目前的 view 定義，逐項回答草案列的 7 個審查重點。草案本身寫得很扎實，7 個問題問到的都是真正該問的地方，逐一查證下來大多數判斷是對的，其中第 1 點的風險比草案描述的還要更嚴重一級。

---

## 結論先講：第 1 點（v1 `delCampaign()`）風險比草案寫的更大，建議提高優先度到「必須同批做，不是建議同批做」

草案問「v1 `delCampaign()` 是否必須在 Batch 12 前或同批停用，避免 cascade 清掉 v2 已建立的 `marketing_campaign_vendors` / deliverables」——**答案是必須，而且是二層 cascade，不是一層**：

```sql
-- sql/phase1_batch3_vendors.sql
create table if not exists marketing_campaign_vendors (
  campaign_id uuid not null references marketing_campaigns(id) on delete cascade,
  ...
);

create table if not exists marketing_campaign_vendor_deliverables (
  campaign_vendor_id uuid not null references marketing_campaign_vendors(id) on delete cascade,
  ...
);
```

v1 現在刪除一筆行銷案，會先 cascade 刪光這個案子底下**所有廠商合作紀錄**，每一筆廠商合作又會 cascade 刪光**底下所有交付物**——這是目前為止查到的搬遷風險裡，波及範圍最大的一次（比 Batch 11A 的資源連結表只有一層、比行銷案本身其他子表如 tasks/budget_items 是平行一層都更深）。而且跟 Batch 11A 資源封存不同的地方是：**廠商合作跟交付物功能已經是 v2 上線一段時間、有實際操作歷史的正式功能**（Batch 6A-6C 建的編輯/取消/核准流程），不是剛接手還沒什麼資料的新功能，波及後果更實際。

另外查到一個草案沒提到的次要風險：`approval_requests`（Batch 4 建的審核表）用 `entity_id` 這種無 FK 的通用欄位指向 `marketing_campaign_vendors.id`（廠商報價審核走這條路）。cascade 刪除不會連帶刪掉 `approval_requests` 的紀錄（沒有 FK 約束），但會讓這些審核紀錄的 `entity_id` 變成指向不存在資料的孤兒——不會報錯、不會被自動清理，只是總經理待決策中心之後如果顯示這筆審核紀錄，會找不到對應的廠商報價內容。這個風險比 cascade 直接消失更隱蔽（沒有錯誤訊息，只是資料對不起來），建議記錄下來但不用因此擴大這批範圍，等實際做核准紀錄清理時再處理。

**建議**：這批不是「Claude 判斷後可能建議同批處理」，是明確建議跟 Batch 11A 用同一套模式立即處理（停用 `delCampaign()`，改成跟 `delResource()` 一樣的提示訊息），而且優先度應該高於「補齊 v2 新增/編輯欄位」本身——理由是就算 Batch 12 的新增/編輯 modal 還沒寫完，只要 v1 這個真刪除還留著，任何時候都可能有人在 v1 刪掉一個剛好被 v2 廠商合作模組使用中的行銷案，跟 Batch 12 本身進度無關。**建議在 Batch 12 動工的第一步就處理，甚至可以獨立拆成 Batch 12A（比照 Batch 11A 的做法）搶在新增/編輯 modal 之前先上。**

---

## 逐項回答草案的 7 個審查重點

### 1. v1 `delCampaign()` 停用時機

見上方結論，答案是「必須，建議提前或同批最優先處理，不是可以再斟酌的選項」。

### 2. v2 新增/編輯欄位是否完整對齊 v1 `saveCampaign()`

**逐欄核對過，草案的 21 個欄位跟 v1 `saveCampaign()`（`app.js:2932-2966`）的 payload 完全一致，沒有遺漏任何一個欄位，也沒有多加 v1 沒有的欄位。** 這是我核對過的所有批次裡，欄位清單跟來源程式碼吻合度最高的一次草案。

順帶確認一件事：schema 最原始版本（`schema.sql`）裡有一個 `partner`/`vendor`（單數）欄位，草案沒有列進去——查證後確認這是被 `vendors`（複數，jsonb 陣列）取代的舊欄位，v1 `saveCampaign()` 現在完全不寫入 `partner`，搜尋整個 `app.js` 也沒有任何地方讀取它，是草案正確判斷該排除的死欄位，不是遺漏。

`sort_order` 的處理草案寫「若欄位可用，新增案子應給一個合理排序值」，這題答案要更具體——v1 目前的寫法是：

```js
if (!editCampaignId && campaignSortColumnReady) {
  const ordered = sortCampaignsManual(CAMPAIGNS);
  const firstRank = ordered.length ? campaignSortRank(ordered[0], 1000) : 1000;
  payload.sort_order = firstRank - 10;
}
```

新案子的 `sort_order` 是「目前最小值再減 10」，讓新案子排到手動排序清單的**最前面**。v2 如果不做同樣的處理（例如乾脆不寫 `sort_order`），新建的案子在 v1 手動排序頁會因為 `sort_order` 是 null、`campaignSortRank()` fallback 成 `Number.MAX_SAFE_INTEGER` 而排到**最後面**——變成「用 v1 新增的案子排最前面、用 v2 新增的案子排最後面」，行銷總監會覺得排序邏輯不一致。**建議 v2 新增時複製 v1 這段邏輯**（查目前最小 `sort_order`、減 10），不要留空。

### 3. `status`/`priority`/`association_activity_type` 選項是否符合現有約束

**`status` 完全正確**：DB 現行 check 約束（`schema_v6_status.sql` 兩階段收斂後的最終版本）是 `('預計規劃','估價中','進行中','補助申請','結案')`，跟草案列的 5 個值逐字逐序相同。

**`priority` 完全正確**：`schema_v15_priority.sql` 約束是 `('高','中','低')`，跟草案一致。

**`association_activity_type` 草案沒有列出選項清單，這裡要提醒一件事**：這個欄位在資料庫**沒有 check 約束**（純 `text`），但 v1 前端用了一個專門的元件（`setCustomSelect()`/`customSelectOptions()`）處理，行為是：固定選項（`CAMPAIGN_ASSOC_ACTIVITY_OPTIONS = ['會員大會','協辦活動','技術講座','展覽','餐會','期刊投稿','期刊廣告','年度贊助','其他']`）＋**目前資料庫裡所有行銷案實際用過的值**＋當筆記錄目前的值，三者聯集，還提供「＋新增選項」讓使用者當場輸入新值存進 DB。這是比這系列已經修過的 `selectOptions()` 防呆（只保留單筆記錄的既有值）更完整的做法（v1 是動態聯集全部歷史值，不是只保護正在編輯的那一筆）。

v2 目前已經有的 `selectOptions()` 防呆（Batch 8A 修的，不在清單裡的值會被加回去標記「（既有值）」）**已經能避免重演 Batch 8A 那次的資料被覆蓋 bug**，這點不用擔心。但如果 v2 這批只給 9 個固定選項、不做「＋新增選項」這個逃生口，行銷總監在 v2 新增行銷案時如果想用一個不在清單裡的活動類型（例如新的公會活動形式），會被鎖住打不出來——**這不是資料正確性問題，是功能完整性問題**，建議這批至少讓這個欄位維持自由輸入的文字框（不做成純 `<select>`），或是照 v1 的模式做一個「選單 + 其他請輸入」的簡化版，不強求做出 v1 那種動態聯集全部歷史值的複雜元件（那個複雜度可以留到之後，Phase 1 用文字框最省事也不會丟資料）。

### 4. `sort_order` 寫入方式

見第 2 點，建議複製 v1 的「目前最小值減 10」邏輯。

### 5. v1 是否要加提示但保留新增/編輯

**同意草案的判斷，不建議這批更強硬地停用 v1 新增主檔。** 理由：Batch 13/14/15（任務、預算、文件、風險、成效）都還沒搬到 v2，這些子模組現在只能在 v1 的行銷案詳情頁操作，如果連 v1 的「新增行銷案」都停用，會出現「v1 不能新增、v2 只能新增主檔但不能管子模組」的空窗——一個新案子想要有任務/預算，必須先在某個地方建立主檔，過渡期兩邊都留著入口反而是對的，跟 Batch 11B「v1 仍是主要管理入口時不要太早收緊」是同一個判斷框架，不需要重新推導。

草案第 4 點「v1 行銷案管理頁、Dashboard 新增行銷案按鈕旁或 modal 內加提示」——建議具體訂成：v1 `openCampaignModal()` 的 modal 標題或表單上方加一行說明文字（不影響操作，純提示），措辭比照 Batch 11A 資源刪除按鈕的提示語氣（「行銷案主檔管理將逐步改由 v2 進行，任務/預算/文件仍請於此頁管理」），不需要彈出額外的 confirm 或阻擋操作——這樣跟 Batch 11A 那次「停用真刪除、但不阻擋既有功能」的力度一致，不用另外設計新的提示機制。

### 6. `all_expenses_overview` 是否需要排除已封存行銷案

**不需要，建議維持現況（不排除）。** 查了目前的 view 定義（`sql/phase1_batch6c_vendor_lifecycle.sql`），`marketing_campaign_budget_items`／`marketing_campaign_vendors` 兩個分支都是直接讀資料、`vendors` 分支額外排除 `cancelled_at is not null`（已取消的廠商合作費用不算數，因為那筆交易根本沒發生），但沒有任何分支排除已封存**行銷案**的費用。

這個現況是對的，不用改：**封存行銷案是「這個案子不再是進行中項目」，不是「這筆費用沒發生過」**——已經花掉的預算、已經請款的金額，封存之後在總經理費用彙總裡消失，會讓「這個月/這一年總支出」這種累加數字無故變小，變成錯誤的財務資料。這跟 Batch 6C「已取消廠商合作費用要排除」的邏輯不衝突：取消的廠商合作代表這筆交易沒發生，封存的行銷案代表案子結束了但過去花的錢是真的花了。**這題答案很明確，不需要為這批寫額外的 SQL 去改這個 view。**

### 7. 手機版新增/編輯 modal 是否需要拆分區塊

草案的 21 個欄位是目前這個系列所有 modal 裡最多的一次（比 Batch 8A 知識條目編輯 modal 的約 12 個欄位還多快一倍）。**不建議做成分頁式/多步驟表單**——這個專案目前所有 modal 都是「單一可捲動表單」的架構（`openModal()`/`.form-grid`），沒有任何分步驟表單的既有元件，為了這一批臨時發明一種新的表單模式，複雜度不成比例，而且知識條目編輯 modal（12 欄位含兩個長文字欄位）已經證實單一捲動表單在手機上是可用的，只是需要確認捲動流暢、按鈕在底部搆得到。

建議做法：維持單一表單，但用視覺分組（例如幾個 `<div class="form-section">` 搭配小標題「基本資訊」「預算與補助」「公會關聯」「期間與備註」，不需要真的做成 tab 或 step，純粹加個小標題跟間距幫助閱讀），這樣桌機跟手機都不用改變互動模式，只是排版上更容易掃視 21 個欄位。動工後記得照 `MOBILE_ACCEPTANCE_CHECKLIST.md` 第 4 條實際在 375px 走一次新增跟編輯兩個流程。

---

## 需要你或行銷總監確認的事

草案本身列的待確認事項（Phase 1 權限沿用前端角色控制、RLS 不擴大）我沒有異議，不需要另外拍板。唯一補充一題：**`association_activity_type` 要不要做成純固定選單還是保留自由輸入**（見第 3 點）——這是功能完整性的取捨，不是正確性問題，但會影響行銷總監能不能記錄新出現的公會活動類型，建議先問清楚。

---

## 建議動工順序

1. **v1 `delCampaign()` 停用**（比照 Batch 11A 模式，獨立處理，不等新增/編輯 modal 寫完，可以叫 Batch 12A）。
2. v2 新增行銷案 modal（欄位對齊草案清單，`association_activity_type` 用文字框或簡化版選單+其他，`sort_order` 複製 v1 的最小值減 10 邏輯）。
3. v2 編輯行銷案 modal（`loadMarketingCampaigns()` 補齊欄位，PATCH 邏輯）。
4. v2 封存確認流程（沿用 Batch 10/11B 已經驗證過的軟封存 + 引用提示模式）。
5. v1 提示文案（比照 Batch 11A 語氣，加在 `openCampaignModal()` 表單上方）。
6. 手機版驗收（視覺分組 + 375px 實測新增/編輯兩個流程）。

`all_expenses_overview` 不需要異動（第 6 點已確認維持現況），不用排進待辦。
