# Claude Code Review｜Batch 6B 新增資料操作實作結果

審查日期：2026-07-15
審查對象：`assets/app.js`（commit `dba31b1`，`openCreateCampaignVendorModal`/`openCreateKnowledgeItemModal`/`openCampaignCreationDeferredModal`）
審查方式：實際讀取完整 diff，並用 `grep` 列出目前 app.js 裡**所有**的 `POST`/`PATCH`/`DELETE` 呼叫逐一核對，不只看這次 diff 涉及的範圍。

---

## 通過 / 不通過

**通過，有一項建議修正（非阻塞）。**

---

## 1. 是否確實沒有任何地方會新增 `marketing_campaigns`

**確認沒有。** 列出目前整個 `app.js` 裡所有的寫入呼叫（11 處 `POST`/`PATCH`），逐一核對 table 名稱：`sales_requests`（新增/更新）、`approval_requests`（新增/核決）、`vendors`（新增）、`marketing_campaign_vendors`（新增/更新報價狀態）、`product_knowledge_items`（新增）——**沒有任何一處寫入 `marketing_campaigns`**。行銷案頁的主按鈕（`openCampaignCreationDeferredModal`）只開一個說明用的 modal，`onSubmit` 只呼叫 `closeModal()`，完全沒有 `api()` 呼叫。這項確認通過，做法乾淨。

---

## 2-3. 廠商合作兩段式寫入：一致性風險 + `vendors` 成功但 `marketing_campaign_vendors` 失敗時是否需要補救

**正常路徑沒問題，但重新推演「第二段失敗後使用者重試」的情境，找到一個實際的資料重複風險，建議修正。**

流程本身寫得對：先 `POST vendors`（僅在沒選既有廠商時）→ 從回傳值拿新 `id` → 檢查 `id` 存在才繼續 → `POST marketing_campaign_vendors`。`core/api.js` 的 `api()` 在非 2xx 回應時會 `throw`，所以如果第一段 `POST vendors` 失敗，第二段確實不會執行，這條路徑是安全的。

**問題出在第二段失敗、使用者接著重試的情境**：如果 `POST vendors` 成功（廠商已經真的建立），但緊接著 `POST marketing_campaign_vendors` 失敗（例如網路瞬斷），外層 `modalForm` 的 submit handler 會 `catch` 住錯誤、顯示錯誤訊息、**但不會清空表單、也不會記住剛剛已經成功建立的 `vendorId`**。使用者看到錯誤訊息後，直覺反應通常是再按一次「建立廠商合作」，這時候 `values.vendor_id` 欄位依然是空的（因為使用者是走「新增廠商」那個分支，表單上沒有帶入剛剛產生的 `vendorId`），`values.vendor_name` 還是同一個名字——**會再送一次 `POST vendors`，用同一個名字建立第二筆廠商**。`vendors.name` 沒有唯一性約束，這個重複不會被資料庫擋下來。

實際後果：使用者多按一次重試，系統裡會出現兩筆同名廠商，其中先建立的那一筆會變成永久的孤兒紀錄（沒有任何 `marketing_campaign_vendors` 指向它）。這不是資安或資料損毀等級的問題（多一筆可以事後清理的重複資料），但值得修，而且修法很小：

**建議修正**：在 `onSubmit` 開頭把 `vendorId` 提升成 modal 層級可以跨次 submit 保留的變數（例如在 `openCreateCampaignVendorModal` 函式作用域宣告一個 `let createdVendorId = "";`，`POST vendors` 成功後存進去；下次進 `onSubmit` 時先檢查 `createdVendorId` 有沒有值，有的話直接沿用、不要再送一次 `POST vendors`）。這個修正不影響正常路徑（沒有失敗過的情況完全不受影響），只在「第二段失敗後重試」這個邊角情境生效，工作量很小，建議下一批順手補上，不需要現在為了這個阻塞 Batch 6B 收尾。

---

## 4. `meisun_contact` / `owner = state.auth.email` 是否可能 FK 失敗

**不會失敗，這點可以放心。** 追過 `bootAuthenticatedApp()` 的邏輯：`state.auth.email` 是在成功登入、且 `loadUserAccess(email)` 對 `app_user_access` 查詢確認 `is_active` 為真之後才被設定的——換句話說，任何能操作這個表單的登入使用者，他的 email **必然已經是 `app_user_access` 裡的一筆合法資料**，不可能出現「登入了但 email 不在 `app_user_access` 裡」這種情況。`citext` 型別對大小寫不敏感，也不會有大小寫不一致造成 FK 比對失敗的問題。這條路徑是安全的。

---

## 5. `visibility_status = 待確認` 是否能確保業務端不會顯示

**確認會被正確擋下。** 核對業務端知識庫的過濾邏輯（`visibleKnowledgeItems`，第 977-980 行）：`if (isMarketing) return 全部；否則 filter (可對外, 僅內部)`。新條目固定寫入 `visibility_status: "待確認"`，不在這個允許清單裡，所以業務端看不到剛建立的條目，行銷總監端則因為 `isMarketing` 分支回傳全部資料，可以看到自己剛建立的條目做後續編輯或送審——這個對稱行為是對的，新增功能跟既有的可見性過濾邏輯接得起來，沒有繞過或衝突。

---

## 6. 欄位名稱、型別、Check 約束值是否全部正確

**逐一核對過，全部正確**：

- `evidence_level`：表單值 A/B/C/D，跟 `product_knowledge_items` 的 `check (evidence_level in ('A','B','C','D'))` 完全一致。
- `visibility_status`：固定送出 `'待確認'`，跟 check 約束的字串完全一致（含用字）。
- `knowledge_type`：資料庫這個欄位沒有 check 約束（設計上是自由文字），表單提供的下拉選項延續了之前審查建議的分類清單，是體驗上的一致性選擇，不是資料庫層的強制要求。
- `quote_status`：延續 `marketing_campaign_vendors` 已有的用字（待報價/已報價/待核准/已簽約），這個欄位也沒有 check 約束，但用字跟既有的 `statusTone()` 顏色對照表一致，畫面顯示不會出現無色標籤。
- `budget_amount`：`values.budget_amount ? Number(values.budget_amount) : null`——正確把輸入框的字串轉成真正的數字型別再送出，沒有把畫面顯示用的格式化字串（例如「180萬」）誤送進 `numeric` 欄位的風險。
- `campaign_id`/`vendor_id`：都是從下拉選單（`state.data.campaigns`/`state.data.vendors`）選出的真實 `id`，不是自由輸入，`campaign_id` 也正確用 `required` 屬性擋住空白提交。

沒有發現任何欄位名稱打錯、型別不符或約束值不一致的問題。

---

## 7. 是否有必要在 Batch 6B 就加 RLS 或資料庫層保護

**不需要，維持之前審查的判斷。** 這三個都是「新增」操作，最壞情況是多了一筆可以事後編輯或刪除的資料，風險層級遠低於核准或刪除。第 2-3 節提到的重試重複問題是應用層的資料整潔問題，不是權限或安全問題，用 RLS 也解決不了，跟 Phase 1 要不要提前加保護是兩件不相關的事。維持 Phase 1 前端角色控制、Phase 2 再統一處理的既定計畫即可。

---

## 必修問題

無。

## 建議但不阻塞問題

1. **廠商合作表單「新建廠商」分支的重試重複問題**（第 2-3 節）：`POST vendors` 成功、`POST marketing_campaign_vendors` 失敗後使用者重試，會建立第二筆同名孤兒廠商。建議把已建立的 `vendorId` 存到 modal 層級變數，重試時優先沿用，不要重新呼叫 `POST vendors`。

## 下一批建議

Batch 6B 這一批核心的三個新增功能都做對了，可以收尾。下一批（無論是 Batch 6C 還是回頭處理其他模組）開始前，建議：

1. 先把上面「建議但不阻塞」的重試重複問題順手修掉，成本很小。
2. 之後如果要幫 `vendors`、`product_knowledge_items` 或 `marketing_campaign_vendors` 做刪除功能，比照 Batch 6A 刪除功能審查建立的判斷原則（可逆性、有無留下痕跡、這張表是不是本來就要拿來做統計）重新評估一次要不要用軟刪除，不要預設沿用 `sales_requests` 的方案，因為不同表的用途不一樣（例如 `vendors` 是全域主檔，被誰引用、能不能刪需要先確認沒有 `marketing_campaign_vendors` 還在用它）。
3. `marketing_campaigns` 新增功能被刻意延後到「v2 完成並確認整合 v1」之後——這個決定已經寫進 `docs/phase-1-mvp.md`，之後如果有人重新提案要做，記得先確認這個前提條件是否已經成立，不要繞過這個決策直接動工。
