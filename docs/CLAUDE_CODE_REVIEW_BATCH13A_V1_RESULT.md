# Claude Code Review｜Batch 13A 實作結果（v1 文件刪除凍結 + 匯入腳本二層旗標）

審查日期：2026-07-17
審查對象：v1（`marketing-platform` / `meisheng-marketing`，同一個 remote）commit `2f32739`「Guard campaign document deletion」
審查方式：兩個本地路徑都 `git pull` 到最新，**直接用 `node` 實際執行兩支腳本**（不是只讀程式碼推論）驗證旗標防護，並啟動本機 preview（port 8776）攔截 `alert`/`api()`/`deleteStorageFile` 驗證 `delDocument()`/`delTask()`/`delBudgetItem()`/`saveDocument()` 的實際行為。

---

## 結論：範圍完全採納草案審查的調整建議，五項驗證全部通過

草案審查當時建議把 `delDocument()` 跟 `delTask()`/`delBudgetItem()` 分開處理（文件已有真實 v2 依賴、任務預算目前沒有），這批的實作範圍精準對應這個建議——只停用文件刪除，任務跟預算刪除完全沒有被動到。

---

## 逐項驗證

### 兩支匯入腳本的旗標防護（實際執行，非讀碼推論）

直接在終端機跑 `node scripts/import-campaign-details.mjs --apply`（不帶第二層旗標）：

```
Refusing destructive re-import. This script DELETEs marketing_campaign_tasks and marketing_campaign_budget_items before rebuilding them. Re-run with --apply --allow-destructive-reimport only after confirming v2 lifecycle data will not be lost.
EXIT CODE: 1
```

`node scripts/seed-exhibition-oct2026.mjs --apply` 同樣測試，結果一致（訊息正確列出這支腳本會動到的三張表：tasks/budget_items/documents）。兩支腳本都在**進入 `main()` 的第一步就擋下**，早於 `signIn()`/任何網路請求，確認不會有「先連上 Supabase 才發現被擋」的情況，也不會有殘留的部分寫入。警告文案清楚列出會被刪除的資料表，符合草案驗收方式第 2 點的要求。

### `delDocument()` 停用

`openDocModal("d1")` 開編輯 modal 後，`#dc-delete`：`disabled: true`、文字「刪除已停用」、`title="刪除已停用，文件生命週期將改由 v2 管理"`、`onclick` 屬性移除。繞過 UI 直接呼叫 `delDocument()`，攔截 `alert`/`api()`/`deleteStorageFile`：只跳 alert（訊息正確說明原因），**`api()` 完全沒被呼叫，`deleteStorageFile()` 也完全沒被呼叫**——符合草案驗收方式第 4 點「不得呼叫 deleteStorageFile('campaign-documents', ...)」的要求，`campaign-documents` bucket 裡的實體檔案不會因為這個按鈕被誤觸而消失。

### `delTask()`/`delBudgetItem()` 確認維持原樣

實測直接呼叫兩個函式（`confirm` 攔截為固定回傳 `true`），確認都還是正常送出真正的 `DELETE`（`DELETE marketing_campaign_tasks?id=eq.t1`、`DELETE marketing_campaign_budget_items?id=eq.b1`）——這是**刻意**的，不是疏漏：草案審查建議這兩個函式現在不動，因為 v2 完全沒有依賴這兩張表的既有功能，太早停用只會讓行銷總監在 Batch 13B 上線前失去唯一的修正入口。這批的 diff 也確認只碰了 `delDocument()`、`index.html` 的 `#dc-delete` 按鈕、兩支腳本、`HANDOFF.md`，沒有動到 `delTask()`/`delBudgetItem()` 所在的程式碼區塊。

### `saveDocument()` 是否仍正常

實測編輯一份文件（改標題），正確送出 `PATCH marketing_campaign_documents?id=eq.d1`，payload 正確；`campaignDetail()` 重新整理也正常觸發後續查詢。新增/上傳流程程式碼沒有被這批改動，維持不變。

---

## 附帶確認

`HANDOFF.md` 的更新內容（文件停用原因、兩支腳本現在需要 `--apply --allow-destructive-reimport` 才能重跑）跟草案審查記錄的風險描述一致，也回頭補充說明了 2026-07-10 那次已經執行過的匯入紀錄現在受到新旗標保護，沒有被誤刪改寫成別的內容。

---

## 下次接手備註

Batch 13A 完全收尾。下一步 Batch 13B（v2 任務/預算/文件管理）動工前，直接沿用 `CLAUDE_CODE_REVIEW_BATCH13A_DRAFT.md` 已經給的三個具體建議：命名分法（tasks/budget_items 用 `cancelled_*`，documents 用 `archived_*`）、`all_expenses_overview` 排除已取消預算項目、文件換檔案是否要延續 Batch 9B「換檔清舊檔」的既有慣例（除非有版本保留的正當理由要刻意不同）。屆時 `delTask()`/`delBudgetItem()` 也應該比照這次 `delDocument()` 的模式停用。
