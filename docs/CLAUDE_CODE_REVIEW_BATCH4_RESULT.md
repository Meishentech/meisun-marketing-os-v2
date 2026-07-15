# Claude Code Review｜Batch 4 業務需求單 / 審核流程實作結果

審查日期：2026-07-15
審查對象：`sql/phase1_batch4_requests_approvals.sql`（commit `ef068c8`）、`assets/app.js` 業務需求單/待決策中心相關程式碼（含 `dd355a4` 表格排版修正）
審查方式：實際讀取目前 repo 內容逐行比對。

---

## 結論摘要

SQL 設計正確、`entity_type`/`entity_id` 通用審核設計是合理且足夠的。**這次審查抓到一個比前三批更需要重視的問題**：總經理「待決策中心」頁的三個渲染函式（`decisionListSection`、`approvalFlowSection`、`approvalKpis`）都少了 Batch 1-3 一路建立起來的「已連線但沒資料」中間層判斷，只要 `approval_requests` 是空的就會直接顯示假的示範資料——這跟前三批任何一個模組的行為都不一樣，而且發生在總經理實際會拿來做決策的頁面上，風險層級比其他模組的同類缺口更高，建議在 Batch 5 開始前先補上。另外找到一個業務需求單的資料範圍設計（自己沒有需求時會看到別人的）需要你確認是否為預期行為。

---

## 1. SQL 欄位、FK、RLS/Grant 檢查

| 檢查項目 | 結果 |
|---|---|
| `sales_requests` 欄位 | ✅ 與原草案一致，`deliverable_resource_id` 正確保持 nullable，符合已確認的商業規則（需求完成不強制先進 `marketing_resources`） |
| `requested_by`/`assigned_to` 用 `citext references app_user_access(email)` | ✅ 延續 Batch 1-3 已驗證過的寫法，一致 |
| `approval_requests.entity_id` 沒有 FK | ✅ 符合設計初衷（見第 2、3 節） |
| `approval_requests` 新增 `title`/`summary`/`amount`/`due_date` | ⚠️ 超出原草案範圍的新增欄位，見下方說明 |
| RLS/Grant 寫法 | ✅ 延續 Batch 1-3 已確立的 v2 慣例，一致 |
| Index 覆蓋 | ✅ `(status, priority, due_date)`、`(requested_by, created_at)`、`(assigned_to, status, due_date)`、`(entity_type, entity_id)`、`(status, approver_role, due_date)` 都有建，涵蓋常見查詢情境 |

### 關於新增的 `title`/`summary`/`amount`/`due_date` 欄位

這四個欄位不在原本的 Phase 1 schema 草案裡，是這次實作自己加的。**這是合理的實作判斷**：因為 `entity_id` 沒有 FK（見第 2 節），如果 `approval_requests` 只存 `entity_type`/`entity_id`，待決策中心要顯示「這筆審核是什麼」時，得先知道 `entity_type` 對應哪張表、再動態組 SQL 去查那張表拿標題和金額——這對一個要同時支援 `vendor_quote`/`budget_item`/`knowledge_item`/`association` 四種來源的通用列表頁來說，會變成前端要寫四套查詢邏輯。直接把 `title`/`summary`/`amount`/`due_date` 存成建立審核單當下的**快照**，讓待決策中心可以用同一個查詢顯示所有類型，是務實的取捨。

**需要你確認的地方**：這是一次性快照，還是要跟來源資料保持同步？例如廠商報價後來改金額了，`approval_requests.amount` 是要跟著更新，還是維持「送審當下的金額」不變（即使來源之後又調整）？如果是後者（快照語意），這其實是合理甚至更好的設計——審核紀錄本來就該留存「當初核准的是什麼版本」，不應該因為後續資料變動而跟著改變歷史紀錄。這點建議明確寫進文件裡（例如 `docs/phase-1-mvp.md`），避免之後有人以為這是即時查詢結果而納悶「怎麼跟廠商頁金額對不上」。

---

## 2. `entity_type`/`entity_id` 通用設計是否足夠支援 vendor_quote、budget_item、knowledge_item

**足夠**。這個設計本來就不需要跟著每種來源類型改變結構——`entity_type text` + `entity_id uuid`（不設 FK）是刻意的通用取捨，新增一種審核來源（例如未來的 `budget_item`、`knowledge_item`）不需要動 `approval_requests` 的表結構，只要應用層在建立審核單時傳對 `entity_type` 字串跟 `entity_id` 值即可。

前端 `approvalEntityLabel()` 已經預先把四種類型的顯示標籤都寫好了（`budget_item`→預算項目、`vendor_quote`→廠商報價、`knowledge_item`→知識/文宣審核、`association`→公會合作），雖然目前只有 `vendor_quote` 真的有資料寫入，但這代表前端已經準備好接住未來其他來源，不需要等其他 batch 做完才回來補這塊——這是好的前瞻設計。

---

## 3. 沒有資料庫層 FK 的風險評估

`entity_id uuid not null`（無 `references`）是刻意設計，不是遺漏。這裡重新評估一下實際風險：

- **理論風險**：如果 `entity_id` 指向的來源列被刪除（例如某個 `marketing_campaign_vendors` 合作關係後來整個刪掉），對應的 `approval_requests` 那筆紀錄會變成「查無此實體」的孤兒資料，資料庫不會自動處理。
- **但這其實是審核紀錄該有的正確行為，不是缺陷**：`approval_requests`本質上是一份「誰在什麼時候核准了什麼」的稽核記錄，即使來源資料之後被刪除或修改，這筆歷史紀錄本來就應該保留下來，不應該被 `on delete cascade` 自動清掉——如果設了 FK 加 `cascade`，反而會讓「這筆錢是誰核准的」這種稽核追溯能力憑空消失。
- **Phase 1 現實資料量下，實際發生孤兒紀錄的機率很低**（使用者數量少、目前只有 `vendor_quote` 一種來源在用），不需要現在額外處理。

**低優先建議（非必要）**：如果之後 `entity_type` 的錯字風險讓你在意（例如打成 `vendor_qoute`），可以加一個 `check (entity_type in ('vendor_quote','budget_item','knowledge_item','association'))`，跟現有 `doc_type` 那種每次擴充清單就 `alter constraint` 的模式一樣。這不是必要的，因為 `entity_type` 目前完全是程式碼寫死傳入、不是使用者直接輸入的自由文字，錯字風險主要來自 Codex 自己寫程式碼時手滑，用 code review 抓比資料庫約束更直接。

---

## 4. 前端需求單與待決策頁讀取邏輯

### 4.1 重要發現：待決策中心的三個函式都少了「已連線但沒資料」的中間層判斷

這是這次審查最需要處理的一項。比對 Batch 1-3 建立起來的固定模式（例如 `associationSection()`／`vendorSection()`／`salesRequestSection()` 都是：**有真實資料 → 顯示真實資料**；**`dataStatus === 'live'` 但陣列是空的 → 明確提示「尚未從哪張表讀到資料」**；**還沒連線 → 顯示示範資料**），總經理待決策中心用到的三個函式都只做了「有資料 vs 沒資料」兩層判斷，沒資料時直接跳過 `dataStatus` 檢查，落到示範資料：

- `decisionListSection()`（第 365-393 行）
- `approvalFlowSection()`（第 535-564 行）
- `approvalKpis()`（第 1319-1320 行）

**這個缺口在這個頁面上的風險比其他模組更高**：`approval_requests` 是空的通常代表「目前沒有待審核事項」，這其實是一個**正常、甚至是好消息**的狀態，但畫面會顯示「空調展裝潢追加 28 萬」「公會講座是否提高贊助級距」這些寫死的示範內容，看起來就像真的有兩筆待決策事項在等總經理處理。因為這是總經理實際會拿來做決策依據的頁面，示範資料被誤認成真實待辦事項的後果，比公會頁或廠商頁顯示假資料嚴重——後者頂多是資料還沒建，這裡是「可能讓人去追一個不存在的決策」。

**對照組**：同一批的 `sales_requests`（`salesRequestSection()`，第 886-929 行）就正確做了三層判斷，`requestKpis()`（第 1339 行）雖然也少了中間層，但因為下面的需求列表本身是正確的，實際影響較小。

**建議修正**：比照 `associationKpis()`/`vendorKpis()` 的寫法，在這三個函式裡補上 `if (state.dataStatus === "live")` 的中間層分支，用文字明確說「目前沒有待審核事項」而不是顯示假資料。這個修正建議在 Batch 5 開始前先處理，不需要等到所有 batch 都做完。

### 4.2 需要確認：業務只有自己名下沒有需求單時，會改顯示所有人的需求單

```js
function visibleSalesRequests(isMarketing) {
  if (isMarketing) return state.data.salesRequests;
  const email = String(state.auth.email || "").toLowerCase();
  const ownRequests = state.data.salesRequests.filter((request) => String(request.requested_by || "").toLowerCase() === email);
  return ownRequests.length ? ownRequests : state.data.salesRequests;
}
```

業務登入後，如果自己名下一筆需求單都沒有，畫面會**改顯示所有業務的需求單**，而不是「目前沒有你的需求單」的空狀態。這跟前面提到的「示範資料 fallback」是不同性質的問題——這裡 fallback 到的是**其他人的真實資料**，不是假資料。

目前資料量很小（目前只有一筆「Batch 4 測試需求」），實際效果是：除了剛好等於那筆測試資料 `requested_by` 的帳號以外，幾乎所有業務登入現在都會看到全部需求單，而不是只看到自己的。

這不一定是錯的——也可能是刻意設計成「還沒有個人化資料時，先讓使用者看到系統裡有什麼在跑，比空白畫面更有用」。但因為 `sales_requests.description` 欄位可能包含客戶情境等內容，如果業務之間本來就不該互相看到彼此提出的需求細節，這個 fallback 就需要改成單純的「你目前沒有提出任何需求單」空狀態。**這點需要你確認：業務之間本來就可以互相看到彼此的需求單內容，還是應該嚴格只看自己的？**如果是後者，改法很簡單（`return ownRequests;` 拿掉 fallback 那段），但需要你先拍板，不建議我自己代為決定資料範圍的商業規則。

---

## 5. Batch 5（產品知識庫 + 費用彙總）開始前的阻塞檢查

Batch 4 本身沒有新增會阻塞 Batch 5 的問題。但這裡要**重新提起一個從最早 Phase 1 schema 審查就標記、至今還沒拍板的舊問題**：`docs/phase-1-mvp.md` 第 6 步寫明 Batch 5 要建 `all_expenses_overview`，而這個 view 需要 `marketing_campaign_budget_items`（行銷案費用）、`association_fee_records`、`association_task_expenses`、`marketing_campaign_vendors`（Batch 3 已加入這個來源）四張表對齊欄位。

問題在於：**`marketing_campaign_budget_items` 目前完全沒有 `payment_status`/日期欄位**（只有 `quote_status`），這是最初 `CLAUDE_CODE_SCHEMA_REVIEW_PHASE1.md` 就抓到、當時列為「需要你確認」但**目前還沒有看到任何一批 migration 處理過**的問題。如果 Batch 5 直接動手建 `all_expenses_overview`，會重新撞到同一個障礙：行銷案費用項目在這個彙總表裡沒有可比對的「付款狀態」跟「日期」，總經理看到的支出總覽會有一整類資料的狀態/日期欄位是空的或語意不對。

**建議在 Batch 5 開始前，先確認這件事**：要不要幫 `marketing_campaign_budget_items` 補上 `payment_status text`、`payment_date date`（純新增、nullable，不影響既有資料），這樣 `all_expenses_overview` 建出來的欄位語意才會一致。這不是 Batch 4 造成的問題，但因為 Batch 5 馬上就會用到，這是目前唯一一個實質會擋住 Batch 5「做對」（而不是「做出來但語意有缺陷」）的事項，建議現在就一併決定，不要等 Batch 5 SQL 都寫完才發現。
