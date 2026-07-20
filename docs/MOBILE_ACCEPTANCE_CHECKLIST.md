# Mobile Acceptance Checklist

Marketing OS v2 uses mobile-first acceptance. Every new feature must be usable on a phone, not only readable after shrinking the desktop UI.

Last updated: 2026-07-20

## Minimum Standards

1. **No horizontal scrolling at 375px width**
   - Text must not be clipped, hidden, or overlap adjacent content.
   - Dense tables should render as labeled mobile cards.

2. **Touch targets are large enough**
   - Primary buttons, secondary buttons, inline actions, inputs, selects, and modal controls should be at least 44px high where practical.
   - If inline actions are smaller, spacing and grouping must still prevent accidental taps.

3. **Nested actions must be visually separated**
   - If a row/card contains child records with their own edit/cancel actions, each child record needs a visible boundary.
   - Users must be able to tell whether an action affects the parent item or the child item.

4. **Modal forms must be fully operable**
   - Long forms must scroll inside the mobile viewport.
   - Submit and cancel actions must remain reachable.
   - Fields must not be hidden behind fixed or modal chrome.

5. **Empty, loading, and fallback states must remain readable**
   - Mobile layouts must show the full message, not only the table shell or a clipped note.
   - Demo/fallback content must not look like live data when the system has confirmed an empty live result.

6. **Text color must be readable on its actual background**
   - Shared components used on both light and dark backgrounds need context-specific color rules.
   - Login, sidebar, modal, and cards should be checked separately.

7. **Core workflows must be exercised on mobile width**
   - For each new feature, test view, create, edit, cancel, and approval/send actions when applicable.
   - Do not accept a feature after only checking the list screen.

## Suggested Test Method

- Preview locally and test at 375 x 812.
- Capture screenshots for login, the target role page, modal forms, and final state after action.
- When login credentials are not available, test render-specific helpers directly by injecting representative HTML into the page, then inspect mobile layout.
- Verify desktop is not regressed after mobile changes.

## Required Role Coverage

- **Executive:** dashboard summaries, budget tables, approval/decision actions.
- **Marketing director:** campaign/vendor/deliverable management, association records, product knowledge, sales requests.
- **Sales:** resources, product knowledge, tenders, leads, own sales requests.

## Required V2 Page Coverage

### Executive

- **總經理戰情室**
  - 年度預算總表不得橫向爆版。
  - 上下半年行銷案表格在手機應轉成可讀卡片或保持可完整閱讀。
  - 重要性高 / 中 / 低與執行狀態顏色需清楚可判斷急迫性。

- **待決策中心**
  - 無資料時應顯示空狀態，不顯示 demo 決策項。
  - 審核 modal 的核准 / 駁回按鈕可觸達。

- **Channel 成效**
  - Channel 摘要與管理判斷卡片不可重疊。
  - 多指標列應可掃讀，不要求使用者左右滑動才能理解數字。

- **週報摘要**
  - 週報文字區可讀、可捲動。
  - 「複製週報」與「匯出 .txt」按鈕在手機底部可觸達。
  - 首頁週報入口、選單入口、週報內的「進入專案 / 前往待決策」連結都可點擊。

### Marketing Director

- **行銷專案管理列表**
  - 巡檢卡片（到期任務 / 待付款 / 文件 / 風險）可點擊。
  - 巡檢列表只做定位，手機上需有清楚「返回行銷專案」路徑。
  - 專案列表可看出狀態、重要性、預算與下一步。
  - 已封存行銷案清單預設收合，展開後資訊不擠壓。

- **行銷案詳情頁**
  - 返回行銷專案的路徑清楚。
  - 任務、預算、文件、風險、成效各區塊的新增 / 編輯 / 取消 / 封存按鈕歸屬清楚。
  - 已取消 / 已封存清單預設收合，展開後每筆資料有明確邊界。

- **任務 modal**
  - 排序、任務名稱、負責人、狀態、日期、完成度、產出、備註都可操作。
  - 底部儲存 / 取消按鈕不可被裁切。

- **預算 modal**
  - 台幣金額、人民幣金額、匯率、報價狀態、付款狀態、付款日欄位比例正常。
  - 長文字 placeholder 不應撐破欄位。

- **文件 modal**
  - 檔案上傳控制可觸達。
  - 已有檔案、待上傳檔案與版本註記顯示清楚。

- **風險 / 追蹤 modal**
  - 風險負責人可編輯。
  - 追蹤紀錄列表與新增追蹤表單不混淆。
  - 取消 / 封存確認文字完整可讀。

- **成效 modal**
  - Channel、觸及、名單、詢問、有效商機、成交件數與金額欄位在手機上可連續填寫。
  - unique constraint 錯誤訊息若出現，需完整顯示。

- **合作廠商 / 交付物**
  - 交付物卡片需有邊框或分隔，不能和廠商層級按鈕混在一起。
  - 取消交付物與取消廠商合作的按鈕位置不可造成誤觸。
  - 已取消廠商 / 交付物清單預設收合。

- **文宣資源管理**
  - 新增 / 編輯資源表單可捲動。
  - 檔案、外部連結、Canva 連結多按鈕情境可堆疊。
  - 封存確認 modal 的引用數量文案完整顯示。

- **產品知識庫**
  - 詳情 modal 可看完整 detail、建議話術、不建議話術、競品對照。
  - 已連結資源各自成卡片，開啟 / 下載 / 移除連結按鈕不擠壓。

- **公會管理**
  - 公會列表與公會詳情頁不可橫向撐版，公會名稱、狀態、多標籤、負責人與下一步可讀。
  - 公會主檔新增 / 編輯 / 封存 modal 可完整操作，底部按鈕可觸達。
  - 關係標籤新增 / 移除按鈕歸屬清楚，不可和公會主檔操作混淆。
  - 公會任務進行中清單與歷史清單都可讀；任務新增 / 編輯 / 取消 modal 可操作。
  - 公會任務費用進行中清單與歷史清單都可讀；費用新增 / 編輯 / 取消 modal 可操作。
  - 公會活動 / 講座 / 贊助進行中清單與歷史清單都可讀；活動新增 / 編輯 / 取消 modal 可操作。
  - 公會期刊排程進行中清單與歷史清單都可讀；期刊新增 / 編輯 / 取消 modal 可操作。
  - 公會年費 / 會費進行中清單與歷史清單都可讀；年費新增 / 編輯 / 取消 modal 可操作。
  - 公會權益進行中清單與歷史清單都可讀；權益新增 / 編輯 / 封存 modal 可操作。
  - 公會備註 / 附件連結進行中清單與歷史清單都可讀；備註新增 / 編輯 / 取消 modal 可操作。
  - 合併歷史紀錄區塊預設收合，展開後任務、費用、活動、期刊、年費、權益、備註 7 組資料都有明確類型標籤與卡片邊界。
  - 活動與期刊階段下拉在手機上可操作，階段顏色 / 百分比不可被裁切。
  - 附件維持文字連結欄位；長網址或檔名不得撐破 modal。

- **業務需求單**
  - 行銷總監列表可掃讀需求、提出人、優先級、狀態。
  - 已取消需求清單預設收合。

### Sales

- **文宣 / 資源下載**
  - 可下載 / 外部連結 / Canva 連結按鈕可清楚堆疊。
  - 不可下載或已封存資源要明確顯示不可用狀態，不給死連結。

- **招標工具**
  - 標案列表需看得出標題、日期、狀態與轉名單提示。
  - 外部標案連結或來源回查動作不可擠壓。

- **產品知識庫**
  - 業務看不到編輯、連結管理、移除連結等行銷總監操作。
  - 「提出補充需求」按鈕可觸達，表單預填內容可讀。

- **我的名單**
  - 名單卡片需顯示公司、來源 Channel、階段、下次追蹤日。
  - 空狀態不可顯示 demo 假名單。
  - 跟進提醒不可和需求單混淆。

- **業務需求單**
  - 新增需求單表單單欄可填寫。
  - 取消需求流程可操作，且不需要橫向捲動。
  - 只顯示自己的需求與自己的已取消紀錄。

## Blocking Failures

以下任一項出現，手機版驗收不得通過：

- 登入頁品牌文字不可讀。
- 任一核心 modal 底部儲存 / 取消按鈕無法觸達。
- 任一主要列表需要橫向捲動才能完成操作。
- 父項 / 子項的編輯、取消、封存按鈕歸屬不清楚。
- 已連 live 資料時顯示 demo 假資料。
- 私有檔案按鈕是死連結或直接開原始 `file_path`。
- 手機版文字重疊、被裁切，或按鈕文字溢出。
