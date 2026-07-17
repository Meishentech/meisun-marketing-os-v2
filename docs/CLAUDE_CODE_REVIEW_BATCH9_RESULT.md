# Claude Code Review｜Batch 9 實作結果（資源下載頁真正可操作化）

審查日期：2026-07-17
審查對象：commit `45ff375`「Make resource downloads actionable」
審查方式：逐行核對 `assets/app.js`/`core/api.js` diff，並實際啟動本機 preview（375×812 手機寬度）注入涵蓋六種組合（外部可用私有檔案／內部私有檔案／內部連結／純 Canva／完全無來源／三種來源皆有）的測試資料，實測渲染與點擊行為；額外攔截 `window.open`/`getSignedUrl`/`alert` 驗證下載中 loading 狀態、成功與失敗兩條路徑，以及知識條目詳情裡 Batch 8B 已連結資源卡片是否套用了同一套修正。

---

## 結論：乾淨通過，三個待拍板商業規則都有明確答案且正確落地，沒有發現需要修正的問題

`docs/phase-1-mvp.md` 已經記錄了三個決策：優先順序 `file_path ＞ resource_url ＞ canva_url`、`is_external_usable=true` 才能簽出私有檔案（內部資源仍可查看外部/Canva連結）、這批不做行銷總監端新增/編輯。程式碼實作跟這三個決策完全一致，也確認了草案審查點名的 Batch 8B 既有 bug（知識條目「已連結資源」的「開啟」按鈕對 `file_path` 直接當 href 用）已經一併修正。

---

## 逐項核對

### 1. 三個開啟來源判斷邏輯

`resourceActionButtons(resource)` 沒有採用「挑一個最優先來源」的做法，而是**三個來源各自獨立判斷，同時顯示所有可用的動作**（例如同時有 `file_path`/`resource_url`/`canva_url` 時會顯示三個按鈕）。這比草案建議的「挑一個」更透明，不會因為挑錯優先順序而讓使用者看不到其他實際存在的來源，是比建議更好的設計選擇：

- `file_path` 存在 → `is_external_usable=true` 顯示「下載 {檔案大小}」（可點擊）；`false` 顯示「內部檔案」（disabled，不可點擊）
- `resource_url` 存在 → 一定顯示按鈕（`is_external_usable` 只影響文字是「開啟連結」還是「查看連結」，兩種都可點擊）
- `canva_url` 存在 → 一定顯示「查看 Canva」（可點擊）
- 三者都沒有 → 顯示 disabled「尚無檔案」

實測六種組合（純外部可用私有檔案、內部私有檔案、內部連結、純 Canva、完全無來源、三種來源皆有），按鈕文字、disabled 狀態、`data-action`/`data-id` 全部正確，檔案大小格式化也正確（2500000 bytes → 「下載 2.4 MB」，1200000 bytes → 「下載 1.1 MB」）。

### 2. `is_external_usable=false` 時的存取控制

實測確認正確落地 `phase-1-mvp.md` 記錄的決策：`file_path` 在 `is_external_usable=false` 時顯示 disabled「內部檔案」（不會呼叫 `getSignedUrl`，私有檔案不會被簽出）；`resource_url`/`canva_url` 則不受 `is_external_usable` 限制，內部資源業務仍看得到並可以打開外部連結——這比草案建議的「內部資源整個查看/下載都關掉」更細緻，只鎖住真正會讓檔案落地到使用者裝置的動作（私有檔案簽出下載），不影響本來就已經是外部連結的內容，風險控制的顆粒度抓得比我原本的建議更準。

`openResourceFile()` 內部也重複檢查了一次 `resource.is_external_usable`（`if (!resource?.file_path || !resource.is_external_usable) return;`），就算未來某處繞過 UI 直接呼叫這個函式，存取控制還是有效——延續這系列審查已經確立的「防禦性重複檢查」慣例。

### 3. Batch 8B 既有 bug 修正確認

草案審查抓到的問題——知識條目詳情「已連結資源」卡片的「開啟」按鈕直接把 `file_path`（私有 bucket 路徑）當 `<a href>` 用——這批已經修正：`resourceLinkCard()` 現在呼叫同一個 `resourceActionButtons()` helper，跟業務端資源庫共用同一套判斷邏輯，不是另外複製一份。實測在知識條目詳情裡塞入一筆 `file_path`＋`is_external_usable=true` 的已連結資源，正確顯示可點擊的「下載 2.4 MB」；塞入 `is_external_usable=false` 的則正確顯示 disabled「內部檔案」，不再是那個點下去導到不存在路徑的死連結。**這是這次審查裡少數「修正範圍主動涵蓋了審查者在前一批漏掉的舊 bug」的案例，值得肯定。**

### 4. 簽名 URL 下載流程本身

`getSignedUrl()` 從 v1 `core/api.js` 移植，用 `getToken()`（v2 既有的 token 讀取方式）取代 v1 直接讀 `sessionStorage`，行為等價；失敗時 `throw new Error(...)` 而非 v1 原本靜默回傳空字串，讓呼叫端可以用 `try/catch` 明確處理錯誤，是比原版更好的錯誤處理方式。

`openResourceFile()` 用「點擊當下先同步開一個 `about:blank` 空分頁，等簽名網址回來後才設定 `popup.location.href`」的模式來避開瀏覽器彈窗攔截（非同步呼叫後才 `window.open` 通常會被攔），並在拿不到 popup 時 fallback 直接 `window.open(signedUrl, ...)`——實測用程式直接呼叫（非真實使用者點擊，缺乏 user-gesture）觸發了這個 fallback 路徑，確認兩條路徑都能正確送出正確的簽名網址，不會卡死或無反應。

下載中／完成／失敗三個狀態都實測驗證：
- 下載中：按鈕 disabled、文字變成「產生連結...」
- 完成：按鈕還原成可點擊、文字還原成原本的「下載 {大小}」
- 失敗（模擬 `getSignedUrl` 丟出錯誤）：跳出 `alert` 顯示錯誤訊息、關閉已開的空白分頁、按鈕正確還原不會卡在 disabled 狀態

### 5. 手機版

沿用既有 `type:"table"` + `data-label` 轉卡片機制與 Batch 8 建立的 `actionGroup`/`inline-action` 元件，這批沒有新增 CSS，也不需要——多按鈕情境（例如一筆資源同時有下載＋連結＋Canva 三個按鈕）實測在 375px 寬度下垂直堆疊、不擠壓、彼此有清楚間距。唯一觀察：`.inline-action` 按鈕高度是 36px，略低於驗收清單建議的 44px，但這是**整個 app 從 Batch 6A 就開始沿用的既有樣式**（「移除連結」「編輯」等按鈕都是同樣高度），不是這批新增或變差的地方，不列為這批的問題，值得記錄下來供之後如果要整體調整觸控尺寸時一次處理。

### 6. 對 v1 的影響

這批全程只有 `GET`（讀取 `marketing_resources` 補充欄位）跟簽名 URL 簽發（讀取端點，不修改任何資料列），沒有任何 `POST`/`PATCH`/`DELETE` 打到 `marketing_resources` 或 `storage.objects`，符合草案審查「維持只做業務端可點擊」的建議範圍，對 v1 沒有任何影響。

---

## 下次接手備註

Batch 9 完全收尾，沒有殘留問題。草案裡列的 Batch 9B（行銷總監端新增/編輯 `marketing_resources`）仍在「需要使用者拍板要不要做、以及之後打算用 v1 還是 v2 管理」的狀態，還沒有被這批觸碰，下次使用者提到要開始 Batch 9B，先確認這個治理問題是否已經有答案。
