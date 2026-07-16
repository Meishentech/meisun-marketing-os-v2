# Claude Code Review｜Phase 1 Batch 8 草案：產品知識庫與業務可用資料強化（寫程式前審查）

審查日期：2026-07-16
審查對象：知識條目詳情 modal、行銷總監編輯功能、業務端可見性、資源連結、手機版 + 補充需求入口
審查方式：重新核對 `product_knowledge_items` 目前實際的查詢欄位、`knowledgeSection()`/`visibleKnowledgeItems()` 現行程式碼、`requestFormHtml()` 既有的預填能力，確認五個計畫項目裡哪些已經做了、哪些欄位查詢不夠用、哪些是全新的技術模式。

---

## 先更正一個前提：第 3 項「業務端只顯示可用資料」已經做完了

重新核對 `visibleKnowledgeItems(isMarketing)`（第 1196-1199 行）：

```js
function visibleKnowledgeItems(isMarketing) {
  if (isMarketing) return state.data.knowledgeItems;
  return state.data.knowledgeItems.filter((item) => ["可對外", "僅內部"].includes(item.visibility_status));
}
```

這個過濾邏輯在 Batch 5/6B 就做好了，業務登入現在就只看得到 `可對外`/`僅內部` 的條目，`待確認`/`禁止使用` 已經被擋掉。**這一項不需要再開發，Batch 8 只需要確認新增的詳情/編輯功能不要意外繞過這個既有過濾就好**，不用當成新工作排進去。

---

## 現況確認：其他四項目前的完整度

逐一核對現有程式碼，掌握清楚的起點才能判斷 Batch 8 該做多少：

- **列表查詢欄位不夠支撐「詳情」**：`loadExistingData()` 裡 `product_knowledge_items` 的 `select` 只有 `id,title,product_line,knowledge_type,target_segment,use_context,summary,evidence_level,visibility_status,owner,version,updated_at`——**沒有 `detail`、`recommended_pitch`、`prohibited_pitch`、`related_competitor`**。這四個欄位是知識條目真正的「內容」（詳細說明、建議話術、禁止話術、競品對照），業務要查的核心價值大概就在這幾欄，但現在連撈都沒撈。
- **完全沒有詳情/編輯 modal**：搜尋整個檔案，只有 `openCreateKnowledgeItemModal()` 這一個知識庫相關的 modal，沒有任何 `openViewKnowledgeItemModal`/`openEditKnowledgeItemModal` 之類的函式，列表也沒有任何操作按鈕（`knowledgeSection()` 只有 4 欄純文字/標籤，沒有 `actionButton`）——現況是知識條目建立之後**完全沒有入口可以再打開看或改**，第 1、2 項是從零開始。
- **完全沒有資源連結功能**：`product_knowledge_resource_links` 這張表 Batch 5 就建好了，但目前沒有任何程式碼讀寫過這張表，也沒有任何 UI。這會是這個專案**第一次要做多對多關聯的管理介面**（一個知識條目可以連結多筆 `marketing_resources`，需要加入/移除），跟目前所有 modal 都是「單表單、單筆或最多兩段式循序寫入」的複雜度不是同一個等級。
- **`sales_requests` 已有可重複使用的預填機制**：`requestFormHtml(request = {}, readOnly = false)` 本來就接受一個物件帶入初始值（目前只有「檢視」模式在用），「提出補充需求」如果要從知識條目頁帶預設文字過去，改動很小，不用重新設計表單。

---

## 建議範圍：拆成 Batch 8（核心）+ Batch 8B（資源連結）

**建議把「知識條目可連到文宣/DM/資源」拆出去，其餘四項（含已完成的第 3 項確認）留在 Batch 8。**

理由：資源連結是全新的多對多關聯管理模式，這個專案目前所有寫入操作都是「一張表」或「先後寫兩張表」，沒有「一個項目底下可以自由加減好幾筆關聯」這種介面（連結廠商交付物都是一對多父子關係，不是多對多）。這個複雜度值得獨立拿出來設計，不要跟「先把知識條目內容做完整、做出可以查看/編輯的基本功能」這個當下最有價值的目標綁在同一批——你自己列的理由也是「先把業務需要查的資料做實」，資料做實的關鍵是內容欄位補齊跟能編輯，不是能不能連結文宣檔案，後者是加分項不是急件。

**Batch 8（建議這批做）**：
1. 知識條目詳情 modal（含補齊查詢欄位）
2. 行銷總監編輯功能（建議範圍比「只改狀態」更大，見下方說明）
3. 業務端可見性——確認既有邏輯正確涵蓋新功能，不用重做
4. 手機版驗收 + 「提出補充需求」入口

**Batch 8B（建議之後獨立一批）**：
5. 知識條目連結 `marketing_resources`（多對多管理介面）

---

## 逐項審查

### 1. 詳情 Modal

**先決條件是把查詢欄位補齊**：

```js
safeGET("product_knowledge_items?select=id,title,product_line,knowledge_type,target_segment,use_context,summary,detail,recommended_pitch,prohibited_pitch,related_competitor,evidence_level,visibility_status,owner,version,updated_at,created_at&order=updated_at.desc,created_at.desc&limit=100")
```

只是在既有 `select` 後面補欄位，不是新查詢，風險很低。詳情 modal 本身沿用既有 `openViewSalesRequestModal` 那種「唯讀表單」模式即可（`requestFormHtml` 的 `readOnly=true` 用法就是這個模式的既有範例），不需要發明新的呈現方式。

建議詳情 modal 至少要完整顯示：主題、知識類型、產品線、適用對象、使用場合、摘要、詳細說明、建議業務說法、不建議說法、競品對照、證據等級、可用狀態、負責人、最後更新時間——這些欄位現在都已經在資料庫裡，只是沒地方看。

### 2. 行銷總監編輯：建議範圍比「只改狀態」更大

你的計畫寫「行銷總監可編輯知識條目狀態」，但**如果編輯範圍只限定 `visibility_status`/`evidence_level` 這兩個狀態欄位，不能改 `detail`/`recommended_pitch`/`prohibited_pitch`/`related_competitor` 這些內容欄位，知識庫的實質內容還是補不進去**——現在的新增表單（`openCreateKnowledgeItemModal`）本來就沒有這幾個內容欄位，如果編輯也不開放，這些欄位會永遠是空的，跟「把業務需要查的資料做實」這個目標矛盾。

**建議編輯 modal 開放到接近完整欄位**（`title`/`product_line`/`knowledge_type`/`target_segment`/`use_context`/`summary`/`detail`/`recommended_pitch`/`prohibited_pitch`/`related_competitor`/`evidence_level`/`visibility_status`），**只有 `owner` 維持唯讀**（延續整個系列審查已經確立好幾次的原則——`citext references app_user_access(email)` 這類欄位不開放重新指派，因為 `app_user_access` 的 RLS 只讓查得到自己那一列，做不出指派選單）。

**需要你決定的商業規則**：`visibility_status` 改成 `可對外` 要不要經過 `approval_requests` 走一次總經理核准，還是行銷總監可以直接改？最早設計知識庫 schema 時就決定「不自己做審核欄位，走共用的 `approval_requests`」，但目前這個串接**只有廠商報價那條路做了**（`entity_type='vendor_quote'`），知識條目的 `entity_type='knowledge_item'` 從來沒有被實際寫入過。這批要不要一併把這條路接起來，還是先讓行銷總監直接改、審核機制留到之後有需要再做，是這批最重要的一個待確認事項，列在最後一節。

### 3. 業務端可見性

已經做完，見文件開頭。**唯一要確認的是**：詳情 modal 開放給業務角色查看時，只能讀取 `visibleKnowledgeItems(false)` 篩選過的清單裡的項目——這應該是自然而然的（因為業務端的列表本來就已經篩過，詳情只是把同一筆資料的更多欄位顯示出來），但建議在 code review 時明確確認一次，不要讓詳情 modal 另外去查 `state.data.knowledgeItems`（未篩選的完整陣列）而繞過既有的過濾。

### 4. 手機版 + 「提出補充需求」

**手機版**：知識條目列表本身是 `type:"table"`，已經套用既有的手機轉卡片機制，這部分不用額外做。真正要照 `docs/MOBILE_ACCEPTANCE_CHECKLIST.md` 檢查的是**這批新增的兩個 modal**（詳情、編輯）——尤其編輯 modal 如果照上面建議開放到接近完整欄位，會是目前所有 modal 裡欄位最多的一個（10 個以上欄位 + 兩個長文字欄位），手機視窗高度下的捲動、`textarea` 的高度、送出按鈕是否會被鍵盤或內容推出畫面，都要照清單第 4 條實際走一次流程確認，不能只看桌機版。

**提出補充需求**：技術上很輕量，`requestFormHtml(request = {}, readOnly = false)` 已經支援帶入初始值，建議做法是從知識條目詳情 modal 加一個「提出補充需求」按鈕，點擊後關掉詳情 modal、開一個預填過的新增需求單 modal（例如 `request_name` 預設「補充資料：{知識條目標題}」、`description` 預設帶一句提示這是針對哪個知識條目提出的），沿用 `openCreateSalesRequestModal` 現有的送出邏輯即可，**不需要在 `sales_requests` 加新欄位去正式關聯知識條目**——這批用文字說明帶過去就夠了，正式的資料庫關聯只有在之後這個功能被大量使用、真的需要追蹤統計「哪些知識條目最常被要求補充」時才需要加，現在加是過度設計。

---

## 是否需要 SQL

**Batch 8（本批）不需要任何 SQL。** 前面確認過的欄位（`detail`/`recommended_pitch`/`prohibited_pitch`/`related_competitor`）全部已經在資料庫裡，只是查詢字串沒帶到；「提出補充需求」也確認不需要新欄位。

Batch 8B（資源連結）也不需要新 SQL——`product_knowledge_resource_links` 這張表 Batch 5 已經建好，需要的是新的前端讀寫邏輯，不是新表或新欄位。

---

## 前端實作建議（Batch 8 範圍）

1. `loadExistingData()` 補齊 `product_knowledge_items` 的 `select` 欄位清單。
2. 新增 `openViewKnowledgeItemModal(id)`：唯讀顯示完整欄位，比照 `openViewSalesRequestModal` 的模式，底部加「編輯」（行銷總監角色）跟「提出補充需求」（業務角色）兩個動作按鈕，依角色決定要不要顯示。
3. 新增 `openEditKnowledgeItemModal(id)`：開放到接近完整欄位（`owner` 唯讀），送出走 `PATCH`，記得帶 `updated_at`（延續整個系列審查一直在提醒的——這個專案沒有資料庫觸發器自動更新這個欄位）。
4. `knowledgeSection()` 的表格列要加操作按鈕（「查看」給業務、「查看 / 編輯」給行銷總監），比照其他頁面已經有的 `actionGroup`/`actionButton` 模式。
5. 「提出補充需求」入口掛在詳情 modal 裡，重用既有的 `requestFormHtml`/送出邏輯，不新建表單元件。

---

## 需要你或行銷總監拍板的商業規則

1. **知識條目改成「可對外」要不要走 `approval_requests` 給總經理核准，還是行銷總監可以直接改？**（第 2 節，這是這批最重要的待確認事項）
2. **編輯範圍是否同意開放到接近完整欄位**（不只是狀態），讓知識庫內容真的能被填滿，而不是新增之後就定型？
3. **`product_knowledge_sources`（證據來源登記）要不要也排進 Batch 8B**，還是這次資源連結只處理 `marketing_resources`（文宣/DM），證據來源之後有需要再做？

---

## 建議順序

1. 補齊查詢欄位（最小、最先做，其他都依賴這步）。
2. 詳情 modal（唯讀，risk 最低，先確認資料顯示得完整正確）。
3. 編輯 modal（在詳情 modal 驗證過欄位沒問題之後接著做）。
4. 「提出補充需求」入口（依賴詳情 modal 已經存在）。
5. 手機版驗收（比照 `MOBILE_ACCEPTANCE_CHECKLIST.md` 逐條確認新增的兩個 modal）。
6.（Batch 8B，另外排）資源連結多對多管理介面。

---

## 阻塞問題

無。這批完全不需要 SQL，四個項目（含已完成的第 3 項）都可以立刻開始，只是建議在動工前先確認上面兩個商業規則（審核要不要走 `approval_requests`、編輯範圍要不要開放到完整欄位），這兩個答案會直接決定編輯 modal 要做多大，先問清楚比做完才發現方向不對划算。
