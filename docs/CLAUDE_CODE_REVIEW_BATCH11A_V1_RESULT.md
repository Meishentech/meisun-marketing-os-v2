# Claude Code Review｜Batch 11A 實作結果（v1 資源刪除停用）

審查日期：2026-07-17
審查對象：v1（`meisheng-marketing` / `marketing-platform`，同一個 remote `Meishentech/marketing.git`）commit `cf354f3`「Disable v1 resource deletion」
審查方式：兩個本地路徑都 `git pull` 到 `cf354f3`，啟動本機 preview（`meisheng_marketing`，port 8776）直接呼叫 v1 全域函式（`openResourceModal`/`delResource`/`saveResource`/`renderResourcesPage`/`renderExternalResourcesPage`/`renderDashboard`），攔截 `alert`/`DEL`/`deleteStorageFile`/`safeGET`/`api` 逐一驗證四個要求的測項。

---

## 結論：四項全部驗證通過，沒有發現問題

---

## 逐項驗證

### 1. 編輯 modal 是否看得到停用的刪除按鈕

塞入一筆測試資源、呼叫 `openResourceModal("r1")` 後檢查 `#res-delete`：`disabled: true`、文字「刪除已停用」、`title="資源已改由 v2 封存，不再從 v1 刪除"`、`onclick` 屬性完全移除（`null`）。截圖確認視覺上也是灰階不可點擊狀態，跟「取消」「儲存」兩個正常按鈕並排，沒有版面跑掉。

### 2. 直接觸發 `delResource()` 是否只顯示提示、不送 DELETE

繞過 UI 直接呼叫函式（模擬有人從 console 硬觸發，或未來其他地方不小心又接回這個函式），攔截 `alert`/`DEL`/`deleteStorageFile` 後執行：

- `alert` 被呼叫一次，內容正確：「行銷資源已改由 v2 管理。請到 v2 的「產品知識庫 / 文宣資源管理」使用封存，不再從 v1 真刪除。」
- `DEL()`（送 `DELETE` 到 `marketing_resources`）**完全沒有被呼叫**
- `deleteStorageFile()`（原本會先刪 Storage 裡的檔案）**也完全沒有被呼叫**

這代表就算之後有人不小心把某個地方的 `onclick` 重新接回 `delResource()`，函式本身已經是空氣，不會有任何刪除副作用——防護不是只在 UI 層（disabled 屬性），函式層也同步清空了，是雙重防護。

### 3. 三個資源頁是否排除 v2 已封存資源

攔截 `safeGET()` 記錄實際送出的查詢字串，分別呼叫三個頁面的載入函式：

| 頁面 | 函式 | 實際送出的查詢 |
|---|---|---|
| 資源管理頁 | `renderResourcesPage()` | `marketing_resources?deleted_at=is.null&order=updated_at.desc` |
| 對外資源頁 | `renderExternalResourcesPage()` | `marketing_resources?is_external_usable=eq.true&deleted_at=is.null&order=updated_at.desc` |
| Dashboard | `renderDashboard()` | `marketing_resources?is_external_usable=eq.true&deleted_at=is.null&order=updated_at.desc` |

三處都正確帶了 `deleted_at=is.null`，跟複查 `V1_TO_V2_MIGRATION_PLAN.md` 時指出的三個位置（`app.js:501`/`1686`/`1794`）完全對應，沒有漏掉任何一處。`renderDashboard()` 呼叫過程沒有拋出例外，其他資料查詢不受影響。

### 4. v1 新增 / 編輯資源是否仍正常

`saveResource()` 這批完全沒有被改動（diff 裡沒有這個函式），照理不會壞，但還是實際跑一次確認：攔截底層 `api()`（`PATCH`/`POST`/`GET`/`DEL` 是包在 `api()` 外面的 `const` 包裝函式，直接 mock `api` 才攔得到，這是這次測試過程中的一個小插曲——一開始想 mock `window.PATCH`/`window.POST` 沒攔到，因為它們是 `const` 宣告不是 `window` 屬性，改 mock `api()` 之後才正確攔截，記錄下來供之後測 v1 存檔邏輯時直接用對的攔截點）：

- **編輯**：修改標題與「可對外」勾選後存檔，正確送出 `PATCH marketing_resources?id=eq.r1`，payload 裡的 `title`/`is_external_usable` 都是修改後的值。
- **新增**：清空表單填入新標題後存檔，正確送出 `POST marketing_resources`，payload 正確。

兩條路徑都沒有觸發任何錯誤或非預期的 alert，功能完全正常，跟這批的改動範圍（只動刪除、不動存檔）一致。

---

## 下次接手備註

Batch 11A（v1 這端）確認完全收尾，四項測試全部通過。下一步照 `V1_TO_V2_MIGRATION_PLAN.md` 走 Batch 11B（`marketing_campaigns` 封存模型），複查時記得沿用這次「先兩個 v1 本地路徑都 pull 到最新、直接呼叫全域函式測試、mock `api()` 而不是 `PATCH`/`POST`/`GET`/`DEL`」這套已經驗證有效的方法。
