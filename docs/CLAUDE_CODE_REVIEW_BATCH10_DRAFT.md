# Claude Code Review｜Batch 10 草案：資源軟刪除設計 + 引用關係檢查（寫程式前審查）

審查日期：2026-07-17
審查對象：`marketing_resources` 的刪除功能設計（Phase 1 目前刻意未做，見 Batch 9B）、`marketing_resources` 被哪些表引用、v1/v2 共用這張表帶來的既有風險
審查方式：核對 v2 repo 所有 SQL（`sql/*.sql`）裡對 `marketing_resources` 的外鍵引用，並回頭讀 v1（`meisheng-marketing`）現有的 `delResource()` 實作，確認 v1 現在的刪除行為實際上會不會觸發這些外鍵。

---

## 結論先講：這不是「之後要不要做」的問題，v1 現在就有一個沒有防護的刪除按鈕，隨時可能悄悄弄壞 v2 的知識庫關聯

在規劃 v2 這邊怎麼設計軟刪除之前，先講一個**已經存在、跟這批要不要動工無關的現況風險**：v1 `meisheng-marketing/app.js:1784` 的 `delResource()` 現在就是**真刪除**（`DEL(\`marketing_resources?id=eq.${editResourceId}\`)`），只有一個 `confirm()` 對話框，**完全不知道 `product_knowledge_resource_links` 這張表的存在**（這張表是 v2 在 Batch 5 才建的，比 v1 這個刪除功能晚很多），而這張表的外鍵是：

```sql
resource_id uuid not null references marketing_resources(id) on delete cascade
```

**意思是：只要行銷總監現在在 v1 對任何一筆已經被 v2 知識庫連結過的資源按下刪除，那筆資源在所有知識條目下的「已連結資源」關聯會被資料庫靜默 cascade 刪光，v1 完全不會提示、v2 這邊也不會有任何記錄留下發生過這件事。** 這個風險從 Batch 5 建這張表的那天就存在，Batch 9B 決定「未來資源庫改以 v2 管理，逐步取代 v1」之後，v1 這個刪除入口理論上會慢慢停用，但只要 v1 還在被使用一天，這個風險就是活的，不是這批才要開始擔心的事——**建議先讓行銷總監知道這件事本身**（口頭提醒即可，不需要等這批做完），這批要做的是讓 v2 之後接手時有正確的防護，不是「製造」這個風險。

---

## 現況確認：`marketing_resources` 目前有兩條外鍵指向它

逐一核對 v2 repo 所有 `sql/*.sql`：

| 來源表 | 外鍵行為 | 目前使用狀況 |
|---|---|---|
| `product_knowledge_resource_links.resource_id` | `on delete cascade` | **實際在用**——Batch 8B 建的知識條目↔資源連結功能，`resourceLinkCard()`/`openAddKnowledgeResourceModal()` 都在讀寫這張表 |
| `sales_requests.deliverable_resource_id` | `on delete set null` | **定義了但從沒被寫入過**——`loadSalesRequests()`/`loadCancelledSalesRequests()` 有 select 這個欄位，但整個 v2 沒有任何 UI 會 PATCH 這個欄位，目前所有資料這欄應該都是 null。這是 Batch 4 就埋下的「之後要接」欄位，還沒有人接上 |

`on delete cascade` 跟 `on delete set null` 是不同等級的風險：前者是「引用它的紀錄整筆消失」，後者是「引用它的紀錄還在，只是欄位變空」——`product_knowledge_resource_links` 才是這批要優先處理的，`sales_requests.deliverable_resource_id` 因為根本沒被寫入過，現況不痛不癢，但既然這批要做完整的引用檢查，順手把它也納入清單，避免之後真的接上這個欄位時又要重新盤點一次。

---

## 建議設計：延續這個專案已經確立的「軟取消」慣例，不是發明新模式

這個專案從 Batch 6A（業務需求單）、6C（廠商合作/交付物）就確立了同一套判斷原則（我在那兩次審查記錄下來的：**看動作可不可逆、有沒有留下痕跡、這張表是不是本來就有歷史/統計用途**），`marketing_resources` 完全符合「不該真刪除」的條件，不需要重新推導，直接套用同一套模式：

1. 加 `deleted_at timestamptz`、`deleted_by citext references app_user_access(email)` 兩個 nullable 欄位（零風險純新增，跟 Batch 6A 的 `cancelled_at`/`cancelled_by` 同一種寫法）。
2. **不需要動 `on delete cascade` 這個外鍵約束本身**——只要 v2 之後永遠只做 `PATCH deleted_at`、不再對 `marketing_resources` 送真正的 `DELETE`，這個 cascade 就永遠不會被 v2 觸發，改約束反而是多餘的風險（改 FK 需要先 drop 再 create，這個專案目前還沒有為了現有表改過外鍵約束等級，第一次做建議選風險最低的路徑）。真正的殘留風險是 v1 那個刪除按鈕，那是流程/溝通問題，不是 v2 這邊能用 SQL 解決的。
3. `loadExistingData()` 目前唯一一處 `marketing_resources` 查詢**不需要加 `deleted_at=is.null` 過濾**——沿用 Batch 6C `activeCampaignVendors()` 的做法：`state.data.resources` 保留完整資料（含已封存），另外做一個 `activeResources()` helper 給「可以新增連結／可以管理編輯」這些動作情境用，`findResource()`（給知識條目卡片查標題用）維持不過濾。這樣一筆資源被封存後，已經連結過的知識條目卡片還是能顯示正確標題（加一個「已封存」標籤），不會變回 Batch 8B 修過的那種「找不到資源顯示空殼標題」的狀態；只有「新增資源連結」的下拉選單、「文宣資源管理」表格會排除已封存的。

---

## 需要你（或行銷總監）拍板的商業規則

**這批只有一個真正需要拍板的問題：封存一筆已經被知識條目引用的資源時，要直接允許，還是要先擋下來？**

- **選項 A（建議）：允許封存，但明確提示引用數量**——封存按鈕點下去前，先算出這筆資源目前被幾個知識條目連結，用文字提示「這份資源目前被 3 個知識條目引用，封存後仍會顯示在這些條目的已連結資源清單中（標記為已封存），但不會再出現在新增連結的選單裡」，讓行銷總監自己判斷要不要繼續。這樣「資源已經過時要下架」這個正常操作不會被卡住，跟這個專案目前刻意不做強制阻擋、只做提示的既有慣例一致（例如取消廠商合作也是提示不阻擋）。
- **選項 B：有引用就完全擋下封存**，行銷總監要先手動去每個知識條目移除連結才能封存——比較保守，但操作上會變得很繁瑣（尤其一份資源被很多條目引用時），也是這個專案目前沒有出現過的「強制阻擋」模式，會是一個新的互動慣例。

建議採選項 A，除非行銷總監有特別強烈的理由需要強制檢查過一輪連結才能下架。

---

## 是否需要 SQL

**需要，但很小**：`marketing_resources` 加兩個 nullable 欄位（`deleted_at`/`deleted_by`），沒有其他表要動、不改任何既有外鍵約束、不改既有欄位型別。這是這個系列所有「加軟取消」migration 裡最小的一次（連 Batch 6A 都還多了個 index，這次資料量小不需要）。

---

## 前端實作建議

1. SQL migration：`marketing_resources` 加 `deleted_at`/`deleted_by`。
2. `loadExistingData()` 的 `marketing_resources` select 加上 `deleted_at`、`deleted_by`。
3. 新增 `activeResources()` helper（比照 `activeCampaignVendors()` 命名慣例），`marketingResourceManagerSection()`、`availableResourcesForKnowledgeItem()`、`resourceLibrarySection()`、`salesHomeResourcesSection()` 這幾個「決定可不可以被選取/管理」的地方改用這個 helper；`findResource()` 維持查完整清單不過濾。
4. `marketingResourceManagerSection()` 的操作欄加「封存」按鈕（PATCH `deleted_at`/`deleted_by`），送出前依拍板結果（選項 A）先查一次 `product_knowledge_resource_links` 算出引用數量並顯示提示文字。
5. `resourceLinkCard()` 對已封存資源加一個視覺標籤（例如「已封存」amber tag），跟現有「內部檔案」disabled 按鈕並列顯示，讓行銷總監一眼看出這筆已連結資源是不是還「活著」。
6. 比照 Batch 6A/6C/7 的既有慣例，`marketingResourceManagerSection()` 旁邊或下方加一個「已封存資源」唯讀列表區塊（可先做成類似 `cancelledSalesRequestSection` 的簡單表格），保留「復原」空間——這批可以先不做復原按鈕（跟 Phase 1 其他軟取消功能一樣，復原留給之後真的有需求再做），但列表本身建議一起做，不要讓封存變成有去無回看不到的黑洞。
7. 手機版驗收：封存確認提示文字（含引用數量）、已封存標籤在資源卡片與已封存列表的呈現，都要照 `MOBILE_ACCEPTANCE_CHECKLIST.md` 走一次。

---

## 建議順序

1. SQL migration（最小、最先做）。
2. 補查詢欄位 + `activeResources()` helper。
3. 封存功能（依拍板結果決定要不要顯示引用數量提示）。
4. `resourceLinkCard()` 已封存標籤。
5. 已封存資源唯讀列表。
6. 手機版驗收。

---

## 阻塞問題

**技術上無阻塞，但建議動工前把最上面那個「v1 現在就有沒有防護的真刪除」的風險告知行銷總監**——這不是這批程式碼能解決的事（v2 管不到 v1 的按鈕），但既然這次盤點清楚發現了，不應該壓到這批做完才提，讓現況風險多存在幾天沒有意義。除此之外，只有一題需要拍板（封存時要不要擋下有引用的資源），拍板後就可以直接動工。
