# Claude Code Review｜Batch 12A 實作結果（v1 行銷案刪除停用）

審查日期：2026-07-17
審查對象：v1（`marketing-platform` / `meisheng-marketing`，同一個 remote）commit `45d93db`「Disable v1 campaign deletion」
審查方式：兩個本地路徑都 `git pull` 到 `45d93db`，啟動本機 preview（`meisheng_marketing`，port 8776）直接呼叫 v1 全域函式（`openCampaignModal`/`delCampaign`/`saveCampaign`），攔截 `alert`/底層 `api()` 驗證，沿用 Batch 11A 審查時建立的方法（mock `window.api` 而不是 `GET`/`PATCH`/`POST`/`DEL` 這幾個 `const` 包裝函式，避免攔截不到）。

---

## 結論：跟 Batch 11A 同一套模式套用到行銷案，四項對應驗證全部通過，沒有發現問題

---

## 逐項驗證

### 刪除按鈕狀態

`openCampaignModal("c1")` 開編輯 modal 後，`#cm-delete`：`disabled: true`、文字「刪除已停用」、`title="行銷案已改由 v2 封存，不再從 v1 刪除"`、`onclick` 屬性完全移除。截圖確認實際渲染的完整編輯行銷案表單（21 個欄位全部在畫面上，跟 Batch 12 草案審查核對過的欄位清單一致），刪除按鈕在底部呈現灰階不可點擊狀態，跟「取消」「儲存」並排。

### 直接觸發 `delCampaign()`

繞過 UI 直接呼叫函式，攔截 `alert`/`api()`：`alert` 被呼叫一次，內容正確（「行銷案已改由 v2 管理生命週期。請到 v2 的「行銷案管理」使用封存，不再從 v1 真刪除。」），**`api()` 完全沒有被呼叫**——不只 `DELETE marketing_campaigns` 沒送出，這次連 GET 都沒有，比資源刪除那次更乾淨（資源刪除原本還會呼叫 `deleteStorageFile`，行銷案刪除函式現在整個就是一行 `alert`，沒有任何殘留的資料操作）。

### `saveCampaign()` 是否仍正常

這批完全沒有改動 `saveCampaign()`，實測編輯（改名稱、改狀態）跟新增都正確送出 `PATCH marketing_campaigns?id=eq.c1` / `POST marketing_campaigns`，payload 裡的欄位值正確，存檔後續的 dashboard 重新載入（任務/預算/風險/成效/資源查詢）也都正常觸發，其中資源查詢确认帶著 Batch 11A 加的 `deleted_at=is.null`——兩批的修改在同一次操作流程裡共存，沒有互相干擾。

### 範圍確認沒有擴大

diff 只動了 `delCampaign()` 本體、`index.html` 的刪除按鈕、`HANDOFF.md` 記錄——沒有連帶碰到 `saveCampaign()`、任務/預算/文件/風險/成效等其他子模組的任何刪除功能（`delTask`/`delBudgetItem`/`delDoc`/`delRisk` 等等這次都沒被動到，是對的，這些屬於 Batch 13/14 的範圍，Batch 12A 只處理行銷案主檔本身）。`HANDOFF.md` 新增的說明文字正確記錄了二層 cascade 的風險原因，跟 Batch 12 草案審查抓到的風險描述一致，沒有寫錯。

---

## 下次接手備註

Batch 12A（v1 端）確認完全收尾。可以進 Batch 12B（v2 行銷案主檔新增/編輯/封存），這批確認不需要 SQL——`archived_at`/`archived_by`/`archive_reason` 三個欄位 Batch 11B 已經建好，Batch 12B 純粹是前端 CRUD，複查時直接沿用 `CLAUDE_CODE_REVIEW_BATCH12_DRAFT.md` 裡的欄位清單、`sort_order` 邏輯、`association_activity_type` 自由文字框建議三個重點去對照實作。
