# Claude Code Review｜Phase 1 Batch 6B 草案：新增資料操作功能（寫程式前審查）

審查日期：2026-07-15
審查對象：新增行銷案、新增廠商/專案廠商合作、新增產品知識庫條目
審查方式：重新核對 `marketing_campaigns`（v1 累積到 v22 的完整欄位，含之前沒讀過的 `schema_v3_fields.sql`/`schema_v5_subsidy.sql`）、`vendors`/`marketing_campaign_vendors`（Batch 3 實際 schema）、`product_knowledge_items`（Batch 5 實際 schema，非草案），並確認目前 `assets/app.js` 的 `primaryAction` 按鈕在行銷案頁跟知識庫頁確實沒有任何點擊處理（點了沒反應），符合你描述的現況。

---

## 是否可以開始 Batch 6B

**可以開始，而且這批不需要寫任何 SQL**——三個功能要用到的表跟欄位，Batch 3、5 都已經建好，這是繼 Batch 6A 之後第二批純應用層工作，沒有 schema 風險。唯一需要你先決定的是第 7 節列的幾項商業規則，其中一項（新增行銷案會直接寫進 v1 也在用的同一張表）比較重要，建議看完再開始寫程式。

## 建議範圍

**三個都放在同一批 Batch 6B，不用拆 6B/6C**，但建議依複雜度排實作順序（第 6 節），不要三個同時動工——原因見第 1 節。

---

## 1. 三個功能是否適合放同一批

三個功能的複雜度不一樣，值得先說清楚差異，但不需要因此拆批：

- **新增行銷案**：單一表、單一 `INSERT`，沒有分支邏輯，是三個裡面最簡單的。
- **新增知識庫條目**：單一表、單一 `INSERT`，但你自己提的問題（新增時要不要順便送 `approval_requests`）如果答案是「要」，會變成「一個表單、兩個可能的寫入動作」，複雜度會跳一級。
- **新增廠商/專案廠商合作**：這是三個裡面最複雜的——需要「選現有廠商」或「建立新廠商」兩條路徑合併在同一個表單裡處理，選第二條路徑時是「先寫 `vendors`、再用回傳的 id 寫 `marketing_campaign_vendors`」的兩段式寫入，這是這個專案第一次出現「同一個表單、依情況可能要連續呼叫兩次 API」的情境（Batch 6A 到目前為止的表單都是單表單、單次寫入）。

**建議把「新增知識庫條目」的第二個問題先拍板成「先只建立內部條目，不在建立當下就送審」**（第 7 節），這樣三個功能都會是「單表單、單次寫入」的同一種複雜度，可以用同一套 modal 模式做完，不需要為了知識庫另外處理分支邏輯。真的要送外部使用審核，比照現有「廠商報價送審」（`openVendorApprovalModal`）的模式，之後在知識庫條目列表加一個獨立的「送審」動作即可，不用綁在新增流程裡。

---

## 2. 每個功能最小必要欄位

### 新增行銷案 → `marketing_campaigns`

重新核對完整欄位（含之前沒讀過的 `owner`/`owner_unit`/`subsidy_planned`/`subsidy_received`），**資料庫層真正 `not null` 且沒有預設值的欄位只有 `name`**，其他都有預設值或允許空白。但只填 `name` 會做出一個空殼行銷案，建議最小可用欄位是：

- `name`（必填）
- `status`（有預設值 `'預計規劃'`，但建議讓使用者能選，因為有些案子一開始就是「估價中」）
- `priority`（有預設值 `'中'`，同上建議可選）
- `budget`
- `planned_start`、`planned_end`
- `owner`
- `purpose`

**不建議在新表單裡放 `vendors`（那個 jsonb 陣列欄位）**——這是 v1 舊的、非結構化的廠商記錄方式，Batch 3 已經用 `marketing_campaign_vendors` 取代它，新建的行銷案讓 `vendors` 維持預設的 `'[]'::jsonb` 就好，廠商關聯統一走新的結構化流程（也就是這批的第二個功能），不要在新表單裡讓使用者重新走回舊的自由文字廠商欄位。

`association_id`（關聯公會）可以做成表單裡的選填下拉選單（來源是已經讀進 `state.data.associations`），不是必要欄位，但既然資料都已經在前端了，加上去不費工。

### 新增廠商/專案廠商合作 → `vendors` + `marketing_campaign_vendors`

**「新增全域廠商主檔」跟「把廠商掛到某個行銷案」建議合併成一個表單、不強制分兩步**：表單一開始給一個「選擇既有廠商」的下拉選單，選單最上面留一個「+ 新增廠商」的選項，選了之後展開廠商基本資料欄位（`name` 必填、`vendor_type`、`contact_name`、`contact_phone`、`contact_email`）。使用者選現有廠商就只送一次 `marketing_campaign_vendors`；選「新增廠商」就先送 `vendors`、拿到回傳的新 `id` 後再送 `marketing_campaign_vendors`。這樣常見情境（廠商已經在系統裡，只是要掛到新專案）不用多走一層畫面。

**`marketing_campaign_vendors` 必填欄位（容易被忽略的是 `campaign_id`）**：

- `campaign_id`（**必填，不能省**——這張表現在的呈現方式是「合作廠商/交付物」單一列表，不是掛在某個行銷案詳情頁底下，所以表單裡一定要有一個「選擇行銷案」的下拉選單，來源是 `state.data.campaigns`，不能假設有預設值）
- `vendor_id`（來自選擇或新建立的廠商）
- `role_in_project`
- `meisun_contact`（建議預設帶入登入者信箱，可覆蓋，不要留空白文字輸入——原因見第 3 節）
- `quote_status`（預設 `'待報價'`）
- `budget_amount`

`actual_amount`/`payment_status`/`payment_date` 不需要放進新增表單——這些是後續處理階段的欄位，現有的「廠商報價送審」流程已經在處理這塊，新增時不用一次填完。

### 新增產品知識庫條目 → `product_knowledge_items`

- `title`（必填）
- `knowledge_type`（**必填，沒有預設值，一定要選**——建議下拉選單給常見分類：市場差異化/技術比較/競品分析/客戶異議處理/應用場景/FAQ/簡報說法/資料待確認，但這個欄位資料庫沒有 check 約束，允許自訂輸入）
- `evidence_level`（有預設值 `'C'`，建議讓使用者能選，因為建立當下通常已經知道證據等級）
- `summary`
- `product_line`
- `owner`（建議自動帶入登入者信箱，比照 `sales_requests.requested_by` 的做法，不要開放自由輸入）

`visibility_status` **不放進新增表單，維持資料庫預設值 `'待確認'`**——對應第 1 節的建議，新條目一律先進「待確認」狀態，要不要送外部使用審核是之後的動作，不是建立當下就要決定的事。`detail`/`recommended_pitch`/`prohibited_pitch`/`target_segment`/`use_context`/`related_competitor` 都是選填，可以之後編輯再補。

---

## 3. 哪些 FK 或欄位型別容易接錯

- **`meisun_contact`（`marketing_campaign_vendors`）、`owner`（`product_knowledge_items`）都是 `citext references app_user_access(email)`**——這兩個欄位如果做成自由文字輸入框，使用者打錯字（例如少打一個字或大小寫問題，雖然 citext 對大小寫不敏感）就會讓 `INSERT` 直接失敗，因為 FK 要求值必須真實存在於 `app_user_access.email`。**建議兩個都預設帶入登入者信箱，`meisun_contact` 可以做成下拉選單讓使用者改選別人**（如果需要指派給其他同事），但不要做成自由輸入框。
- **`marketing_campaigns.association_id`、`marketing_campaign_vendors.campaign_id`/`vendor_id` 都是 `uuid` FK**，一定要用下拉選單選現有資料的 id，不能讓使用者自己輸入文字去猜。
- **`status`/`priority`（`marketing_campaigns`）、`evidence_level`/`visibility_status`（`product_knowledge_items`）都有 check 約束**，下拉選單的選項值要跟資料庫允許的字串完全一致（包括繁體字、標點），複製貼上時容易手滑打錯字導致約束擋下寫入——這四個欄位建議 Codex 寫 SQL 常數表時直接從對應的 migration 檔案複製字串，不要憑記憶重打。
- **`budget`/`budget_amount`/`amount_twd` 這類 `numeric` 欄位要送純數字**，不要把畫面上顯示用的「180萬」這種格式化字串直接送出去（現有 `formatMoney()` 是顯示用的單向函式，不能拿來逆向解析輸入值）。
- **新建立 `vendors` 時要用 `Prefer: return=representation` 拿到新 `id` 才能接著寫 `marketing_campaign_vendors`**——這個 header 在 `core/api.js` 的 `getHeaders()` 已經內建了，不用額外設定，但寫兩段式的送出邏輯時要記得先 `await` 第一段的回傳值，再把 `id` 帶進第二段的 payload。

---

## 4. 現有 Schema 是否足夠

**足夠，這批不需要任何新的 SQL migration。** 逐項確認：`marketing_campaigns` 累積到 v22 的欄位已經涵蓋建議的最小欄位；`vendors`/`marketing_campaign_vendors` 在 Batch 3（加上 Batch 5 補的 `payment_date`）已經是完整的；`product_knowledge_items` 在 Batch 5 已經建好，欄位、check 約束（`evidence_level`/`visibility_status`）都跟原本審查建議的一致。三張表的 RLS/grant 也已經是「`authenticated` 可以 `insert`」，不需要額外開權限。

---

## 5. 是否有跟既有 v1 平台資料衝突的風險

**沒有結構上的衝突，但有一個業務流程上的問題需要你先想清楚**：`marketing_campaigns` 是 v1 正式平台（`marketing-a4l.pages.dev`）現在還在用的同一張表。這批做完之後，**任何人透過 v2 新增的行銷案，會直接出現在 v1 的行銷案列表裡**，反過來 v1 新增的案子也會出現在 v2——這是必然的（同一個 Supabase project、同一張表），不是 bug，但這是 v2 第一次要「新增」會被 v1 使用者直接看到的正式資料（前五批都是唯讀顯示或寫進 v2 專屬的新表，不會被 v1 看到）。

技術面確認沒有風險：新建立的行銷案 `vendors` 欄位會維持預設空陣列 `'[]'::jsonb`，v1 的畫面本來就有處理空陣列的邏輯（顯示「尚未填寫」），不會壞版面；`status`/`priority` 用的是 v1 現有的合法值，v1 端不會出現看不懂的狀態文字。

**需要你確認的是流程面**：如果現在還有人在用 v1 日常管理行銷案，v2 新增的案子會混進他們的列表——這是你們預期中的「v2 開始接手真實資料輸入」，還是希望在 v1 完全退場前，v2 這邊先只累積測試資料、暫不透過 v2 新增真的會影響 v1 使用者的案子？這個判斷不是我能代為決定的，列在第 7 節。

---

## 6. Phase 1 繼續用前端角色控制是否可接受

**可以接受，不需要為這批提前加 RLS。** 延續之前刪除功能審查時建立的判斷原則（看動作可不可逆、有沒有留下痕跡）：這三個都是「新增」，就算有人繞過畫面直接呼叫 API 新增了不該由他新增的資料，後果是「多了一筆不該存在但可以事後編輯或刪除的資料」，跟核准/刪除那種「造成既有資料被錯誤處理或消失」的風險層級不一樣，屬於可以留到 Phase 2 一次處理的等級。

唯一值得注意但不需要現在處理的殘餘風險：知識庫條目如果有人繞過 UI 直接把 `visibility_status` 設成 `'可對外'`（正常表單流程不會這樣做，只是理論上 API 沒擋），會讓未經審核的內容被業務端看到並可能對外使用。這個風險現有的員工规模跟信任基礎下發生機率低，先記錄下來，等 Phase 2 做 RLS 時一併處理。

---

## 7. 需要你或行銷總監拍板的商業規則

1. **v2 新增行銷案，會直接出現在 v1 正式平台的列表裡——這是你們現在就要的效果，還是希望先只在 v2 累積測試資料？**（第 5 節，這是這次審查最需要先確認的一項）
2. **新增知識庫條目時，要不要順便可以直接送 `approval_requests`，還是先只建立內部條目（`待確認`），送審另外做？**（第 1 節，建議選後者，讓這批三個功能維持同一個複雜度）
3. **`marketing_campaign_vendors.meisun_contact` 要不要做成可選別人的下拉選單，還是固定就是登入者本人？**（第 3 節）
4. **`vendors.vendor_type` 新增表單要不要提供常見選項的下拉（裝潢/美編/印刷/場地/攝影影音/其他），還是純自由輸入？**（資料庫本身沒有限制，純粹是表單體驗的選擇）

---

## 是否阻塞下一步

**不阻塞。** 這批不需要新 SQL，三個功能彼此獨立、沒有互相依賴，可以照第 1 節建議的順序（行銷案 → 知識庫條目 → 廠商合作）依序做完就收工，也可以只先做其中一兩個，不會影響之後其他批次的規劃。唯一建議先處理的是第 7 節第 1 項（v2 新增資料會直接進到 v1 正式平台這件事），這個決定越早確認越好，避免動工後才發現方向跟預期不同。
