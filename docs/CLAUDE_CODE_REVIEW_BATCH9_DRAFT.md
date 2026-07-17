# Claude Code Review｜Batch 9 草案：資源下載頁真正可操作化（寫程式前審查）

審查日期：2026-07-17
審查對象：業務端「文宣 / 資源下載」頁（`sales:resources`）、業務首頁「常用資料」區塊、知識條目詳情已連結資源的「開啟」連結
審查方式：逐行核對 `assets/app.js` 現有 `salesHomeResourcesSection()`/`resourceLibrarySection()`/Batch 8B `resourceLinkCard()`，並回頭核對 `marketing_resources` 的**完整歷史 schema**（v2 repo 沒有這張表的建表 SQL，因為它是 v1 `meisheng-marketing` 就存在、現在還在用的表——讀了 v1 repo 的 `schema_v12_performance_resources.sql`、`schema_v14_resource_files.sql` 跟 `core/api.js` 才確認完整欄位與現成的簽名 URL 實作）。

---

## 結論先講：這批會直接撞到一個「私有 Storage bucket 不能當一般連結開」的技術地雷，而且**這個地雷 Batch 8B 已經先踩下去了**

`marketing_resources.file_path` 指向的是**私有**（`public: false`）Supabase Storage bucket `marketing-resource-files`，不是公開可直接用 `<a href>`打開的網址。Batch 8B 的 `resourceLinkCard()`（知識條目詳情裡「已連結資源」的「開啟」按鈕）目前是這樣判斷來源：

```js
const resourceHref = resource?.resource_url || resource?.file_path || "";
...
`<a class="inline-action is-primary" href="${escapeAttr(resourceHref)}" target="_blank" rel="noopener">開啟</a>`
```

**任何只有 `file_path`（沒有 `resource_url`）的資源，這個「開啟」連結現在點下去是壞的**——`file_path` 是 storage object 的相對路徑（例如 `1752600000_型錄.pdf`），不是可以直接開的 URL，瀏覽器會嘗試導到一個不存在的相對路徑。這不是這批要新增的風險，是**現有程式碼已經存在的 bug**，只是 Batch 8B 審查時我沒有往下查 `file_path` 實際指向私有還是公開 bucket，這次為了回答你問題 2 才往下查到——**建議這批一併修正，不要只修新頁面、放著 Batch 8B 那個入口繼續壞著**。

v1（`meisheng-marketing`）早就處理過同樣的問題，`core/api.js` 有現成的 `getSignedUrl(bucket, path, expiresIn)`：

```js
async function getSignedUrl(bucket, path, expiresIn = 3600){
  const tok = sessionStorage.getItem('ms_token');
  const r = await fetch(`${SB}/storage/v1/object/sign/${bucket}/${path}`, {
    method: 'POST',
    headers: { apikey: KEY, Authorization: `Bearer ${tok || KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn })
  });
  if(!r.ok) return '';
  const data = await r.json();
  return `${SB}/storage/v1${data.signedURL}`;
}
```

v1 跟 v2 是**同一個 Supabase project**（`apgrclmrkarxlajmhnpa`），`marketing-resource-files` bucket 跟它的 RLS 政策（`schema_v14_resource_files.sql` 已經 grant `authenticated` 全權限）v2 現在就能直接用，**不需要新的 SQL 或 Storage 政策**，只要把這個函式搬進 v2 的 `core/api.js`（`authenticated` 才會有 `sessionStorage` 裡的 `ms_token`，跟這個函式的假設一致，直接複製貼上即可）。

---

## 逐題回答你列的 6 點

### 1. `marketing_resources` 現有欄位是否足夠支援下載 / 查看？

**欄位本身夠，但 v2 目前查詢字串少撈了 3 個相關欄位。**

完整欄位（v1 `schema_v12`/`v14` 累積結果）：`id / title / resource_type / product_line / audience / version / resource_url / canva_url / is_external_usable / tags[] / notes / file_path / file_name / file_size / created_at / updated_at`。

v2 目前 `loadExistingData()` 的 select：`id,title,resource_type,product_line,audience,version,resource_url,file_path,is_external_usable,updated_at`——**少了 `canva_url`、`file_name`、`file_size`**。

- `canva_url` 缺了會有實質影響：目前判斷「有沒有東西可以下載/查看」只看 `resource_url || file_path`，任何只填了 `canva_url`（例如還沒匯出成檔案、只有 Canva 設計連結的資源）現在會被判定成「沒有來源」，即使資料庫裡其實有一個可以打開的連結。
- `file_name`／`file_size` 不影響「能不能點」，但這批既然要做「真正可操作化」，有 `file_name` 才能在按鈕上顯示真實檔名（現在只能借用 `title`），`file_size` 可以做「下載（2.4MB）」這種更清楚的提示，建議一併補上，反正只是 select 字串加欄位，跟 Batch 8 補 `detail`/`recommended_pitch` 那次一樣是零風險的查詢擴充。

### 2. `resource_url`、`file_path` 應該怎麼判斷開啟來源？

實際上有三個可能來源（不是兩個），行為必須分開處理：

| 來源 | 性質 | 開啟方式 |
|---|---|---|
| `resource_url` | 外部網址（可能是已經公開託管的檔案或頁面） | 直接 `<a href>` 開新分頁，同步、不需要額外請求 |
| `canva_url` | Canva 設計稿連結 | 直接 `<a href>` 開新分頁，同步；但語意上是「查看設計來源」不是「下載成品」，建議跟 `resource_url`/`file_path` 分開標示文字 |
| `file_path` | 私有 bucket 內的檔案路徑 | **不能當 href**，必須先呼叫 `getSignedUrl('marketing-resource-files', file_path)` 拿到臨時簽名網址，再 `window.open(signedUrl, '_blank')`——這是非同步操作，UI 上必須是「按鈕點擊觸發 JS」，不能是靜態 `<a>` 標籤 |

**建議判斷優先順序**：`file_path`（真正的上傳檔案，最可能是使用者要的最終成品）＞ `resource_url`（外部連結，可能是同一份資料的備援位置）＞ `canva_url`（設計來源，通常不是要直接發給客戶的東西）。三者都沒有時才是真正的「尚無檔案」空狀態。

**這題的優先順序判斷是內容治理判斷，不是純技術問題**（例如：如果行銷總監的習慣是資料上傳後才刪掉 Canva 草稿保留 `resource_url` 導去正式雲端硬碟，那 `resource_url` 可能才該排第一），建議實作前跟行銷總監確認一次現有資料實際填寫習慣，不要我這邊憑欄位名稱猜測後就直接定案。

### 3. 業務端可見範圍：只顯示 `is_external_usable=true`，還是內部資料也顯示？

**這是這批最重要的待拍板商業規則，建議維持現況（內部資料也顯示，只是標示成內部）**，理由如下：

現有 `resourceLibrarySection()` 本來就沒有過濾，`is_external_usable` 只拿來決定顯示「可對外」或「內部/待確認」標籤，兩種都給業務看得到——這跟知識庫 `visibleKnowledgeItems()` 的過濾邏輯（業務只看得到 `可對外`/`僅內部`，`待確認`/`禁止使用` 兩態會被擋掉）不是同一套規則，但知識庫是四態、`marketing_resources.is_external_usable` 只有二態（沒有「僅內部」「禁止使用」的區分），語意上比較接近知識庫的「可對外／僅內部」兩態合併，不是「可對外／禁止使用」二選一。

**但這件事在 Batch 8 之前是不痛不癢的（反正整欄都是靜態文字點不動），這批做完「真正可點擊」之後，這題的風險等級會跟著提升**——如果某份 `is_external_usable=false` 的資源其實是「還沒審完、不該被業務誤用去發給客戶」而不是「業務可以看但不能對外」，現在做成可以真的下載，等於業務真的能拿到這份檔案並轉發出去，過去「反正點了也沒用」這個隱性防線會消失。

建議：**這批把「可以查看」跟「可以下載」分開處理**——`is_external_usable=false` 的資源，操作欄顯示「查看」而非「下載」（維持業務看得到內容、知道有這份資料存在，但不主動給下載連結），`is_external_usable=true` 才顯示「下載」。這樣不用改變現有「業務看得到全部資源」的既定行為，但至少讓「下載」這個動作的風險跟資料的核准狀態掛鉤，是這題除了「全開」「全關」之外的第三個選項，建議跟使用者/行銷總監確認是否採用。

### 4. 行銷總監端是否需要先能新增 / 編輯，還是這批先只做業務端可點擊？

**建議這批只做業務端可點擊，行銷總監端的新增/編輯留給下一批（比照 Batch 8/8B 的拆法）。**

查證結果：v2 現在**完全沒有** `marketing_resources` 的任何寫入操作——沒有 create/edit modal，`marketing` 角色的 nav 選單裡也沒有「資源管理」這個入口，只有業務端的兩個唯讀區塊在讀這張表。也就是說**目前 v2 裡能看到的所有資源資料，全部來自行銷總監在 v1（`meisheng-marketing`）操作的結果**——v1 已經有完整的上傳/編輯/刪除介面（`app.js` 裡 `uploadStorageFile`/`deleteStorageFile` 一整套，含簽名 URL 下載），這是行銷總監現在真的在用的正式功能，不是半成品。

這代表 Batch 9 的「新增/編輯」不是從零設計，是「要不要把 v1 已經做好的功能搬進 v2」的決定，性質類似 Batch 6B 遇到的「v2 新增資料是否直接進 v1 也在用的表」——**但方向相反**：Batch 6B 是「v2 新增的東西會不會被 v1 看到」，這裡是「v2 要不要新增一個管道去寫同一張 v1 正在用的表」。如果 v2 也做寫入，行銷總監會有兩個地方可以管理同一批資源，要嘛之後只用 v2（v1 這塊功能等於停用）、要嘛兩邊並存但要注意欄位/bucket 完全共用不會衝突（技術上共用沒問題，是使用習慣要不要統一的問題）。這題比「要不要做」更需要先問「行銷總監之後打算用哪一邊管理資源」，建議跟 Batch 6B 一樣列成需要使用者拍板的問題，不在這批動工前替他決定。

### 5. 手機版下載按鈕與無檔案狀態應如何呈現？

**沿用既有的 `type:"table"` + `data-label` 自動轉卡片機制即可，不需要另外設計新元件**——`resourceLibrarySection()` 已經是 `type:"table", wide:true`，跟 Batch 8A 知識條目列表用的是同一套機制，已經驗證過手機版轉卡片正常。真正要注意的是操作欄本身：

- 操作欄要從純文字改成 `actionButton`/`actionGroup`（沿用 Batch 8 建立的模式），一份資源可能同時要顯示「下載」跟「查看」兩個動作（例如 `is_external_usable=true` 又同時有 `file_path` 可下載、也有 `canva_url` 可查看設計來源），手機版兩個按鈕要垂直堆疊不擠壓，這點 Batch 8B 的 `.linked-resource-card` mobile CSS（`grid-template-columns: 1fr` 覆寫）已經有現成範例可以參考同一種寫法。
- **無檔案狀態不能是空白或死點的文字**：現有程式碼 `resource.resource_url || resource.file_path ? "下載" : "查看"` 這行本身就有問題——沒有 `resource_url`/`file_path` 時 fallback 顯示「查看」，但根本沒有東西可以查看，是一個看起來能點、實際上點了沒反應的死狀態。這批要改成三個來源都沒有時明確顯示「尚無檔案」（disabled 按鈕或純文字提示），不要讓「查看」變成假的可點擊文字。
- 下載中的 loading 狀態：`getSignedUrl` 是一次網路請求，手機網路較慢時使用者可能會重複點擊，建議比照既有 modal 送出按鈕的防雙擊模式（`app.js:3207` 那個 `submit.disabled = true` 模式），下載按鈕點擊後先短暫 disable，拿到簽名網址後再 enable，避免重複開分頁或誤以為沒反應而連點。

### 6. 是否會影響 v1 正式平台資料或現有流程？

**如果這批維持「只做業務端可點擊」（問題 4 的建議範圍），完全不影響 v1。**

理由：`getSignedUrl` 是 Storage 的簽名網址簽發，屬於讀取端點，不會修改 `storage.objects` 或 `marketing_resources` 任何一列資料，v1 使用者不會看到任何變化，也不會有任何 v2 產生的新資料出現在 v1 畫面上（跟 Batch 6B 遇到的「v2 新增行銷案會被 v1 看到」是不同性質——那次是 INSERT 進共用表，這次單純是 SELECT + Storage 簽名 URL，沒有寫入動作）。

如果之後真的要做問題 4 提到的「v2 也能新增/編輯資源」，那時候才會變成跟 Batch 6B 同等級的風險（v2 寫入會被 v1 看到），但那是下一批的事，不是這批。

---

## 建議範圍

**Batch 9（建議這批做）**：
1. `loadExistingData()` 補齊 `marketing_resources` 查詢欄位（`canva_url`/`file_name`/`file_size`）。
2. 把 v1 `core/api.js` 的 `getSignedUrl(bucket, path, expiresIn)` 搬進 v2 `core/api.js`（同一個 Supabase project，同一個 bucket，同一套 RLS，直接複製即可，不用重新設計）。
3. 業務端「文宣 / 資源下載」頁 + 業務首頁「常用資料」區塊：操作欄從純文字改成真的可點擊的按鈕，依「來源判斷」表（問題 2）決定按鈕行為；`file_path` 來源用非同步簽名 URL、`resource_url`/`canva_url` 用一般連結。
4. **一併修正 Batch 8B 已經存在的同款 bug**：`resourceLinkCard()`（知識條目詳情裡「已連結資源」的「開啟」按鈕）目前對 `file_path` 直接當 href 用，要改成呼叫同一個 `getSignedUrl`。
5. 無檔案空狀態明確化（不要用「查看」這種假可點擊文字頂著）。
6. 手機版驗收（沿用既有 `data-label` 轉卡片機制 + Batch 8B 的按鈕堆疊 CSS 範例）。

**不建議放進這批（留給之後，需要使用者先拍板要不要做）**：
7. 行銷總監端新增/編輯 `marketing_resources`（問題 4）——這不是做不做得到的技術問題，是要不要在 v2 複製一份 v1 已經在用的正式功能的決定。

---

## 是否需要 SQL

**不需要。** 三個要補的查詢欄位（`canva_url`/`file_name`/`file_size`）都已經在資料庫裡（v1 `schema_v12`/`v14` 早就建好），只是查詢字串沒帶到；簽名 URL 需要的 Storage bucket 跟 RLS 政策（`marketing-resource-files`）v1 也已經建好且 grant 給 `authenticated`，v2 跟 v1 共用同一個 Supabase project，可以直接呼叫，不需要新表、新欄位或新的 Storage 政策。

---

## 需要你（或行銷總監）拍板的商業規則

1. **`file_path`／`resource_url`／`canva_url` 三者都存在時，開啟的優先順序**（問題 2）——目前建議 `file_path` ＞ `resource_url` ＞ `canva_url`，但這取決於行銷總監實際填寫資料的習慣，建議先問清楚再定案。
2. **`is_external_usable=false` 的資源，業務端要不要能真的下載，還是只能「查看」不能「下載」**（問題 3）——這是這批做完「真正可點擊」之後才會浮現的新風險等級，建議明確拍板，不要延續「反正之前點了也沒用」的預設心態。
3. **v2 要不要做行銷總監端的新增/編輯，還是繼續用 v1 管理 `marketing_resources`**（問題 4）——如果之後拍板要做，會是下一批（可以叫 Batch 9B，比照 Batch 8/8B 的命名），且要先問清楚「之後打算用哪一邊管理」再動工，避免做出來後行銷總監還是習慣性回去用 v1，變成白做。

---

## 建議順序

1. 補齊 `marketing_resources` 查詢欄位（最小、最先做，其他都依賴這步）。
2. 把 `getSignedUrl` 搬進 v2 `core/api.js`（v1 現成程式碼，複製即可，風險最低）。
3. 修正 Batch 8B `resourceLinkCard()` 的 `file_path` href bug（獨立驗證，不依賴後面步驟）。
4. 業務端「文宣 / 資源下載」頁 + 業務首頁「常用資料」操作欄改成可點擊按鈕（依商業規則 1、2 的拍板結果決定行為）。
5. 無檔案空狀態明確化。
6. 手機版驗收（含下載按鈕防雙擊、簽名網址請求期間的 loading 狀態）。
7.（Batch 9B，另外排，待拍板商業規則 3）行銷總監端新增/編輯介面，可直接參考 v1 `app.js` 現成的上傳/編輯/刪除邏輯搬過來，不用重新設計。

---

## 阻塞問題

**技術上無阻塞**——不需要 SQL，`getSignedUrl` 有 v1 現成可直接複製的實作，可以立刻開始。但建議動工前先確認上面三個商業規則，尤其是第 2 點（`is_external_usable=false` 資源要不要能下載）——這批的核心目的就是「讓下載真的能用」，如果做完才發現某些資源不該被下載，會是比「功能沒做完」更麻煩的收尾（已經下載出去的檔案收不回來）。
