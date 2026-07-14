const state = {
  role: "executive",
  page: "dashboard",
};

const roleMeta = {
  executive: {
    eyebrow: "EXECUTIVE VIEW",
    primaryAction: "查看待決策",
    nav: [
      ["dashboard", "總經理戰情室"],
      ["budget", "預算 / 補助 / 付款"],
      ["leads", "商機轉換"],
      ["channels", "Channel 成效"],
      ["decisions", "待決策中心"],
    ],
  },
  marketing: {
    eyebrow: "MARKETING DIRECTOR",
    primaryAction: "新增行銷案",
    nav: [
      ["dashboard", "行銷總監工作台"],
      ["campaigns", "行銷專案管理"],
      ["vendors", "合作廠商 / 交付物"],
      ["associations", "公會管理"],
      ["knowledge", "產品知識庫"],
      ["requests", "業務需求單"],
    ],
  },
  sales: {
    eyebrow: "SALES VIEW",
    primaryAction: "提出素材需求",
    nav: [
      ["dashboard", "業務資料中心"],
      ["resources", "文宣 / 資源下載"],
      ["knowledge", "產品知識庫"],
      ["tenders", "招標工具"],
      ["leads", "我的名單"],
      ["requests", "業務需求單"],
    ],
  },
};

const pages = {
  executive: {
    dashboard: {
      title: "總經理戰情室",
      subtitle: "看預算、行銷案、商機、Channel 成效與待決策事項。",
      kpis: [
        ["下半年預算", "420萬", "已核准 260萬，待核准 51萬"],
        ["高重要性專案", "6", "2 件需要總經理決策"],
        ["補助申請", "3", "1 件已核准待核銷"],
        ["名單轉商機率", "24%", "較上期增加 5%"],
      ],
      sections: [
        projectOverviewSection(),
        decisionListSection(),
        channelSummarySection(true),
      ],
    },
    budget: {
      title: "預算 / 補助 / 付款",
      subtitle: "總經理看摘要、風險與待核准項目，細節由行銷總監維護。",
      kpis: [
        ["已使用", "238萬", "下半年預算使用 57%"],
        ["待核准", "51萬", "2 筆重大費用"],
        ["補助待核銷", "1", "公會講座資料補齊中"],
        ["待付款", "73萬", "3 筆廠商或活動費用"],
      ],
      sections: [budgetSection(), subsidySection()],
    },
    leads: {
      title: "商機拓展與轉換率",
      subtitle: "追蹤每個 Channel 產生的名單、跟進狀態與商機轉換。",
      kpis: [
        ["詢問 / 接觸", "186", "來自活動、公會、官網、LINE、標案"],
        ["有效名單", "92", "可分派業務追蹤"],
        ["形成商機", "22", "7 件需主管協助"],
        ["平均轉換", "24%", "公會與標案表現較佳"],
      ],
      sections: [leadFunnelSection(), executiveLeadRiskSection()],
    },
    channels: {
      title: "Channel 成效",
      subtitle: "比較公會、標案、研討會、官網、LINE、Facebook 等來源成效。",
      kpis: [
        ["最佳來源", "公會", "有效名單 31，商機 9"],
        ["標案工具", "33%", "名單轉商機率最高"],
        ["待調整", "Facebook", "觸及高但有效名單低"],
        ["待補資料", "官網", "需補產品線與產業分類"],
      ],
      sections: [channelSummarySection(false), channelDecisionSection()],
    },
    decisions: {
      title: "待決策中心",
      subtitle: "集中處理需要總經理確認的預算、活動、資料風險與跨部門事項。",
      kpis: [
        ["待核准", "2", "裝潢追加、年度贊助"],
        ["待討論", "3", "公會權益、內容使用、預算移轉"],
        ["逾期提醒", "1", "醫院商機需主管協助"],
        ["已處理", "8", "本月已完成決策項"],
      ],
      sections: [decisionListSection(), approvalFlowSection()],
    },
  },
  marketing: {
    dashboard: {
      title: "行銷總監工作台",
      subtitle: "管理行銷案、廠商、素材、預算、補助、名單與業務需求。",
      kpis: [
        ["進行中行銷案", "12", "高重要性 4 件"],
        ["待審素材", "7", "含外包美編初稿"],
        ["預算核銷中", "5", "補助相關 2 件"],
        ["業務需求", "9", "3 件急件"],
      ],
      sections: [marketingWorklistSection(), marketingTodoSection()],
    },
    campaigns: {
      title: "行銷專案管理",
      subtitle: "控管行銷案進度、重要性、預算、任務、成效與關聯資料。",
      kpis: [
        ["上半年專案", "9", "已完成 7 件"],
        ["下半年專案", "12", "進行中 8 件"],
        ["高重要性", "4", "空調展、公會講座、白皮書、招標工具"],
        ["待補資料", "6", "素材、預算或成效未完整"],
      ],
      sections: [projectOverviewSection(), campaignDetailCardsSection()],
    },
    vendors: {
      title: "合作廠商 / 交付物",
      subtitle: "每個專案可管理多個外部單位、交付物、報價、合約、附件與付款狀態。",
      kpis: [
        ["合作單位", "14", "展覽、裝潢、美編、印刷、公會"],
        ["交付物", "32", "5 件待審、2 件逾期"],
        ["待核准報價", "2", "需送總經理決策"],
        ["附件完整度", "78%", "合約與設計稿仍需補齊"],
      ],
      sections: [vendorSection(), vendorFormPreviewSection()],
    },
    associations: {
      title: "公會管理",
      subtitle: "支援入會、未入會、講座協辦、期刊刊登、活動贊助等彈性合作型態。",
      kpis: [
        ["合作公會", "8", "3 個進行中合作"],
        ["本年公會費用", "86萬", "含會費、贊助、期刊、活動"],
        ["產出名單", "74", "可分派業務跟進"],
        ["待確認權益", "4", "會員名錄、曝光、名單權益"],
      ],
      sections: [associationSection(), associationTagsSection()],
    },
    knowledge: {
      title: "產品知識庫",
      subtitle: "管理差異化、技術比較、競品分析、FAQ、證據等級與可對外使用範圍。",
      kpis: [
        ["知識條目", "28", "A/B 等級 17 筆"],
        ["待技術確認", "6", "不可直接對外使用"],
        ["業務常用", "10", "差異化與異議處理最多"],
        ["關聯文宣", "42", "DM、簡報、案例與型錄"],
      ],
      sections: [knowledgeSection(true), knowledgeGovernanceSection()],
    },
    requests: {
      title: "業務需求單",
      subtitle: "把業務的簡報、DM、分析、影片與活動邀請需求轉成可追蹤任務。",
      kpis: [
        ["待處理", "9", "3 件急件"],
        ["製作中", "5", "素材與分析文件"],
        ["待業務確認", "3", "已交付初版"],
        ["本月完成", "14", "平均處理 4.2 天"],
      ],
      sections: [salesRequestSection(true), requestKanbanSection()],
    },
  },
  sales: {
    dashboard: {
      title: "業務資料中心",
      subtitle: "查最新版文宣、產品知識、標案、名單與待回報事項。",
      kpis: [
        ["可下載資料", "86", "最新版 12 份"],
        ["新增名單", "14", "本週新增"],
        ["標案待評估", "8", "可轉商機 2 件"],
        ["待回報跟進", "5", "逾期 1 件"],
      ],
      sections: [salesHomeResourcesSection(), salesTodoSection()],
    },
    resources: {
      title: "文宣 / 資源下載",
      subtitle: "統一下載已核准、可使用的 DM、簡報、產品資料、分析與案例。",
      kpis: [
        ["正式文宣", "46", "可對外使用"],
        ["內部分析", "18", "不可直接轉傳客戶"],
        ["待確認資料", "7", "需行銷或技術確認"],
        ["本月更新", "12", "版本已更新"],
      ],
      sections: [resourceLibrarySection(), resourceUsageRuleSection()],
    },
    knowledge: {
      title: "產品知識庫",
      subtitle: "查差異化、技術比較、競品分析、客戶異議處理與 FAQ。",
      kpis: [
        ["可查條目", "17", "A/B 等級"],
        ["技術比較", "6", "冰水主機相關"],
        ["競品分析", "4", "內部使用"],
        ["常見 FAQ", "7", "依產業情境整理"],
      ],
      sections: [knowledgeSection(false), knowledgeDetailSection()],
    },
    tenders: {
      title: "招標工具",
      subtitle: "查看標案結果、標記狀態，適合追蹤後再轉成名單。",
      kpis: [
        ["監測專案", "5", "冰水主機、節能、醫院、商辦"],
        ["本週新標案", "8", "2 件建議追蹤"],
        ["已轉商機", "6", "回到名單管理追蹤"],
        ["已排除", "14", "不符合產品或區域"],
      ],
      sections: [tenderSection(), tenderRuleSection()],
    },
    leads: {
      title: "我的名單",
      subtitle: "查看分派給自己的名單、來源、跟進狀態與下次追蹤日。",
      kpis: [
        ["我的名單", "22", "進行中 13"],
        ["本週需跟進", "7", "逾期 1"],
        ["主管協助", "2", "醫院與科技廠案件"],
        ["已形成商機", "5", "本月新增"],
      ],
      sections: [salesLeadSection(), leadFollowUpSection()],
    },
    requests: {
      title: "業務需求單",
      subtitle: "向行銷提出簡報、DM、市場分析、競品比較、影片或活動邀請需求。",
      kpis: [
        ["我的需求", "6", "2 件製作中"],
        ["已完成", "8", "可下載成品"],
        ["待補資料", "1", "需補客戶情境"],
        ["平均回覆", "2.5天", "急件優先處理"],
      ],
      sections: [salesRequestSection(false), requestFormPreviewSection()],
    },
  },
};

function projectOverviewSection() {
  return {
    type: "table",
    title: "上下半年行銷專案總覽",
    wide: true,
    headers: ["專案", "重要性", "進度", "預算", "待處理"],
    rows: [
      ["10 月空調展", tag("高", "red"), progress("68%"), "180萬", "裝潢追加報價待核准"],
      ["公會技術講座", tag("高", "red"), progress("52%", "amber"), "45萬", "講師與名單權益確認"],
      ["產品比較白皮書", tag("中", "amber"), progress("35%", "amber"), "18萬", "技術資料與證據來源"],
      ["LINE 客戶培育", tag("中", "green"), progress("74%", "green"), "12萬", "持續追蹤轉換"],
    ],
  };
}

function decisionListSection() {
  return {
    type: "list",
    title: "待決策 / 待討論",
    items: [
      ["空調展裝潢追加 28 萬", "關聯：10 月空調展 / 裝潢公司 / 7 日內需回覆", "核准?", "high"],
      ["公會講座是否提高贊助級距", "可換取名單權益與期刊曝光，需要評估投入效益。", "討論", "medium"],
      ["競品比較資料對外使用範圍", "證據等級 B，建議先限內部使用。", "確認", ""],
    ],
  };
}

function channelSummarySection(wide) {
  return {
    type: "table",
    title: "Channel 成效摘要",
    wide,
    headers: ["Channel", "詢問", "有效名單", "商機", "管理判斷"],
    rows: [
      ["公會", "64", "31", "9", tag("加碼", "green")],
      ["標案工具", "38", "18", "6", tag("持續", "green")],
      ["官網 / LINE", "52", "26", "4", tag("補分類", "amber")],
      ["Facebook", "41", "9", "1", tag("調整", "amber")],
    ],
  };
}

function budgetSection() {
  return {
    type: "table",
    title: "費用狀態",
    headers: ["項目", "類型", "金額", "狀態", "操作"],
    rows: [
      ["展場裝潢追加", "廠商交付物", "28萬", tag("待核准", "red"), "查看"],
      ["公會年度贊助", "公會合作", "23萬", tag("待核准", "red"), "查看"],
      ["期刊廣告設計", "外包美編", "6萬", tag("待付款", "amber"), "摘要"],
      ["講座場地費", "活動費", "12萬", tag("已付款", "green"), "摘要"],
    ],
  };
}

function subsidySection() {
  return {
    type: "list",
    title: "補助申請流程",
    items: [
      ["空調展補助", "已送件，等待主管機關回覆；預估可補助 30 萬。", "送件", "ok"],
      ["公會講座補助", "活動成果與照片已補齊，待核銷文件確認。", "核銷", "medium"],
      ["媒體曝光補助", "待確認是否符合申請資格。", "評估", ""],
    ],
  };
}

function leadFunnelSection() {
  return {
    type: "table",
    title: "名單漏斗",
    headers: ["階段", "數量", "說明"],
    rows: [
      ["詢問 / 接觸", "186", "來自活動、公會、官網、LINE、標案"],
      ["有效名單", "92", "資料完整且可分派業務"],
      ["業務跟進", "61", "已建立跟進紀錄"],
      ["形成商機", "22", "具體需求與時程"],
      ["需主管協助", "7", "需要高階拜訪或資源協調"],
    ],
  };
}

function executiveLeadRiskSection() {
  return {
    type: "list",
    title: "需主管協助商機",
    items: [
      ["南部醫療院所冰水主機汰換", "需要高階拜訪與節能效益說明。", "高", "high"],
      ["科技廠資料中心冷卻案", "業務要求產品比較表與案例支援。", "中", "medium"],
      ["商辦大樓年度節能改善", "來自標案工具，待判斷是否投入。", "評估", ""],
    ],
  };
}

function channelDecisionSection() {
  return {
    type: "cards",
    title: "管理判斷",
    cards: [
      ["應增加資源", "公會活動與標案工具帶來的有效商機比例較高，適合連到業務追蹤。"],
      ["需調整內容", "Facebook 觸及尚可，但 B2B 有效名單低，應轉向技術議題或案例內容。"],
      ["待補資料", "官網詢問來源需要補齊產品線與產業分類，才方便判斷轉換率。"],
      ["下一步", "把商機來源統一回到 leads，避免只看彙總數字。"],
    ],
  };
}

function approvalFlowSection() {
  return {
    type: "cards",
    title: "決策中心來源",
    cards: [
      ["預算核准", "來自行銷專案費用、公會費用與廠商追加報價。"],
      ["素材風險", "來自產品知識庫與文宣資料庫的對外使用審核。"],
      ["商機協助", "來自業務名單追蹤，需要主管支援拜訪或資源。"],
      ["公會合作", "來自公會活動、期刊刊登、贊助與會費評估。"],
    ],
  };
}

function marketingWorklistSection() {
  return {
    type: "table",
    title: "行銷案控管表",
    headers: ["專案", "階段", "預算", "下一步"],
    rows: [
      ["10 月空調展", tag("執行中", "amber"), "180萬 / 已用 96萬", "確認裝潢圖與追加報價"],
      ["公會期刊", tag("稿件中"), "12萬 / 已用 3萬", "美編初稿審核"],
      ["產品比較白皮書", tag("知識審核", "purple"), "18萬 / 已用 0", "補競品資料證據來源"],
      ["招標工具優化", tag("規劃中", "gray"), "待估", "整理關鍵字與轉名單流程"],
    ],
  };
}

function marketingTodoSection() {
  return {
    type: "list",
    title: "今天要處理",
    items: [
      ["核對空調展裝潢報價", "需送總經理核准，關聯廠商：展場裝潢公司。", "急", "high"],
      ["回覆業務：科技廠比較表", "需產品知識庫補資料。", "需求", "medium"],
      ["公會講座邀請名單整理", "活動後轉入商機 / 名單管理。", "名單", ""],
    ],
  };
}

function campaignDetailCardsSection() {
  return {
    type: "cards",
    title: "專案詳情要管理的內容",
    cards: [
      ["任務 / 里程碑", "規劃、執行、素材、活動、成效與結案。"],
      ["合作廠商", "展覽公司、裝潢、美編、印刷、公會與講師。"],
      ["預算 / 補助", "申請、核准、核銷、付款與補助進度。"],
      ["成效 / 名單", "每個活動或 Channel 回到商機名單追蹤。"],
    ],
  };
}

function vendorSection() {
  return {
    type: "table",
    title: "合作廠商與交付物",
    wide: true,
    headers: ["廠商 / 單位", "角色", "交付物", "狀態", "費用", "文件"],
    rows: [
      ["展覽公司 A", "場地與展會規範", "攤位、用電、參展手冊", tag("進行中", "green"), "88萬", "合約、報價單"],
      ["裝潢公司 B", "攤位設計施工", "設計圖、施工、撤場照片", tag("追加待核", "red"), "72萬 + 28萬", "設計稿、追加報價"],
      ["外包美編 C", "主視覺與邀請函", "KV、DM、邀請圖", tag("初稿審核", "amber"), "8萬", "設計稿"],
      ["印刷廠 D", "DM 與展場輸出", "DM 1000 份、背板輸出", tag("待下單", "gray"), "12萬", "印刷報價"],
    ],
  };
}

function vendorFormPreviewSection() {
  return {
    type: "cards",
    title: "新增廠商欄位",
    cards: [
      ["廠商角色", "裝潢 / 美編 / 印刷 / 公會 / 場地。"],
      ["美昇對接人", "行銷總監、助理或專案負責人。"],
      ["報價 / 合約", "待報價、已報價、待核准、已簽約。"],
      ["付款 / 交付", "未請款、待付款、已付款、待審、已完成。"],
    ],
  };
}

function associationSection() {
  return {
    type: "table",
    title: "公會合作紀錄",
    headers: ["項目", "是否需入會", "狀態", "費用", "名單"],
    rows: [
      ["7/31 技術講座協辦", "否", tag("進行中", "green"), "18萬", "預估 40"],
      ["Q4 期刊刊登", "否", tag("稿件中", "amber"), "8萬", "無"],
      ["年度會費評估", "是", tag("待確認", "gray"), "12萬", "會員名錄"],
    ],
  };
}

function associationTagsSection() {
  return {
    type: "cards",
    title: "公會狀態原則",
    cards: [
      ["多標籤", "已入會、未入會、洽談中、講座協辦、期刊合作、活動贊助。"],
      ["可自訂", "避免固定成已入會 / 未入會，符合美昇實際合作型態。"],
      ["可關聯名單", "活動或會員名錄可回到商機 / 名單管理。"],
      ["可關聯費用", "會費、年費、贊助、期刊、活動費分開記錄。"],
    ],
  };
}

function knowledgeSection(isMarketing) {
  return {
    type: "table",
    title: isMarketing ? "產品知識審核" : "常用知識條目",
    headers: ["主題", "類型", "證據", "可用狀態"],
    rows: [
      ["磁浮主機相對傳統離心機差異", "技術比較", tag("A", "green"), "可對外"],
      ["大型商辦節能改善說法", "應用情境", tag("B", "green"), isMarketing ? "內部 / 待審" : "內部"],
      ["常見競品價格異議回覆", "異議處理", tag("B", "amber"), "內部"],
      ["醫療場域可靠度 FAQ", "FAQ", tag("C", "gray"), isMarketing ? "待技術確認" : "不顯示或標記"],
    ],
  };
}

function knowledgeGovernanceSection() {
  return {
    type: "cards",
    title: "證據等級與治理",
    cards: [
      ["A 正式來源", "可對外使用，需關聯 DM、型錄、簡報或正式文件。"],
      ["B 技術確認", "可內部使用，對外需行銷總監確認。"],
      ["C 待確認", "只能內部討論，不給業務預設查詢。"],
      ["D 不可使用", "標記禁止使用，不出現在業務端。"],
    ],
  };
}

function knowledgeDetailSection() {
  return {
    type: "cards",
    title: "條目詳情",
    cards: [
      ["一句話重點", "用生命週期成本、節能與維護風險說明，不用價格促銷話術。"],
      ["建議業務說法", "這類主機適合用整體能耗與長期維護風險評估，而不是只看設備單價。"],
      ["證據來源", "關聯：正式 DM、公司簡報、技術確認紀錄。"],
      ["不建議說法", "未確認的節能比例、未授權案例或未審核競品比較。"],
    ],
  };
}

function salesRequestSection(isMarketing) {
  return {
    type: "table",
    title: isMarketing ? "業務需求列表" : "我的需求單",
    headers: ["需求", "提出人 / 案件", "類型", "優先級", "狀態"],
    rows: [
      ["科技廠競品比較表", "業務 A / 資料中心案", "競爭力分析", tag("急", "red"), tag("製作中", "amber")],
      ["醫院拜訪簡報", "業務 B / 醫療院所", "簡報", tag("高", "red"), tag("待補資料")],
      ["公會講座邀請圖", "業務 C / 公會活動", "社群素材", tag("一般"), tag("已完成", "green")],
    ],
  };
}

function requestKanbanSection() {
  return {
    type: "cards",
    title: "需求處理流程",
    cards: [
      ["新需求", "業務提交用途、客戶情境、預計使用日。"],
      ["行銷評估", "轉為素材任務、知識條目或文宣更新。"],
      ["製作 / 審核", "可關聯外包美編、產品知識與附件。"],
      ["完成通知", "業務從同一頁下載或查看回覆說明。"],
    ],
  };
}

function salesHomeResourcesSection() {
  return {
    type: "table",
    title: "常用資料",
    headers: ["資料", "版本", "適用", "操作"],
    rows: [
      ["工程公司版簡報", "2026.07", "工程公司", "下載"],
      ["磁浮冰水主機 DM", "最新版", "業主 / 技師", "下載"],
      ["節能改善案例包", "待確認", "內部參考", "查看"],
    ],
  };
}

function salesTodoSection() {
  return {
    type: "list",
    title: "我的待辦",
    items: [
      ["醫院汰換案下次追蹤", "7/18 前回報拜訪結果。", "逾期", "high"],
      ["科技廠需求：競品比較表", "已送行銷，等待資料。", "待回覆", "medium"],
      ["公會講座名單", "已分派 6 筆，需標記跟進狀態。", "跟進", "ok"],
    ],
  };
}

function resourceLibrarySection() {
  return {
    type: "table",
    title: "搜尋結果：冰水主機",
    wide: true,
    headers: ["檔案名稱", "類型", "產品線", "適用客群", "狀態", "操作"],
    rows: [
      ["MagBoost Apex 型錄", "DM", "磁浮冰水主機", "業主 / 技師", tag("可對外", "green"), "下載"],
      ["工程公司版公司簡介", "簡報", "公司能力", "工程公司", tag("可對外", "green"), "下載"],
      ["競品比較初稿", "分析", "冰水主機", "內部", tag("內部", "amber"), "查看"],
      ["醫院節能議題包", "文案", "應用場景", "業主", tag("待確認", "gray"), "申請使用"],
    ],
  };
}

function resourceUsageRuleSection() {
  return {
    type: "cards",
    title: "使用規則",
    cards: [
      ["版本清楚", "每份資料顯示版本與更新日期，避免使用過期檔案。"],
      ["範圍清楚", "標示可對外、內部使用、待確認或禁止使用。"],
      ["來源清楚", "正式 DM、簡報、案例與知識條目互相關聯。"],
      ["需求回流", "業務找不到資料時，可直接提出需求單。"],
    ],
  };
}

function tenderSection() {
  return {
    type: "table",
    title: "標案結果",
    headers: ["標案", "截止", "狀態", "操作"],
    rows: [
      ["醫院冰水主機汰換", "8/12", tag("評估中", "amber"), "轉名單"],
      ["商辦節能改善", "8/28", tag("已追蹤", "green"), "跟進"],
      ["校園空調採購", "9/03", tag("排除", "gray"), "查看原因"],
    ],
  };
}

function tenderRuleSection() {
  return {
    type: "cards",
    title: "標案轉名單原則",
    cards: [
      ["先評估", "未讀標案不直接進入名單，避免資料雜訊。"],
      ["再追蹤", "狀態到已追蹤後，才能轉成商機 / 名單。"],
      ["可回查", "名單保留來源標案，方便檢討標案工具成效。"],
      ["業務跟進", "後續追蹤回到我的名單，不在標案頁管理完整流程。"],
    ],
  };
}

function salesLeadSection() {
  return {
    type: "table",
    title: "我的名單",
    headers: ["公司 / 案件", "來源", "狀態", "下次追蹤"],
    rows: [
      ["南部醫療院所", "標案", tag("主管協助", "amber"), "7/18"],
      ["科技廠資料中心", "公會講座", tag("跟進中", "green"), "7/22"],
      ["商辦大樓管委會", "官網", tag("初談"), "7/25"],
    ],
  };
}

function leadFollowUpSection() {
  return {
    type: "cards",
    title: "跟進紀錄需要填什麼",
    cards: [
      ["目前狀態", "初談、需求確認、報價中、主管協助、暫緩、結案。"],
      ["下一步", "下次拜訪、寄送資料、安排技術會議或主管拜訪。"],
      ["需要支援", "可直接轉成業務需求單，請行銷補素材或分析。"],
      ["主管可見", "需要主管協助的商機會進入總經理戰情室摘要。"],
    ],
  };
}

function requestFormPreviewSection() {
  return {
    type: "cards",
    title: "新增需求單欄位",
    cards: [
      ["需求類型", "簡報 / DM / 市場分析 / 競爭力分析 / 影片 / 活動邀請。"],
      ["關聯案件", "可選擇名單、標案、客戶或公會活動。"],
      ["優先級", "急件 / 一般 / 低，需填預計使用日。"],
      ["完成方式", "完成後通知業務下載或查看回覆說明。"],
    ],
  };
}

function tag(label, tone = "") {
  return `<span class="tag ${tone}">${label}</span>`;
}

function progress(label, tone = "") {
  const value = Number.parseInt(label, 10);
  return `${label}<div class="progress-track"><div class="progress-fill ${tone}" style="width:${value}%"></div></div>`;
}

function render() {
  const meta = roleMeta[state.role];
  const page = pages[state.role][state.page];

  document.getElementById("roleEyebrow").textContent = meta.eyebrow;
  document.getElementById("pageTitle").textContent = page.title;
  document.getElementById("pageSubtitle").textContent = page.subtitle;
  document.getElementById("primaryAction").textContent = meta.primaryAction;

  renderNav(meta.nav);
  renderKpis(page.kpis);
  renderSections(page.sections);

  document.querySelectorAll(".role-button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.role === state.role);
  });
}

function renderNav(navItems) {
  const nav = document.getElementById("navList");
  nav.innerHTML = navItems.map(([id, label]) => `
    <button class="nav-button ${id === state.page ? "is-active" : ""}" type="button" data-page="${id}">${label}</button>
  `).join("");

  nav.querySelectorAll(".nav-button").forEach((button) => {
    button.addEventListener("click", () => {
      state.page = button.dataset.page;
      render();
    });
  });
}

function renderKpis(kpis) {
  document.getElementById("kpiGrid").innerHTML = kpis.map(([label, value, note]) => `
    <article class="kpi-card">
      <div class="kpi-label">${label}</div>
      <div class="kpi-value">${value}</div>
      <div class="kpi-note">${note}</div>
    </article>
  `).join("");
}

function renderSections(sections) {
  document.getElementById("contentGrid").innerHTML = sections.map(renderSection).join("");
}

function renderSection(section) {
  const wideClass = section.wide ? " is-wide" : "";

  if (section.type === "table") {
    return `
      <article class="panel${wideClass}">
        <div class="panel-header"><h2>${section.title}</h2></div>
        <div class="panel-body">
          <table class="table">
            <thead><tr>${section.headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead>
            <tbody>
              ${section.rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}
            </tbody>
          </table>
        </div>
      </article>
    `;
  }

  if (section.type === "list") {
    return `
      <article class="panel${wideClass}">
        <div class="panel-header"><h2>${section.title}</h2></div>
        <div class="panel-body list">
          ${section.items.map(([title, body, status, priority]) => `
            <div class="list-item priority-${priority}">
              <div>
                <strong>${title}</strong>
                <span>${body}</span>
              </div>
              ${tag(status, priority === "high" ? "red" : priority === "medium" ? "amber" : priority === "ok" ? "green" : "")}
            </div>
          `).join("")}
        </div>
      </article>
    `;
  }

  if (section.type === "cards") {
    return `
      <article class="panel${wideClass}">
        <div class="panel-header"><h2>${section.title}</h2></div>
        <div class="panel-body mini-grid">
          ${section.cards.map(([title, body]) => `
            <div class="mini-card">
              <h3>${title}</h3>
              <p>${body}</p>
            </div>
          `).join("")}
        </div>
      </article>
    `;
  }

  return `<article class="panel${wideClass}"><div class="panel-body empty-note">尚未定義內容。</div></article>`;
}

document.querySelectorAll(".role-button").forEach((button) => {
  button.addEventListener("click", () => {
    state.role = button.dataset.role;
    state.page = "dashboard";
    render();
  });
});

render();
