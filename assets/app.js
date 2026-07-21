const state = {
  role: "executive",
  page: "dashboard",
  auth: {
    email: "",
    displayName: "",
    role: "",
    canSwitchRoles: false,
  },
  data: {
    campaigns: [],
    archivedCampaigns: [],
    resources: [],
    tenders: [],
    leads: [],
    associations: [],
    archivedAssociations: [],
    associationTags: [],
    associationCooperations: [],
    associationStages: [],
    associationTasks: [],
    cancelledAssociationTasks: [],
    associationTaskExpenses: [],
    cancelledAssociationTaskExpenses: [],
    associationEvents: [],
    cancelledAssociationEvents: [],
    associationPublications: [],
    cancelledAssociationPublications: [],
    associationFees: [],
    cancelledAssociationFees: [],
    associationBenefits: [],
    archivedAssociationBenefits: [],
    associationNotes: [],
    cancelledAssociationNotes: [],
    campaignVendors: [],
    cancelledCampaignVendors: [],
    cancelledDeliverables: [],
    campaignTasks: [],
    cancelledCampaignTasks: [],
    campaignBudgetItems: [],
    cancelledCampaignBudgetItems: [],
    campaignDocuments: [],
    archivedCampaignDocuments: [],
    campaignRisks: [],
    archivedCampaignRisks: [],
    campaignRiskUpdates: [],
    cancelledCampaignRiskUpdates: [],
    campaignPerformance: [],
    vendors: [],
    vendorDocuments: [],
    salesRequests: [],
    cancelledSalesRequests: [],
    approvalRequests: [],
    knowledgeItems: [],
    knowledgeResourceLinks: [],
    expenses: [],
  },
  dataStatus: "loading",
  campaignDetailId: "",
  campaignInspectionMode: "",
  associationDetailId: "",
  knowledgeArchiveAvailable: false,
};

let modalSubmitHandler = null;
let modalSubmitting = false;
let modalPendingClose = false;
let modalSessionId = 0;
const RESOURCE_FILE_MAX_BYTES = 200 * 1024 * 1024;
const CAMPAIGN_DOCUMENT_FILE_MAX_BYTES = 20 * 1024 * 1024;

const roleAliases = {
  executive: "executive",
  general_manager: "executive",
  gm: "executive",
  總經理: "executive",
  marketing: "marketing",
  marketing_director: "marketing",
  director: "marketing",
  admin: "marketing",
  行銷總監: "marketing",
  sales: "sales",
  salesperson: "sales",
  business: "sales",
  member: "sales",
  業務: "sales",
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
      ["weekly", "週報摘要"],
    ],
  },
  marketing: {
    eyebrow: "MARKETING DIRECTOR",
    primaryAction: "新增行銷案",
    nav: [
      ["dashboard", "行銷總監工作台"],
      ["campaigns", "行銷專案管理"],
      ["budget", "預算 / 補助 / 付款"],
      ["channels", "Channel 成效"],
      ["tenders", "招標工具管理"],
      ["vendors", "合作廠商 / 交付物"],
      ["associations", "公會管理"],
      ["knowledge", "產品知識庫"],
      ["requests", "業務需求單"],
      ["weekly", "週報摘要"],
    ],
  },
  sales: {
    eyebrow: "SALES VIEW",
    primaryAction: "提出素材需求",
    nav: [
      ["dashboard", "業務資料中心"],
      ["resources", "文宣 / 資源下載"],
      ["knowledge", "產品知識庫"],
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
        campaignSummarySection(),
        projectOverviewSection(),
        archivedCampaignsSection(),
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
    weekly: {
      title: "週報摘要",
      subtitle: "自動彙整本週行銷案、風險、預算、成效與下週優先事項，可直接複製或匯出。",
      kpis: [
        ["週期", "本週", "週一到今天"],
        ["異動行銷案", "0", "本週有資料異動"],
        ["待處理", "0", "風險、付款與決策"],
        ["可匯出", "TXT", "可貼到 LINE 或週報"],
      ],
      sections: [],
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
      sections: [campaignSummarySection(), marketingWorklistSection(), marketingTodoSection()],
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
      sections: [campaignInspectionCardsSection(), projectOverviewSection(), archivedCampaignsSection()],
    },
    budget: {
      title: "預算 / 補助 / 付款",
      subtitle: "行銷總監維護預算申請、核銷、補助與付款細節，總經理看摘要與待核准。",
      kpis: [
        ["預算項目", "18", "行銷案與公會費用"],
        ["待送核准", "4", "含廠商追加與活動贊助"],
        ["核銷中", "5", "補助相關 2 件"],
        ["待付款", "73萬", "3 筆廠商或活動費用"],
      ],
      sections: [budgetSection(), subsidySection()],
    },
    channels: {
      title: "Channel 成效",
      subtitle: "行銷總監追蹤各通路的詢問、名單、商機與轉換率，調整資源配置。",
      kpis: [
        ["最佳來源", "公會", "有效名單 31，商機 9"],
        ["標案工具", "33%", "名單轉商機率最高"],
        ["待調整", "Facebook", "觸及高但有效名單低"],
        ["待補資料", "官網", "需補產品線與產業分類"],
      ],
      sections: [channelSummarySection(false), channelDecisionSection()],
    },
    tenders: {
      title: "招標工具管理",
      subtitle: "管理監測專案、關鍵字、掃描規則與排除條件，業務端使用結果找案。",
      kpis: [
        ["監測專案", "5", "冰水主機、節能、醫院、商辦"],
        ["啟用關鍵字", "18", "依產品與應用場景維護"],
        ["本週新標案", "8", "2 件建議追蹤"],
        ["已轉商機", "6", "回到名單管理追蹤"],
      ],
      sections: [tenderSection(), tenderAdminSection()],
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
      sections: [knowledgeSection(true), marketingResourceManagerSection(), archivedMarketingResourcesSection(), knowledgeGovernanceSection()],
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
    weekly: {
      title: "週報摘要",
      subtitle: "自動整理本週行銷案進度、預算付款、風險追蹤、成效與下週優先事項。",
      kpis: [
        ["週期", "本週", "週一到今天"],
        ["異動行銷案", "0", "本週有資料異動"],
        ["待處理", "0", "風險、付款與決策"],
        ["可匯出", "TXT", "可貼到 LINE 或週報"],
      ],
      sections: [],
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
      sections: [resourceLibrarySection()],
    },
    knowledge: {
      title: "產品知識庫",
      subtitle: "產品知識與文宣資源並行查詢；知識看說法，文宣直接下載或開啟。",
      kpis: [
        ["可查條目", "17", "A/B 等級"],
        ["技術比較", "6", "冰水主機相關"],
        ["競品分析", "4", "內部使用"],
        ["常見 FAQ", "7", "依產業情境整理"],
      ],
      sections: [knowledgeSection(false), salesKnowledgeResourcesSection()],
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
  const marketingActions = state.role === "marketing" && state.page === "campaigns";
  if (state.data.campaigns.length) {
    return {
      type: "table",
      title: "專案管理排序",
      wide: true,
      headers: marketingActions
        ? ["專案", "重要性", "執行狀態", "進度", "預算", "待處理", "操作"]
        : ["專案", "重要性", "執行狀態", "進度", "預算", "待處理"],
      rows: sortedCampaignsForExecutive(state.data.campaigns).slice(0, 10).map((campaign) => formatCampaignRow(campaign, marketingActions)),
    };
  }

  if (state.dataStatus === "live") {
    return {
      type: "table",
      title: "專案管理排序",
      wide: true,
      headers: ["狀態", "說明", "下一步"],
      rows: [[tag("尚無進行中", "green"), "目前沒有未封存的行銷案。", "已封存行銷案可在下方歷史清單查看。"]],
    };
  }

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

function archivedCampaignsSection() {
  const rows = state.data.archivedCampaigns.slice(0, 20).map((campaign) => [
    campaign.name || "未命名專案",
    tag(campaign.status || "未填", campaignStatusTone(campaign.status)),
    campaign.priority ? tag(campaign.priority, campaignPriorityTone(campaign.priority)) : "未填",
    formatMoney(campaign.budget),
    campaignDateRange(campaign),
    archiveCampaignMeta(campaign),
  ]);

  return {
    type: "details-table",
    title: `已封存行銷案（${rows.length}）`,
    summary: "只讀顯示；v1 暫時仍會看見封存行銷案，待 v2 正式接手行銷案後再處理。",
    wide: true,
    headers: ["專案", "狀態", "重要性", "預算", "期間", "封存資訊"],
    rows: rows.length ? rows : [[tag("無封存", "green"), "目前沒有已封存行銷案。", "無", "無", "無", "無"]],
  };
}

function campaignInspectionCardsSection() {
  const upcomingTasks = upcomingCampaignTasks();
  const pendingPayments = pendingCampaignPayments();
  const activeDocuments = state.data.campaignDocuments.length;

  return {
    type: "cards",
    title: "跨專案巡檢",
    wide: true,
    cards: [
      [
        "即將到期任務",
        `${upcomingTasks.length} 件需確認<br>${actionGroup([actionButton("查看任務", "view-campaign-inspection", "tasks", "is-primary", !upcomingTasks.length)])}`,
      ],
      [
        "待付款預算",
        `${pendingPayments.length} 筆未結清<br>${actionGroup([actionButton("查看付款", "view-campaign-inspection", "payments", "is-primary", !pendingPayments.length)])}`,
      ],
      [
        "專案文件",
        `${activeDocuments} 份已建檔<br>${actionGroup([actionButton("查看文件", "view-campaign-inspection", "documents", "is-primary", !activeDocuments)])}`,
      ],
      [
        "管理方式",
        "巡檢清單只做快速定位；實際新增、編輯、取消都回到單一專案詳情頁處理。",
      ],
    ],
  };
}

function campaignInspectionSections() {
  const mode = state.campaignInspectionMode;
  const titleMap = {
    tasks: "即將到期任務",
    payments: "待付款預算",
    documents: "專案文件巡檢",
    "risks-high": "高風險未解決",
    "risks-overdue": "逾期未追蹤",
    "risks-weekly": "本週新增追蹤",
    "risks-executive": "待總經理確認",
  };
  return [
    {
      type: "cards",
      title: titleMap[mode] || "跨專案巡檢",
      wide: true,
      cards: [["返回行銷專案管理", actionGroup([actionButton("返回行銷專案", "back-campaign-list", "", "is-primary")])]],
    },
    mode === "payments"
      ? paymentInspectionSection()
      : mode === "documents"
        ? documentInspectionSection()
        : mode === "risks-high" || mode === "risks-overdue" || mode === "risks-weekly" || mode === "risks-executive"
          ? riskInspectionSection(mode)
          : taskInspectionSection(),
  ];
}

function taskInspectionSection() {
  const rows = upcomingCampaignTasks().map((task) => [
    campaignName(task.campaign_id),
    task.task_name || "未命名任務",
    formatDate(task.planned_end) || "未填",
    tag(task.status || "未開始", statusTone(task.status || "未開始")),
    task.owner || "未填",
    actionGroup([actionButton("進入專案", "view-campaign-detail", task.campaign_id, "is-primary")]),
  ]);

  return {
    type: "table",
    title: "即將到期 / 已逾期任務",
    wide: true,
    headers: ["專案", "任務", "到期日", "狀態", "負責人", "操作"],
    rows: rows.length ? rows : [["目前無到期任務", "無", "無", tag("正常", "green"), "無", "無"]],
  };
}

function paymentInspectionSection() {
  const rows = pendingCampaignPayments().map((item) => [
    campaignName(item.campaign_id),
    item.item_name || "未命名費用",
    budgetAmountText(item),
    tag(item.payment_status || "未請款", statusTone(item.payment_status || "未請款")),
    formatDate(item.payment_date) || "未填",
    actionGroup([actionButton("進入專案", "view-campaign-detail", item.campaign_id, "is-primary")]),
  ]);

  return {
    type: "table",
    title: "待付款 / 未請款預算項目",
    wide: true,
    headers: ["專案", "費用項目", "金額", "付款狀態", "付款日", "操作"],
    rows: rows.length ? rows : [["目前無待付款項目", "無", "無", tag("正常", "green"), "無", "無"]],
  };
}

function documentInspectionSection() {
  const rows = state.data.campaignDocuments.slice(0, 80).map((document) => [
    campaignName(document.campaign_id),
    document.title || document.file_name || "未命名文件",
    document.doc_type || "其他",
    document.version_note || "未填",
    formatDate(document.uploaded_at) || "未填",
    actionGroup([
      actionButton("進入專案", "view-campaign-detail", document.campaign_id, "is-primary"),
      document.file_path ? actionButton("開啟", "open-campaign-document", document.id) : disabledInlineAction("無檔案"),
    ]),
  ]);

  return {
    type: "table",
    title: "專案文件巡檢",
    wide: true,
    headers: ["專案", "文件", "類型", "版本", "上傳日", "操作"],
    rows: rows.length ? rows : [["目前無文件", "無", "無", "無", "無", "無"]],
  };
}

function riskInspectionSection(mode = "") {
  const riskRows = {
    "risks-high": highOpenRisks(),
    "risks-overdue": overdueRisks(),
    "risks-executive": executiveConfirmRisks(),
  };
  const updateRows = mode === "risks-weekly" ? weeklyRiskUpdates() : [];

  if (mode === "risks-weekly") {
    const rows = updateRows.map((update) => {
      const risk = findCampaignRisk(update.risk_id);
      return [
        campaignName(risk?.campaign_id),
        risk?.title || "未關聯事項",
        formatDate(update.update_date) || "未填",
        update.update_note || "未填內容",
        update.is_important ? tag("重要", "amber") : tag("一般", "gray"),
        risk?.campaign_id ? actionButton("進入專案", "view-campaign-detail", risk.campaign_id, "is-primary") : "無",
      ];
    });

    return {
      type: "table",
      title: "本週新增追蹤",
      wide: true,
      headers: ["專案", "事項", "更新日", "內容", "標記", "操作"],
      rows: rows.length ? rows : [["本週沒有新增追蹤", "無", "無", "無", tag("正常", "green"), "無"]],
    };
  }

  const rows = (riskRows[mode] || []).map((risk) => [
    campaignName(risk.campaign_id),
    risk.title || "未命名事項",
    tag(risk.impact_level || "中", riskImpactTone(risk.impact_level || "中")),
    tag(isRiskOverdue(risk) ? "逾期" : risk.status || "待處理", isRiskOverdue(risk) ? "red" : riskStatusTone(risk.status || "待處理")),
    formatDate(riskNextFollowupDate(risk)) || "未設定",
    risk.owner || "未填",
    actionButton("進入專案", "view-campaign-detail", risk.campaign_id, "is-primary"),
  ]);

  return {
    type: "table",
    title: mode === "risks-high" ? "高風險未解決" : mode === "risks-overdue" ? "逾期未追蹤" : "待總經理確認",
    wide: true,
    headers: ["專案", "事項", "影響", "狀態", "期限 / 追蹤", "負責人", "操作"],
    rows: rows.length ? rows : [["目前無符合項目", "無", tag("正常", "green"), tag("無待辦", "green"), "無", "無", "無"]],
  };
}

function campaignDetailSections() {
  const campaign = findCampaign(state.campaignDetailId);
  if (!campaign) {
    state.campaignDetailId = "";
    return [campaignInspectionCardsSection(), projectOverviewSection(), archivedCampaignsSection()];
  }

  return [
    campaignDetailHeaderSection(campaign),
    campaignDetailActionCardsSection(campaign),
    campaignTasksSection(campaign),
    cancelledCampaignTasksSection(campaign),
    campaignBudgetItemsSection(campaign),
    cancelledCampaignBudgetItemsSection(campaign),
    campaignDocumentsSection(campaign),
    archivedCampaignDocumentsSection(campaign),
    campaignRisksSection(campaign),
    campaignRiskUpdatesSection(campaign),
    cancelledCampaignRiskUpdatesSection(campaign),
    archivedCampaignRisksSection(campaign),
    campaignPerformanceSection(campaign),
  ];
}

function campaignDetailHeaderSection(campaign = {}) {
  return {
    type: "cards",
    title: `專案詳情：${campaign.name || "未命名行銷案"}`,
    wide: true,
    cards: [
      ["返回", actionGroup([actionButton("返回行銷專案", "back-campaign-list", "", "is-primary")])],
      ["執行狀態", `${tag(campaign.status || "未填", campaignStatusTone(campaign.status))} ${tag(campaign.priority || "中", campaignPriorityTone(campaign.priority || "中"))}`],
      ["期間", campaignDateRange(campaign)],
      ["預算", `${formatMoney(campaign.budget)} / 實支 ${formatMoney(campaign.actual_spend)}`],
    ],
  };
}

function campaignDetailActionCardsSection(campaign = {}) {
  return {
    type: "cards",
    title: "新增專案子項目",
    wide: true,
    cards: [
      ["新增任務", actionGroup([actionButton("新增任務", "create-campaign-task", campaign.id, "is-primary")])],
      ["新增預算項目", actionGroup([actionButton("新增預算", "create-campaign-budget-item", campaign.id, "is-primary")])],
      ["新增文件版本", actionGroup([actionButton("新增文件", "create-campaign-document", campaign.id, "is-primary")])],
      ["新增風險 / 待決事項", actionGroup([actionButton("新增風險", "create-campaign-risk", campaign.id, "is-primary")])],
      ["新增 / 編輯成效", actionGroup([actionButton(performanceForCampaign(campaign.id) ? "編輯成效" : "新增成效", "edit-campaign-performance", campaign.id, "is-primary")])],
      ["資料原則", "取消或封存只會從進行中清單移除，歷史紀錄保留在下方收合區塊。"],
    ],
  };
}

function campaignTasksSection(campaign = {}) {
  const tasks = campaignTasksFor(campaign.id);
  const rows = tasks.map((task) => [
    task.seq ?? "未填",
    task.task_name || "未命名任務",
    task.owner || "未填",
    `${formatDate(task.planned_start) || "未填"} - ${formatDate(task.planned_end) || "未填"}`,
    tag(task.status || "未開始", statusTone(task.status || "未開始")),
    `${Number(task.completion_pct || 0)}%`,
    actionGroup([
      actionButton("編輯", "edit-campaign-task", task.id, "is-primary"),
      actionButton("取消", "cancel-campaign-task", task.id, "is-danger"),
    ]),
  ]);

  return {
    type: "table",
    title: "任務 / 里程碑",
    wide: true,
    headers: ["排序", "任務", "負責人", "期間", "狀態", "完成度", "操作"],
    rows: rows.length ? rows : [["無", "尚未建立任務", "無", "無", tag("未開始", "gray"), "0%", actionButton("新增任務", "create-campaign-task", campaign.id, "is-primary")]],
  };
}

function cancelledCampaignTasksSection(campaign = {}) {
  const rows = state.data.cancelledCampaignTasks
    .filter((task) => String(task.campaign_id || "") === String(campaign.id || ""))
    .map((task) => [
      task.task_name || "未命名任務",
      tag(task.status || "已取消", "gray"),
      cancellationMeta(task),
      task.cancel_reason || "未填寫原因",
    ]);

  return {
    type: "details-table",
    title: `已取消任務（${rows.length}）`,
    summary: "只讀保留，Phase 1 不做復原。",
    wide: true,
    headers: ["任務", "狀態", "取消資訊", "原因"],
    rows: rows.length ? rows : [["目前沒有已取消任務", tag("無紀錄", "green"), "無", "無"]],
  };
}

function campaignBudgetItemsSection(campaign = {}) {
  const items = campaignBudgetItemsFor(campaign.id);
  const rows = items.map((item) => [
    item.seq ?? "未填",
    item.item_name || "未命名費用",
    item.budget_nature || "未分類",
    budgetAmountText(item),
    tag(item.quote_status || "待報價", statusTone(item.quote_status || "待報價")),
    tag(item.payment_status || "未請款", statusTone(item.payment_status || "未請款")),
    actionGroup([
      actionButton("編輯", "edit-campaign-budget-item", item.id, "is-primary"),
      actionButton("取消", "cancel-campaign-budget-item", item.id, "is-danger"),
    ]),
  ]);

  return {
    type: "table",
    title: "預算 / 補助 / 付款項目",
    wide: true,
    headers: ["排序", "項目", "性質", "金額", "報價", "付款", "操作"],
    rows: rows.length ? rows : [["無", "尚未建立預算項目", "無", "無", tag("未開始", "gray"), tag("未請款", "gray"), actionButton("新增預算", "create-campaign-budget-item", campaign.id, "is-primary")]],
  };
}

function cancelledCampaignBudgetItemsSection(campaign = {}) {
  const rows = state.data.cancelledCampaignBudgetItems
    .filter((item) => String(item.campaign_id || "") === String(campaign.id || ""))
    .map((item) => [
      item.item_name || "未命名費用",
      budgetAmountText(item),
      cancellationMeta(item),
      item.cancel_reason || "未填寫原因",
    ]);

  return {
    type: "details-table",
    title: `已取消預算項目（${rows.length}）`,
    summary: "已取消項目不納入總支出彙總。",
    wide: true,
    headers: ["項目", "金額", "取消資訊", "原因"],
    rows: rows.length ? rows : [["目前沒有已取消預算項目", "無", "無", "無"]],
  };
}

function campaignDocumentsSection(campaign = {}) {
  const documents = campaignDocumentsFor(campaign.id);
  const rows = documents.map((document) => [
    document.doc_type || "其他",
    document.title || document.file_name || "未命名文件",
    document.version_note || "未填",
    document.file_name || "未上傳檔案",
    formatDate(document.uploaded_at) || "未填",
    actionGroup([
      document.file_path ? actionButton("開啟", "open-campaign-document", document.id, "is-primary") : disabledInlineAction("無檔案"),
      actionButton("編輯", "edit-campaign-document", document.id, "is-primary"),
      actionButton("封存", "archive-campaign-document", document.id, "is-danger"),
    ]),
  ]);

  return {
    type: "table",
    title: "文件 / 版本",
    wide: true,
    headers: ["類型", "標題", "版本", "檔案", "上傳日", "操作"],
    rows: rows.length ? rows : [["無", "尚未建立文件", "無", "無", "無", actionButton("新增文件", "create-campaign-document", campaign.id, "is-primary")]],
  };
}

function archivedCampaignDocumentsSection(campaign = {}) {
  const rows = state.data.archivedCampaignDocuments
    .filter((document) => String(document.campaign_id || "") === String(campaign.id || ""))
    .map((document) => [
      document.title || document.file_name || "未命名文件",
      document.doc_type || "其他",
      archiveDocumentMeta(document),
      document.archive_reason || "未填寫原因",
    ]);

  return {
    type: "details-table",
    title: `已封存文件（${rows.length}）`,
    summary: "只讀保留，Phase 1 不做復原。",
    wide: true,
    headers: ["文件", "類型", "封存資訊", "原因"],
    rows: rows.length ? rows : [["目前沒有已封存文件", "無", "無", "無"]],
  };
}

function campaignRisksSection(campaign = {}) {
  const risks = campaignRisksFor(campaign.id);
  const rows = risks.map((risk) => {
    const latest = latestRiskUpdate(risk.id);
    return [
      risk.risk_type || "其他",
      risk.title || "未命名事項",
      tag(risk.impact_level || "中", riskImpactTone(risk.impact_level || "中")),
      risk.owner || "未填",
      formatDate(risk.due_date) || "未填",
      tag(risk.status || "待處理", riskStatusTone(risk.status || "待處理")),
      risk.show_on_dashboard ? tag("戰情室", "amber") : tag("專案內", "gray"),
      latestRiskUpdateText(latest),
      riskUpdateTimelineText(risk.id),
      actionGroup([
        actionButton("編輯", "edit-campaign-risk", risk.id, "is-primary"),
        actionButton("追蹤", "create-risk-update", risk.id, "is-primary"),
        actionButton("封存", "archive-campaign-risk", risk.id, "is-danger"),
      ]),
    ];
  });

  return {
    type: "table",
    title: "風險 / 待決事項",
    wide: true,
    headers: ["類型", "事項", "影響", "負責人", "到期日", "狀態", "顯示", "最新追蹤", "追蹤脈絡", "操作"],
    rows: rows.length ? rows : [["無", "尚未建立風險 / 待決事項", tag("正常", "green"), "無", "無", tag("無", "green"), "無", "無", "無", actionButton("新增風險", "create-campaign-risk", campaign.id, "is-primary")]],
  };
}

function archivedCampaignRisksSection(campaign = {}) {
  const rows = state.data.archivedCampaignRisks
    .filter((risk) => String(risk.campaign_id || "") === String(campaign.id || ""))
    .map((risk) => [
      risk.title || "未命名事項",
      risk.risk_type || "其他",
      tag(risk.impact_level || "中", riskImpactTone(risk.impact_level || "中")),
      archiveRiskMeta(risk),
      risk.archive_reason || "未填寫原因",
    ]);

  return {
    type: "details-table",
    title: `已封存風險 / 待決事項（${rows.length}）`,
    summary: "只讀保留，封存後不進入戰情室與逾期追蹤。",
    wide: true,
    headers: ["事項", "類型", "影響", "封存資訊", "原因"],
    rows: rows.length ? rows : [["目前沒有已封存風險", "無", tag("無紀錄", "green"), "無", "無"]],
  };
}

function campaignRiskUpdatesSection(campaign = {}) {
  const rows = campaignRiskUpdatesForCampaign(campaign.id).map((update) => {
    const risk = findCampaignRisk(update.risk_id);
    return [
      risk?.title || "未關聯事項",
      formatDate(update.update_date) || "未填",
      update.update_note || "未填內容",
      formatDate(update.next_followup_date) || "未設定",
      update.is_important ? tag("重要", "amber") : tag("一般", "gray"),
      update.updated_by || "未填",
      actionGroup([
        actionButton("編輯", "edit-risk-update", update.id, "is-primary"),
        actionButton("取消", "cancel-risk-update", update.id, "is-danger"),
      ]),
    ];
  });

  return {
    type: "details-table",
    title: `風險追蹤紀錄（${rows.length}）`,
    summary: "依重要性與更新日期排序，預設收合。",
    wide: true,
    headers: ["事項", "更新日", "內容", "下次追蹤", "標記", "更新人", "操作"],
    rows: rows.length ? rows : [["目前沒有追蹤紀錄", "無", "無", "無", tag("無紀錄", "green"), "無", "無"]],
  };
}

function cancelledCampaignRiskUpdatesSection(campaign = {}) {
  const rows = cancelledCampaignRiskUpdatesForCampaign(campaign.id).map((update) => {
    const risk = findCampaignRisk(update.risk_id);
    return [
      risk?.title || "未關聯事項",
      formatDate(update.update_date) || "未填",
      update.update_note || "未填內容",
      cancellationMeta(update),
      update.cancel_reason || "未填寫原因",
    ];
  });

  return {
    type: "details-table",
    title: `已取消風險追蹤（${rows.length}）`,
    summary: "只讀保留，Phase 1 不做復原。",
    wide: true,
    headers: ["事項", "更新日", "內容", "取消資訊", "原因"],
    rows: rows.length ? rows : [["目前沒有已取消追蹤", "無", "無", tag("無紀錄", "green"), "無"]],
  };
}

function campaignPerformanceSection(campaign = {}) {
  const performance = performanceForCampaign(campaign.id);
  if (!performance) {
    return {
      type: "table",
      title: "成效資料",
      wide: true,
      headers: ["狀態", "說明", "操作"],
      rows: [[
        tag("尚未填寫", "amber"),
        "此行銷案尚未建立成效資料，可先填主要 Channel、觸及、名單、有效商機與成交金額。",
        actionButton("新增成效", "edit-campaign-performance", campaign.id, "is-primary"),
      ]],
    };
  }

  const spend = campaignPerformanceSpend(campaign);
  const rows = [
    ["主要 Channel", performance.channel || "未填", "行銷案主要歸因來源", actionButton("編輯成效", "edit-campaign-performance", campaign.id, "is-primary")],
    ["觸及 / 名單", `${formatCount(performance.reach_count)} / ${formatCount(performance.lead_count)}`, `名單轉換率 ${ratioText(performance.lead_count, performance.reach_count)}`, "無"],
    ["詢問 / 有效商機", `${formatCount(performance.inquiry_count)} / ${formatCount(performance.qualified_lead_count)}`, `詢問率 ${ratioText(performance.inquiry_count, performance.reach_count)}，有效名單率 ${ratioText(performance.qualified_lead_count, performance.lead_count)}`, "無"],
    ["成交", `${formatCount(performance.deal_count)} 件 / ${formatCurrencyFull(performance.deal_amount)}`, `成交率 ${ratioText(performance.deal_count, performance.qualified_lead_count)}`, "無"],
    ["成本效率", `名單成本 ${costPerText(spend, performance.lead_count)}`, `有效商機成本 ${costPerText(spend, performance.qualified_lead_count)}`, "無"],
    ["預估商機金額", formatCurrencyFull(performance.estimated_opportunity_amount), "用於總經理判斷後續業務投入價值", "無"],
    ["備註", escapeHtml(performance.notes || "未填"), `最後更新 ${formatDate(performance.updated_at) || formatDate(performance.created_at) || "未記錄"}`, "無"],
  ];

  return {
    type: "table",
    title: "成效資料",
    wide: true,
    headers: ["項目", "數值", "判讀", "操作"],
    rows,
  };
}

function weeklySummaryEntrySection() {
  const summary = weeklySummaryData();
  return {
    type: "cards",
    title: "週報摘要",
    wide: true,
    cards: [
      ["本週期間", `${summary.start} ~ ${summary.end}`],
      ["異動行銷案", `${summary.changedCampaigns.length} 件有資料異動。`],
      ["下週優先", `${summary.nextPriorities.length} 件需要先確認。`],
      ["產出週報", actionButton("查看週報摘要", "view-weekly-summary", "", "is-primary")],
    ],
  };
}

function weeklySummarySections() {
  const summary = weeklySummaryData();
  return [
    weeklyOverviewSection(summary),
    weeklyReportSection(summary),
    weeklyCampaignProgressSection(summary),
    weeklyRiskDecisionSection(summary),
    weeklyBudgetPaymentSection(summary),
    weeklyPerformanceChannelSection(summary),
    weeklyNextPrioritySection(summary),
  ];
}

function weeklyOverviewSection(summary = weeklySummaryData()) {
  return {
    type: "cards",
    title: `本週總覽：${summary.start} ~ ${summary.end}`,
    wide: true,
    cards: [
      ["行銷案異動", `${summary.changedCampaigns.length} 件行銷案本週有任務、預算、文件、風險或成效異動。`],
      ["任務", `新增 ${summary.newTasks.length} 件，完成 ${summary.completedTasks.length} 件，取消 ${summary.cancelledTasks.length} 件。`],
      ["風險追蹤", `本週新增 ${summary.weeklyRiskUpdates.length} 筆追蹤，高風險未解決 ${summary.highRisks.length} 件。`],
      ["預算付款", `待付款 ${summary.pendingPayments.length} 筆，估計金額 ${formatCurrencyFull(summary.pendingPaymentTotal)}。`],
      ["成效資料", `本週更新 ${summary.weeklyPerformance.length} 筆，最佳 Channel：${summary.bestChannel?.channel || "尚未有資料"}。`],
      ["待決策", `${summary.pendingApprovals.length} 筆待處理事項；週報只讀，不會自動新增審核單。`],
    ],
  };
}

function weeklyReportSection(summary = weeklySummaryData()) {
  return {
    type: "weekly-report",
    title: "可複製週報文字",
    wide: true,
    text: weeklyReportText(summary),
  };
}

function weeklyCampaignProgressSection(summary = weeklySummaryData()) {
  const rows = summary.changedCampaigns.slice(0, 12).map((campaign) => {
    const facts = weeklyCampaignFacts(campaign.id, summary);
    return [
      campaign.name || "未命名行銷案",
      tag(campaign.priority || "中", campaignPriorityTone(campaign.priority || "中")),
      tag(campaign.status || "未填", campaignStatusTone(campaign.status || "未填")),
      facts,
      actionButton("進入專案", "view-campaign-detail", campaign.id, "is-primary"),
    ];
  });

  return {
    type: "table",
    title: "行銷案進度摘要",
    wide: true,
    headers: ["行銷案", "重要性", "狀態", "本週摘要", "操作"],
    rows: rows.length ? rows : [["本週尚無行銷案異動", tag("無", "green"), tag("正常", "green"), "任務、預算、文件、風險與成效目前沒有本週異動。", "無"]],
  };
}

function weeklyRiskDecisionSection(summary = weeklySummaryData()) {
  const riskRows = summary.weeklyRisks.slice(0, 10).map((risk) => [
    tag("風險", isRiskOverdue(risk) ? "red" : riskImpactTone(risk.impact_level || "中")),
    `${campaignName(risk.campaign_id)} / ${risk.title || "未命名事項"}`,
    `${tag(risk.impact_level || "中", riskImpactTone(risk.impact_level || "中"))} ${tag(isRiskOverdue(risk) ? "逾期" : risk.status || "待處理", isRiskOverdue(risk) ? "red" : riskStatusTone(risk.status || "待處理"))}`,
    formatDate(riskNextFollowupDate(risk)) || "未設定",
    risk.owner || "未填",
    actionButton("進入專案", "view-campaign-detail", risk.campaign_id, "is-primary"),
  ]);
  const approvalRows = summary.pendingApprovals.slice(0, 6).map((request) => [
    tag("決策", approvalPriority(request) === "high" ? "red" : "amber"),
    request.title || approvalEntityLabel(request.entity_type),
    request.summary || approvalEntityLabel(request.entity_type),
    formatDate(request.due_date) || "未設定",
    "待決策中心處理",
    actionButton("前往待決策", "view-decisions", "", "is-primary"),
  ]);

  return {
    type: "table",
    title: "風險 / 待決策摘要",
    wide: true,
    headers: ["類型", "項目", "內容 / 狀態", "期限", "負責 / 處理", "操作"],
    rows: [
      ...riskRows,
      ...approvalRows,
    ].length
      ? [...riskRows, ...approvalRows]
      : [["目前無重大風險", "沒有高風險、逾期追蹤或待審核事項。", tag("正常", "green"), "無", "無", "無"]],
  };
}

function weeklyBudgetPaymentSection(summary = weeklySummaryData()) {
  const rows = summary.pendingPayments.slice(0, 10).map((item) => [
    campaignName(item.campaign_id),
    item.item_name || "未命名費用",
    budgetAmountText(item),
    tag(item.payment_status || "未請款", statusTone(item.payment_status || "未請款")),
    formatDate(item.payment_date) || "未設定",
    actionButton("進入專案", "view-campaign-detail", item.campaign_id, "is-primary"),
  ]);

  return {
    type: "table",
    title: "預算 / 付款摘要",
    wide: true,
    headers: ["行銷案", "項目", "金額", "付款狀態", "付款日", "操作"],
    rows: rows.length ? rows : [["目前無待付款項目", "無", "無", tag("正常", "green"), "無", "無"]],
  };
}

function weeklyPerformanceChannelSection(summary = weeklySummaryData()) {
  const rows = summary.weeklyPerformance.slice(0, 10).map((performance) => [
    campaignName(performance.campaign_id),
    performance.channel || "未分類",
    `${formatCount(performance.reach_count)} / ${formatCount(performance.lead_count)}`,
    `${formatCount(performance.qualified_lead_count)} / ${formatCount(performance.deal_count)} 件`,
    formatCurrencyFull(performance.deal_amount),
    formatDate(performance.updated_at || performance.created_at) || "未記錄",
    actionButton("進入專案", "view-campaign-detail", performance.campaign_id, "is-primary"),
  ]);

  return {
    type: "table",
    title: "成效 / Channel 摘要",
    wide: true,
    headers: ["行銷案", "Channel", "觸及 / 名單", "有效 / 成交", "成交金額", "更新日", "操作"],
    rows: rows.length ? rows : [["本週尚無成效更新", "無", "無", "無", "無", "無", "無"]],
  };
}

function weeklyNextPrioritySection(summary = weeklySummaryData()) {
  const rows = summary.nextPriorities.slice(0, 12).map((item) => [
    tag(item.type, item.tone),
    item.title,
    item.detail,
    item.campaign_id ? actionButton("進入專案", "view-campaign-detail", item.campaign_id, "is-primary") : item.action || "無",
  ]);

  return {
    type: "table",
    title: "下週優先事項",
    wide: true,
    headers: ["類型", "事項", "原因", "操作"],
    rows: rows.length ? rows : [[tag("正常", "green"), "目前沒有下週優先事項", "沒有 7 天內到期任務、待付款、高風險或待決策事項。", "無"]],
  };
}

function weeklySummaryData() {
  const start = startOfWeekString();
  const end = localDateString();
  const nextLimit = addDaysString(7);
  const allCampaigns = [...state.data.campaigns, ...state.data.archivedCampaigns];

  const newTasks = state.data.campaignTasks.filter((task) => isDateInRange(task.created_at, start, end));
  const completedTasks = state.data.campaignTasks.filter((task) => {
    const status = task.status || "";
    return ["已完成", "完成", "結案"].includes(status) && isDateInRange(task.planned_end, start, end);
  });
  const cancelledTasks = state.data.cancelledCampaignTasks.filter((task) => isDateInRange(task.cancelled_at, start, end));
  const newBudgetItems = state.data.campaignBudgetItems.filter((item) => isDateInRange(item.created_at, start, end));
  const cancelledBudgetItems = state.data.cancelledCampaignBudgetItems.filter((item) => isDateInRange(item.cancelled_at, start, end));
  const paidBudgetItems = state.data.campaignBudgetItems.filter((item) => item.payment_status === "已付款" && isDateInRange(item.payment_date, start, end));
  const newDocuments = state.data.campaignDocuments.filter((document) => isDateInRange(document.uploaded_at || document.created_at, start, end));
  const archivedDocuments = state.data.archivedCampaignDocuments.filter((document) => isDateInRange(document.archived_at, start, end));
  const newRisks = state.data.campaignRisks.filter((risk) => isDateInRange(risk.created_at, start, end));
  const updatedRisks = state.data.campaignRisks.filter((risk) => isDateInRange(risk.updated_at, start, end));
  const archivedRisks = state.data.archivedCampaignRisks.filter((risk) => isDateInRange(risk.archived_at, start, end));
  const weeklyRiskUpdatesRows = weeklyRiskUpdates();
  const weeklyPerformance = state.data.campaignPerformance.filter((performance) => isDateInRange(performance.updated_at || performance.created_at, start, end));
  const weeklyLeads = state.data.leads.filter((lead) => isDateInRange(lead.created_at, start, end));
  const pendingPayments = pendingCampaignPayments();
  const highRisks = highOpenRisks();
  const overdue = overdueRisks();
  const executiveRisks = executiveConfirmRisks();
  const pendingApprovals = state.data.approvalRequests
    .filter(isOpenApprovalRequest)
    .sort((a, b) => approvalPriorityScore(b) - approvalPriorityScore(a) || String(a.due_date || "9999-12-31").localeCompare(String(b.due_date || "9999-12-31")));
  const bestChannel = channelPerformanceRows()[0] || null;

  const changedIds = new Set();
  [
    ...newTasks,
    ...completedTasks,
    ...cancelledTasks,
    ...newBudgetItems,
    ...cancelledBudgetItems,
    ...paidBudgetItems,
    ...newDocuments,
    ...archivedDocuments,
    ...newRisks,
    ...updatedRisks,
    ...archivedRisks,
    ...weeklyPerformance,
  ].forEach((record) => {
    if (record.campaign_id) changedIds.add(String(record.campaign_id));
  });
  weeklyRiskUpdatesRows.forEach((update) => {
    const risk = findCampaignRisk(update.risk_id);
    if (risk?.campaign_id) changedIds.add(String(risk.campaign_id));
  });

  const changedCampaigns = allCampaigns
    .filter((campaign) => changedIds.has(String(campaign.id)))
    .sort(compareWeeklyCampaigns);

  const weeklyRisks = uniqueById([...highRisks, ...overdue, ...executiveRisks, ...newRisks, ...updatedRisks])
    .sort(compareExecutiveRisks);

  const nextTasks = state.data.campaignTasks.filter((task) => {
    const due = formatDate(task.planned_end);
    const status = task.status || "";
    return due && due <= nextLimit && !["已完成", "完成", "結案"].includes(status);
  });
  const missingPerformanceCampaigns = state.data.campaigns
    .filter((campaign) => campaign.priority === "高" && !performanceForCampaign(campaign.id));

  const nextPriorities = [
    ...nextTasks.map((task) => ({
      type: "任務",
      tone: isPastDate(task.planned_end) ? "red" : "amber",
      title: task.task_name || "未命名任務",
      detail: `${campaignName(task.campaign_id)} / 到期 ${formatDate(task.planned_end) || "未填"} / ${task.owner || "未填負責人"}`,
      campaign_id: task.campaign_id,
    })),
    ...pendingPayments.slice(0, 8).map((item) => ({
      type: "付款",
      tone: paymentDuePriority(item) === 0 ? "red" : "amber",
      title: item.item_name || "未命名費用",
      detail: `${campaignName(item.campaign_id)} / ${budgetAmountText(item)} / ${item.payment_status || "未請款"}`,
      campaign_id: item.campaign_id,
    })),
    ...highRisks.slice(0, 8).map((risk) => ({
      type: "風險",
      tone: "red",
      title: risk.title || "未命名風險",
      detail: `${campaignName(risk.campaign_id)} / ${risk.status || "待處理"} / ${formatDate(riskNextFollowupDate(risk)) || "未設定追蹤"}`,
      campaign_id: risk.campaign_id,
    })),
    ...pendingApprovals.slice(0, 6).map((request) => ({
      type: "決策",
      tone: approvalPriority(request) === "high" ? "red" : "amber",
      title: request.title || approvalEntityLabel(request.entity_type),
      detail: `${request.summary || approvalEntityLabel(request.entity_type)} / ${formatDate(request.due_date) || "未設定期限"}`,
      action: "待決策中心",
    })),
    ...missingPerformanceCampaigns.slice(0, 6).map((campaign) => ({
      type: "成效",
      tone: "amber",
      title: campaign.name || "未命名行銷案",
      detail: "高重要性行銷案尚未填成效資料。",
      campaign_id: campaign.id,
    })),
  ];

  return {
    start,
    end,
    changedCampaigns,
    newTasks,
    completedTasks,
    cancelledTasks,
    newBudgetItems,
    cancelledBudgetItems,
    paidBudgetItems,
    newDocuments,
    archivedDocuments,
    newRisks,
    updatedRisks,
    archivedRisks,
    weeklyRiskUpdates: weeklyRiskUpdatesRows,
    weeklyPerformance,
    weeklyLeads,
    weeklyRisks,
    pendingPayments,
    pendingPaymentTotal: pendingPayments.reduce((sum, item) => sum + budgetComparableAmount(item), 0),
    highRisks,
    overdueRisks: overdue,
    executiveRisks,
    pendingApprovals,
    bestChannel,
    nextPriorities: uniqueWeeklyPriorities(nextPriorities),
  };
}

function weeklyCampaignFacts(campaignId, summary = weeklySummaryData()) {
  const facts = [];
  const taskCount = [
    ...summary.newTasks,
    ...summary.completedTasks,
    ...summary.cancelledTasks,
  ].filter((task) => String(task.campaign_id || "") === String(campaignId || "")).length;
  const budgetCount = [
    ...summary.newBudgetItems,
    ...summary.cancelledBudgetItems,
    ...summary.paidBudgetItems,
  ].filter((item) => String(item.campaign_id || "") === String(campaignId || "")).length;
  const documentCount = [
    ...summary.newDocuments,
    ...summary.archivedDocuments,
  ].filter((document) => String(document.campaign_id || "") === String(campaignId || "")).length;
  const riskCount = summary.weeklyRisks.filter((risk) => String(risk.campaign_id || "") === String(campaignId || "")).length;
  const performanceCount = summary.weeklyPerformance.filter((performance) => String(performance.campaign_id || "") === String(campaignId || "")).length;

  if (taskCount) facts.push(`任務 ${taskCount}`);
  if (budgetCount) facts.push(`預算 ${budgetCount}`);
  if (documentCount) facts.push(`文件 ${documentCount}`);
  if (riskCount) facts.push(`風險 ${riskCount}`);
  if (performanceCount) facts.push(`成效 ${performanceCount}`);
  return facts.length ? facts.join(" / ") : "本週有資料異動";
}

function weeklyReportText(summary = weeklySummaryData()) {
  const campaignLines = summary.changedCampaigns.slice(0, 8).map((campaign) => `- ${campaign.name || "未命名行銷案"}：${weeklyCampaignFacts(campaign.id, summary)}`);
  const riskLines = summary.weeklyRisks.slice(0, 8).map((risk) => `- ${campaignName(risk.campaign_id)}｜${risk.title || "未命名事項"}：${risk.impact_level || "中"} / ${risk.status || "待處理"} / ${formatDate(riskNextFollowupDate(risk)) || "未設定追蹤"}`);
  const paymentLines = summary.pendingPayments.slice(0, 8).map((item) => `- ${campaignName(item.campaign_id)}｜${item.item_name || "未命名費用"}：${budgetAmountText(item)} / ${item.payment_status || "未請款"} / ${formatDate(item.payment_date) || "未設定付款日"}`);
  const performanceLines = summary.weeklyPerformance.slice(0, 8).map((performance) => `- ${campaignName(performance.campaign_id)}｜${performance.channel || "未分類"}：名單 ${formatCount(performance.lead_count)}，有效 ${formatCount(performance.qualified_lead_count)}，成交 ${formatCurrencyFull(performance.deal_amount)}`);
  const priorityLines = summary.nextPriorities.slice(0, 10).map((item) => `- ${item.type}｜${item.title}：${item.detail}`);

  return [
    "美昇 Marketing OS 週報摘要",
    `期間：${summary.start} ~ ${summary.end}`,
    "",
    "一、本週重點",
    `- 異動行銷案：${summary.changedCampaigns.length} 件。`,
    `- 任務：新增 ${summary.newTasks.length} 件、完成 ${summary.completedTasks.length} 件、取消 ${summary.cancelledTasks.length} 件。`,
    `- 風險追蹤：本週新增 ${summary.weeklyRiskUpdates.length} 筆，高風險未解決 ${summary.highRisks.length} 件。`,
    `- 預算付款：待付款 ${summary.pendingPayments.length} 筆，估計 ${formatCurrencyFull(summary.pendingPaymentTotal)}。`,
    `- 成效：本週更新 ${summary.weeklyPerformance.length} 筆，最佳 Channel：${summary.bestChannel?.channel || "尚未有資料"}。`,
    "",
    "二、行銷案進度",
    ...(campaignLines.length ? campaignLines : ["- 本週尚無行銷案異動。"]),
    "",
    "三、風險 / 待決事項",
    ...(riskLines.length ? riskLines : ["- 目前沒有高風險、逾期追蹤或重要待決事項。"]),
    summary.pendingApprovals.length ? `- 待決策中心：${summary.pendingApprovals.length} 筆待處理事項。` : "- 待決策中心：目前沒有待處理審核。",
    "",
    "四、預算 / 付款",
    ...(paymentLines.length ? paymentLines : ["- 目前沒有待付款項目。"]),
    "",
    "五、成效 / Channel",
    ...(performanceLines.length ? performanceLines : ["- 本週尚無成效資料更新。"]),
    summary.weeklyLeads.length ? `- 本週新增名單：${summary.weeklyLeads.length} 筆。` : "- 本週尚無新增名單。",
    "",
    "六、下週優先事項",
    ...(priorityLines.length ? priorityLines : ["- 目前沒有系統標示的下週優先事項。"]),
  ].join("\n");
}

function isDateInRange(value, start, end) {
  const date = formatDate(value);
  return Boolean(date && date >= start && date <= end);
}

function compareWeeklyCampaigns(a = {}, b = {}) {
  return campaignUrgencyScore(b) - campaignUrgencyScore(a)
    || String(b.created_at || "").localeCompare(String(a.created_at || ""))
    || String(a.name || "").localeCompare(String(b.name || ""), "zh-Hant-TW");
}

function uniqueById(items = []) {
  const seen = new Set();
  return items.filter((item) => {
    const id = String(item.id || "");
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function uniqueWeeklyPriorities(items = []) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.type}-${item.title}-${item.campaign_id || item.detail}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function approvalPriorityScore(request = {}) {
  if (approvalPriority(request) === "high") return 100;
  if (request.status === "需修正") return 60;
  return 30;
}

function campaignSummarySection() {
  if (!state.data.campaigns.length) {
    return {
      type: "table",
      title: "年度行銷案彙總",
      wide: true,
      tableClass: "campaign-summary-table",
      headers: ["期間", "預算", "專案數量", "預估支出", "總實際支出", "預估補助款", "實撥補助款"],
      rows: [
        ["本年度上半年", "未填", "0", "未填", "未填", "未填", "未填"],
        ["本年度下半年", "未填", "0", "未填", "未填", "未填", "未填"],
        { className: "campaign-summary-total", cells: ["本年度總年度", "未填", "0", "未填", "未填", "未填", "未填"] },
      ],
    };
  }

  const year = campaignOverviewYear(state.data.campaigns);
  const firstHalf = campaignPeriodSummary(state.data.campaigns, "h1", year);
  const secondHalf = campaignPeriodSummary(state.data.campaigns, "h2", year);
  const total = {
    rows: [...firstHalf.rows, ...secondHalf.rows],
    budget: firstHalf.budget + secondHalf.budget,
    estimatedSpend: firstHalf.estimatedSpend + secondHalf.estimatedSpend,
    actualSpend: firstHalf.actualSpend + secondHalf.actualSpend,
    subsidyPlanned: firstHalf.subsidyPlanned + secondHalf.subsidyPlanned,
    subsidyReceived: firstHalf.subsidyReceived + secondHalf.subsidyReceived,
  };

  return {
    type: "table",
    title: "年度行銷案彙總",
    wide: true,
    tableClass: "campaign-summary-table",
    headers: ["期間", "預算", "專案數量", "預估支出", "總實際支出", "預估補助款", "實撥補助款"],
    rows: [
      campaignSummaryRow(`${year} 上半年`, firstHalf),
      campaignSummaryRow(`${year} 下半年`, secondHalf),
      { className: "campaign-summary-total", cells: campaignSummaryRow(`${year} 總年度`, total) },
    ],
  };
}

function campaignSummaryRow(label, summary) {
  return [
    label,
    formatCurrencyFull(summary.budget),
    String(summary.rows.length),
    formatCurrencyFull(summary.estimatedSpend),
    formatCurrencyFull(summary.actualSpend),
    formatCurrencyFull(summary.subsidyPlanned),
    formatCurrencyFull(summary.subsidyReceived),
  ];
}

function campaignRiskSummarySection() {
  const risks = executiveRiskItems();
  const rows = risks.slice(0, 8).map((risk) => [
    campaignName(risk.campaign_id),
    risk.title || "未命名事項",
    tag(risk.impact_level || "中", riskImpactTone(risk.impact_level || "中")),
    tag(isRiskOverdue(risk) ? "逾期" : risk.status || "待處理", isRiskOverdue(risk) ? "red" : riskStatusTone(risk.status || "待處理")),
    formatDate(riskNextFollowupDate(risk)) || "未設定",
    latestRiskUpdateText(latestRiskUpdate(risk.id)),
    actionButton("進入專案", "view-campaign-detail", risk.campaign_id, "is-primary"),
  ]);

  return {
    type: "table",
    title: "風險 / 待決事項摘要",
    wide: true,
    headers: ["專案", "事項", "影響", "狀態", "期限 / 追蹤", "最新追蹤", "操作"],
    rows: rows.length ? rows : [["目前無重大風險", "無", tag("正常", "green"), tag("無待辦", "green"), "無", "無", "無"]],
  };
}

function marketingRiskInspectionCardsSection() {
  const highRisks = highOpenRisks();
  const overdue = overdueRisks();
  const weekly = weeklyRiskUpdates();
  const executiveConfirm = executiveConfirmRisks();

  return {
    type: "cards",
    title: "風險巡檢",
    wide: true,
    cards: [
      [
        "高風險未解決",
        `${highRisks.length} 件需追蹤<br>${actionGroup([actionButton("查看", "view-campaign-inspection", "risks-high", "is-primary", !highRisks.length)])}`,
      ],
      [
        "逾期未追蹤",
        `${overdue.length} 件需更新<br>${actionGroup([actionButton("查看", "view-campaign-inspection", "risks-overdue", "is-primary", !overdue.length)])}`,
      ],
      [
        "本週新增追蹤",
        `${weekly.length} 筆更新<br>${actionGroup([actionButton("查看", "view-campaign-inspection", "risks-weekly", "is-primary", !weekly.length)])}`,
      ],
      [
        "待總經理確認",
        `${executiveConfirm.length} 件已標示<br>${actionGroup([actionButton("查看", "view-campaign-inspection", "risks-executive", "is-primary", !executiveConfirm.length)])}`,
      ],
    ],
  };
}

function formatCampaignRow(campaign, includeActions = false) {
  const priority = campaign.priority || "中";
  const budget = formatMoney(campaign.budget);
  const progressLabel = campaignProgress(campaign.status);
  const nextStep = campaign.notes || campaign.purpose || campaign.partner || "待補下一步";

  const row = [
    campaign.name || "未命名專案",
    tag(priority, campaignPriorityTone(priority)),
    tag(campaign.status || "未填", campaignStatusTone(campaign.status)),
    progress(progressLabel.label, progressLabel.tone),
    budget,
    nextStep,
  ];

  if (includeActions) {
    row.push(actionGroup([
      actionButton("詳情", "view-campaign-detail", campaign.id, "is-primary"),
      actionButton("編輯", "edit-campaign", campaign.id, "is-primary"),
      actionButton("封存", "archive-campaign", campaign.id, "is-danger"),
    ]));
  }

  return row;
}

function campaignProgress(status = "") {
  if (["結案", "已完成", "完成"].includes(status)) return { label: "100%", tone: "green" };
  if (["進行中", "執行中"].includes(status)) return { label: "65%", tone: "" };
  if (["預計規劃", "規劃中", "估價中"].includes(status)) return { label: "25%", tone: "amber" };
  return { label: "40%", tone: "amber" };
}

function campaignPriorityTone(priority = "") {
  if (priority === "高") return "red";
  if (priority === "低") return "green";
  return "amber";
}

function campaignStatusTone(status = "") {
  if (["逾期", "需修正", "追加待核"].includes(status)) return "red";
  if (["估價中", "補助申請", "待確認", "預計規劃"].includes(status)) return "amber";
  if (["進行中", "執行中"].includes(status)) return "";
  if (["結案", "已完成", "完成"].includes(status)) return "green";
  return "gray";
}

function sortedCampaignsForExecutive(campaigns = []) {
  return [...campaigns].sort((a, b) => (
    campaignUrgencyScore(b) - campaignUrgencyScore(a)
    || String(campaignStartDate(a) || "9999").localeCompare(String(campaignStartDate(b) || "9999"))
    || String(a.name || "").localeCompare(String(b.name || ""))
  ));
}

function campaignUrgencyScore(campaign = {}) {
  const priorityScores = { 高: 300, 中: 180, 低: 80 };
  const statusScores = {
    估價中: 90,
    補助申請: 85,
    預計規劃: 70,
    進行中: 60,
    執行中: 60,
    結案: 0,
    已完成: 0,
    完成: 0,
  };
  const overdue = isPastDate(campaign.planned_end || campaign.actual_end) && !["結案", "已完成", "完成"].includes(campaign.status);
  const budget = Number(campaign.budget || 0);
  const actualSpend = Number(campaign.actual_spend || 0);
  const overBudget = budget > 0 && actualSpend > budget;

  return (priorityScores[campaign.priority] || priorityScores.中)
    + (statusScores[campaign.status] ?? 40)
    + (overdue ? 120 : 0)
    + (overBudget ? 110 : 0);
}

function campaignFiscalYear(campaign = {}) {
  const raw = campaign.actual_start || campaign.planned_start || campaign.created_at || "";
  const year = Number(String(raw).slice(0, 4));
  return Number.isFinite(year) && year > 0 ? year : new Date().getFullYear();
}

function campaignOverviewYear(campaigns = []) {
  const current = new Date().getFullYear();
  const years = campaigns.map(campaignFiscalYear).filter((year) => Number.isFinite(year));
  if (!years.length || years.includes(current)) return current;
  return Math.max(...years);
}

function campaignHalf(campaign = {}) {
  const raw = campaign.actual_start || campaign.planned_start || campaign.created_at || nowIso();
  const month = Number(String(raw).slice(5, 7)) || 1;
  return month <= 6 ? "h1" : "h2";
}

function campaignStartDate(campaign = {}) {
  return campaign.actual_start || campaign.planned_start || campaign.created_at || "";
}

function campaignDateRange(campaign = {}) {
  const start = formatDate(campaign.actual_start || campaign.planned_start);
  const end = formatDate(campaign.actual_end || campaign.planned_end);
  if (start && end) return `${start} - ${end}`;
  return start || end || "未設定";
}

function campaignExpenses(campaignId) {
  return state.data.expenses.filter((expense) => expense.campaign_id === campaignId);
}

function campaignEstimatedSpend(campaign = {}) {
  const expenses = campaignExpenses(campaign.id);
  const expenseTotal = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  return expenseTotal || Number(campaign.budget || 0);
}

function campaignActualSpend(campaign = {}) {
  const expenses = campaignExpenses(campaign.id);
  const expenseActualTotal = expenses.reduce((sum, expense) => sum + Number(expense.amount_actual || 0), 0);
  return Number(campaign.actual_spend || 0) || expenseActualTotal;
}

function campaignPeriodSummary(campaigns = [], half, year) {
  const rows = campaigns.filter((campaign) => (
    campaignFiscalYear(campaign) === year
    && campaignHalf(campaign) === half
  ));

  return {
    rows,
    budget: rows.reduce((sum, campaign) => sum + Number(campaign.budget || 0), 0),
    estimatedSpend: rows.reduce((sum, campaign) => sum + campaignEstimatedSpend(campaign), 0),
    actualSpend: rows.reduce((sum, campaign) => sum + campaignActualSpend(campaign), 0),
    subsidyPlanned: rows.reduce((sum, campaign) => sum + Number(campaign.subsidy_planned || 0), 0),
    subsidyReceived: rows.reduce((sum, campaign) => sum + Number(campaign.subsidy_received || 0), 0),
  };
}

function isPastDate(value) {
  if (!value) return false;
  return String(value).slice(0, 10) < new Date().toISOString().slice(0, 10);
}

function decisionListSection() {
  if (state.data.approvalRequests.length) {
    const pendingRequests = state.data.approvalRequests
      .filter(isOpenApprovalRequest)
      .slice(0, 8);

    if (!pendingRequests.length) {
      return {
        type: "list",
        title: "待決策 / 待討論",
        items: [
          ["目前沒有待審核事項", "目前沒有需要總經理處理的審核資料。", "無待辦", "ok"],
        ],
      };
    }

    return {
      type: "table",
      title: "待決策 / 待討論",
      headers: ["事項", "摘要", "狀態", "操作"],
      rows: pendingRequests.map((request) => [
        request.title || approvalEntityLabel(request.entity_type),
        request.summary || `${approvalEntityLabel(request.entity_type)} / ${formatMoney(request.amount)} / ${formatDate(request.due_date) || "未設定期限"}`,
        tag(request.status || "待審核", approvalPriority(request) === "high" ? "red" : "amber"),
        actionButton("處理", "review-approval", request.id, "is-primary"),
      ]),
    };
  }

  if (state.dataStatus === "live") {
    return {
      type: "list",
      title: "待決策 / 待討論",
      items: [
        [
          "目前沒有待審核事項",
          "目前沒有待處理資料，代表暫時沒有需要總經理決策的項目。",
          "無待辦",
          "ok",
        ],
      ],
    };
  }

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

function approvalEntityLabel(entityType = "") {
  const labels = {
    budget_item: "預算項目",
    vendor_quote: "廠商報價",
    knowledge_item: "知識 / 文宣審核",
    association: "公會合作",
  };
  return labels[entityType] || entityType || "審核事項";
}

function approvalPriority(request = {}) {
  if (request.status === "需修正") return "medium";
  if (request.due_date && request.due_date < new Date().toISOString().slice(0, 10)) return "high";
  if (request.approver_role === "executive") return "high";
  return "medium";
}

function channelSummarySection(wide) {
  const rows = channelPerformanceRows().map((row) => [
    row.channel,
    formatCount(row.reach),
    `${formatCount(row.totalLeads)}<br><span class="cell-sub">${row.performanceRecords ? "以成效資料為主" : "以名單庫補缺"}</span>`,
    formatCount(row.inquiries),
    formatCount(row.qualified),
    `${formatCount(row.deals)} 件`,
    formatCurrencyFull(row.dealAmount),
    tag(row.judgment.label, row.judgment.tone),
  ]);

  if (rows.length) {
    return {
      type: "table",
      title: "Channel 成效摘要",
      wide,
      headers: ["Channel", "觸及", "名單", "詢問", "有效名單", "成交", "成交金額", "管理判斷"],
      rows,
    };
  }

  if (state.dataStatus === "live") {
    return {
      type: "table",
      title: "Channel 成效摘要",
      wide,
      headers: ["狀態", "說明", "下一步"],
      rows: [[
        tag("尚無資料", "amber"),
        "目前沒有可彙總的 Channel 成效或名單來源。",
        "請先在行銷案詳情頁填成效資料，或確認名單已建立來源 Channel。",
      ]],
    };
  }

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

function channelPerformanceRows() {
  const channels = new Map();

  state.data.campaignPerformance.forEach((performance) => {
    const stats = ensureChannelStats(channels, performance.channel);
    stats.performanceRecords += 1;
    stats.reach += Number(performance.reach_count || 0);
    stats.performanceLeads += Number(performance.lead_count || 0);
    stats.performanceInquiries += Number(performance.inquiry_count || 0);
    stats.performanceQualified += Number(performance.qualified_lead_count || 0);
    stats.estimatedOpportunityAmount += Number(performance.estimated_opportunity_amount || 0);
    stats.deals += Number(performance.deal_count || 0);
    stats.dealAmount += Number(performance.deal_amount || 0);
  });

  state.data.leads.forEach((lead) => {
    const stats = ensureChannelStats(channels, lead.source_channel);
    stats.leadRecords += 1;
    if (lead.stage === "詢問") stats.leadInquiries += 1;
    if (["有效名單", "業務跟進", "形成商機", "需主管協助"].includes(lead.stage)) stats.leadQualified += 1;
    if (["形成商機", "需主管協助"].includes(lead.stage)) stats.leadOpportunities += 1;
  });

  return [...channels.values()]
    .map((stats) => {
      const hasPerformance = stats.performanceRecords > 0;
      const resolvedStats = {
        ...stats,
        totalLeads: hasPerformance ? stats.performanceLeads : stats.leadRecords,
        inquiries: hasPerformance ? stats.performanceInquiries : stats.leadInquiries,
        qualified: hasPerformance ? stats.performanceQualified : stats.leadQualified,
        opportunities: hasPerformance ? stats.performanceOpportunities : stats.leadOpportunities,
      };
      return { ...resolvedStats, judgment: channelJudgment(resolvedStats) };
    })
    .sort(compareChannelRows);
}

function ensureChannelStats(channels, rawChannel) {
  const channel = normalizeChannel(rawChannel);
  if (!channels.has(channel)) {
    channels.set(channel, {
      channel,
      performanceRecords: 0,
      reach: 0,
      performanceLeads: 0,
      performanceInquiries: 0,
      performanceQualified: 0,
      performanceOpportunities: 0,
      leadRecords: 0,
      leadInquiries: 0,
      leadQualified: 0,
      leadOpportunities: 0,
      inquiries: 0,
      qualified: 0,
      opportunities: 0,
      estimatedOpportunityAmount: 0,
      deals: 0,
      dealAmount: 0,
    });
  }
  return channels.get(channel);
}

function normalizeChannel(value = "") {
  const channel = String(value || "").trim();
  return channel || "未分類";
}

function compareChannelRows(a = {}, b = {}) {
  const dealAmountDiff = Number(b.dealAmount || 0) - Number(a.dealAmount || 0);
  if (dealAmountDiff) return dealAmountDiff;

  const qualifiedDiff = Number(b.qualified || 0) - Number(a.qualified || 0);
  if (qualifiedDiff) return qualifiedDiff;

  const leadDiff = Number(b.totalLeads || 0) - Number(a.totalLeads || 0);
  if (leadDiff) return leadDiff;

  return String(a.channel || "").localeCompare(String(b.channel || ""), "zh-Hant-TW");
}

function channelJudgment(row = {}) {
  if (!row.performanceRecords) return { label: "待補資料", tone: "amber" };
  if (Number(row.dealAmount || 0) > 0 || Number(row.qualified || 0) >= 10) return { label: "加碼", tone: "green" };
  if (Number(row.reach || 0) >= 100 && ratioValue(row.qualified, row.reach) < 0.05) return { label: "調整", tone: "amber" };
  if (Number(row.totalLeads || 0) > 0 || Number(row.inquiries || 0) > 0 || Number(row.reach || 0) > 0) return { label: "持續", tone: "green" };
  return { label: "待補資料", tone: "amber" };
}

function ratioValue(numerator, denominator) {
  const top = Number(numerator || 0);
  const bottom = Number(denominator || 0);
  return bottom ? top / bottom : 0;
}

function budgetSection() {
  if (state.data.expenses.length) {
    return {
      type: "table",
      title: "費用狀態",
      headers: ["項目", "類型", "金額", "狀態", "日期", "操作"],
      rows: state.data.expenses.slice(0, 10).map((expense) => [
        expense.title || "未命名費用",
        expense.category || "未分類",
        formatMoney(expense.amount),
        tag(expense.payment_status || "未填", statusTone(expense.payment_status)),
        formatDate(expense.payment_date) || "未設定",
        expenseActionGroup(expense),
      ]),
    };
  }

  if (state.dataStatus === "live") {
    return {
      type: "table",
      title: "費用狀態",
      headers: ["狀態", "說明", "下一步"],
      rows: [
        [
          tag("尚無資料", "amber"),
          "目前沒有可顯示的費用彙總資料。",
          "請先建立預算、廠商費用或公會費用資料。",
        ],
      ],
    };
  }

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

function expenseActionGroup(expense = {}) {
  const sourceKey = expenseSourceKey(expense);
  if (!sourceKey) return "無";

  if (state.role === "marketing") {
    return actionGroup([
      actionButton("編輯", "edit-expense-source", sourceKey, "is-primary"),
      actionButton("取消", "cancel-expense-source", sourceKey, "is-danger"),
    ]);
  }

  return actionGroup([actionButton("查看來源", "view-expense-source", sourceKey, "is-primary")]);
}

function expenseSourceKey(expense = {}) {
  if (!expense.source_table || !expense.source_id) return "";
  return `${expense.source_table}:${expense.source_id}`;
}

function parseExpenseSourceKey(sourceKey = "") {
  const [sourceTable, ...idParts] = String(sourceKey || "").split(":");
  return { sourceTable, sourceId: idParts.join(":") };
}

function openExpenseSource(sourceKey = "") {
  const { sourceTable, sourceId } = parseExpenseSourceKey(sourceKey);
  if (!sourceTable || !sourceId) return;

  if (sourceTable === "marketing_campaign_budget_items") {
    const item = findCampaignBudgetItem(sourceId);
    if (item?.campaign_id) {
      state.page = "campaigns";
      state.campaignInspectionMode = "";
      state.campaignDetailId = item.campaign_id;
      render();
    }
    return;
  }

  if (sourceTable === "marketing_campaign_vendors") {
    state.page = "vendors";
    clearCampaignDrilldown();
    render();
    return;
  }

  if (sourceTable === "association_task_expenses") {
    const expense = findAssociationTaskExpense(sourceId);
    if (expense?.association_id) {
      state.page = "associations";
      state.associationDetailId = expense.association_id;
      state.campaignDetailId = "";
      state.campaignInspectionMode = "";
      render();
    }
    return;
  }

  if (sourceTable === "association_fee_records") {
    const fee = findAssociationFee(sourceId);
    if (fee?.association_id) {
      state.page = "associations";
      state.associationDetailId = fee.association_id;
      state.campaignDetailId = "";
      state.campaignInspectionMode = "";
      render();
    }
  }
}

function openEditExpenseSource(sourceKey = "") {
  const { sourceTable, sourceId } = parseExpenseSourceKey(sourceKey);
  if (sourceTable === "marketing_campaign_budget_items") return openEditCampaignBudgetItemModal(sourceId);
  if (sourceTable === "marketing_campaign_vendors") return openEditCampaignVendorModal(sourceId);
  if (sourceTable === "association_task_expenses") return openEditAssociationTaskExpenseModal(sourceId);
  if (sourceTable === "association_fee_records") return openEditAssociationFeeModal(sourceId);
}

function openCancelExpenseSource(sourceKey = "") {
  const { sourceTable, sourceId } = parseExpenseSourceKey(sourceKey);
  if (sourceTable === "marketing_campaign_budget_items") return openCancelCampaignBudgetItemModal(sourceId);
  if (sourceTable === "marketing_campaign_vendors") return openCancelCampaignVendorModal(sourceId);
  if (sourceTable === "association_task_expenses") return openCancelAssociationTaskExpenseModal(sourceId);
  if (sourceTable === "association_fee_records") return openCancelAssociationFeeModal(sourceId);
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
  if (state.data.leads.length) {
    const stages = ["詢問", "有效名單", "業務跟進", "形成商機", "需主管協助"];
    const rows = stages.map((stage) => {
      const count = state.data.leads.filter((lead) => lead.stage === stage).length;
      return [stage, String(count), leadStageDescription(stage)];
    });

    return {
      type: "table",
      title: "名單漏斗",
      headers: ["階段", "數量", "說明"],
      rows,
    };
  }

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

function leadStageDescription(stage) {
  return {
    詢問: "初步接觸或尚待判斷",
    有效名單: "資料完整且可分派業務",
    業務跟進: "已建立跟進紀錄或下一步",
    形成商機: "具體需求與時程",
    需主管協助: "需要高階拜訪或資源協調",
  }[stage] || "自訂階段";
}

function executiveLeadRiskSection() {
  const priorityLeads = state.data.leads
    .filter((lead) => lead.stage === "需主管協助" || lead.importance === "高")
    .slice(0, 5);

  if (priorityLeads.length) {
    return {
      type: "list",
      title: "需主管協助商機",
      items: priorityLeads.map((lead) => [
        lead.company_name || "未命名名單",
        lead.requirement_note || lead.next_step || `來源：${lead.source_channel || "未分類"}`,
        lead.importance || "中",
        lead.importance === "高" || lead.stage === "需主管協助" ? "high" : "medium",
      ]),
    };
  }

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
  const rows = channelPerformanceRows();
  if (rows.length) {
    const best = rows[0];
    const adjustment = rows.find((row) => row.judgment.label === "調整");
    const missing = rows.filter((row) => row.judgment.label === "待補資料");
    const qualified = rows
      .filter((row) => Number(row.qualified || 0) > 0)
      .slice(0, 3)
      .map((row) => `${row.channel} ${formatCount(row.qualified)}`)
      .join("、") || "尚未形成有效名單";

    return {
      type: "cards",
      title: "管理判斷",
      cards: [
        ["應增加資源", `${best.channel} 目前排序最高，${best.judgment.label}；有效名單 ${formatCount(best.qualified)}、成交金額 ${formatCurrencyFull(best.dealAmount)}。`],
        ["需調整內容", adjustment ? `${adjustment.channel} 觸及 ${formatCount(adjustment.reach)}，但有效名單 ${formatCount(adjustment.qualified)}，建議檢查內容或受眾。` : "目前沒有被標示為需調整的 Channel。"],
        ["待補資料", missing.length ? `${missing.map((row) => row.channel).slice(0, 3).join("、")} 尚未填成效資料或只有 leads 來源，需補觸及與轉換數字。` : "主要 Channel 已有成效資料，可持續累積。"],
        ["有效名單來源", qualified],
      ],
    };
  }

  if (state.dataStatus === "live") {
    return {
      type: "cards",
      title: "管理判斷",
      cards: [
        ["目前狀態", "尚未有可彙總的 Channel 成效資料。"],
        ["下一步", "先從行銷案詳情頁補主要 Channel、觸及、名單、有效商機與成交金額。"],
        ["名單來源", "若 leads.source_channel 已有資料，Channel 頁會先顯示來源摘要。"],
        ["治理提醒", "第一版先依原字串分類，後續再設計 Channel 命名對照表。"],
      ],
    };
  }

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
  if (state.data.approvalRequests.length) {
    const pending = state.data.approvalRequests.filter((request) => request.status === "待審核").length;
    const revision = state.data.approvalRequests.filter((request) => request.status === "需修正").length;
    const approved = state.data.approvalRequests.filter((request) => request.status === "已核准").length;
    const vendorQuotes = state.data.approvalRequests.filter((request) => request.entity_type === "vendor_quote").length;

    return {
      type: "cards",
      title: "決策中心來源",
      cards: [
        ["待審核", `${pending} 筆仍需決策。`],
        ["需修正", `${revision} 筆退回補資料。`],
        ["已核准", `${approved} 筆本期已完成。`],
        ["廠商報價", `${vendorQuotes} 筆可對應合作廠商 / 交付物。`],
      ],
    };
  }

  if (state.dataStatus === "live") {
    return {
      type: "cards",
      title: "決策中心來源",
      cards: [
        ["待審核", "目前沒有待審核事項。"],
        ["需修正", "目前沒有退回補資料項目。"],
        ["廠商報價", "廠商報價待核准後，會進入這裡。"],
        ["其他審核", "預算、知識與公會審核會集中到待決策中心。"],
      ],
    };
  }

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

function vendorSection() {
  if (state.data.campaignVendors.length) {
    return {
      type: "table",
      title: "合作廠商與交付物",
      wide: true,
      headers: ["廠商 / 單位", "角色", "交付物", "報價 / 付款", "費用", "文件", "操作"],
      rows: state.data.campaignVendors.slice(0, 10).map(formatVendorRow),
    };
  }

  if (state.dataStatus === "live") {
    return {
      type: "table",
      title: "合作廠商與交付物",
      wide: true,
      headers: ["狀態", "說明", "下一步"],
      rows: [
        [
          tag("尚未建立", "amber"),
          "目前尚未建立專案廠商合作資料。",
          "請點右上角「新增廠商合作」建立第一筆廠商合作。",
        ],
      ],
    };
  }

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

function cancelledVendorRecordsSection() {
  const vendorRows = state.data.cancelledCampaignVendors.map((campaignVendor) => {
    const vendor = campaignVendor.vendors || {};
    return [
      vendor.name || "未命名廠商",
      campaignVendor.role_in_project || vendor.vendor_type || "未填",
      campaignName(campaignVendor.campaign_id),
      cancellationMeta(campaignVendor),
      campaignVendor.cancel_reason || "未填寫原因",
    ];
  });
  const deliverableRows = state.data.cancelledDeliverables.map((record) => [
    record.deliverable.deliverable_name || "未命名交付物",
    record.vendorName,
    campaignName(record.campaignVendor.campaign_id),
    cancellationMeta(record.deliverable),
    record.deliverable.cancel_reason || "未填寫原因",
  ]);
  const rows = [
    ...vendorRows.map((row) => [tag("廠商合作", "gray"), ...row]),
    ...deliverableRows.map((row) => [tag("交付物", "gray"), ...row]),
  ];

  return {
    type: "details-table",
    title: `已取消紀錄（${rows.length}）`,
    summary: "只讀顯示已取消廠商合作與交付物，不提供恢復功能。",
    wide: true,
    headers: ["類型", "名稱", "角色 / 所屬", "專案", "取消資訊", "原因"],
    rows: rows.length ? rows : [[tag("無紀錄", "green"), "目前沒有已取消廠商合作或交付物。", "無", "無", "無", "無"]],
  };
}

function formatVendorRow(campaignVendor = {}) {
  const vendor = campaignVendor.vendors || {};
  const deliverables = Array.isArray(campaignVendor.marketing_campaign_vendor_deliverables)
    ? campaignVendor.marketing_campaign_vendor_deliverables
    : [];

  return [
    vendor.name || "未命名廠商",
    campaignVendor.role_in_project || vendor.vendor_type || "未填",
    trustedTableHtml(formatDeliverableSummary(campaignVendor.id, deliverables)),
    `${tag(campaignVendor.quote_status || "待報價", statusTone(campaignVendor.quote_status))} ${tag(campaignVendor.payment_status || "未請款", statusTone(campaignVendor.payment_status))}`,
    formatVendorAmount(campaignVendor),
    formatVendorDocuments(campaignVendor.id),
    vendorActionGroup(campaignVendor),
  ];
}

function vendorActionGroup(campaignVendor = {}) {
  return actionGroup([
    actionButton("編輯", "edit-campaign-vendor", campaignVendor.id, "is-primary"),
    actionButton("交付物", "add-vendor-deliverable", campaignVendor.id),
    vendorApprovalAction(campaignVendor),
    actionButton("取消", "cancel-campaign-vendor", campaignVendor.id, "is-danger"),
  ]);
}

function vendorApprovalAction(campaignVendor = {}) {
  if (hasPendingVendorApproval(campaignVendor.id)) return actionButton("已送審", "send-vendor-approval", campaignVendor.id, "", true);
  return actionButton("送審", "send-vendor-approval", campaignVendor.id, "is-primary");
}

function hasPendingVendorApproval(campaignVendorId) {
  return state.data.approvalRequests.some((request) => (
    request.entity_type === "vendor_quote"
    && String(request.entity_id || "") === String(campaignVendorId || "")
    && isOpenApprovalRequest(request)
  ));
}

function isOpenApprovalRequest(request = {}) {
  return !["已核准", "已撤回", "已取消"].includes(request.status);
}

function formatDeliverableSummary(campaignVendorId, deliverables = []) {
  const createAction = actionGroup([actionButton("新增交付物", "add-vendor-deliverable", campaignVendorId)]);
  if (!deliverables.length) return `<div class="deliverable-stack"><div class="deliverable-item is-empty">尚未建立交付物</div>${createAction}</div>`;
  const rows = deliverables.slice(0, 3).map((item) => {
    const dueDate = item.due_date ? ` ${formatDate(item.due_date)}` : "";
    const actions = actionGroup([
      actionButton("編輯", "edit-vendor-deliverable", item.id),
      actionButton("取消", "cancel-vendor-deliverable", item.id, "is-danger"),
    ]);
    return `
      <div class="deliverable-item">
        <strong>${escapeHtml(item.deliverable_name || "未命名")}</strong>
        <span>${escapeHtml(item.status || "未開始")}${escapeHtml(dueDate)}</span>
        ${actions}
      </div>
    `;
  });
  const overflow = deliverables.length > 3 ? `<div class="deliverable-more">另有 ${deliverables.length - 3} 筆交付物</div>` : "";
  return `<div class="deliverable-stack">${rows.join("")}${overflow}${createAction}</div>`;
}

function formatVendorAmount(campaignVendor = {}) {
  const budget = formatMoney(campaignVendor.budget_amount);
  const actual = formatMoney(campaignVendor.actual_amount);
  if (budget === "未填" && actual === "未填") return "未填";
  if (actual !== "未填") return `${budget} / 實支 ${actual}`;
  return budget;
}

function formatVendorDocuments(campaignVendorId) {
  const documents = state.data.vendorDocuments.filter((document) => document.vendor_id === campaignVendorId);
  if (!documents.length) return "尚未連結";
  return [...new Set(documents.map((document) => document.doc_type || "其他"))].join("、");
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
  if (state.associationDetailId) {
    const association = findAssociation(state.associationDetailId);
    return associationDetailCooperationSection(association);
  }

  const activeCooperations = state.data.associationCooperations.filter((item) => !isCancelledAssociationCooperation(item));
  if (activeCooperations.length) {
    const rows = activeCooperations
      .slice()
      .sort(sortCooperations)
      .slice(0, 8)
      .map((item) => [
        item.item_name || "未命名合作項目",
        item.item_type || sourceTableLabel(item.source_table),
        associationStageCell(item),
        formatDate(item.due_date) || "未排定",
        associationNextStep(item),
      ]);

    return {
      type: "table",
      title: "公會合作紀錄",
      wide: true,
      headers: ["項目", "類型", "階段", "日期", "負責 / 下一步"],
      rows,
    };
  }

  if (state.dataStatus === "live") {
    return {
      type: "table",
      title: "公會合作紀錄",
      wide: true,
      headers: ["狀態", "說明", "下一步"],
      rows: [
        [
          tag("尚無資料", "amber"),
          "目前沒有可顯示的公會合作紀錄。",
          "請先建立公會任務、活動、講座、贊助或期刊資料。",
        ],
      ],
    };
  }

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

function associationPageSections() {
  if (state.associationDetailId) return associationDetailSections();
  return [
    associationListSection(),
    associationSection(),
    associationTagsSection(),
    archivedAssociationsSection(),
  ];
}

function associationListSection() {
  const rows = state.data.associations
    .slice()
    .sort((a, b) => String(associationDisplayName(a)).localeCompare(String(associationDisplayName(b)), "zh-Hant-TW"))
    .map((association) => [
      associationDisplayName(association),
      association.association_type || "未分類",
      tag(association.join_status || "未填", associationRelationshipTone(association.join_status)),
      associationTagText(association.id) || "尚未建立",
      association.internal_owner || "未填",
      actionGroup([
        actionButton("詳情", "view-association-detail", association.id, "is-primary"),
        actionButton("編輯", "edit-association", association.id, "is-primary"),
        actionButton("封存", "archive-association", association.id, "is-danger"),
      ]),
    ]);

  return {
    type: "table",
    title: "公會主檔",
    wide: true,
    headers: ["公會", "類型", "正式關係", "合作標籤", "負責人", "操作"],
    rows: rows.length ? rows : [[
      state.dataStatus === "live" ? "目前尚未建立公會資料" : "台灣省冷凍空調技師公會",
      "公會",
      tag(state.dataStatus === "live" ? "無資料" : "已加入", state.dataStatus === "live" ? "amber" : "green"),
      state.dataStatus === "live" ? "請新增公會主檔" : "期刊合作、講座協辦",
      state.dataStatus === "live" ? "無" : "Eric",
      state.dataStatus === "live" ? actionButton("新增公會", "create-association", "", "is-primary") : "示範資料",
    ]],
  };
}

function associationTagsSection() {
  if (state.data.associations.length || state.data.associationTags.length) {
    const tagsByAssociation = state.data.associationTags.reduce((acc, tagRow) => {
      const key = tagRow.association_id || "unknown";
      if (!acc[key]) acc[key] = [];
      if (tagRow.tag) acc[key].push(tagRow.tag);
      return acc;
    }, {});

    const cards = state.data.associations.slice(0, 8).map((association) => {
      const tags = tagsByAssociation[association.id] || [];
      const fallbackTag = association.join_status ? [association.join_status] : [];
      return [
        associationDisplayName(association),
        [...tags, ...fallbackTag].length ? [...tags, ...fallbackTag].join("、") : "尚未建立關係標籤",
      ];
    });

    if (!cards.length) {
      Object.entries(tagsByAssociation).slice(0, 8).forEach(([associationId, tags]) => {
        cards.push([associationId.slice(0, 8), tags.join("、")]);
      });
    }

    return {
      type: "cards",
      title: "公會關係標籤",
      cards,
    };
  }

  if (state.dataStatus === "live") {
    return {
      type: "cards",
      title: "公會資料狀態",
      cards: [
        ["公會主檔", "目前尚未建立可顯示的公會資料。"],
        ["關係標籤", "目前尚未建立公會關係標籤。"],
        ["合作紀錄", "目前尚未建立公會任務、活動、講座、贊助或期刊資料。"],
        ["畫面狀態", "目前不是功能錯誤，而是公會頁尚未取得可顯示資料。"],
      ],
    };
  }

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

function archivedAssociationsSection() {
  const rows = state.data.archivedAssociations.slice(0, 30).map((association) => [
    associationDisplayName(association),
    tag(association.join_status || "未填", "gray"),
    archiveAssociationMeta(association),
    association.archive_reason || "未填寫原因",
    actionButton("查看詳情", "view-association-detail", association.id, "is-primary"),
  ]);

  return {
    type: "details-table",
    title: `已封存公會（${rows.length}）`,
    summary: "封存後不出現在進行中公會列表，歷史資料保留。",
    wide: true,
    headers: ["公會", "正式關係", "封存資訊", "原因", "操作"],
    rows: rows.length ? rows : [["目前沒有已封存公會", tag("無紀錄", "green"), "無", "無", "無"]],
  };
}

function associationDetailSections() {
  const association = findAssociation(state.associationDetailId);
  if (!association) {
    state.associationDetailId = "";
    return associationPageSections();
  }

  return [
    associationDetailHeaderSection(association),
    associationProfileSection(association),
    associationTagManagerSection(association),
    associationFeesSection(association),
    associationBenefitsSection(association),
    associationNotesSection(association),
    associationTasksSection(association),
    associationEventsSection(association),
    associationPublicationsSection(association),
    associationTaskExpensesSection(association),
    associationDetailCooperationSection(association),
    associationHistorySection(association),
  ];
}

function associationDetailHeaderSection(association = {}) {
  const isArchived = Boolean(association.archived_at);
  return {
    type: "cards",
    title: `公會詳情：${associationDisplayName(association)}`,
    wide: true,
    cards: [
      ["返回", actionGroup([actionButton("返回公會列表", "back-association-list", "", "is-primary")])],
      ["正式關係", `${tag(association.join_status || "未填", isArchived ? "gray" : associationRelationshipTone(association.join_status))} ${isArchived ? tag("已封存", "gray") : ""}`],
      ["合作標籤", relationshipChipList(association.id)],
      ["內部負責人", association.internal_owner || "未填"],
    ],
  };
}

function associationProfileSection(association = {}) {
  return {
    type: "cards",
    title: "公會基本資料",
    wide: true,
    cards: [
      ["類型", escapeHtml(association.association_type || "未分類")],
      ["聯絡人", escapeHtml(association.contact_person || "未填")],
      ["電話 / Email", `${escapeHtml(association.phone || "未填")}<br>${escapeHtml(association.email || "未填")}`],
      ["網站 / LINE", `${escapeHtml(association.website || "未填")}<br>${escapeHtml(association.line_url || "未填")}`],
      ["地址", escapeHtml(association.address || "未填")],
      ["備註", escapeHtml(association.notes || "未填")],
      ["操作", association.archived_at
        ? "已封存公會目前只讀。"
        : actionGroup([
          actionButton("編輯主檔", "edit-association", association.id, "is-primary"),
          actionButton("封存公會", "archive-association", association.id, "is-danger"),
        ])],
    ],
  };
}

function associationTagManagerSection(association = {}) {
  const rows = associationTagsFor(association.id).map((tagRow) => [
    tagRow.tag || "未命名標籤",
    formatDate(tagRow.created_at) || "未記錄",
    association.archived_at ? "已封存公會不再調整標籤" : actionButton("移除", "remove-association-tag", tagRow.id, "is-danger"),
  ]);

  return {
    type: "table",
    title: "關係標籤管理",
    wide: true,
    headers: ["標籤", "建立時間", "操作"],
    rows: rows.length ? rows : [["尚未建立標籤", "無", association.archived_at ? "已封存" : actionButton("新增標籤", "add-association-tag", association.id, "is-primary")]],
    footer: association.archived_at ? "" : actionGroup([actionButton("新增關係標籤", "add-association-tag", association.id, "is-primary")]),
  };
}

function associationFeesSection(association = {}) {
  const fees = associationFeesFor(association.id);
  const rows = fees.map((fee) => [
    String(fee.year || "未填"),
    formatMoney(fee.fee_amount),
    tag(fee.payment_status || "未繳", statusTone(fee.payment_status || "未繳")),
    `${formatDate(fee.due_date) || "未填"} / ${formatDate(fee.renewal_reminder_date) || "未填"}`,
    `${formatDate(fee.payment_date) || "未填"} / ${escapeHtml(fee.receipt_status || "未填")}`,
    escapeHtml(fee.receipt_attachment || "未填"),
    association.archived_at
      ? "已封存公會目前只讀。"
      : actionGroup([
        actionButton("編輯", "edit-association-fee", fee.id, "is-primary"),
        actionButton("取消", "cancel-association-fee", fee.id, "is-danger"),
      ]),
  ]);

  return {
    type: "table",
    title: "年費 / 會費",
    wide: true,
    headers: ["年度", "金額", "繳費狀態", "到期 / 提醒", "繳費 / 收據", "附件", "操作"],
    rows: rows.length ? rows : [[
      String(new Date().getFullYear()),
      "未填",
      tag("未繳", "gray"),
      "無",
      "無",
      "無",
      association.archived_at ? "已封存" : actionButton("新增年費", "create-association-fee", association.id, "is-primary"),
    ]],
    footer: association.archived_at ? "" : actionGroup([actionButton("新增年費 / 會費", "create-association-fee", association.id, "is-primary")]),
  };
}

function associationBenefitsSection(association = {}) {
  const benefits = associationBenefitsFor(association.id);
  const rows = benefits.map((benefit) => [
    escapeHtml(benefit.benefit_name || "未命名權益"),
    escapeHtml(benefit.benefit_type || "其他"),
    tag(benefit.usage_status || "未使用", statusTone(benefit.usage_status || "未使用")),
    formatDate(benefit.valid_until) || "未填",
    escapeHtml(benefit.owner || "未填"),
    escapeHtml(benefit.description || benefit.notes || "未填"),
    association.archived_at
      ? "已封存公會目前只讀。"
      : actionGroup([
        actionButton("編輯", "edit-association-benefit", benefit.id, "is-primary"),
        actionButton("封存", "archive-association-benefit", benefit.id, "is-danger"),
      ]),
  ]);

  return {
    type: "table",
    title: "會員權益",
    wide: true,
    headers: ["權益", "類型", "使用狀態", "有效期限", "負責人", "說明 / 備註", "操作"],
    rows: rows.length ? rows : [[
      "尚未建立會員權益",
      "無",
      tag("未使用", "gray"),
      "無",
      "無",
      "無",
      association.archived_at ? "已封存" : actionButton("新增權益", "create-association-benefit", association.id, "is-primary"),
    ]],
    footer: association.archived_at ? "" : actionGroup([actionButton("新增會員權益", "create-association-benefit", association.id, "is-primary")]),
  };
}

function associationNotesSection(association = {}) {
  const notes = associationNotesFor(association.id);
  const rows = notes.map((note) => [
    escapeHtml(note.note_title || "未命名備註"),
    escapeHtml(note.owner || "未填"),
    escapeHtml(note.attachment || "未填"),
    escapeHtml(note.note || "未填"),
    formatDate(note.updated_at || note.created_at) || "未記錄",
    association.archived_at
      ? "已封存公會目前只讀。"
      : actionGroup([
        actionButton("編輯", "edit-association-note", note.id, "is-primary"),
        actionButton("取消", "cancel-association-note", note.id, "is-danger"),
      ]),
  ]);

  return {
    type: "table",
    title: "備註 / 附件連結",
    wide: true,
    headers: ["標題", "負責人", "附件", "內容", "最後更新", "操作"],
    rows: rows.length ? rows : [[
      "尚未建立備註",
      "無",
      "無",
      "無",
      "無",
      association.archived_at ? "已封存" : actionButton("新增備註", "create-association-note", association.id, "is-primary"),
    ]],
    footer: association.archived_at ? "" : actionGroup([actionButton("新增備註 / 附件連結", "create-association-note", association.id, "is-primary")]),
  };
}

function associationTasksSection(association = {}) {
  const tasks = associationTasksFor(association.id);
  const rows = tasks.map((task) => [
    task.task_name || "未命名任務",
    task.task_type || "其他",
    tag(task.task_status || "待確認", statusTone(task.task_status || "待確認")),
    tag(task.priority || "中", priorityTone(task.priority || "中")),
    `${formatDate(task.start_date) || "未填"} - ${formatDate(task.due_date) || "未填"}`,
    `${Number(task.progress_pct || 0)}%`,
    task.owner || "未填",
    campaignName(task.marketing_campaign_id),
    association.archived_at
      ? "已封存公會目前只讀。"
      : actionGroup([
        actionButton("編輯", "edit-association-task", task.id, "is-primary"),
        actionButton("取消", "cancel-association-task", task.id, "is-danger"),
      ]),
  ]);

  return {
    type: "table",
    title: "公會任務",
    wide: true,
    headers: ["任務", "類型", "狀態", "優先", "期間", "進度", "負責人", "關聯行銷案", "操作"],
    rows: rows.length ? rows : [[
      "尚未建立公會任務",
      "無",
      tag("待建立", "amber"),
      tag("中", "gray"),
      "無",
      "0%",
      "無",
      "無",
      association.archived_at ? "已封存" : actionButton("新增任務", "create-association-task", association.id, "is-primary"),
    ]],
    footer: association.archived_at ? "" : actionGroup([actionButton("新增公會任務", "create-association-task", association.id, "is-primary")]),
  };
}

function associationTaskExpensesSection(association = {}) {
  const expenses = associationTaskExpensesFor(association.id);
  const rows = expenses.map((expense) => [
    expense.expense_type || "其他",
    associationTaskName(expense.task_id),
    formatAssociationExpenseAmount(expense),
    tag(expense.payment_status || "未付款", statusTone(expense.payment_status || "未付款")),
    formatDate(expense.payment_date) || "未排定",
    expense.receipt_status || "未填",
    association.archived_at
      ? "已封存公會目前只讀。"
      : actionGroup([
        actionButton("編輯", "edit-association-task-expense", expense.id, "is-primary"),
        actionButton("取消", "cancel-association-task-expense", expense.id, "is-danger"),
      ]),
  ]);

  return {
    type: "table",
    title: "公會任務費用",
    wide: true,
    headers: ["費用類型", "關聯任務", "金額", "付款", "付款日", "收據", "操作"],
    rows: rows.length ? rows : [[
      "尚未建立任務費用",
      "無",
      "未填",
      tag("未付款", "gray"),
      "無",
      "無",
      association.archived_at ? "已封存" : actionButton("新增費用", "create-association-task-expense", association.id, "is-primary"),
    ]],
    footer: association.archived_at ? "" : actionGroup([actionButton("新增公會任務費用", "create-association-task-expense", association.id, "is-primary")]),
  };
}

function associationEventsSection(association = {}) {
  const events = associationEventsFor(association.id);
  const rows = events.map((event) => [
    escapeHtml(event.event_name || "未命名活動"),
    escapeHtml(event.event_type || "其他"),
    associationStageCell({ source_table: "event", stage: event.event_status || "待確認" }),
    formatDate(event.event_date) || "未排定",
    escapeHtml(event.location || "未填"),
    formatAssociationEventAmount(event),
    escapeHtml(event.owner || "未填"),
    associationTaskName(event.task_id),
    association.archived_at
      ? "已封存公會目前只讀。"
      : actionGroup([
        actionButton("編輯", "edit-association-event", event.id, "is-primary"),
        actionButton("取消", "cancel-association-event", event.id, "is-danger"),
      ]),
  ]);

  return {
    type: "table",
    title: "公會活動 / 講座 / 贊助",
    wide: true,
    headers: ["活動", "類型", "階段", "日期", "地點", "費用", "負責人", "關聯任務", "操作"],
    rows: rows.length ? rows : [[
      "尚未建立公會活動",
      "無",
      tag("待建立", "amber"),
      "無",
      "無",
      "未填",
      "無",
      "無",
      association.archived_at ? "已封存" : actionButton("新增活動", "create-association-event", association.id, "is-primary"),
    ]],
    footer: association.archived_at ? "" : actionGroup([actionButton("新增公會活動", "create-association-event", association.id, "is-primary")]),
  };
}

function associationPublicationsSection(association = {}) {
  const publications = associationPublicationsFor(association.id);
  const rows = publications.map((publication) => [
    escapeHtml(publication.publication_name || "未命名期刊"),
    associationStageCell({ source_table: "publication", stage: publication.material_status || "待確認主題" }),
    `${formatDate(publication.deadline_date) || "未填"} / ${formatDate(publication.publish_date) || "未填"}`,
    escapeHtml(publication.topic || "未填"),
    escapeHtml(publication.ad_spec || "未填"),
    escapeHtml(publication.owner || "未填"),
    associationTaskName(publication.task_id),
    association.archived_at
      ? "已封存公會目前只讀。"
      : actionGroup([
        actionButton("編輯", "edit-association-publication", publication.id, "is-primary"),
        actionButton("取消", "cancel-association-publication", publication.id, "is-danger"),
      ]),
  ]);

  return {
    type: "table",
    title: "公會期刊排程",
    wide: true,
    headers: ["期刊", "素材階段", "截稿 / 刊出", "主題", "規格", "負責人", "關聯任務", "操作"],
    rows: rows.length ? rows : [[
      "尚未建立期刊排程",
      tag("待建立", "amber"),
      "無",
      "無",
      "無",
      "無",
      "無",
      association.archived_at ? "已封存" : actionButton("新增期刊排程", "create-association-publication", association.id, "is-primary"),
    ]],
    footer: association.archived_at ? "" : actionGroup([actionButton("新增期刊排程", "create-association-publication", association.id, "is-primary")]),
  };
}

function associationDetailCooperationSection(association = {}) {
  const rows = state.data.associationCooperations
    .filter((item) => String(item.association_id || "") === String(association.id || ""))
    .filter((item) => !isCancelledAssociationCooperation(item))
    .slice()
    .sort(sortCooperations)
    .map((item) => [
      item.item_name || "未命名合作項目",
      item.item_type || sourceTableLabel(item.source_table),
      associationStageCell(item),
      formatDate(item.due_date) || "未排定",
      associationNextStep(item),
    ]);

  return {
    type: "table",
    title: "合作概覽",
    wide: true,
    headers: ["項目", "類型", "階段", "日期", "負責 / 下一步"],
    rows: rows.length ? rows : [["尚未建立合作紀錄", "無", tag("待建立", "amber"), "無", "後續在 17D/17E/17F 建立任務、費用、活動、期刊、年費與備註 CRUD"]],
  };
}

function associationHistorySection(association = {}) {
  const rows = [];
  if (association.archived_at) {
    rows.push([
      tag("公會封存", "gray"),
      associationDisplayName(association),
      archiveAssociationMeta(association),
      association.archive_reason || "未填寫原因",
    ]);
  }

  state.data.cancelledAssociationTasks
    .filter((task) => String(task.association_id || "") === String(association.id || ""))
    .forEach((task) => {
      rows.push([
        tag("任務取消", "gray"),
        task.task_name || "未命名任務",
        cancellationMeta(task),
        task.cancel_reason || "未填寫原因",
      ]);
    });

  state.data.cancelledAssociationTaskExpenses
    .filter((expense) => String(expense.association_id || "") === String(association.id || ""))
    .forEach((expense) => {
      rows.push([
        tag("費用取消", "gray"),
        `${expense.expense_type || "其他"} / ${associationTaskName(expense.task_id)}`,
        cancellationMeta(expense),
        expense.cancel_reason || "未填寫原因",
      ]);
    });

  state.data.cancelledAssociationEvents
    .filter((event) => String(event.association_id || "") === String(association.id || ""))
    .forEach((event) => {
      rows.push([
        tag("活動取消", "gray"),
        event.event_name || "未命名活動",
        cancellationMeta(event),
        event.cancel_reason || "未填寫原因",
      ]);
    });

  state.data.cancelledAssociationPublications
    .filter((publication) => String(publication.association_id || "") === String(association.id || ""))
    .forEach((publication) => {
      rows.push([
        tag("期刊取消", "gray"),
        publication.publication_name || "未命名期刊",
        cancellationMeta(publication),
        publication.cancel_reason || "未填寫原因",
      ]);
    });

  state.data.cancelledAssociationFees
    .filter((fee) => String(fee.association_id || "") === String(association.id || ""))
    .forEach((fee) => {
      rows.push([
        tag("年費取消", "gray"),
        `${fee.year || "未填年度"} / ${formatMoney(fee.fee_amount)}`,
        cancellationMeta(fee),
        fee.cancel_reason || "未填寫原因",
      ]);
    });

  state.data.archivedAssociationBenefits
    .filter((benefit) => String(benefit.association_id || "") === String(association.id || ""))
    .forEach((benefit) => {
      rows.push([
        tag("權益封存", "gray"),
        benefit.benefit_name || "未命名權益",
        archiveAssociationMeta(benefit),
        benefit.archive_reason || "未填寫原因",
      ]);
    });

  state.data.cancelledAssociationNotes
    .filter((note) => String(note.association_id || "") === String(association.id || ""))
    .forEach((note) => {
      rows.push([
        tag("備註取消", "gray"),
        note.note_title || "未命名備註",
        cancellationMeta(note),
        note.cancel_reason || "未填寫原因",
      ]);
    });

  return {
    type: "details-table",
    title: `歷史紀錄（${rows.length}）`,
    summary: "公會主檔、標籤與後續子項目取消 / 封存紀錄會集中在這裡。",
    wide: true,
    headers: ["類型", "項目", "時間 / 操作者", "原因"],
    rows: rows.length ? rows : [[tag("無紀錄", "green"), "目前沒有已取消或已封存紀錄", "無", "無"]],
  };
}

function associationTasksFor(associationId) {
  return state.data.associationTasks
    .filter((task) => String(task.association_id || "") === String(associationId || ""))
    .sort(compareAssociationTasks);
}

function allAssociationTasksFor(associationId) {
  return [...state.data.associationTasks, ...state.data.cancelledAssociationTasks]
    .filter((task) => String(task.association_id || "") === String(associationId || ""))
    .sort(compareAssociationTasks);
}

function associationTaskExpensesFor(associationId) {
  return state.data.associationTaskExpenses
    .filter((expense) => String(expense.association_id || "") === String(associationId || ""))
    .sort(compareAssociationTaskExpenses);
}

function associationEventsFor(associationId) {
  return state.data.associationEvents
    .filter((event) => String(event.association_id || "") === String(associationId || ""))
    .sort(compareAssociationEvents);
}

function associationPublicationsFor(associationId) {
  return state.data.associationPublications
    .filter((publication) => String(publication.association_id || "") === String(associationId || ""))
    .sort(compareAssociationPublications);
}

function associationFeesFor(associationId) {
  return state.data.associationFees
    .filter((fee) => String(fee.association_id || "") === String(associationId || ""))
    .sort(compareAssociationFees);
}

function associationBenefitsFor(associationId) {
  return state.data.associationBenefits
    .filter((benefit) => String(benefit.association_id || "") === String(associationId || ""))
    .sort(compareAssociationBenefits);
}

function associationNotesFor(associationId) {
  return state.data.associationNotes
    .filter((note) => String(note.association_id || "") === String(associationId || ""))
    .sort(compareAssociationNotes);
}

function findAssociationTask(id) {
  return [...state.data.associationTasks, ...state.data.cancelledAssociationTasks]
    .find((task) => String(task.id || "") === String(id || ""));
}

function findAssociationTaskExpense(id) {
  return [...state.data.associationTaskExpenses, ...state.data.cancelledAssociationTaskExpenses]
    .find((expense) => String(expense.id || "") === String(id || ""));
}

function findAssociationEvent(id) {
  return [...state.data.associationEvents, ...state.data.cancelledAssociationEvents]
    .find((event) => String(event.id || "") === String(id || ""));
}

function findAssociationPublication(id) {
  return [...state.data.associationPublications, ...state.data.cancelledAssociationPublications]
    .find((publication) => String(publication.id || "") === String(id || ""));
}

function findAssociationFee(id) {
  return [...state.data.associationFees, ...state.data.cancelledAssociationFees]
    .find((fee) => String(fee.id || "") === String(id || ""));
}

function findAssociationBenefit(id) {
  return [...state.data.associationBenefits, ...state.data.archivedAssociationBenefits]
    .find((benefit) => String(benefit.id || "") === String(id || ""));
}

function findAssociationNote(id) {
  return [...state.data.associationNotes, ...state.data.cancelledAssociationNotes]
    .find((note) => String(note.id || "") === String(id || ""));
}

function compareAssociationTasks(a = {}, b = {}) {
  const dateDiff = String(a.due_date || "9999-12-31").localeCompare(String(b.due_date || "9999-12-31"));
  if (dateDiff) return dateDiff;

  const priorityDiff = associationPriorityRank(a.priority) - associationPriorityRank(b.priority);
  if (priorityDiff) return priorityDiff;

  return String(b.updated_at || b.created_at || "").localeCompare(String(a.updated_at || a.created_at || ""));
}

function compareAssociationTaskExpenses(a = {}, b = {}) {
  const statusDiff = associationPaymentStatusRank(a.payment_status) - associationPaymentStatusRank(b.payment_status);
  if (statusDiff) return statusDiff;

  const dateDiff = String(a.payment_date || "9999-12-31").localeCompare(String(b.payment_date || "9999-12-31"));
  if (dateDiff) return dateDiff;

  const amountDiff = associationExpenseComparableAmount(b) - associationExpenseComparableAmount(a);
  if (amountDiff) return amountDiff;

  return String(b.updated_at || b.created_at || "").localeCompare(String(a.updated_at || a.created_at || ""));
}

function compareAssociationEvents(a = {}, b = {}) {
  const dateDiff = String(a.event_date || "9999-12-31").localeCompare(String(b.event_date || "9999-12-31"));
  if (dateDiff) return dateDiff;

  return String(b.updated_at || b.created_at || "").localeCompare(String(a.updated_at || a.created_at || ""));
}

function compareAssociationPublications(a = {}, b = {}) {
  const deadlineDiff = String(a.deadline_date || "9999-12-31").localeCompare(String(b.deadline_date || "9999-12-31"));
  if (deadlineDiff) return deadlineDiff;

  const publishDiff = String(a.publish_date || "9999-12-31").localeCompare(String(b.publish_date || "9999-12-31"));
  if (publishDiff) return publishDiff;

  return String(b.updated_at || b.created_at || "").localeCompare(String(a.updated_at || a.created_at || ""));
}

function compareAssociationFees(a = {}, b = {}) {
  const yearDiff = Number(b.year || 0) - Number(a.year || 0);
  if (yearDiff) return yearDiff;

  const dueDiff = String(a.due_date || "9999-12-31").localeCompare(String(b.due_date || "9999-12-31"));
  if (dueDiff) return dueDiff;

  return String(b.updated_at || b.created_at || "").localeCompare(String(a.updated_at || a.created_at || ""));
}

function compareAssociationBenefits(a = {}, b = {}) {
  const dateDiff = String(a.valid_until || "9999-12-31").localeCompare(String(b.valid_until || "9999-12-31"));
  if (dateDiff) return dateDiff;

  return String(a.benefit_name || "").localeCompare(String(b.benefit_name || ""), "zh-Hant-TW");
}

function compareAssociationNotes(a = {}, b = {}) {
  return String(b.updated_at || b.created_at || "").localeCompare(String(a.updated_at || a.created_at || ""));
}

function associationPriorityRank(priority = "") {
  return { 高: 0, 中: 1, 低: 2 }[priority] ?? 3;
}

function associationPaymentStatusRank(status = "") {
  return { 未付款: 0, 待確認: 1, 已付款: 2, 不適用: 3 }[status] ?? 4;
}

function associationExpenseComparableAmount(expense = {}) {
  return Number(expense.actual_amount || expense.budget_amount || 0);
}

function formatAssociationEventAmount(event = {}) {
  const budget = formatMoney(event.budget);
  const actual = formatMoney(event.actual_spend);
  if (budget === "未填" && actual === "未填") return "未填";
  if (actual !== "未填") return `${budget} / 實支 ${actual}`;
  return budget;
}

function associationTaskName(taskId) {
  if (!taskId) return "不關聯任務";
  const task = findAssociationTask(taskId);
  if (!task) return "已取消或未載入任務";
  const suffix = isCancelledAssociationTask(task) ? "（已取消）" : "";
  return `${task.task_name || "未命名任務"}${suffix}`;
}

function formatAssociationExpenseAmount(expense = {}) {
  const budget = formatMoney(expense.budget_amount);
  const actual = formatMoney(expense.actual_amount);
  if (budget === "未填" && actual === "未填") return "未填";
  if (actual !== "未填") return `${budget} / 實支 ${actual}`;
  return budget;
}

function sortCooperations(a, b) {
  const dateA = a.due_date || "9999-12-31";
  const dateB = b.due_date || "9999-12-31";
  if (dateA !== dateB) return dateA.localeCompare(dateB);
  return String(b.created_at || "").localeCompare(String(a.created_at || ""));
}

function sourceTableLabel(source = "") {
  if (source === "task") return "任務";
  if (source === "event") return "活動 / 講座 / 贊助";
  if (source === "publication") return "期刊刊登";
  return "合作紀錄";
}

function isCancelledAssociationCooperation(item = {}) {
  return ["取消", "已取消"].includes(item.stage);
}

function associationDisplayName(association = {}) {
  return association.name || association.association_name || association.title || association.short_name || "未命名公會";
}

function associationNextStep(item = {}) {
  if (item.next_step) return item.next_step;
  if (item.notes) return item.notes;
  if (item.owner) return `負責：${item.owner}`;
  return "待補下一步";
}

function associationStageCell(item = {}) {
  const stage = item.stage || "未填";
  const stageOption = findAssociationStageOption(item);
  if (!stageOption) return tag(stage, statusTone(stage));

  const pct = Number(stageOption.pct_value || 0);
  const tone = pct >= 100 ? "green" : pct >= 50 ? "amber" : statusTone(stage);
  return `${tag(stage, tone)}${progress(`${pct}%`, tone)}`;
}

function findAssociationStageOption(item = {}) {
  return state.data.associationStages.find((option) => (
    option.entity_type === item.source_table
    && option.stage_name === item.stage
  ));
}

function knowledgeSection(isMarketing) {
  const items = visibleKnowledgeItems(isMarketing);
  if (items.length) {
    return {
      type: "table",
      title: isMarketing ? "產品知識審核" : "常用知識條目",
      headers: ["主題", "類型", "證據", "可用狀態", "操作"],
      rows: items.slice(0, 10).map((item) => [
        item.title || "未命名知識",
        item.knowledge_type || "未分類",
        tag(item.evidence_level || "C", evidenceTone(item.evidence_level)),
        tag(item.visibility_status || "待確認", visibilityTone(item.visibility_status)),
        knowledgeActionGroup(item, isMarketing),
      ]),
    };
  }

  if (state.dataStatus === "live") {
    return {
      type: "table",
      title: isMarketing ? "產品知識審核" : "常用知識條目",
      headers: ["狀態", "說明", "下一步"],
      rows: [
        [
          tag("尚無資料", "amber"),
          isMarketing ? "目前尚未建立產品知識條目。" : "目前沒有可供業務使用的知識條目。",
          isMarketing ? "請新增產品差異化、技術比較或 FAQ 條目。" : "待行銷總監建立並標記可對外或僅內部後會顯示。",
        ],
      ],
    };
  }

  return {
    type: "table",
    title: isMarketing ? "產品知識審核" : "常用知識條目",
    headers: ["主題", "類型", "證據", "可用狀態", "操作"],
    rows: [
      ["磁浮主機相對傳統離心機差異", "技術比較", tag("A", "green"), "可對外", "示範資料"],
      ["大型商辦節能改善說法", "應用場景", tag("B", "green"), isMarketing ? "內部 / 待審" : "內部", "示範資料"],
      ["常見競品價格異議回覆", "異議處理", tag("B", "amber"), "內部", "示範資料"],
      ["醫療場域可靠度 FAQ", "FAQ", tag("C", "gray"), isMarketing ? "待技術確認" : "不顯示或標記", "示範資料"],
    ],
  };
}

function knowledgeActionGroup(item = {}, isMarketing = false) {
  const actions = [actionButton("查看", "view-knowledge-item", item.id, "is-primary")];
  if (isMarketing) {
    actions.push(actionButton("編輯", "edit-knowledge-item", item.id));
    if (state.knowledgeArchiveAvailable) {
      actions.push(actionButton("封存", "archive-knowledge-item", item.id, "is-danger"));
    }
  }
  return actionGroup(actions);
}

function visibleKnowledgeItems(isMarketing) {
  const activeItems = state.data.knowledgeItems.filter((item) => !item.archived_at);
  if (isMarketing) return activeItems;
  return activeItems.filter((item) => ["可對外", "僅內部"].includes(item.visibility_status));
}

function evidenceTone(level = "") {
  if (level === "A") return "green";
  if (level === "B") return "amber";
  if (level === "D") return "red";
  return "gray";
}

function visibilityTone(status = "") {
  if (status === "可對外") return "green";
  if (status === "僅內部") return "amber";
  if (status === "禁止使用") return "red";
  return "gray";
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

function archivedKnowledgeSection() {
  if (state.role !== "marketing") return null;
  if (!state.knowledgeArchiveAvailable) {
    return {
      type: "cards",
      title: "已封存知識條目",
      cards: [["封存功能尚未啟用", "請先執行產品知識封存 SQL。完成後，這裡會顯示已封存的歷史紀錄。"]],
    };
  }
  const items = state.data.knowledgeItems.filter((item) => Boolean(item.archived_at));
  return {
    type: "details-table",
    title: `已封存知識條目（${items.length}）`,
    summary: "只讀保留已封存的產品知識，不再顯示給業務使用。",
    wide: true,
    headers: ["主題", "類型", "原可用狀態", "封存資訊", "原因"],
    rows: items.length
      ? items.map((item) => [
        item.title || "未命名知識",
        item.knowledge_type || "未分類",
        tag(item.visibility_status || "未填", visibilityTone(item.visibility_status)),
        knowledgeArchiveMeta(item),
        item.archive_reason || "未填寫原因",
      ])
      : [["無", "目前沒有已封存知識條目。", tag("正常", "green"), "無", "無"]],
  };
}

function knowledgeArchiveMeta(item = {}) {
  const archivedAt = item.archived_at ? formatDate(item.archived_at) : "未記錄時間";
  const archivedBy = item.archived_by ? formatRequester(item.archived_by) : "未記錄封存人";
  return `${archivedAt} / ${archivedBy}`;
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
  const requests = visibleSalesRequests(isMarketing);
  if (requests.length) {
    return {
      type: "table",
      compact: true,
      title: isMarketing ? "業務需求列表" : "我的需求單",
      headers: isMarketing
        ? ["需求", "提出人", "類型", "優先級", "狀態", "操作"]
        : ["需求", "提出人", "類型", "優先級", "狀態", "操作"],
      rows: requests.slice(0, 10).map((request) => [
        request.request_name || "未命名需求",
        formatRequester(request.requested_by),
        request.request_type || "未分類",
        tag(request.priority || "一般", priorityTone(request.priority)),
        tag(request.status || "待處理", requestStatusTone(request.status)),
        isMarketing
          ? actionGroup([
            actionButton("更新", "edit-sales-request", request.id, "is-primary"),
            actionButton("取消", "cancel-sales-request", request.id, "is-danger"),
          ])
          : actionGroup([
            actionButton("檢視", "view-sales-request", request.id),
            actionButton("取消", "cancel-sales-request", request.id, "is-danger"),
          ]),
      ]),
    };
  }

  if (state.dataStatus === "live") {
    const emptyMessage = !isMarketing && state.data.salesRequests.length
      ? "你目前沒有自己提出的需求單。"
      : "目前尚未建立業務需求單。";

    return {
      type: "table",
      title: isMarketing ? "業務需求列表" : "我的需求單",
      headers: ["狀態", "說明", "下一步"],
      rows: [
        [
          tag("尚無資料", "amber"),
          emptyMessage,
          isMarketing ? "請新增或匯入需求單資料。" : "新增需求後會只顯示你的需求單。",
        ],
      ],
    };
  }

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

function visibleSalesRequests(isMarketing) {
  const activeRequests = state.data.salesRequests.filter((request) => !isCancelledSalesRequest(request));
  if (isMarketing) return activeRequests;
  const email = String(state.auth.email || "").toLowerCase();
  const ownRequests = activeRequests.filter((request) => String(request.requested_by || "").toLowerCase() === email);
  return ownRequests;
}

function cancelledSalesRequestSection(isMarketing) {
  const requests = visibleCancelledSalesRequests(isMarketing);
  return {
    type: "details-table",
    compact: true,
    title: `已取消需求（${requests.length}）`,
    summary: isMarketing ? "只讀顯示已取消業務需求。" : "只讀顯示你自己取消的需求。",
    headers: ["需求", "提出人", "類型", "優先級", "取消資訊"],
    rows: requests.length
      ? requests.slice(0, 10).map((request) => [
        request.request_name || "未命名需求",
        formatRequester(request.requested_by),
        request.request_type || "未分類",
        tag(request.priority || "一般", priorityTone(request.priority)),
        cancellationMeta(request),
      ])
      : [[
        "目前沒有已取消需求",
        isMarketing ? "全部業務" : formatRequester(state.auth.email),
        "無",
        tag("無紀錄", "green"),
        "無",
      ]],
  };
}

function visibleCancelledSalesRequests(isMarketing) {
  if (isMarketing) return state.data.cancelledSalesRequests;
  const email = String(state.auth.email || "").toLowerCase();
  return state.data.cancelledSalesRequests.filter((request) => String(request.requested_by || "").toLowerCase() === email);
}

function isCancelledSalesRequest(request = {}) {
  return Boolean(request.cancelled_at) || request.status === "已取消";
}

function formatRequester(email = "") {
  if (!email) return "未填";
  const [name, domain] = String(email).split("@");
  if (!domain) return escapeHtml(email);
  return `<span class="cell-main">${escapeHtml(name)}</span><span class="cell-sub">@${escapeHtml(domain)}</span>`;
}

function cancellationMeta(record = {}) {
  const cancelledBy = record.cancelled_by ? formatRequester(record.cancelled_by) : "未記錄取消人";
  const cancelledAt = record.cancelled_at ? formatDate(record.cancelled_at) : "未記錄時間";
  return `${cancelledAt}<br>${cancelledBy}`;
}

function campaignName(campaignId) {
  const campaign = findCampaign(campaignId);
  return campaign?.name || "未關聯專案";
}

function findCampaign(campaignId) {
  const id = String(campaignId || "");
  return [...state.data.campaigns, ...state.data.archivedCampaigns]
    .find((item) => String(item.id || "") === id);
}

function findAssociation(associationId) {
  const id = String(associationId || "");
  return [...state.data.associations, ...state.data.archivedAssociations]
    .find((item) => String(item.id || "") === id);
}

function activeCampaigns(campaigns = []) {
  return campaigns.filter((campaign) => !campaign.archived_at);
}

function archivedCampaigns(campaigns = []) {
  return campaigns.filter((campaign) => Boolean(campaign.archived_at));
}

function activeAssociations(associations = []) {
  return associations.filter((association) => !association.archived_at);
}

function archivedAssociations(associations = []) {
  return associations.filter((association) => Boolean(association.archived_at));
}

function isCancelledAssociationTask(task = {}) {
  return Boolean(task.cancelled_at) || task.task_status === "取消";
}

function activeAssociationTasks(tasks = []) {
  return tasks.filter((task) => !isCancelledAssociationTask(task));
}

function cancelledAssociationTasks(tasks = []) {
  return tasks.filter(isCancelledAssociationTask);
}

function activeAssociationTaskExpenses(expenses = []) {
  return expenses.filter((expense) => !expense.cancelled_at);
}

function cancelledAssociationTaskExpenses(expenses = []) {
  return expenses.filter((expense) => Boolean(expense.cancelled_at));
}

function isCancelledAssociationEvent(event = {}) {
  return Boolean(event.cancelled_at) || event.event_status === "取消";
}

function activeAssociationEvents(events = []) {
  return events.filter((event) => !isCancelledAssociationEvent(event));
}

function cancelledAssociationEvents(events = []) {
  return events.filter(isCancelledAssociationEvent);
}

function isCancelledAssociationPublication(publication = {}) {
  return Boolean(publication.cancelled_at) || ["取消", "已取消"].includes(publication.material_status);
}

function activeAssociationPublications(publications = []) {
  return publications.filter((publication) => !isCancelledAssociationPublication(publication));
}

function cancelledAssociationPublications(publications = []) {
  return publications.filter(isCancelledAssociationPublication);
}

function activeAssociationFees(fees = []) {
  return fees.filter((fee) => !fee.cancelled_at);
}

function cancelledAssociationFees(fees = []) {
  return fees.filter((fee) => Boolean(fee.cancelled_at));
}

function activeAssociationBenefits(benefits = []) {
  return benefits.filter((benefit) => !benefit.archived_at);
}

function archivedAssociationBenefits(benefits = []) {
  return benefits.filter((benefit) => Boolean(benefit.archived_at));
}

function activeAssociationNotes(notes = []) {
  return notes.filter((note) => !note.cancelled_at);
}

function cancelledAssociationNotes(notes = []) {
  return notes.filter((note) => Boolean(note.cancelled_at));
}

function activeCampaignTasks(tasks = state.data.campaignTasks) {
  return tasks.filter((task) => !task.cancelled_at);
}

function cancelledCampaignTasks(tasks = state.data.campaignTasks) {
  return tasks.filter((task) => Boolean(task.cancelled_at));
}

function activeCampaignBudgetItems(items = state.data.campaignBudgetItems) {
  return items.filter((item) => !item.cancelled_at);
}

function cancelledCampaignBudgetItems(items = state.data.campaignBudgetItems) {
  return items.filter((item) => Boolean(item.cancelled_at));
}

function activeCampaignDocuments(documents = state.data.campaignDocuments) {
  return documents.filter((document) => !document.archived_at);
}

function archivedCampaignDocuments(documents = state.data.campaignDocuments) {
  return documents.filter((document) => Boolean(document.archived_at));
}

function activeCampaignRisks(risks = state.data.campaignRisks) {
  return risks.filter((risk) => !risk.archived_at);
}

function archivedCampaignRisks(risks = state.data.campaignRisks) {
  return risks.filter((risk) => Boolean(risk.archived_at));
}

function activeCampaignRiskUpdates(updates = state.data.campaignRiskUpdates) {
  return updates.filter((update) => !update.cancelled_at);
}

function cancelledCampaignRiskUpdates(updates = state.data.campaignRiskUpdates) {
  return updates.filter((update) => Boolean(update.cancelled_at));
}

function campaignTasksFor(campaignId) {
  return state.data.campaignTasks
    .filter((task) => String(task.campaign_id || "") === String(campaignId || ""))
    .sort(sortBySeqThenDate("planned_end"));
}

function campaignBudgetItemsFor(campaignId) {
  return state.data.campaignBudgetItems
    .filter((item) => String(item.campaign_id || "") === String(campaignId || ""))
    .sort(sortBySeqThenDate("created_at"));
}

function campaignDocumentsFor(campaignId) {
  return state.data.campaignDocuments
    .filter((document) => String(document.campaign_id || "") === String(campaignId || ""))
    .sort((a, b) => String(b.uploaded_at || b.created_at || "").localeCompare(String(a.uploaded_at || a.created_at || "")));
}

function campaignRisksFor(campaignId) {
  return state.data.campaignRisks
    .filter((risk) => String(risk.campaign_id || "") === String(campaignId || ""))
    .sort(compareCampaignRisks);
}

function allCampaignRisksFor(campaignId) {
  return [...state.data.campaignRisks, ...state.data.archivedCampaignRisks]
    .filter((risk) => String(risk.campaign_id || "") === String(campaignId || ""))
    .sort(compareCampaignRisks);
}

function campaignRiskUpdatesFor(riskId) {
  return state.data.campaignRiskUpdates
    .filter((update) => String(update.risk_id || "") === String(riskId || ""))
    .sort(compareRiskUpdates);
}

function cancelledCampaignRiskUpdatesFor(riskId) {
  return state.data.cancelledCampaignRiskUpdates
    .filter((update) => String(update.risk_id || "") === String(riskId || ""))
    .sort(compareRiskUpdates);
}

function campaignRiskUpdatesForCampaign(campaignId) {
  const riskIds = new Set(allCampaignRisksFor(campaignId).map((risk) => String(risk.id || "")));
  return state.data.campaignRiskUpdates
    .filter((update) => riskIds.has(String(update.risk_id || "")))
    .sort(compareRiskUpdates);
}

function cancelledCampaignRiskUpdatesForCampaign(campaignId) {
  const riskIds = new Set(allCampaignRisksFor(campaignId).map((risk) => String(risk.id || "")));
  return state.data.cancelledCampaignRiskUpdates
    .filter((update) => riskIds.has(String(update.risk_id || "")))
    .sort(compareRiskUpdates);
}

function performanceForCampaign(campaignId) {
  return state.data.campaignPerformance
    .find((item) => String(item.campaign_id || "") === String(campaignId || ""));
}

function findCampaignPerformance(id) {
  return state.data.campaignPerformance
    .find((item) => String(item.id || "") === String(id || ""));
}

function sortBySeqThenDate(dateField) {
  return (a, b) => {
    const seqA = Number(a.seq);
    const seqB = Number(b.seq);
    if (Number.isFinite(seqA) && Number.isFinite(seqB) && seqA !== seqB) return seqA - seqB;
    if (Number.isFinite(seqA) && !Number.isFinite(seqB)) return -1;
    if (!Number.isFinite(seqA) && Number.isFinite(seqB)) return 1;
    return String(a[dateField] || "").localeCompare(String(b[dateField] || ""));
  };
}

function localDateString(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function addDaysString(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return localDateString(date);
}

function startOfWeekString() {
  const date = new Date();
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return localDateString(date);
}

function upcomingCampaignTasks() {
  const limit = addDaysString(7);
  return state.data.campaignTasks
    .filter((task) => {
      const due = formatDate(task.planned_end);
      const status = task.status || "";
      return due && due <= limit && !["已完成", "完成", "結案"].includes(status);
    })
    .sort((a, b) => String(a.planned_end || "").localeCompare(String(b.planned_end || "")));
}

function pendingCampaignPayments() {
  return state.data.campaignBudgetItems
    .filter((item) => {
      const paymentStatus = item.payment_status || "未請款";
      return !["已付款", "不需付款"].includes(paymentStatus) && hasBudgetAmount(item);
    })
    .sort(comparePendingCampaignPayments);
}

function comparePendingCampaignPayments(a = {}, b = {}) {
  const statusDiff = paymentStatusPriority(a) - paymentStatusPriority(b);
  if (statusDiff) return statusDiff;

  const dueDiff = paymentDuePriority(a) - paymentDuePriority(b);
  if (dueDiff) return dueDiff;

  const dateDiff = String(a.payment_date || "9999-12-31").localeCompare(String(b.payment_date || "9999-12-31"));
  if (dateDiff) return dateDiff;

  const amountDiff = budgetComparableAmount(b) - budgetComparableAmount(a);
  if (amountDiff) return amountDiff;

  const campaignDiff = String(campaignName(a.campaign_id)).localeCompare(String(campaignName(b.campaign_id)), "zh-Hant-TW");
  if (campaignDiff) return campaignDiff;

  return Number(a.seq || 0) - Number(b.seq || 0);
}

function paymentStatusPriority(item = {}) {
  return item.payment_status === "待付款" ? 0 : 1;
}

function paymentDuePriority(item = {}) {
  const due = formatDate(item.payment_date);
  if (!due) return 2;
  return due <= addDaysString(7) ? 0 : 1;
}

function budgetComparableAmount(item = {}) {
  const twd = Number(item.amount_twd || 0);
  const rmb = Number(item.amount_rmb || 0);
  const exchangeRate = Number(item.exchange_rate || 0);
  return twd || (rmb && exchangeRate ? rmb * exchangeRate : rmb);
}

function hasBudgetAmount(item = {}) {
  return Number(item.amount_twd || 0) > 0 || Number(item.amount_rmb || 0) > 0;
}

function campaignPerformanceSpend(campaign = {}) {
  const actual = Number(campaign.actual_spend || 0);
  const budget = Number(campaign.budget || 0);
  if (actual > 0) return actual;
  if (budget > 0) return budget;
  return null;
}

function ratioText(numerator, denominator) {
  const top = Number(numerator || 0);
  const bottom = Number(denominator || 0);
  if (!bottom || top < 0) return "未填";
  return `${Math.round((top / bottom) * 100)}%`;
}

function costPerText(amount, count) {
  const total = Number(amount || 0);
  const qty = Number(count || 0);
  if (!total || !qty) return "未填";
  return formatCurrencyFull(Math.round(total / qty));
}

function formatCount(value) {
  const number = Number(value || 0);
  return number.toLocaleString("zh-Hant-TW");
}

function compareCampaignRisks(a = {}, b = {}) {
  const impactDiff = riskImpactPriority(a) - riskImpactPriority(b);
  if (impactDiff) return impactDiff;

  const statusDiff = riskStatusPriority(a) - riskStatusPriority(b);
  if (statusDiff) return statusDiff;

  const dateDiff = String(formatDate(a.due_date) || "9999-12-31").localeCompare(String(formatDate(b.due_date) || "9999-12-31"));
  if (dateDiff) return dateDiff;

  return String(b.updated_at || b.created_at || "").localeCompare(String(a.updated_at || a.created_at || ""));
}

function compareRiskUpdates(a = {}, b = {}) {
  const importantDiff = Number(b.is_important === true) - Number(a.is_important === true);
  if (importantDiff) return importantDiff;

  const updateDateDiff = String(b.update_date || b.created_at || "").localeCompare(String(a.update_date || a.created_at || ""));
  if (updateDateDiff) return updateDateDiff;

  return String(b.created_at || "").localeCompare(String(a.created_at || ""));
}

function riskImpactPriority(risk = {}) {
  return { 高: 0, 中: 1, 低: 2 }[risk.impact_level] ?? 3;
}

function riskStatusPriority(risk = {}) {
  return { 待處理: 0, 處理中: 1, 暫緩: 2, 已解決: 3 }[risk.status] ?? 4;
}

function riskImpactTone(level = "") {
  if (level === "高") return "red";
  if (level === "中") return "amber";
  if (level === "低") return "green";
  return "gray";
}

function riskStatusTone(status = "") {
  if (status === "已解決") return "green";
  if (status === "處理中") return "amber";
  if (status === "待處理") return "red";
  if (status === "暫緩") return "gray";
  return statusTone(status);
}

function latestRiskUpdate(riskId) {
  return campaignRiskUpdatesFor(riskId)[0] || null;
}

function latestRiskUpdateText(update = null) {
  if (!update) return "尚無追蹤";
  const date = formatDate(update.update_date) || "未填日期";
  const important = update.is_important ? "重要 / " : "";
  const next = update.next_followup_date ? ` / 下次：${formatDate(update.next_followup_date)}` : "";
  return `${important}${date} / ${update.update_note || "未填內容"}${next}`;
}

function riskUpdateTimelineText(riskId) {
  const updates = campaignRiskUpdatesFor(riskId);
  if (!updates.length) return "尚無追蹤";
  const shown = updates.slice(0, 3).map((update) => {
    const important = update.is_important ? "重要 / " : "";
    return `${important}${formatDate(update.update_date) || "未填日期"} / ${update.update_note || "未填內容"}`;
  });
  const more = updates.length > 3 ? `另有 ${updates.length - 3} 筆，可展開下方全案追蹤表查看` : "";
  return [...shown, more].filter(Boolean).join("<br>");
}

function riskNextFollowupDate(risk = {}) {
  return latestRiskUpdate(risk.id)?.next_followup_date || risk.due_date || "";
}

function isRiskOverdue(risk = {}) {
  if (risk.status === "已解決") return false;
  const date = formatDate(riskNextFollowupDate(risk));
  return Boolean(date && date < localDateString());
}

function executiveRiskItems() {
  return state.data.campaignRisks
    .filter((risk) => risk.status !== "已解決")
    .filter((risk) => {
      const latest = latestRiskUpdate(risk.id);
      return risk.show_on_dashboard === true || risk.impact_level === "高" || latest?.is_important === true || isRiskOverdue(risk);
    })
    .sort(compareExecutiveRisks);
}

function compareExecutiveRisks(a = {}, b = {}) {
  const highDiff = Number(b.impact_level === "高") - Number(a.impact_level === "高");
  if (highDiff) return highDiff;

  const overdueDiff = Number(isRiskOverdue(b)) - Number(isRiskOverdue(a));
  if (overdueDiff) return overdueDiff;

  const dashboardDiff = Number(b.show_on_dashboard === true) - Number(a.show_on_dashboard === true);
  if (dashboardDiff) return dashboardDiff;

  return String(b.updated_at || b.created_at || "").localeCompare(String(a.updated_at || a.created_at || ""));
}

function highOpenRisks() {
  return state.data.campaignRisks
    .filter((risk) => risk.impact_level === "高" && risk.status !== "已解決")
    .sort(compareCampaignRisks);
}

function overdueRisks() {
  return state.data.campaignRisks
    .filter((risk) => risk.status !== "已解決")
    .filter(isRiskOverdue)
    .sort(compareExecutiveRisks);
}

function executiveConfirmRisks() {
  return state.data.campaignRisks
    .filter((risk) => risk.status !== "已解決" && risk.show_on_dashboard === true)
    .sort(compareExecutiveRisks);
}

function weeklyRiskUpdates() {
  const start = startOfWeekString();
  const end = localDateString();
  return state.data.campaignRiskUpdates
    .filter((update) => {
      const date = formatDate(update.update_date || update.created_at);
      return date && date >= start && date <= end;
    })
    .sort(compareRiskUpdates);
}

function budgetAmountText(item = {}) {
  const twd = Number(item.amount_twd || 0);
  const rmb = Number(item.amount_rmb || 0);
  const parts = [];
  if (twd) parts.push(`NT$ ${twd.toLocaleString("zh-Hant-TW")}`);
  if (rmb) parts.push(`RMB ${rmb.toLocaleString("zh-Hant-TW")}`);
  return parts.length ? parts.join(" / ") : "未填";
}

function archiveDocumentMeta(document = {}) {
  const archivedBy = document.archived_by ? formatRequester(document.archived_by) : "未記錄封存人";
  const archivedAt = document.archived_at ? formatDate(document.archived_at) : "未記錄時間";
  return `${archivedAt}<br>${archivedBy}`;
}

function archiveRiskMeta(risk = {}) {
  const archivedBy = risk.archived_by ? formatRequester(risk.archived_by) : "未記錄封存人";
  const archivedAt = risk.archived_at ? formatDate(risk.archived_at) : "未記錄時間";
  return `${archivedAt}<br>${archivedBy}`;
}

function findCampaignTask(id) {
  return [...state.data.campaignTasks, ...state.data.cancelledCampaignTasks].find((task) => String(task.id || "") === String(id || ""));
}

function findCampaignBudgetItem(id) {
  return [...state.data.campaignBudgetItems, ...state.data.cancelledCampaignBudgetItems].find((item) => String(item.id || "") === String(id || ""));
}

function findCampaignDocument(id) {
  return [...state.data.campaignDocuments, ...state.data.archivedCampaignDocuments].find((document) => String(document.id || "") === String(id || ""));
}

function findCampaignRisk(id) {
  return [...state.data.campaignRisks, ...state.data.archivedCampaignRisks].find((risk) => String(risk.id || "") === String(id || ""));
}

function findCampaignRiskUpdate(id) {
  return [...state.data.campaignRiskUpdates, ...state.data.cancelledCampaignRiskUpdates].find((update) => String(update.id || "") === String(id || ""));
}

function clearCampaignDrilldown() {
  state.campaignDetailId = "";
  state.campaignInspectionMode = "";
  state.associationDetailId = "";
}

function archiveCampaignMeta(campaign = {}) {
  const date = formatDate(campaign.archived_at);
  const by = campaign.archived_by || "未記錄";
  const reason = campaign.archive_reason ? ` / ${campaign.archive_reason}` : "";
  return date ? `${date} / ${by}${reason}` : `${by}${reason}`;
}

function archiveAssociationMeta(association = {}) {
  const date = formatDate(association.archived_at);
  const by = association.archived_by || "未記錄";
  const reason = association.archive_reason ? ` / ${association.archive_reason}` : "";
  return date ? `${date} / ${by}${reason}` : `${by}${reason}`;
}

function associationTagsFor(associationId) {
  const id = String(associationId || "");
  return state.data.associationTags.filter((tagRow) => String(tagRow.association_id || "") === id);
}

function associationTagText(associationId) {
  return associationTagsFor(associationId).map((tagRow) => tagRow.tag).filter(Boolean).join("、");
}

function relationshipChipList(associationId) {
  const chips = associationTagsFor(associationId)
    .map((tagRow) => `<span class="relationship-chip">${escapeHtml(tagRow.tag || "未命名標籤")}</span>`);
  return chips.length ? `<div class="relationship-chip-list">${chips.join("")}</div>` : "尚未建立合作標籤";
}

function associationRelationshipTone(status = "") {
  if (["已加入", "已入會", "合作中"].includes(status)) return "green";
  if (["洽談中", "評估中", "暫停合作"].includes(status)) return "amber";
  if (["未加入", "未入會", "已封存"].includes(status)) return "gray";
  return statusTone(status);
}

function associationStatusOptions(selected = "") {
  const fixed = ["已入會", "未入會", "洽談中", "暫停合作", "合作中", "評估中"];
  const existing = [...state.data.associations, ...state.data.archivedAssociations]
    .map((association) => association.join_status)
    .filter(Boolean);
  return selectOptions([...new Set([...fixed, ...existing, selected].filter(Boolean))].map((value) => [value, value]), selected || "未入會");
}

function associationTypeSuggestions(selected = "") {
  const fixed = ["公會", "協會", "學會", "商會", "產業組織", "其他"];
  const existing = [...state.data.associations, ...state.data.archivedAssociations]
    .map((association) => association.association_type)
    .filter(Boolean);
  return [...new Set([...fixed, ...existing, selected].filter(Boolean))]
    .map((value) => `<option value="${escapeAttr(value)}"></option>`)
    .join("");
}

function associationTagSuggestions(selected = "") {
  const fixed = ["已入會", "未入會", "講座協辦", "期刊合作", "活動贊助", "會員大會", "年度贊助", "名單權益", "曝光合作", "技術交流"];
  const existing = state.data.associationTags.map((tagRow) => tagRow.tag).filter(Boolean);
  return [...new Set([...fixed, ...existing, selected].filter(Boolean))]
    .map((value) => `<option value="${escapeAttr(value)}"></option>`)
    .join("");
}

function priorityTone(priority = "") {
  if (["急件", "急", "高"].includes(priority)) return "red";
  if (["一般", "中"].includes(priority)) return "amber";
  return "gray";
}

function requestStatusTone(status = "") {
  if (status === "已完成") return "green";
  if (["處理中", "待業務確認"].includes(status)) return "amber";
  if (status === "待處理") return "gray";
  return statusTone(status);
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
  const resources = activeResources();
  if (resources.length) {
    return {
      type: "table",
      title: "常用資料",
      headers: ["資料", "版本", "適用", "操作"],
      rows: resources.slice(0, 5).map((resource) => [
        resource.title || "未命名資料",
        resource.version || "未標示",
        resource.audience || resource.product_line || "未分類",
        resourceActionGroup(resource),
      ]),
    };
  }

  if (state.dataStatus === "live") {
    return {
      type: "table",
      title: "常用資料",
      headers: ["狀態", "說明", "下一步"],
      rows: [[tag("尚無可用資料", "amber"), "目前沒有可供業務使用的未封存文宣資源。", "請向行銷提出素材需求。"]],
    };
  }

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
  const requests = visibleSalesRequests(false).filter((request) => !["已完成", "已取消"].includes(request.status || ""));
  if (requests.length) {
    return {
      type: "list",
      title: "我的待辦",
      items: requests.slice(0, 5).map((request) => [
        request.request_name || "未命名需求",
        request.description || request.request_type || "待補需求說明。",
        request.status || "待處理",
        request.priority === "急件" ? "high" : request.priority === "一般" ? "medium" : "ok",
      ]),
    };
  }

  return {
    type: "table",
    title: "我的待辦",
    headers: ["狀態", "說明", "下一步"],
    rows: [[tag("目前無待辦", "green"), "你目前沒有未完成的需求單。", "有需要素材或資料時，可提出業務需求。"]],
  };
}

function resourceLibrarySection() {
  const resources = activeResources();
  if (resources.length) {
    return {
      type: "table",
      title: "文宣 / 資源資料庫",
      wide: true,
      headers: ["檔案名稱", "類型", "產品線", "適用客群", "狀態", "操作"],
      rows: resources.slice(0, 8).map((resource) => [
        resource.title || "未命名資料",
        resource.resource_type || "其他",
        resource.product_line || "未分類",
        resource.audience || "未設定",
        resource.is_external_usable ? tag("可對外", "green") : tag("內部 / 待確認", "amber"),
        resourceActionGroup(resource),
      ]),
    };
  }

  if (state.dataStatus === "live") {
    return {
      type: "table",
      title: "文宣 / 資源資料庫",
      wide: true,
      headers: ["狀態", "說明", "下一步"],
      rows: [[tag("尚無可用資料", "amber"), "目前沒有可供業務使用的未封存文宣 / DM / 資源。", "可從業務需求單提出需要的資料。"]],
    };
  }

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

function salesKnowledgeResourcesSection() {
  const resources = activeResources();
  if (resources.length) {
    return {
      type: "table",
      title: "文宣資源",
      wide: true,
      headers: ["資源", "類型", "產品線", "適用", "操作"],
      rows: resources.slice(0, 8).map((resource) => [
        resource.title || "未命名資料",
        resource.resource_type || "其他",
        resource.product_line || "未分類",
        resource.audience || "未設定",
        resourceActionGroup(resource),
      ]),
      footer: "文宣資源是獨立資料庫，可直接使用；知識條目旁的關聯文宣只是輔助參考。",
    };
  }

  if (state.dataStatus === "live") {
    return {
      type: "table",
      title: "文宣資源",
      wide: true,
      headers: ["狀態", "說明", "下一步"],
      rows: [[tag("尚無可用資料", "amber"), "目前沒有可供業務使用的未封存文宣資源。", "可從業務需求單提出需要的資料。"]],
    };
  }

  return resourceLibrarySection();
}

function marketingResourceManagerSection() {
  const resources = activeResources();
  if (resources.length) {
    return {
      type: "table",
      title: "文宣資源管理",
      headerAction: actionButton("新增資源", "create-marketing-resource", "", "is-primary"),
      wide: true,
      headers: ["資源", "類型", "適用", "狀態", "檔案 / 連結", "操作"],
      rows: resources.slice(0, 10).map((resource) => [
        resource.title || "未命名資料",
        resource.resource_type || "其他",
        resource.audience || resource.product_line || "未分類",
        resource.is_external_usable ? tag("可對外", "green") : tag("內部", "amber"),
        resourceActionGroup(resource),
        actionGroup([
          actionButton("編輯", "edit-marketing-resource", resource.id, "is-primary"),
          actionButton("封存", "archive-marketing-resource", resource.id, "is-danger"),
        ]),
      ]),
    };
  }

  return {
    type: "table",
    title: "文宣資源管理",
    headerAction: actionButton("新增資源", "create-marketing-resource", "", "is-primary"),
    wide: true,
    headers: ["狀態", "說明", "下一步"],
    rows: [
      [
        tag("尚無資料", "amber"),
        "目前沒有從 marketing_resources 讀到文宣 / DM / 資源。",
        "請由右上角新增資源。",
      ],
    ],
  };
}

function archivedMarketingResourcesSection() {
  const rows = archivedResources().slice(0, 20).map((resource) => [
    resource.title || "未命名資料",
    resource.resource_type || "其他",
    resource.audience || resource.product_line || "未分類",
    resourceReferenceSummary(resource.id),
    archiveMeta(resource),
  ]);

  return {
    type: "details-table",
    title: `已封存文宣資源（${rows.length}）`,
    summary: "只讀顯示，不提供復原或真刪除。",
    wide: true,
    headers: ["資源", "類型", "適用", "引用", "封存資訊"],
    rows: rows.length ? rows : [[tag("無封存", "green"), "目前沒有已封存文宣資源。", "無", "無", "無"]],
  };
}

function resourceUsageRuleSection() {
  return {
    type: "cards",
    title: "使用規則",
    cards: [
      ["版本清楚", "每份資料顯示版本與更新日期，避免使用過期檔案。"],
      ["範圍清楚", "標示可對外、內部使用、待確認或禁止使用。"],
      ["並行管理", "文宣資源可直接下載；與產品知識的關聯只是輔助脈絡。"],
      ["需求回流", "業務找不到資料時，可直接提出需求單。"],
    ],
  };
}

function tenderSection() {
  if (state.data.tenders.length) {
    return {
      type: "table",
      title: "標案結果",
      headers: ["標案", "截止", "狀態", "操作"],
      rows: state.data.tenders.slice(0, 8).map((tender) => [
        tender.title || "未命名標案",
        formatDate(tender.published_at) || "未標示",
        tag(tender.status || "未讀", statusTone(tender.status)),
        tender.converted_lead_id ? "已轉名單" : tender.status === "已追蹤" ? "轉名單" : "查看",
      ]),
    };
  }

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

function tenderAdminSection() {
  return {
    type: "cards",
    title: "招標管理功能",
    cards: [
      ["監測專案", "管理來源網址、頁數、啟用狀態與最近掃描結果。"],
      ["關鍵字", "維護冰水主機、節能、磁浮、中央空調等關鍵字。"],
      ["篩選規則", "設定排除條件與相關度，避免低關聯標案進名單。"],
      ["轉商機", "標案先評估、再追蹤，確認後才轉入商機 / 名單。"],
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
  const leads = visibleSalesLeads();
  if (leads.length) {
    return {
      type: "table",
      title: "我的名單",
      headerAction: state.auth.canSwitchRoles ? "" : actionButton("新增名單", "create-sales-lead", "", "is-primary"),
      headers: ["公司 / 案件", "來源", "狀態", "下次追蹤"],
      rows: leads.slice(0, 8).map((lead) => [
        lead.company_name || "未命名名單",
        lead.source_channel || "未分類",
        tag(lead.stage || "詢問", leadStageTone(lead.stage)),
        formatDate(lead.next_followup_date) || "未設定",
      ]),
    };
  }

  return {
    type: "table",
    title: "我的名單",
    headerAction: state.auth.canSwitchRoles ? "" : actionButton("新增名單", "create-sales-lead", "", "is-primary"),
    headers: ["公司 / 案件", "來源", "狀態", "下次追蹤"],
    rows: [[tag("尚無指定名單", "green"), "目前沒有指派給你的名單。", "無", "無"]],
  };
}

function visibleSalesLeads() {
  if (!state.data.leads.length) return [];
  if (state.role === "sales" && state.auth.canSwitchRoles) return [];

  const email = String(state.auth.email || "").toLowerCase();
  return state.data.leads.filter((lead) => String(lead.assigned_sales || "").toLowerCase() === email);
}

function leadStageTone(stage = "") {
  if (stage === "形成商機") return "green";
  if (stage === "需主管協助") return "amber";
  if (stage === "業務跟進") return "";
  return "gray";
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
  const toneClass = tone ? ` ${escapeAttr(tone)}` : "";
  return `<span class="tag${toneClass}">${escapeHtml(label)}</span>`;
}

function actionButton(label, action, id = "", tone = "", disabled = false) {
  const toneClass = tone ? ` ${escapeAttr(tone)}` : "";
  const disabledAttr = disabled ? " disabled" : "";
  return `<button class="inline-action${toneClass}" type="button" data-action="${escapeAttr(action)}" data-id="${escapeAttr(id)}"${disabledAttr}>${escapeHtml(label)}</button>`;
}

function actionGroup(actions = []) {
  return `<div class="action-group">${actions.join("")}</div>`;
}

function disabledInlineAction(label) {
  return `<button class="inline-action" type="button" disabled>${escapeHtml(label)}</button>`;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value = "") {
  return escapeHtml(value);
}

function statusTone(status = "") {
  if (["已追蹤", "已完成", "可對外", "已付款", "已繳", "已簽約", "已報價", "已核准", "已使用"].includes(status)) return "green";
  if (["評估中", "待確認", "待付款", "待核准", "待報價", "進行中", "準備中", "已送審", "待審核", "需修正"].includes(status)) return "amber";
  if (["已排除", "逾期", "未請款", "未付款", "未繳", "未開始", "未使用", "不適用"].includes(status)) return "gray";
  if (["追加待核"].includes(status)) return "red";
  return "";
}

function formatMoney(value) {
  const number = Number(value || 0);
  if (!number) return "未填";
  if (number >= 10000) return `${Math.round(number / 10000)}萬`;
  return `${number.toLocaleString("zh-Hant-TW")}元`;
}

function formatCurrencyFull(value) {
  const number = Number(value || 0);
  return `NT$ ${number.toLocaleString("zh-Hant-TW")}`;
}

function formatDate(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function formatFileSize(bytes) {
  const number = Number(bytes || 0);
  if (!number) return "";
  if (number < 1024 * 1024) return `${Math.round(number / 1024)} KB`;
  return `${(number / 1024 / 1024).toFixed(1)} MB`;
}

function progress(label, tone = "") {
  const value = Number.parseInt(label, 10);
  const safeValue = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
  const toneClass = tone ? ` ${escapeAttr(tone)}` : "";
  return `${escapeHtml(label)}<div class="progress-track"><div class="progress-fill${toneClass}" style="width:${safeValue}%"></div></div>`;
}

function nowIso() {
  return new Date().toISOString();
}

function selectOptions(options = [], selected = "") {
  const hasSelected = !selected || options.some(([value]) => String(value) === String(selected));
  const normalizedOptions = hasSelected ? options : [...options, [selected, `${selected}（既有值）`]];
  return normalizedOptions.map(([value, label]) => {
    const isSelected = String(value) === String(selected) ? " selected" : "";
    return `<option value="${escapeAttr(value)}"${isSelected}>${escapeHtml(label)}</option>`;
  }).join("");
}

function leadOptions(selected = "") {
  const options = [["", "不關聯名單"]];
  const leads = state.role === "sales" ? visibleSalesLeads() : state.data.leads;
  leads.slice(0, 50).forEach((lead) => {
    const contact = lead.contact_name ? ` / ${lead.contact_name}` : "";
    options.push([lead.id, `${lead.company_name || "未命名名單"}${contact}`]);
  });
  return selectOptions(options, selected);
}

function salesLeadFormHtml(lead = {}) {
  return `
    <div class="form-grid">
      <label class="form-field is-wide">
        <span>公司 / 案件名稱</span>
        <input name="company_name" value="${escapeAttr(lead.company_name || "")}" required>
      </label>
      <label class="form-field">
        <span>聯絡人</span>
        <input name="contact_name" value="${escapeAttr(lead.contact_name || "")}">
      </label>
      <label class="form-field">
        <span>聯絡電話</span>
        <input name="contact_phone" value="${escapeAttr(lead.contact_phone || "")}">
      </label>
      <label class="form-field">
        <span>聯絡 Email</span>
        <input name="contact_email" type="email" value="${escapeAttr(lead.contact_email || "")}">
      </label>
      <label class="form-field">
        <span>來源</span>
        <input name="source_channel" value="${escapeAttr(lead.source_channel || "")}" placeholder="例如：拜訪、官網、活動、介紹">
      </label>
      <label class="form-field">
        <span>重要性</span>
        <select name="importance">
          ${selectOptions([["高", "高"], ["中", "中"], ["低", "低"]], lead.importance || "中")}
        </select>
      </label>
      <label class="form-field">
        <span>狀態</span>
        <select name="stage">
          ${selectOptions([["詢問", "詢問"], ["有效名單", "有效名單"], ["業務跟進", "業務跟進"], ["形成商機", "形成商機"], ["需主管協助", "需主管協助"]], lead.stage || "詢問")}
        </select>
      </label>
      <label class="form-field">
        <span>下次追蹤</span>
        <input name="next_followup_date" type="date" value="${escapeAttr(formatDate(lead.next_followup_date))}">
      </label>
      <label class="form-field is-wide">
        <span>需求 / 備註</span>
        <textarea name="requirement_note">${escapeHtml(lead.requirement_note || "")}</textarea>
      </label>
      <label class="form-field is-wide">
        <span>下一步</span>
        <textarea name="next_step">${escapeHtml(lead.next_step || "")}</textarea>
      </label>
    </div>
  `;
}

function salesLeadPayload(values = {}) {
  return {
    company_name: values.company_name?.trim(),
    contact_name: values.contact_name?.trim() || null,
    contact_phone: values.contact_phone?.trim() || null,
    contact_email: values.contact_email?.trim() || null,
    source_channel: values.source_channel?.trim() || null,
    requirement_note: values.requirement_note?.trim() || null,
    importance: values.importance || "中",
    assigned_sales: state.auth.email,
    stage: values.stage || "詢問",
    next_step: values.next_step?.trim() || null,
    next_followup_date: values.next_followup_date || null,
    updated_at: nowIso(),
  };
}

function openCreateSalesLeadModal() {
  openModal("新增我的名單", salesLeadFormHtml(), {
    submitLabel: "建立名單",
    onSubmit: async (form) => {
      const values = formValues(form);
      const payload = salesLeadPayload(values);
      if (!payload.company_name) throw new Error("請輸入公司或案件名稱。");
      await api("POST", "leads", payload);
      closeModal();
      await loadExistingData();
    },
  });
}

function campaignOptions(selected = "") {
  const options = state.data.campaigns.map((campaign) => [campaign.id, campaign.name || "未命名行銷案"]);
  return selectOptions(options, selected);
}

function associationOptions(selected = "") {
  const options = [["", "不關聯公會"]];
  state.data.associations
    .slice()
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "zh-Hant-TW"))
    .forEach((association) => {
      options.push([association.id, association.name || "未命名公會"]);
    });
  return selectOptions(options, selected);
}

function associationActivitySuggestions(selected = "") {
  const fixed = ["會員大會", "協辦活動", "技術講座", "展覽", "餐會", "期刊投稿", "期刊廣告", "年度贊助", "其他"];
  const existing = [...state.data.campaigns, ...state.data.archivedCampaigns]
    .map((campaign) => campaign.association_activity_type)
    .filter(Boolean);
  const values = [...new Set([...fixed, ...existing, selected].filter(Boolean))];
  return values.map((value) => `<option value="${escapeAttr(value)}"></option>`).join("");
}

function associationTaskTypeSuggestions(selected = "") {
  const fixed = ["會員大會", "協辦活動", "技術講座", "期刊投稿", "期刊廣告", "年度贊助", "拜訪聯繫", "素材準備", "其他"];
  const existing = [...state.data.associationTasks, ...state.data.cancelledAssociationTasks]
    .map((task) => task.task_type)
    .filter(Boolean);
  const values = [...new Set([...fixed, ...existing, selected].filter(Boolean))];
  return values.map((value) => `<option value="${escapeAttr(value)}"></option>`).join("");
}

function associationTaskStatusOptions() {
  return [
    ["待確認", "待確認"],
    ["未開始", "未開始"],
    ["準備中", "準備中"],
    ["進行中", "進行中"],
    ["已送審", "已送審"],
    ["已完成", "已完成"],
  ];
}

function associationExpenseTypeSuggestions(selected = "") {
  const fixed = ["年費", "年度贊助", "活動贊助", "期刊費用", "設計製作", "印刷", "禮品", "交通餐費", "其他"];
  const existing = [...state.data.associationTaskExpenses, ...state.data.cancelledAssociationTaskExpenses]
    .map((expense) => expense.expense_type)
    .filter(Boolean);
  const values = [...new Set([...fixed, ...existing, selected].filter(Boolean))];
  return values.map((value) => `<option value="${escapeAttr(value)}"></option>`).join("");
}

function associationExpensePaymentOptions() {
  return [
    ["未付款", "未付款"],
    ["待確認", "待確認"],
    ["已付款", "已付款"],
    ["不適用", "不適用"],
  ];
}

function associationFeePaymentOptions(selected = "") {
  const fixed = ["未繳", "已繳", "待確認", "不適用"];
  const existing = [...state.data.associationFees, ...state.data.cancelledAssociationFees]
    .map((fee) => fee.payment_status)
    .filter(Boolean);
  const values = [...new Set([...fixed, ...existing, selected].filter(Boolean))];
  return selectOptions(values.map((value) => [value, value]), selected);
}

function associationBenefitTypeSuggestions(selected = "") {
  const fixed = ["期刊曝光", "活動參與", "協辦活動", "會員名錄", "課程講座", "其他"];
  const existing = [...state.data.associationBenefits, ...state.data.archivedAssociationBenefits]
    .map((benefit) => benefit.benefit_type)
    .filter(Boolean);
  const values = [...new Set([...fixed, ...existing, selected].filter(Boolean))];
  return values.map((value) => `<option value="${escapeAttr(value)}"></option>`).join("");
}

function associationBenefitUsageOptions(selected = "") {
  const fixed = ["未使用", "準備中", "已使用", "不適用"];
  const existing = [...state.data.associationBenefits, ...state.data.archivedAssociationBenefits]
    .map((benefit) => benefit.usage_status)
    .filter(Boolean);
  const values = [...new Set([...fixed, ...existing, selected].filter(Boolean))];
  return selectOptions(values.map((value) => [value, value]), selected);
}

function associationTaskCampaignOptions(selected = "") {
  const options = [["", "不關聯行銷案"]];
  state.data.campaigns
    .slice()
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "zh-Hant-TW"))
    .forEach((campaign) => {
      options.push([campaign.id, campaign.name || "未命名行銷案"]);
    });

  if (selected && !state.data.campaigns.some((campaign) => String(campaign.id || "") === String(selected))) {
    const archived = state.data.archivedCampaigns.find((campaign) => String(campaign.id || "") === String(selected));
    if (archived) options.push([archived.id, `${archived.name || "未命名行銷案"}（已封存）`]);
  }

  return selectOptions(options, selected);
}

function associationTaskOptions(associationId, selected = "") {
  const options = [["", "不關聯任務"]];
  associationTasksFor(associationId).forEach((task) => {
    options.push([task.id, task.task_name || "未命名任務"]);
  });

  if (selected && !associationTasksFor(associationId).some((task) => String(task.id || "") === String(selected))) {
    const cancelled = state.data.cancelledAssociationTasks.find((task) => String(task.id || "") === String(selected));
    if (cancelled) options.push([cancelled.id, `${cancelled.task_name || "未命名任務"}（已取消）`]);
  }

  return selectOptions(options, selected);
}

function associationStageSelectOptions(entityType, selected = "") {
  const fallback = entityType === "publication"
    ? [["待確認主題", "待確認主題"], ["素材製作中", "素材製作中"], ["已投稿/截稿", "已投稿/截稿"], ["已確認刊出", "已確認刊出"]]
    : [["待確認", "待確認"], ["已確認合作/排期", "已確認合作/排期"], ["素材準備中", "素材準備中"], ["執行中", "執行中"], ["已結束", "已結束"]];
  const stageRows = state.data.associationStages
    .filter((option) => option.entity_type === entityType)
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
    .map((option) => [option.stage_name, `${option.stage_name}（${Number(option.pct_value || 0)}%）`]);
  return selectOptions(stageRows.length ? stageRows : fallback, selected);
}

function associationEventTypeSuggestions(selected = "") {
  const fixed = ["會員大會", "協辦活動", "技術講座", "展覽", "餐會", "活動贊助", "其他"];
  const existing = [...state.data.associationEvents, ...state.data.cancelledAssociationEvents]
    .map((event) => event.event_type)
    .filter(Boolean);
  const values = [...new Set([...fixed, ...existing, selected].filter(Boolean))];
  return values.map((value) => `<option value="${escapeAttr(value)}"></option>`).join("");
}

function associationRoleSuggestions(selected = "") {
  const fixed = ["會員參與", "協辦", "贊助", "講師", "展示"];
  const existing = [...state.data.associationEvents, ...state.data.cancelledAssociationEvents]
    .map((event) => event.meisun_role)
    .filter(Boolean);
  const values = [...new Set([...fixed, ...existing, selected].filter(Boolean))];
  return values.map((value) => `<option value="${escapeAttr(value)}"></option>`).join("");
}

function performanceChannelSuggestions(selected = "") {
  const fixed = ["公會", "展覽", "官網", "LINE", "Facebook", "標案", "業務轉介", "講座", "期刊", "其他"];
  const performanceChannels = state.data.campaignPerformance.map((item) => item.channel).filter(Boolean);
  const leadChannels = state.data.leads.map((lead) => lead.source_channel).filter(Boolean);
  const values = [...new Set([...fixed, ...performanceChannels, ...leadChannels, selected].filter(Boolean))];
  return values.map((value) => `<option value="${escapeAttr(value)}"></option>`).join("");
}

function vendorOptions(selected = "") {
  const options = [["", "新增廠商主檔"]];
  state.data.vendors.forEach((vendor) => {
    const type = vendor.vendor_type ? ` / ${vendor.vendor_type}` : "";
    options.push([vendor.id, `${vendor.name || "未命名廠商"}${type}`]);
  });
  return selectOptions(options, selected);
}

function openModal(title, content, options = {}) {
  const modal = document.getElementById("formModal");
  const submit = document.getElementById("modalSubmit");
  const cancel = document.getElementById("modalCancel");
  const submitLabel = options.submitLabel || "送出";

  document.getElementById("modalTitle").textContent = title;
  document.getElementById("modalContent").innerHTML = content;
  document.getElementById("modalMessage").textContent = "";
  submit.textContent = submitLabel;
  submit.dataset.idleLabel = submitLabel;
  submit.dataset.pendingLabel = options.pendingLabel || pendingLabelForSubmitLabel(submitLabel);
  submit.disabled = false;
  submit.classList.toggle("is-hidden", options.hideSubmit === true);
  submit.classList.toggle("is-danger", options.submitTone === "danger");
  cancel.disabled = false;
  document.getElementById("modalClose").disabled = false;
  cancel.classList.toggle("is-hidden", options.hideCancel === true);
  modalSubmitHandler = options.onSubmit || null;
  modalSubmitting = false;
  modalPendingClose = false;
  modalSessionId += 1;
  modal.classList.remove("is-hidden");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  if (modalSubmitting) {
    modalPendingClose = true;
    return;
  }
  closeModalNow();
}

function closeModalNow() {
  const modal = document.getElementById("formModal");
  modal.classList.add("is-hidden");
  modal.setAttribute("aria-hidden", "true");
  modalSubmitHandler = null;
  modalPendingClose = false;
}

function formValues(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function setModalMessage(message, tone = "") {
  const element = document.getElementById("modalMessage");
  element.textContent = message;
  element.className = `form-message ${tone}`.trim();
}

function pendingLabelForSubmitLabel(label = "") {
  if (label.includes("建立")) return "建立中...";
  if (label.includes("新增")) return "新增中...";
  if (label.includes("儲存")) return "儲存中...";
  if (label.includes("更新")) return "更新中...";
  if (label.includes("封存")) return "封存中...";
  if (label.includes("取消")) return "取消中...";
  if (label.includes("移除")) return "移除中...";
  if (label.includes("審核") || label.includes("決策") || label.includes("確認")) return "處理中...";
  if (label.includes("送")) return "送出中...";
  if (label.includes("下一步")) return "處理中...";
  if (label.includes("關閉")) return "關閉中...";
  return "處理中...";
}

function requestFormHtml(request = {}, readOnly = false) {
  const disabled = readOnly ? " disabled" : "";
  const readonly = readOnly ? " readonly" : "";
  return `
    <div class="form-grid">
      <label class="form-field is-wide">
        <span>需求名稱</span>
        <input name="request_name" value="${escapeAttr(request.request_name || "")}" required${readonly}>
      </label>
      <label class="form-field">
        <span>需求類型</span>
        <select name="request_type"${disabled}>
          ${selectOptions([
            ["簡報", "簡報"],
            ["DM", "DM / 文宣"],
            ["市場分析", "市場分析"],
            ["競爭力分析", "競爭力分析"],
            ["影片", "影片 / 多媒體"],
            ["活動邀請", "活動邀請"],
            ["其他", "其他"],
          ], request.request_type || "簡報")}
        </select>
      </label>
      <label class="form-field">
        <span>優先級</span>
        <select name="priority"${disabled}>
          ${selectOptions([["急件", "急件"], ["一般", "一般"], ["低", "低"]], request.priority || "一般")}
        </select>
      </label>
      <label class="form-field">
        <span>預計使用日</span>
        <input name="due_date" type="date" value="${escapeAttr(formatDate(request.due_date))}"${readonly}>
      </label>
      <label class="form-field">
        <span>關聯名單</span>
        <select name="lead_id"${disabled}>${leadOptions(request.lead_id || "")}</select>
      </label>
      <label class="form-field is-wide">
        <span>需求說明</span>
        <textarea name="description"${readonly}>${escapeHtml(request.description || "")}</textarea>
      </label>
    </div>
  `;
}

function openCreateSalesRequestModal(prefill = {}) {
  openModal("提出素材 / 資料需求", requestFormHtml(prefill), {
    submitLabel: "建立需求",
    onSubmit: async (form) => {
      const values = formValues(form);
      await api("POST", "sales_requests", {
        request_name: values.request_name.trim(),
        requested_by: state.auth.email,
        lead_id: values.lead_id || null,
        request_type: values.request_type,
        priority: values.priority || "一般",
        status: "待處理",
        due_date: values.due_date || null,
        description: values.description?.trim() || null,
      });
      closeModal();
      state.page = "requests";
      await loadExistingData();
    },
  });
}

function openViewSalesRequestModal(id) {
  const request = state.data.salesRequests.find((item) => item.id === id);
  if (!request) return;
  const detail = `${requestFormHtml(request, true)}
    <div class="form-grid">
      <label class="form-field">
        <span>目前狀態</span>
        <input value="${escapeAttr(request.status || "待處理")}" readonly>
      </label>
      <label class="form-field">
        <span>行銷負責</span>
        <input value="${escapeAttr(request.assigned_to || "尚未指派")}" readonly>
      </label>
    </div>`;
  openModal("需求內容", detail, {
    submitLabel: "關閉",
    hideCancel: true,
    onSubmit: async () => closeModal(),
  });
}

function openEditSalesRequestModal(id) {
  const request = state.data.salesRequests.find((item) => item.id === id);
  if (!request) return;
  const content = `
    <div class="form-grid">
      <label class="form-field is-wide">
        <span>需求名稱</span>
        <input value="${escapeAttr(request.request_name || "")}" readonly>
      </label>
      <label class="form-field">
        <span>狀態</span>
        <select name="status">
          ${selectOptions([["待處理", "待處理"], ["處理中", "處理中"], ["待業務確認", "待業務確認"], ["已完成", "已完成"]], request.status || "待處理")}
        </select>
      </label>
      <label class="form-field">
        <span>行銷負責</span>
        <input name="assigned_to" type="email" value="${escapeAttr(request.assigned_to || state.auth.email || "")}">
      </label>
      <label class="form-field">
        <span>預計完成日</span>
        <input name="due_date" type="date" value="${escapeAttr(formatDate(request.due_date))}">
      </label>
      <label class="form-field is-wide">
        <span>處理說明</span>
        <textarea name="description">${escapeHtml(request.description || "")}</textarea>
      </label>
    </div>
  `;

  openModal("更新業務需求", content, {
    submitLabel: "儲存更新",
    onSubmit: async (form) => {
      const values = formValues(form);
      const status = values.status || "待處理";
      await api("PATCH", `sales_requests?id=eq.${encodeURIComponent(id)}`, {
        status,
        assigned_to: values.assigned_to || null,
        due_date: values.due_date || null,
        description: values.description?.trim() || null,
        completed_at: status === "已完成" ? (request.completed_at || nowIso()) : null,
        updated_at: nowIso(),
      });
      closeModal();
      await loadExistingData();
    },
  });
}

function openCancelSalesRequestModal(id) {
  const request = state.data.salesRequests.find((item) => item.id === id);
  if (!request) return;

  openModal("取消業務需求單", `
    <p class="empty-note">
      確定要取消 ${formatRequester(request.requested_by)} 提出的「${escapeHtml(request.request_name || "未命名需求")}」嗎？取消後會保留紀錄，但不再出現在待處理清單。
    </p>
  `, {
    submitLabel: "確認取消",
    onSubmit: async () => {
      await cancelSalesRequest(id);
      closeModal();
      await loadExistingData();
    },
  });
}

async function cancelSalesRequest(id) {
  const payload = {
    status: "已取消",
    cancelled_at: nowIso(),
    cancelled_by: state.auth.email,
    updated_at: nowIso(),
  };

  try {
    await api("PATCH", `sales_requests?id=eq.${encodeURIComponent(id)}`, payload);
  } catch (error) {
    console.warn("sales_requests cancel audit fields unavailable, falling back to status-only cancel", error);
    await api("PATCH", `sales_requests?id=eq.${encodeURIComponent(id)}`, {
      status: "已取消",
      updated_at: nowIso(),
    });
  }
}

function openVendorApprovalModal(id) {
  const campaignVendor = state.data.campaignVendors.find((item) => item.id === id);
  if (!campaignVendor) return;
  const vendor = campaignVendor.vendors || {};
  const amount = campaignVendor.actual_amount || campaignVendor.budget_amount || "";
  const summary = [
    `廠商：${vendor.name || "未命名廠商"}`,
    `角色：${campaignVendor.role_in_project || vendor.vendor_type || "未填"}`,
    `報價狀態：${campaignVendor.quote_status || "待報價"}`,
    `付款狀態：${campaignVendor.payment_status || "未請款"}`,
  ].join(" / ");

  openModal("廠商報價送審", `
    <div class="form-grid">
      <label class="form-field is-wide">
        <span>審核標題</span>
        <input name="title" value="${escapeAttr(`廠商報價核准：${vendor.name || "未命名廠商"}`)}" required>
      </label>
      <label class="form-field">
        <span>金額</span>
        <input name="amount" type="number" min="0" step="1" value="${escapeAttr(amount)}">
      </label>
      <label class="form-field">
        <span>希望回覆日</span>
        <input name="due_date" type="date">
      </label>
      <label class="form-field is-wide">
        <span>摘要</span>
        <textarea name="summary">${escapeHtml(summary)}</textarea>
      </label>
    </div>
  `, {
    submitLabel: "送總經理審核",
    onSubmit: async (form) => {
      const values = formValues(form);
      await api("POST", "approval_requests", {
        entity_type: "vendor_quote",
        entity_id: id,
        title: values.title.trim(),
        summary: values.summary?.trim() || null,
        amount: values.amount ? Number(values.amount) : null,
        due_date: values.due_date || null,
        requested_by: state.auth.email,
        approver_role: "executive",
        status: "待審核",
      });
      await api("PATCH", `marketing_campaign_vendors?id=eq.${encodeURIComponent(id)}`, {
        quote_status: "待核准",
        updated_at: nowIso(),
      });
      closeModal();
      await loadExistingData();
    },
  });
}

function openVendorApprovalPicker() {
  if (!state.data.campaignVendors.length) {
    openModal("廠商報價送審", `<p class="empty-note">目前沒有廠商合作資料可送審。</p>`, {
      submitLabel: "關閉",
      hideCancel: true,
      onSubmit: async () => closeModal(),
    });
    return;
  }

  const availableVendors = state.data.campaignVendors.filter((campaignVendor) => !hasPendingVendorApproval(campaignVendor.id));
  if (!availableVendors.length) {
    openModal("廠商報價送審", `<p class="empty-note">目前廠商報價都已送審或沒有可送審項目。</p>`, {
      submitLabel: "關閉",
      hideCancel: true,
      onSubmit: async () => closeModal(),
    });
    return;
  }

  const options = availableVendors.map((campaignVendor) => {
    const vendor = campaignVendor.vendors || {};
    const label = `${vendor.name || "未命名廠商"} / ${campaignVendor.role_in_project || vendor.vendor_type || "未填"}`;
    return [campaignVendor.id, label];
  });

  openModal("選擇送審廠商", `
    <div class="form-grid">
      <label class="form-field is-wide">
        <span>廠商合作項目</span>
        <select name="vendor_id">${selectOptions(options)}</select>
      </label>
    </div>
  `, {
    submitLabel: "下一步",
    onSubmit: async (form) => {
      const values = formValues(form);
      closeModal();
      openVendorApprovalModal(values.vendor_id);
    },
  });
}

function openCreateCampaignVendorModal() {
  if (!state.data.campaigns.length) {
    openModal("新增廠商合作", `<p class="empty-note">目前沒有可選擇的進行中行銷案。請先到「行銷專案管理」新增行銷案，或確認既有行銷案是否已封存。</p>`, {
      submitLabel: "關閉",
      hideCancel: true,
      onSubmit: async () => closeModal(),
    });
    return;
  }

  let createdVendorId = "";

  openModal("新增廠商合作", `
    <div class="form-grid">
      <label class="form-field is-wide">
        <span>行銷案</span>
        <select name="campaign_id" required>${campaignOptions()}</select>
      </label>
      <label class="form-field is-wide">
        <span>既有廠商</span>
        <select name="vendor_id">${vendorOptions()}</select>
      </label>
      <label class="form-field">
        <span>新廠商名稱</span>
        <input name="vendor_name" placeholder="選新增廠商時必填">
      </label>
      <label class="form-field">
        <span>廠商類型</span>
        <select name="vendor_type">
          ${selectOptions([["", "未分類"], ["裝潢", "裝潢"], ["美編", "美編"], ["印刷", "印刷"], ["場地", "場地"], ["攝影影音", "攝影影音"], ["公會", "公會"], ["其他", "其他"]])}
        </select>
      </label>
      <label class="form-field">
        <span>聯絡人</span>
        <input name="contact_name">
      </label>
      <label class="form-field">
        <span>聯絡電話</span>
        <input name="contact_phone">
      </label>
      <label class="form-field">
        <span>聯絡 Email</span>
        <input name="contact_email" type="email">
      </label>
      <label class="form-field">
        <span>廠商角色</span>
        <input name="role_in_project" placeholder="例如：攤位設計施工">
      </label>
      <label class="form-field">
        <span>美昇對接人</span>
        <input name="meisun_contact" type="email" value="${escapeAttr(state.auth.email)}" readonly>
      </label>
      <label class="form-field">
        <span>報價狀態</span>
        <select name="quote_status">
          ${selectOptions([["待報價", "待報價"], ["已報價", "已報價"], ["待核准", "待核准"], ["已簽約", "已簽約"]], "待報價")}
        </select>
      </label>
      <label class="form-field">
        <span>預估費用</span>
        <input name="budget_amount" type="number" min="0" step="1">
      </label>
    </div>
  `, {
    submitLabel: "建立廠商合作",
    onSubmit: async (form) => {
      const values = formValues(form);
      let vendorId = values.vendor_id || createdVendorId;

      if (!vendorId) {
        if (!values.vendor_name?.trim()) {
          throw new Error("請選擇既有廠商，或填寫新廠商名稱。");
        }
        const createdVendors = await api("POST", "vendors", {
          name: values.vendor_name.trim(),
          vendor_type: values.vendor_type || null,
          contact_name: values.contact_name?.trim() || null,
          contact_phone: values.contact_phone?.trim() || null,
          contact_email: values.contact_email?.trim() || null,
        });
        vendorId = createdVendors?.[0]?.id;
        createdVendorId = vendorId || "";
      }

      if (!vendorId) throw new Error("廠商建立失敗，請稍後再試。");

      await api("POST", "marketing_campaign_vendors", {
        campaign_id: values.campaign_id,
        vendor_id: vendorId,
        role_in_project: values.role_in_project?.trim() || null,
        meisun_contact: state.auth.email,
        quote_status: values.quote_status || "待報價",
        budget_amount: values.budget_amount ? Number(values.budget_amount) : null,
      });
      closeModal();
      await loadExistingData();
    },
  });
}

function openEditCampaignVendorModal(id) {
  const campaignVendor = state.data.campaignVendors.find((item) => item.id === id);
  if (!campaignVendor) return;
  const vendor = campaignVendor.vendors || {};

  openModal("編輯廠商合作", `
    <div class="form-grid">
      <label class="form-field is-wide">
        <span>廠商 / 單位</span>
        <input value="${escapeAttr(vendor.name || "未命名廠商")}" readonly>
      </label>
      <label class="form-field">
        <span>廠商角色</span>
        <input name="role_in_project" value="${escapeAttr(campaignVendor.role_in_project || "")}">
      </label>
      <label class="form-field">
        <span>報價狀態</span>
        <select name="quote_status">
          ${selectOptions([["待報價", "待報價"], ["已報價", "已報價"], ["待核准", "待核准"], ["已簽約", "已簽約"]], campaignVendor.quote_status || "待報價")}
        </select>
      </label>
      <label class="form-field">
        <span>預估費用</span>
        <input name="budget_amount" type="number" min="0" step="1" value="${escapeAttr(campaignVendor.budget_amount || "")}">
      </label>
      <label class="form-field">
        <span>實際費用</span>
        <input name="actual_amount" type="number" min="0" step="1" value="${escapeAttr(campaignVendor.actual_amount || "")}">
      </label>
      <label class="form-field">
        <span>付款狀態</span>
        <select name="payment_status">
          ${selectOptions([["未請款", "未請款"], ["待付款", "待付款"], ["已付款", "已付款"], ["不需付款", "不需付款"]], campaignVendor.payment_status || "未請款")}
        </select>
      </label>
      <label class="form-field">
        <span>付款日</span>
        <input name="payment_date" type="date" value="${escapeAttr(formatDate(campaignVendor.payment_date))}">
      </label>
    </div>
  `, {
    submitLabel: "儲存變更",
    onSubmit: async (form) => {
      const values = formValues(form);
      await api("PATCH", `marketing_campaign_vendors?id=eq.${encodeURIComponent(id)}`, {
        role_in_project: values.role_in_project?.trim() || null,
        quote_status: values.quote_status || "待報價",
        budget_amount: values.budget_amount ? Number(values.budget_amount) : null,
        actual_amount: values.actual_amount ? Number(values.actual_amount) : null,
        payment_status: values.payment_status || "未請款",
        payment_date: values.payment_date || null,
        updated_at: nowIso(),
      });
      closeModal();
      await loadExistingData();
    },
  });
}

function openCancelCampaignVendorModal(id) {
  const campaignVendor = state.data.campaignVendors.find((item) => item.id === id);
  if (!campaignVendor) return;
  const vendor = campaignVendor.vendors || {};
  const deliverableCount = Array.isArray(campaignVendor.marketing_campaign_vendor_deliverables)
    ? campaignVendor.marketing_campaign_vendor_deliverables.length
    : 0;

  openModal("取消廠商合作", `
    <p class="empty-note">確定要取消「${escapeHtml(vendor.name || "未命名廠商")}」這筆合作嗎？資料會保留，但不再出現在合作廠商與費用彙總中。</p>
    <p class="empty-note">目前關聯交付物：${deliverableCount} 筆。資料會保留在資料庫，但取消後不會顯示在目前清單中。</p>
    <div class="form-grid">
      <label class="form-field is-wide">
        <span>取消原因（選填）</span>
        <textarea name="cancel_reason" placeholder="例如：改由其他廠商承接、活動取消、報價未通過。"></textarea>
      </label>
    </div>
  `, {
    submitLabel: "確認取消",
    onSubmit: async (form) => {
      const values = formValues(form);
      const decisionNote = `廠商合作已取消${values.cancel_reason?.trim() ? `：${values.cancel_reason.trim()}` : ""}`;
      await api("PATCH", `marketing_campaign_vendors?id=eq.${encodeURIComponent(id)}`, {
        cancelled_at: nowIso(),
        cancelled_by: state.auth.email,
        cancel_reason: values.cancel_reason?.trim() || null,
        updated_at: nowIso(),
      });
      await withdrawPendingVendorApprovals(id, decisionNote);
      closeModal();
      await loadExistingData();
    },
  });
}

async function withdrawPendingVendorApprovals(campaignVendorId, decisionNote) {
  const pendingRequests = state.data.approvalRequests.filter((request) => (
    request.entity_type === "vendor_quote"
    && String(request.entity_id || "") === String(campaignVendorId || "")
    && request.status === "待審核"
  ));

  await Promise.all(pendingRequests.map((request) => api("PATCH", `approval_requests?id=eq.${encodeURIComponent(request.id)}`, {
    status: "已撤回",
    summary: [request.summary, decisionNote].filter(Boolean).join(" / "),
    updated_at: nowIso(),
  })));
}

function openCreateVendorDeliverableModal(campaignVendorId) {
  const campaignVendor = state.data.campaignVendors.find((item) => item.id === campaignVendorId);
  if (!campaignVendor) return;
  const vendor = campaignVendor.vendors || {};

  openModal("新增交付物", vendorDeliverableFormHtml({}, vendor.name || "未命名廠商"), {
    submitLabel: "建立交付物",
    onSubmit: async (form) => {
      const values = formValues(form);
      await api("POST", "marketing_campaign_vendor_deliverables", {
        campaign_vendor_id: campaignVendorId,
        deliverable_name: values.deliverable_name.trim(),
        owner: state.auth.email,
        due_date: values.due_date || null,
        status: values.status || "未開始",
        reviewer: state.auth.email,
        attachment: values.attachment?.trim() || null,
        notes: values.notes?.trim() || null,
      });
      closeModal();
      await loadExistingData();
    },
  });
}

function openEditVendorDeliverableModal(id) {
  const record = findVendorDeliverable(id);
  if (!record) return;
  const vendor = record.campaignVendor.vendors || {};

  openModal("編輯交付物", vendorDeliverableFormHtml(record.deliverable, vendor.name || "未命名廠商"), {
    submitLabel: "儲存變更",
    onSubmit: async (form) => {
      const values = formValues(form);
      await api("PATCH", `marketing_campaign_vendor_deliverables?id=eq.${encodeURIComponent(id)}`, {
        deliverable_name: values.deliverable_name.trim(),
        due_date: values.due_date || null,
        status: values.status || "未開始",
        attachment: values.attachment?.trim() || null,
        notes: values.notes?.trim() || null,
        updated_at: nowIso(),
      });
      closeModal();
      await loadExistingData();
    },
  });
}

function openCancelVendorDeliverableModal(id) {
  const record = findVendorDeliverable(id);
  if (!record) return;
  const deliverable = record.deliverable;

  openModal("取消交付物", `
    <p class="empty-note">確定要取消交付物「${escapeHtml(deliverable.deliverable_name || "未命名交付物")}」嗎？資料會保留，但不再出現在合作廠商清單中。</p>
    <div class="form-grid">
      <label class="form-field is-wide">
        <span>取消原因（選填）</span>
        <textarea name="cancel_reason"></textarea>
      </label>
    </div>
  `, {
    submitLabel: "確認取消",
    onSubmit: async (form) => {
      const values = formValues(form);
      await api("PATCH", `marketing_campaign_vendor_deliverables?id=eq.${encodeURIComponent(id)}`, {
        cancelled_at: nowIso(),
        cancelled_by: state.auth.email,
        cancel_reason: values.cancel_reason?.trim() || null,
        updated_at: nowIso(),
      });
      closeModal();
      await loadExistingData();
    },
  });
}

function vendorDeliverableFormHtml(deliverable = {}, vendorName = "") {
  return `
    <div class="form-grid">
      <label class="form-field is-wide">
        <span>廠商 / 單位</span>
        <input value="${escapeAttr(vendorName)}" readonly>
      </label>
      <label class="form-field is-wide">
        <span>交付物名稱</span>
        <input name="deliverable_name" value="${escapeAttr(deliverable.deliverable_name || "")}" required>
      </label>
      <label class="form-field">
        <span>到期日</span>
        <input name="due_date" type="date" value="${escapeAttr(formatDate(deliverable.due_date))}">
      </label>
      <label class="form-field">
        <span>狀態</span>
        <select name="status">
          ${selectOptions([["未開始", "未開始"], ["製作中", "製作中"], ["待審", "待審"], ["需修正", "需修正"], ["已完成", "已完成"]], deliverable.status || "未開始")}
        </select>
      </label>
      <label class="form-field">
        <span>負責人</span>
        <input value="${escapeAttr(deliverable.owner || state.auth.email)}" readonly>
      </label>
      <label class="form-field">
        <span>審核人</span>
        <input value="${escapeAttr(deliverable.reviewer || state.auth.email)}" readonly>
      </label>
      <label class="form-field is-wide">
        <span>附件連結</span>
        <input name="attachment" value="${escapeAttr(deliverable.attachment || "")}" placeholder="Google Drive、檔案或參考連結">
      </label>
      <label class="form-field is-wide">
        <span>備註</span>
        <textarea name="notes">${escapeHtml(deliverable.notes || "")}</textarea>
      </label>
    </div>
  `;
}

function findVendorDeliverable(deliverableId) {
  for (const campaignVendor of state.data.campaignVendors) {
    const deliverables = Array.isArray(campaignVendor.marketing_campaign_vendor_deliverables)
      ? campaignVendor.marketing_campaign_vendor_deliverables
      : [];
    const deliverable = deliverables.find((item) => item.id === deliverableId);
    if (deliverable) return { campaignVendor, deliverable };
  }
  return null;
}

function findVisibleKnowledgeItem(id) {
  return visibleKnowledgeItems(state.role === "marketing").find((item) => item.id === id);
}

function openViewKnowledgeItemModal(id) {
  const item = findVisibleKnowledgeItem(id);
  if (!item) return;
  const marketingActions = [
    actionButton("編輯條目", "edit-knowledge-item", item.id, "is-primary"),
  ];
  if (state.knowledgeArchiveAvailable) {
    marketingActions.push(actionButton("封存條目", "archive-knowledge-item", item.id, "is-danger"));
  }
  const actions = state.role === "marketing"
    ? actionGroup(marketingActions)
    : `<div class="action-group">${actionButton("提出補充需求", "request-knowledge-update", item.id, "is-primary")}</div>`;

  openModal("知識條目詳情", `
    ${knowledgeItemFormHtml(item, true)}
    ${knowledgeResourceLinksHtml(item, state.role === "marketing")}
    ${actions}
  `, {
    submitLabel: "關閉",
    hideCancel: true,
    onSubmit: async () => closeModal(),
  });
}

function openArchiveKnowledgeItemModal(id) {
  if (!state.knowledgeArchiveAvailable) {
    openModal("封存尚未啟用", `<p class="empty-note">請先執行產品知識封存 SQL，再回來封存不需要的知識條目。</p>`, {
      submitLabel: "知道了",
      hideCancel: true,
      onSubmit: async () => closeModal(),
    });
    return;
  }
  const item = state.data.knowledgeItems.find((entry) => entry.id === id);
  if (!item || item.archived_at) return;

  openModal("封存知識條目", `
    <p class="empty-note">確定要封存「${escapeHtml(item.title || "未命名知識")}」嗎？封存後不會出現在產品知識審核與業務產品知識庫，但會保留歷史紀錄與既有連結。</p>
    <div class="form-grid">
      <label class="form-field is-wide">
        <span>封存原因（選填）</span>
        <textarea name="archive_reason" placeholder="例如：內容過期、資料重複、改由新版條目取代。"></textarea>
      </label>
    </div>
  `, {
    submitLabel: "確認封存",
    submitTone: "danger",
    onSubmit: async (form) => {
      const values = formValues(form);
      await api("PATCH", `product_knowledge_items?id=eq.${encodeURIComponent(id)}`, {
        archived_at: nowIso(),
        archived_by: state.auth.email,
        archive_reason: values.archive_reason?.trim() || null,
        updated_at: nowIso(),
      });
      closeModal();
      await loadExistingData();
    },
  });
}

function openEditKnowledgeItemModal(id) {
  const item = state.data.knowledgeItems.find((entry) => entry.id === id);
  if (!item || item.archived_at) return;

  openModal("編輯知識條目", knowledgeItemFormHtml(item, false), {
    submitLabel: "儲存變更",
    onSubmit: async (form) => {
      const values = formValues(form);
      await api("PATCH", `product_knowledge_items?id=eq.${encodeURIComponent(id)}`, {
        ...knowledgeItemPayload(values),
        updated_at: nowIso(),
      });
      closeModal();
      await loadExistingData();
    },
  });
}

function openKnowledgeSupplementRequestModal(id) {
  const item = findVisibleKnowledgeItem(id);
  if (!item) return;
  closeModal();
  openCreateSalesRequestModal({
    request_name: `補充資料：${item.title || "知識條目"}`,
    request_type: "市場分析",
    priority: "一般",
    description: [
      `請協助補充產品知識庫條目：「${item.title || "未命名知識"}」。`,
      item.summary ? `目前摘要：${item.summary}` : "",
      "需要補充：詳細說明、建議話術、競品對照或對外可用證據。",
    ].filter(Boolean).join("\n"),
  });
}

function knowledgeResourceLinksFor(knowledgeItemId) {
  return state.data.knowledgeResourceLinks.filter((link) => link.knowledge_item_id === knowledgeItemId);
}

function resourcesForKnowledgeItem(knowledgeItemId) {
  return knowledgeResourceLinksFor(knowledgeItemId).map((link) => ({
    link,
    resource: findResource(link.resource_id),
  }));
}

function availableResourcesForKnowledgeItem(knowledgeItemId) {
  const linkedResourceIds = new Set(knowledgeResourceLinksFor(knowledgeItemId).map((link) => link.resource_id));
  return activeResources().filter((resource) => !linkedResourceIds.has(resource.id));
}

function knowledgeResourceLinksHtml(item = {}, canManage = false) {
  const linkedResources = resourcesForKnowledgeItem(item.id);
  const manageAction = canManage
    ? `<div class="action-group">${actionButton("新增資源連結", "add-knowledge-resource", item.id, "is-primary", !activeResources().length)}</div>`
    : "";
  const body = linkedResources.length
    ? `<div class="linked-resource-list">${linkedResources.map(({ link, resource }) => resourceLinkCard(link, resource, canManage)).join("")}</div>`
    : `<p class="empty-note">此知識條目尚未附加參考文宣；業務仍可到文宣資源區直接查找可用資料。</p>`;

  return `
    <section class="linked-resource-section">
      <div class="linked-resource-header">
        <h3>參考文宣 / DM / 資源</h3>
        ${manageAction}
      </div>
      ${body}
    </section>
  `;
}

function resourceLinkCard(link = {}, resource = {}, canManage = false) {
  const resourceTitle = resource?.title || "已連結資源";
  const resourceActions = resource ? resourceActionButtons(resource) : [disabledInlineAction("尚無檔案")];
  const removeAction = canManage ? actionButton("移除連結", "remove-knowledge-resource", link.id, "is-danger") : "";
  const actions = [...resourceActions, removeAction].filter(Boolean);
  const archiveTag = resource?.deleted_at ? tag("已封存", "amber") : "";

  return `
    <article class="linked-resource-card">
      <div>
        <strong>${escapeHtml(resourceTitle)} ${archiveTag}</strong>
        <p>${escapeHtml(resource?.resource_type || "資源")}・${escapeHtml(resource?.product_line || "未分類")}・${escapeHtml(resource?.audience || "未設定")}</p>
      </div>
      ${actions.length ? actionGroup(actions) : ""}
    </article>
  `;
}

function openAddKnowledgeResourceModal(id) {
  const item = state.data.knowledgeItems.find((entry) => entry.id === id);
  if (!item) return;

  const availableResources = availableResourcesForKnowledgeItem(id);
  if (!availableResources.length) {
    openModal("新增資源連結", `
      <p class="empty-note">目前沒有可新增的正式資源，或此知識條目已連結所有資源。</p>
    `, {
      submitLabel: "知道了",
      hideCancel: true,
      onSubmit: async () => openViewKnowledgeItemModal(id),
    });
    return;
  }

  openModal("新增資源連結", `
    <div class="form-grid">
      <label class="form-field is-wide">
        <span>知識條目</span>
        <input value="${escapeAttr(item.title || "未命名知識")}" readonly>
      </label>
      <label class="form-field is-wide">
        <span>選擇文宣 / DM / 資源</span>
        <select name="resource_id" required>
          ${selectOptions(availableResources.map((resource) => [resource.id, resourceOptionLabel(resource)]))}
        </select>
      </label>
    </div>
  `, {
    submitLabel: "建立連結",
    onSubmit: async (form) => {
      const values = formValues(form);
      await api("POST", "product_knowledge_resource_links", {
        knowledge_item_id: id,
        resource_id: values.resource_id,
      });
      await loadExistingData();
      openViewKnowledgeItemModal(id);
    },
  });
}

function openRemoveKnowledgeResourceModal(linkId) {
  const link = state.data.knowledgeResourceLinks.find((entry) => entry.id === linkId);
  if (!link) return;
  const resource = state.data.resources.find((item) => item.id === link.resource_id);

  openModal("移除資源連結", `
    <p class="empty-note">
      確定要從這個知識條目移除「${escapeHtml(resource?.title || "已連結資源")}」嗎？這只會移除關聯，不會刪除原始文宣或 DM。
    </p>
  `, {
    submitLabel: "移除連結",
    submitTone: "danger",
    onSubmit: async () => {
      await api("DELETE", `product_knowledge_resource_links?id=eq.${encodeURIComponent(linkId)}`);
      await loadExistingData();
      openViewKnowledgeItemModal(link.knowledge_item_id);
    },
  });
}

function resourceOptionLabel(resource = {}) {
  return [
    resource.title || "未命名資源",
    resource.resource_type || "其他",
    resource.product_line || "未分類",
    resource.audience || "未設定",
  ].join(" / ");
}

function findResource(resourceId) {
  return state.data.resources.find((resource) => resource.id === resourceId);
}

function activeResources(resources = state.data.resources) {
  return resources.filter((resource) => !resource.deleted_at);
}

function archivedResources(resources = state.data.resources) {
  return resources.filter((resource) => Boolean(resource.deleted_at));
}

function resourceReferenceCounts(resourceId) {
  const knowledge = state.data.knowledgeResourceLinks.filter((link) => link.resource_id === resourceId).length;
  const requests = [...state.data.salesRequests, ...state.data.cancelledSalesRequests]
    .filter((request) => request.deliverable_resource_id === resourceId).length;
  return { knowledge, requests, total: knowledge + requests };
}

function resourceReferenceSummary(resourceId) {
  const counts = resourceReferenceCounts(resourceId);
  const parts = [];
  if (counts.knowledge) parts.push(`知識條目 ${counts.knowledge}`);
  if (counts.requests) parts.push(`需求單 ${counts.requests}`);
  return parts.length ? parts.join(" / ") : "目前無引用";
}

function archiveMeta(resource = {}) {
  const date = formatDate(resource.deleted_at);
  const by = resource.deleted_by || "未記錄";
  return date ? `${date} / ${by}` : by;
}

function resourceActionGroup(resource = {}) {
  return actionGroup(resourceActionButtons(resource));
}

function resourceActionButtons(resource = {}) {
  if (resource.deleted_at) return [disabledInlineAction("已封存")];

  const actions = [];
  if (resource.file_path) {
    if (resource.is_external_usable) {
      actions.push(actionButton(resourceDownloadLabel(resource), "download-resource-file", resource.id, "is-primary"));
    } else {
      actions.push(disabledInlineAction("內部檔案"));
    }
  }
  if (resource.resource_url) {
    actions.push(actionButton(resource.is_external_usable ? "開啟連結" : "查看連結", "open-resource-url", resource.id));
  }
  if (resource.canva_url) {
    actions.push(actionButton("查看 Canva", "open-resource-canva", resource.id));
  }
  if (!actions.length) actions.push(disabledInlineAction("尚無檔案"));
  return actions;
}

function resourceDownloadLabel(resource = {}) {
  const size = formatFileSize(resource.file_size);
  return size ? `下載 ${size}` : "下載";
}

function openResourceExternalLink(resourceId, source) {
  const resource = findResource(resourceId);
  const url = source === "canva" ? resource?.canva_url : resource?.resource_url;
  if (!url) return;
  window.open(url, "_blank", "noopener");
}

async function openResourceFile(resourceId, button) {
  const resource = findResource(resourceId);
  if (!resource?.file_path || !resource.is_external_usable) return;

  const popup = window.open("about:blank", "_blank");
  if (popup) popup.opener = null;
  const originalText = button?.textContent || "下載";
  if (button) {
    button.disabled = true;
    button.textContent = "產生連結...";
  }

  try {
    const signedUrl = await getSignedUrl("marketing-resource-files", resource.file_path);
    if (popup) {
      popup.location.href = signedUrl;
    } else {
      window.open(signedUrl, "_blank", "noopener");
    }
  } catch (error) {
    if (popup) popup.close();
    console.warn("resource download failed", error);
    alert(error.message || "無法開啟檔案，請稍後再試。");
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = originalText;
    }
  }
}

function resourceTypeOptions() {
  return [
    ["簡報", "簡報"],
    ["DM", "DM"],
    ["型錄", "型錄"],
    ["技術文章", "技術文章"],
    ["期刊投稿", "期刊投稿"],
    ["展場素材", "展場素材"],
    ["社群文案", "社群文案"],
    ["圖片影片", "圖片影片"],
    ["案例", "案例"],
    ["其他", "其他"],
  ];
}

function marketingResourceFormHtml(resource = {}) {
  const fileLabel = resource.file_path
    ? `${resource.file_name || resource.file_path}${resource.file_size ? ` ${formatFileSize(resource.file_size)}` : ""}`
    : "尚未上傳檔案";

  return `
    <div class="form-grid">
      <label class="form-field is-wide">
        <span>資源名稱</span>
        <input name="title" value="${escapeAttr(resource.title || "")}" required>
      </label>
      <label class="form-field">
        <span>類型</span>
        <select name="resource_type">${selectOptions(resourceTypeOptions(), resource.resource_type || "其他")}</select>
      </label>
      <label class="form-field">
        <span>版本</span>
        <input name="version" value="${escapeAttr(resource.version || "")}">
      </label>
      <label class="form-field">
        <span>產品線</span>
        <input name="product_line" value="${escapeAttr(resource.product_line || "")}">
      </label>
      <label class="form-field">
        <span>適用對象</span>
        <input name="audience" value="${escapeAttr(resource.audience || "")}">
      </label>
      <label class="form-field is-wide">
        <span>外部連結</span>
        <input name="resource_url" value="${escapeAttr(resource.resource_url || "")}" placeholder="https://...">
      </label>
      <label class="form-field is-wide">
        <span>Canva 連結</span>
        <input name="canva_url" value="${escapeAttr(resource.canva_url || "")}" placeholder="https://www.canva.com/...">
      </label>
      <label class="form-field is-wide checkbox-field">
        <input name="is_external_usable" type="checkbox" ${resource.is_external_usable ? "checked" : ""}>
        <span>可對外提供給客戶</span>
      </label>
      <label class="form-field is-wide">
        <span>標籤</span>
        <input name="tags" value="${escapeAttr(Array.isArray(resource.tags) ? resource.tags.join("、") : "")}" placeholder="用逗號或頓號分隔">
      </label>
      <label class="form-field is-wide">
        <span>備註</span>
        <textarea name="notes">${escapeHtml(resource.notes || "")}</textarea>
      </label>
      <label class="form-field is-wide">
        <span>目前檔案</span>
        <input value="${escapeAttr(fileLabel)}" readonly>
      </label>
      <label class="form-field is-wide">
        <span>上傳 / 替換檔案</span>
        <input name="resource_file" type="file" accept=".pdf,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.csv,image/*,application/pdf">
      </label>
    </div>
  `;
}

function marketingResourcePayload(values = {}) {
  return {
    title: values.title.trim(),
    resource_type: values.resource_type || "其他",
    product_line: values.product_line?.trim() || null,
    audience: values.audience?.trim() || null,
    version: values.version?.trim() || null,
    resource_url: values.resource_url?.trim() || null,
    canva_url: values.canva_url?.trim() || null,
    is_external_usable: values.is_external_usable === "on",
    tags: String(values.tags || "").split(/[、,]/).map((tagText) => tagText.trim()).filter(Boolean),
    notes: values.notes?.trim() || null,
    updated_at: nowIso(),
  };
}

function openCreateMarketingResourceModal() {
  openMarketingResourceModal();
}

function openEditMarketingResourceModal(id) {
  const resource = findResource(id);
  if (!resource) return;
  openMarketingResourceModal(resource);
}

function openArchiveMarketingResourceModal(id) {
  const resource = findResource(id);
  if (!resource || resource.deleted_at) return;

  const counts = resourceReferenceCounts(id);
  const referenceText = counts.total
    ? `這份資源目前被 ${counts.total} 個地方引用（${resourceReferenceSummary(id)}）。封存後仍會保留在既有知識條目的已連結清單中並標記為「已封存」，但不會再出現在業務資料庫、常用資料、新增連結選單或資源管理列表。`
    : "這份資源目前沒有被知識條目或需求單引用。封存後不會再出現在業務資料庫、常用資料、新增連結選單或資源管理列表。";

  openModal("封存文宣資源", `
    <p class="empty-note">
      確定要封存「${escapeHtml(resource.title || "未命名資料")}」嗎？
    </p>
    <p class="empty-note">${escapeHtml(referenceText)}</p>
    <p class="empty-note">Phase 1 只做封存，不做真刪除，也不提供復原按鈕。</p>
  `, {
    submitLabel: "封存資源",
    submitTone: "danger",
    onSubmit: async () => {
      await api("PATCH", `marketing_resources?id=eq.${encodeURIComponent(id)}`, {
        deleted_at: nowIso(),
        deleted_by: state.auth.email || null,
        updated_at: nowIso(),
      });
      closeModal();
      await loadExistingData();
      state.role = "marketing";
      state.page = "knowledge";
      render();
    },
  });
}

function openMarketingResourceModal(resource = {}) {
  const isEditing = Boolean(resource.id);
  openModal(isEditing ? "編輯文宣資源" : "新增文宣資源", marketingResourceFormHtml(resource), {
    submitLabel: isEditing ? "儲存變更" : "新增資源",
    onSubmit: async (form) => {
      const values = formValues(form);
      const file = form.elements.resource_file?.files?.[0] || null;
      if (file && file.size > RESOURCE_FILE_MAX_BYTES) {
        throw new Error(`檔案超過上傳上限 ${formatFileSize(RESOURCE_FILE_MAX_BYTES)}，請壓縮後再上傳。`);
      }

      const payload = marketingResourcePayload(values);
      let uploadedPath = null;
      if (file) {
        try {
          uploadedPath = await uploadStorageFile("marketing-resource-files", file);
          payload.file_path = uploadedPath;
          payload.file_name = file.name;
          payload.file_size = file.size;
        } catch (error) {
          const message = error?.message || "";
          const isTooLarge = message.includes("Payload too large") || message.includes("413");
          throw new Error(isTooLarge
            ? `檔案上傳失敗：檔案超過目前 Storage 上限。請先套用 schema_v16_resource_file_size_limit.sql，或確認檔案小於 ${formatFileSize(RESOURCE_FILE_MAX_BYTES)}。`
            : "檔案上傳失敗，請確認 Storage 權限與檔案大小。");
        }
      }

      try {
        if (isEditing) {
          await api("PATCH", `marketing_resources?id=eq.${encodeURIComponent(resource.id)}`, payload);
          if (file && resource.file_path && resource.file_path !== uploadedPath) {
            try {
              await deleteStorageFile("marketing-resource-files", resource.file_path);
            } catch (error) {
              console.warn("old resource file cleanup failed", error);
            }
          }
        } else {
          await api("POST", "marketing_resources", payload);
        }
      } catch (error) {
        if (uploadedPath) {
          try {
            await deleteStorageFile("marketing-resource-files", uploadedPath);
          } catch (cleanupError) {
            console.warn("uploaded resource rollback failed", cleanupError);
          }
        }
        throw error;
      }

      closeModal();
      await loadExistingData();
      state.role = "marketing";
      state.page = "knowledge";
      render();
    },
  });
}

function knowledgeItemFormHtml(item = {}, readOnly = false) {
  const disabled = readOnly ? " disabled" : "";
  const readonly = readOnly ? " readonly" : "";
  return `
    <div class="form-grid">
      <label class="form-field is-wide">
        <span>主題</span>
        <input name="title" value="${escapeAttr(item.title || "")}" required${readonly}>
      </label>
      <label class="form-field">
        <span>知識類型</span>
        <select name="knowledge_type"${disabled}>
          ${selectOptions(knowledgeTypeOptions(), item.knowledge_type || "市場差異化")}
        </select>
      </label>
      <label class="form-field">
        <span>產品線</span>
        <input name="product_line" value="${escapeAttr(item.product_line || "")}"${readonly}>
      </label>
      <label class="form-field">
        <span>適用對象</span>
        <input name="target_segment" value="${escapeAttr(item.target_segment || "")}"${readonly}>
      </label>
      <label class="form-field">
        <span>證據等級</span>
        <select name="evidence_level"${disabled}>
          ${selectOptions([["A", "A 正式來源"], ["B", "B 技術確認"], ["C", "C 待確認"], ["D", "D 不可使用"]], item.evidence_level || "C")}
        </select>
      </label>
      <label class="form-field">
        <span>可用狀態</span>
        <select name="visibility_status"${disabled}>
          ${selectOptions([["可對外", "可對外"], ["僅內部", "僅內部"], ["待確認", "待確認"], ["禁止使用", "禁止使用"]], item.visibility_status || "待確認")}
        </select>
      </label>
      <label class="form-field is-wide">
        <span>使用場合</span>
        <input name="use_context" value="${escapeAttr(item.use_context || "")}"${readonly}>
      </label>
      <label class="form-field is-wide">
        <span>摘要</span>
        <textarea name="summary"${readonly}>${escapeHtml(item.summary || "")}</textarea>
      </label>
      <label class="form-field is-wide">
        <span>詳細說明</span>
        <textarea name="detail"${readonly}>${escapeHtml(item.detail || "")}</textarea>
      </label>
      <label class="form-field is-wide">
        <span>建議業務說法</span>
        <textarea name="recommended_pitch"${readonly}>${escapeHtml(item.recommended_pitch || "")}</textarea>
      </label>
      <label class="form-field is-wide">
        <span>不建議說法</span>
        <textarea name="prohibited_pitch"${readonly}>${escapeHtml(item.prohibited_pitch || "")}</textarea>
      </label>
      <label class="form-field is-wide">
        <span>競品對照</span>
        <textarea name="related_competitor"${readonly}>${escapeHtml(item.related_competitor || "")}</textarea>
      </label>
      <label class="form-field">
        <span>負責人</span>
        <input value="${escapeAttr(item.owner || state.auth.email || "未填")}" readonly>
      </label>
      <label class="form-field">
        <span>最後更新</span>
        <input value="${escapeAttr(formatDate(item.updated_at) || "未記錄")}" readonly>
      </label>
    </div>
  `;
}

function knowledgeTypeOptions() {
  return [
    ["市場差異化", "市場差異化"],
    ["技術比較", "技術比較"],
    ["競品分析", "競品分析"],
    ["客戶異議處理", "客戶異議處理"],
    ["應用場景", "應用場景"],
    ["FAQ", "FAQ"],
    ["簡報說法", "簡報說法"],
    ["資料待確認", "資料待確認"],
  ];
}

function knowledgeItemPayload(values = {}) {
  return {
    title: values.title.trim(),
    product_line: values.product_line?.trim() || null,
    knowledge_type: values.knowledge_type,
    target_segment: values.target_segment?.trim() || null,
    use_context: values.use_context?.trim() || null,
    summary: values.summary?.trim() || null,
    detail: values.detail?.trim() || null,
    recommended_pitch: values.recommended_pitch?.trim() || null,
    prohibited_pitch: values.prohibited_pitch?.trim() || null,
    related_competitor: values.related_competitor?.trim() || null,
    evidence_level: values.evidence_level || "C",
    visibility_status: values.visibility_status || "待確認",
  };
}

function openCreateKnowledgeItemModal() {
  openModal("新增產品知識條目", knowledgeItemFormHtml({
    knowledge_type: "市場差異化",
    evidence_level: "C",
    visibility_status: "待確認",
    owner: state.auth.email,
  }), {
    submitLabel: "建立知識條目",
    onSubmit: async (form) => {
      const values = formValues(form);
      await api("POST", "product_knowledge_items", {
        ...knowledgeItemPayload(values),
        owner: state.auth.email,
      });
      closeModal();
      await loadExistingData();
    },
  });
}

function openCreateAssociationModal() {
  openAssociationModal();
}

function openEditAssociationModal(id) {
  const association = findAssociation(id);
  if (!association || association.archived_at) return;
  openAssociationModal(association);
}

function openAssociationModal(association = {}) {
  const isEdit = Boolean(association.id);
  openModal(isEdit ? "編輯公會主檔" : "新增公會主檔", associationFormHtml(association), {
    submitLabel: isEdit ? "儲存變更" : "建立公會",
    onSubmit: async (form) => {
      const values = formValues(form);
      const payload = associationPayload(values);
      if (!payload.name) throw new Error("請輸入公會名稱。");

      if (isEdit) {
        await api("PATCH", `associations?id=eq.${encodeURIComponent(association.id)}`, payload);
      } else {
        await api("POST", "associations", payload);
      }

      closeModal();
      await loadExistingData();
    },
  });
}

function openArchiveAssociationModal(id) {
  const association = state.data.associations.find((item) => String(item.id) === String(id));
  if (!association) return;

  openModal("封存公會", `
    <p class="empty-note">
      確定要封存「${escapeHtml(associationDisplayName(association))}」嗎？封存後會從公會主檔列表移除，但既有合作、費用、標籤與歷史資料會保留。
    </p>
    <div class="form-grid">
      <label class="form-field is-wide">
        <span>封存原因</span>
        <textarea name="archive_reason" placeholder="例如：合作暫停、資料併入其他公會、年度整理"></textarea>
      </label>
    </div>
  `, {
    submitLabel: "確認封存",
    submitTone: "danger",
    onSubmit: async (form) => {
      const values = formValues(form);
      await api("PATCH", `associations?id=eq.${encodeURIComponent(id)}`, {
        archived_at: nowIso(),
        archived_by: state.auth.email,
        archive_reason: values.archive_reason?.trim() || null,
        updated_at: nowIso(),
      });
      state.associationDetailId = "";
      closeModal();
      await loadExistingData();
    },
  });
}

function openAddAssociationTagModal(associationId) {
  const association = findAssociation(associationId);
  if (!association || association.archived_at) return;

  openModal("新增公會關係標籤", `
    <p class="empty-note">同一公會可同時有多個合作標籤，例如未入會但有講座協辦、期刊合作或活動贊助。</p>
    <div class="form-grid">
      <label class="form-field is-wide">
        <span>標籤 *</span>
        <input name="tag" list="associationTagOptions" required placeholder="例如：講座協辦">
        <datalist id="associationTagOptions">${associationTagSuggestions()}</datalist>
      </label>
    </div>
  `, {
    submitLabel: "新增標籤",
    onSubmit: async (form) => {
      const values = formValues(form);
      const label = values.tag?.trim();
      if (!label) throw new Error("請輸入標籤。");
      if (associationTagsFor(association.id).some((tagRow) => tagRow.tag === label)) {
        throw new Error("這個公會已經有相同標籤。");
      }
      await api("POST", "association_relationship_tags", {
        association_id: association.id,
        tag: label,
      });
      closeModal();
      await loadExistingData();
    },
  });
}

function openRemoveAssociationTagModal(id) {
  const tagRow = state.data.associationTags.find((item) => String(item.id || "") === String(id || ""));
  if (!tagRow) return;
  const association = findAssociation(tagRow.association_id);
  if (association?.archived_at) return;

  openModal("移除公會關係標籤", `
    <p class="empty-note">
      確定要從「${escapeHtml(associationDisplayName(association || {}))}」移除「${escapeHtml(tagRow.tag || "未命名標籤")}」嗎？這只會移除標籤，不會刪除公會或合作紀錄。
    </p>
  `, {
    submitLabel: "確認移除",
    submitTone: "danger",
    onSubmit: async () => {
      await api("DELETE", `association_relationship_tags?id=eq.${encodeURIComponent(id)}`);
      closeModal();
      await loadExistingData();
    },
  });
}

function associationFormHtml(association = {}) {
  return `
    <div class="form-section">
      <h3>基本資料</h3>
      <div class="form-grid">
        <label class="form-field is-wide">
          <span>公會名稱 *</span>
          <input name="name" value="${escapeAttr(association.name || "")}" required>
        </label>
        <label class="form-field">
          <span>公會類型</span>
          <input name="association_type" list="associationTypeOptions" value="${escapeAttr(association.association_type || "")}" placeholder="例如：公會、協會、學會">
          <datalist id="associationTypeOptions">${associationTypeSuggestions(association.association_type || "")}</datalist>
        </label>
        <label class="form-field">
          <span>正式關係</span>
          <select name="join_status">${associationStatusOptions(association.join_status || "未入會")}</select>
        </label>
        <label class="form-field">
          <span>內部負責人</span>
          <input name="internal_owner" value="${escapeAttr(association.internal_owner || state.auth.email || "")}">
        </label>
        <label class="form-field">
          <span>聯絡人</span>
          <input name="contact_person" value="${escapeAttr(association.contact_person || "")}">
        </label>
      </div>
    </div>

    <div class="form-section">
      <h3>聯絡資訊</h3>
      <div class="form-grid">
        <label class="form-field">
          <span>電話</span>
          <input name="phone" value="${escapeAttr(association.phone || "")}">
        </label>
        <label class="form-field">
          <span>Email</span>
          <input name="email" type="email" value="${escapeAttr(association.email || "")}">
        </label>
        <label class="form-field">
          <span>網站</span>
          <input name="website" value="${escapeAttr(association.website || "")}">
        </label>
        <label class="form-field">
          <span>LINE / 社群</span>
          <input name="line_url" value="${escapeAttr(association.line_url || "")}">
        </label>
        <label class="form-field is-wide">
          <span>地址</span>
          <input name="address" value="${escapeAttr(association.address || "")}">
        </label>
        <label class="form-field is-wide">
          <span>備註</span>
          <textarea name="notes">${escapeHtml(association.notes || "")}</textarea>
        </label>
      </div>
    </div>
  `;
}

function associationPayload(values = {}) {
  return {
    name: values.name?.trim(),
    association_type: values.association_type?.trim() || null,
    join_status: values.join_status || "未入會",
    contact_person: values.contact_person?.trim() || null,
    phone: values.phone?.trim() || null,
    email: values.email?.trim() || null,
    address: values.address?.trim() || null,
    website: values.website?.trim() || null,
    line_url: values.line_url?.trim() || null,
    internal_owner: values.internal_owner?.trim() || null,
    notes: values.notes?.trim() || null,
    updated_at: nowIso(),
  };
}

function associationTaskFormHtml(task = {}, associationId = "") {
  const selectedAssociationId = task.association_id || associationId;
  const materials = Array.isArray(task.required_materials) ? task.required_materials.join("、") : "";
  return `
    <input type="hidden" name="association_id" value="${escapeAttr(selectedAssociationId)}">
    <div class="form-section">
      <h3>任務基本資訊</h3>
      <div class="form-grid">
        <label class="form-field is-wide">
          <span>所屬公會</span>
          <input value="${escapeAttr(associationDisplayName(findAssociation(selectedAssociationId) || {}))}" readonly>
        </label>
        <label class="form-field is-wide">
          <span>任務名稱 *</span>
          <input name="task_name" value="${escapeAttr(task.task_name || "")}" required>
        </label>
        <label class="form-field">
          <span>任務類型</span>
          <input name="task_type" list="associationTaskTypeOptions" value="${escapeAttr(task.task_type || "其他")}">
          <datalist id="associationTaskTypeOptions">${associationTaskTypeSuggestions(task.task_type || "")}</datalist>
        </label>
        <label class="form-field">
          <span>狀態</span>
          <select name="task_status">${selectOptions(associationTaskStatusOptions(), task.task_status || "待確認")}</select>
        </label>
        <label class="form-field">
          <span>優先級</span>
          <select name="priority">${selectOptions([["高", "高"], ["中", "中"], ["低", "低"]], task.priority || "中")}</select>
        </label>
        <label class="form-field">
          <span>負責人</span>
          <input name="owner" value="${escapeAttr(task.owner || state.auth.email || "")}">
        </label>
        <label class="form-field is-wide">
          <span>關聯行銷案</span>
          <select name="marketing_campaign_id">${associationTaskCampaignOptions(task.marketing_campaign_id || "")}</select>
        </label>
      </div>
    </div>

    <div class="form-section">
      <h3>日期與進度</h3>
      <div class="form-grid">
        <label class="form-field">
          <span>開始日</span>
          <input name="start_date" type="date" value="${escapeAttr(formatDate(task.start_date))}">
        </label>
        <label class="form-field">
          <span>到期日</span>
          <input name="due_date" type="date" value="${escapeAttr(formatDate(task.due_date))}">
        </label>
        <label class="form-field">
          <span>完成日</span>
          <input name="completed_date" type="date" value="${escapeAttr(formatDate(task.completed_date))}">
        </label>
        <label class="form-field">
          <span>進度 %</span>
          <input name="progress_pct" type="number" min="0" max="100" step="1" value="${escapeAttr(task.progress_pct ?? 0)}">
        </label>
      </div>
    </div>

    <div class="form-section">
      <h3>內容與附件</h3>
      <div class="form-grid">
        <label class="form-field is-wide">
          <span>說明</span>
          <textarea name="description">${escapeHtml(task.description || "")}</textarea>
        </label>
        <label class="form-field is-wide">
          <span>下一步</span>
          <textarea name="next_step">${escapeHtml(task.next_step || "")}</textarea>
        </label>
        <label class="form-field is-wide">
          <span>所需素材</span>
          <input name="required_materials" value="${escapeAttr(materials)}" placeholder="用逗號或頓號分隔，例如：公司介紹、DM、Logo">
        </label>
        <label class="form-field is-wide">
          <span>附件 / 連結</span>
          <input name="attachment" value="${escapeAttr(task.attachment || "")}" placeholder="貼上連結或檔名">
        </label>
        <label class="form-field is-wide">
          <span>備註</span>
          <textarea name="notes">${escapeHtml(task.notes || "")}</textarea>
        </label>
      </div>
    </div>
  `;
}

function associationTaskPayload(values = {}) {
  return {
    association_id: values.association_id,
    marketing_campaign_id: values.marketing_campaign_id || null,
    task_name: values.task_name?.trim(),
    task_type: values.task_type?.trim() || "其他",
    task_status: values.task_status || "待確認",
    priority: values.priority || "中",
    start_date: values.start_date || null,
    due_date: values.due_date || null,
    completed_date: values.completed_date || null,
    progress_pct: Math.max(0, Math.min(100, numericOrNull(values.progress_pct) ?? 0)),
    owner: values.owner?.trim() || null,
    description: values.description?.trim() || null,
    next_step: values.next_step?.trim() || null,
    required_materials: splitDelimitedText(values.required_materials),
    attachment: values.attachment?.trim() || null,
    notes: values.notes?.trim() || null,
    updated_at: nowIso(),
  };
}

function openCreateAssociationTaskModal(associationId) {
  const association = findAssociation(associationId);
  if (!association || association.archived_at) return;
  openAssociationTaskModal({ association_id: association.id, owner: state.auth.email });
}

function openEditAssociationTaskModal(id) {
  const task = findAssociationTask(id);
  const association = findAssociation(task?.association_id);
  if (!task || isCancelledAssociationTask(task) || association?.archived_at) return;
  openAssociationTaskModal(task);
}

function openAssociationTaskModal(task = {}) {
  const isEdit = Boolean(task.id);
  openModal(isEdit ? "編輯公會任務" : "新增公會任務", associationTaskFormHtml(task, task.association_id), {
    submitLabel: isEdit ? "儲存變更" : "建立任務",
    onSubmit: async (form) => {
      const values = formValues(form);
      const payload = associationTaskPayload(values);
      if (!payload.association_id) throw new Error("缺少所屬公會。");
      if (!payload.task_name) throw new Error("請輸入任務名稱。");

      if (isEdit) {
        await api("PATCH", `association_tasks?id=eq.${encodeURIComponent(task.id)}`, payload);
      } else {
        await api("POST", "association_tasks", payload);
      }

      state.associationDetailId = payload.association_id;
      closeModal();
      await loadExistingData();
    },
  });
}

function openCancelAssociationTaskModal(id) {
  const task = findAssociationTask(id);
  const association = findAssociation(task?.association_id);
  if (!task || task.cancelled_at || association?.archived_at) return;

  openModal("取消公會任務", `
    <p class="empty-note">確定要取消「${escapeHtml(task.task_name || "未命名任務")}」嗎？取消後任務會移到歷史紀錄，既有任務費用不會被刪除。</p>
    <div class="form-grid">
      <label class="form-field is-wide">
        <span>取消原因（選填）</span>
        <textarea name="cancel_reason"></textarea>
      </label>
    </div>
  `, {
    submitLabel: "確認取消",
    submitTone: "danger",
    onSubmit: async (form) => {
      const values = formValues(form);
      await api("PATCH", `association_tasks?id=eq.${encodeURIComponent(id)}`, {
        cancelled_at: nowIso(),
        cancelled_by: state.auth.email,
        cancel_reason: values.cancel_reason?.trim() || null,
        updated_at: nowIso(),
      });
      state.associationDetailId = task.association_id;
      closeModal();
      await loadExistingData();
    },
  });
}

function associationTaskExpenseFormHtml(expense = {}, associationId = "") {
  const selectedAssociationId = expense.association_id || associationId;
  return `
    <input type="hidden" name="association_id" value="${escapeAttr(selectedAssociationId)}">
    <div class="form-section">
      <h3>費用基本資訊</h3>
      <div class="form-grid">
        <label class="form-field is-wide">
          <span>所屬公會</span>
          <input value="${escapeAttr(associationDisplayName(findAssociation(selectedAssociationId) || {}))}" readonly>
        </label>
        <label class="form-field is-wide">
          <span>關聯任務</span>
          <select name="task_id">${associationTaskOptions(selectedAssociationId, expense.task_id || "")}</select>
        </label>
        <label class="form-field">
          <span>費用類型</span>
          <input name="expense_type" list="associationExpenseTypeOptions" value="${escapeAttr(expense.expense_type || "其他")}">
          <datalist id="associationExpenseTypeOptions">${associationExpenseTypeSuggestions(expense.expense_type || "")}</datalist>
        </label>
        <label class="form-field">
          <span>付款狀態</span>
          <select name="payment_status">${selectOptions(associationExpensePaymentOptions(), expense.payment_status || "未付款")}</select>
        </label>
      </div>
    </div>

    <div class="form-section">
      <h3>金額與憑證</h3>
      <div class="form-grid">
        <label class="form-field">
          <span>預算金額</span>
          <input name="budget_amount" type="number" min="0" step="1" value="${escapeAttr(expense.budget_amount ?? "")}">
        </label>
        <label class="form-field">
          <span>實際金額</span>
          <input name="actual_amount" type="number" min="0" step="1" value="${escapeAttr(expense.actual_amount ?? "")}">
        </label>
        <label class="form-field">
          <span>付款日</span>
          <input name="payment_date" type="date" value="${escapeAttr(formatDate(expense.payment_date))}">
        </label>
        <label class="form-field">
          <span>收據狀態</span>
          <input name="receipt_status" value="${escapeAttr(expense.receipt_status || "")}" placeholder="例如：未收到、已收到、待補">
        </label>
        <label class="form-field is-wide">
          <span>收據附件 / 連結</span>
          <input name="receipt_attachment" value="${escapeAttr(expense.receipt_attachment || "")}" placeholder="貼上連結或檔名">
        </label>
        <label class="form-field is-wide">
          <span>備註</span>
          <textarea name="notes">${escapeHtml(expense.notes || "")}</textarea>
        </label>
      </div>
    </div>
  `;
}

function associationTaskExpensePayload(values = {}) {
  return {
    association_id: values.association_id,
    task_id: values.task_id || null,
    expense_type: values.expense_type?.trim() || "其他",
    budget_amount: numericOrNull(values.budget_amount),
    actual_amount: numericOrNull(values.actual_amount),
    payment_status: values.payment_status || "未付款",
    payment_date: values.payment_date || null,
    receipt_status: values.receipt_status?.trim() || null,
    receipt_attachment: values.receipt_attachment?.trim() || null,
    notes: values.notes?.trim() || null,
    updated_at: nowIso(),
  };
}

function openCreateAssociationTaskExpenseModal(associationId) {
  const association = findAssociation(associationId);
  if (!association || association.archived_at) return;
  openAssociationTaskExpenseModal({ association_id: association.id });
}

function openEditAssociationTaskExpenseModal(id) {
  const expense = findAssociationTaskExpense(id);
  const association = findAssociation(expense?.association_id);
  if (!expense || expense.cancelled_at || association?.archived_at) return;
  openAssociationTaskExpenseModal(expense);
}

function openAssociationTaskExpenseModal(expense = {}) {
  const isEdit = Boolean(expense.id);
  openModal(isEdit ? "編輯公會任務費用" : "新增公會任務費用", associationTaskExpenseFormHtml(expense, expense.association_id), {
    submitLabel: isEdit ? "儲存變更" : "建立費用",
    onSubmit: async (form) => {
      const values = formValues(form);
      const payload = associationTaskExpensePayload(values);
      if (!payload.association_id) throw new Error("缺少所屬公會。");

      if (isEdit) {
        await api("PATCH", `association_task_expenses?id=eq.${encodeURIComponent(expense.id)}`, payload);
      } else {
        await api("POST", "association_task_expenses", payload);
      }

      state.associationDetailId = payload.association_id;
      closeModal();
      await loadExistingData();
    },
  });
}

function openCancelAssociationTaskExpenseModal(id) {
  const expense = findAssociationTaskExpense(id);
  const association = findAssociation(expense?.association_id);
  if (!expense || expense.cancelled_at || association?.archived_at) return;

  openModal("取消公會任務費用", `
    <p class="empty-note">確定要取消「${escapeHtml(expense.expense_type || "未命名費用")}」嗎？取消後不會納入總支出彙總，但會保留在歷史紀錄。</p>
    <div class="form-grid">
      <label class="form-field is-wide">
        <span>取消原因（選填）</span>
        <textarea name="cancel_reason"></textarea>
      </label>
    </div>
  `, {
    submitLabel: "確認取消",
    submitTone: "danger",
    onSubmit: async (form) => {
      const values = formValues(form);
      await api("PATCH", `association_task_expenses?id=eq.${encodeURIComponent(id)}`, {
        cancelled_at: nowIso(),
        cancelled_by: state.auth.email,
        cancel_reason: values.cancel_reason?.trim() || null,
        updated_at: nowIso(),
      });
      state.associationDetailId = expense.association_id;
      closeModal();
      await loadExistingData();
    },
  });
}

function associationEventFormHtml(event = {}, associationId = "") {
  const selectedAssociationId = event.association_id || associationId;
  const materials = Array.isArray(event.required_materials) ? event.required_materials.join("、") : "";
  return `
    <input type="hidden" name="association_id" value="${escapeAttr(selectedAssociationId)}">
    <div class="form-section">
      <h3>活動基本資訊</h3>
      <div class="form-grid">
        <label class="form-field is-wide">
          <span>所屬公會</span>
          <input value="${escapeAttr(associationDisplayName(findAssociation(selectedAssociationId) || {}))}" readonly>
        </label>
        <label class="form-field is-wide">
          <span>活動名稱 *</span>
          <input name="event_name" value="${escapeAttr(event.event_name || "")}" required>
        </label>
        <label class="form-field">
          <span>活動類型</span>
          <input name="event_type" list="associationEventTypeOptions" value="${escapeAttr(event.event_type || "其他")}">
          <datalist id="associationEventTypeOptions">${associationEventTypeSuggestions(event.event_type || "")}</datalist>
        </label>
        <label class="form-field">
          <span>階段</span>
          <select name="event_status">${associationStageSelectOptions("event", event.event_status || "待確認")}</select>
        </label>
        <label class="form-field">
          <span>活動日期</span>
          <input name="event_date" type="date" value="${escapeAttr(formatDate(event.event_date))}">
        </label>
        <label class="form-field">
          <span>關聯任務</span>
          <select name="task_id">${associationTaskOptions(selectedAssociationId, event.task_id || "")}</select>
        </label>
      </div>
    </div>

    <div class="form-section">
      <h3>合作內容</h3>
      <div class="form-grid">
        <label class="form-field">
          <span>地點</span>
          <input name="location" value="${escapeAttr(event.location || "")}">
        </label>
        <label class="form-field">
          <span>主辦 / 協辦單位</span>
          <input name="organizer" value="${escapeAttr(event.organizer || "")}">
        </label>
        <label class="form-field">
          <span>美昇角色</span>
          <input name="meisun_role" list="associationRoleOptions" value="${escapeAttr(event.meisun_role || "")}" placeholder="例如：協辦、贊助、講師">
          <datalist id="associationRoleOptions">${associationRoleSuggestions(event.meisun_role || "")}</datalist>
        </label>
        <label class="form-field">
          <span>負責人</span>
          <input name="owner" value="${escapeAttr(event.owner || state.auth.email || "")}">
        </label>
        <label class="form-field">
          <span>預算金額</span>
          <input name="budget" type="number" min="0" step="1" value="${escapeAttr(event.budget ?? "")}">
        </label>
        <label class="form-field">
          <span>實際支出</span>
          <input name="actual_spend" type="number" min="0" step="1" value="${escapeAttr(event.actual_spend ?? "")}">
        </label>
      </div>
    </div>

    <div class="form-section">
      <h3>素材與結果</h3>
      <div class="form-grid">
        <label class="form-field is-wide">
          <span>所需素材</span>
          <input name="required_materials" value="${escapeAttr(materials)}" placeholder="例如：DM、簡報、名片、禮品、產品資料、展示品">
        </label>
        <label class="form-field is-wide">
          <span>結果 / 下一步</span>
          <textarea name="result_notes">${escapeHtml(event.result_notes || "")}</textarea>
        </label>
        <label class="form-field is-wide">
          <span>附件 / 連結</span>
          <input name="attachment" value="${escapeAttr(event.attachment || "")}" placeholder="貼上連結或檔名">
        </label>
      </div>
    </div>
  `;
}

function associationEventPayload(values = {}) {
  return {
    association_id: values.association_id,
    task_id: values.task_id || null,
    event_name: values.event_name?.trim(),
    event_type: values.event_type?.trim() || "其他",
    event_date: values.event_date || null,
    location: values.location?.trim() || null,
    organizer: values.organizer?.trim() || null,
    meisun_role: values.meisun_role?.trim() || null,
    budget: numericOrNull(values.budget),
    actual_spend: numericOrNull(values.actual_spend),
    required_materials: splitDelimitedText(values.required_materials),
    event_status: values.event_status || "待確認",
    owner: values.owner?.trim() || null,
    result_notes: values.result_notes?.trim() || null,
    attachment: values.attachment?.trim() || null,
    updated_at: nowIso(),
  };
}

function openCreateAssociationEventModal(associationId) {
  const association = findAssociation(associationId);
  if (!association || association.archived_at) return;
  openAssociationEventModal({ association_id: association.id, owner: state.auth.email });
}

function openEditAssociationEventModal(id) {
  const event = findAssociationEvent(id);
  const association = findAssociation(event?.association_id);
  if (!event || isCancelledAssociationEvent(event) || association?.archived_at) return;
  openAssociationEventModal(event);
}

function openAssociationEventModal(event = {}) {
  const isEdit = Boolean(event.id);
  openModal(isEdit ? "編輯公會活動" : "新增公會活動", associationEventFormHtml(event, event.association_id), {
    submitLabel: isEdit ? "儲存變更" : "建立活動",
    onSubmit: async (form) => {
      const values = formValues(form);
      const payload = associationEventPayload(values);
      if (!payload.association_id) throw new Error("缺少所屬公會。");
      if (!payload.event_name) throw new Error("請輸入活動名稱。");

      if (isEdit) {
        await api("PATCH", `association_events?id=eq.${encodeURIComponent(event.id)}`, payload);
      } else {
        await api("POST", "association_events", payload);
      }

      state.associationDetailId = payload.association_id;
      closeModal();
      await loadExistingData();
    },
  });
}

function openCancelAssociationEventModal(id) {
  const event = findAssociationEvent(id);
  const association = findAssociation(event?.association_id);
  if (!event || isCancelledAssociationEvent(event) || association?.archived_at) return;

  openModal("取消公會活動", `
    <p class="empty-note">確定要取消「${escapeHtml(event.event_name || "未命名活動")}」嗎？取消後活動會移到歷史紀錄，合作概覽也會排除這筆。</p>
    <div class="form-grid">
      <label class="form-field is-wide">
        <span>取消原因（選填）</span>
        <textarea name="cancel_reason"></textarea>
      </label>
    </div>
  `, {
    submitLabel: "確認取消",
    submitTone: "danger",
    onSubmit: async (form) => {
      const values = formValues(form);
      await api("PATCH", `association_events?id=eq.${encodeURIComponent(id)}`, {
        cancelled_at: nowIso(),
        cancelled_by: state.auth.email,
        cancel_reason: values.cancel_reason?.trim() || null,
        updated_at: nowIso(),
      });
      state.associationDetailId = event.association_id;
      closeModal();
      await loadExistingData();
    },
  });
}

function associationPublicationFormHtml(publication = {}, associationId = "") {
  const selectedAssociationId = publication.association_id || associationId;
  const materials = Array.isArray(publication.required_materials) ? publication.required_materials.join("、") : "";
  return `
    <input type="hidden" name="association_id" value="${escapeAttr(selectedAssociationId)}">
    <div class="form-section">
      <h3>期刊基本資訊</h3>
      <div class="form-grid">
        <label class="form-field is-wide">
          <span>所屬公會</span>
          <input value="${escapeAttr(associationDisplayName(findAssociation(selectedAssociationId) || {}))}" readonly>
        </label>
        <label class="form-field is-wide">
          <span>期刊名稱 *</span>
          <input name="publication_name" value="${escapeAttr(publication.publication_name || "")}" required>
        </label>
        <label class="form-field">
          <span>素材階段</span>
          <select name="material_status">${associationStageSelectOptions("publication", publication.material_status || "待確認主題")}</select>
        </label>
        <label class="form-field">
          <span>關聯任務</span>
          <select name="task_id">${associationTaskOptions(selectedAssociationId, publication.task_id || "")}</select>
        </label>
        <label class="form-field">
          <span>截稿日</span>
          <input name="deadline_date" type="date" value="${escapeAttr(formatDate(publication.deadline_date))}">
        </label>
        <label class="form-field">
          <span>刊出日</span>
          <input name="publish_date" type="date" value="${escapeAttr(formatDate(publication.publish_date))}">
        </label>
        <label class="form-field">
          <span>送件日</span>
          <input name="submission_date" type="date" value="${escapeAttr(formatDate(publication.submission_date))}">
        </label>
        <label class="form-field">
          <span>負責人</span>
          <input name="owner" value="${escapeAttr(publication.owner || state.auth.email || "")}">
        </label>
      </div>
    </div>

    <div class="form-section">
      <h3>內容與素材</h3>
      <div class="form-grid">
        <label class="form-field">
          <span>刊登規格</span>
          <input name="ad_spec" value="${escapeAttr(publication.ad_spec || "")}" placeholder="例如：半版、全版、專訪">
        </label>
        <label class="form-field">
          <span>主題</span>
          <input name="topic" value="${escapeAttr(publication.topic || "")}">
        </label>
        <label class="form-field is-wide">
          <span>所需素材</span>
          <input name="required_materials" value="${escapeAttr(materials)}" placeholder="例如：公司介紹、產品圖片、文案、Logo、案例、廣告圖">
        </label>
        <label class="form-field is-wide">
          <span>結果 / 下一步</span>
          <textarea name="result_notes">${escapeHtml(publication.result_notes || "")}</textarea>
        </label>
        <label class="form-field is-wide">
          <span>附件 / 連結</span>
          <input name="attachment" value="${escapeAttr(publication.attachment || "")}" placeholder="貼上連結或檔名">
        </label>
      </div>
    </div>
  `;
}

function associationPublicationPayload(values = {}) {
  return {
    association_id: values.association_id,
    task_id: values.task_id || null,
    publication_name: values.publication_name?.trim(),
    publish_date: values.publish_date || null,
    deadline_date: values.deadline_date || null,
    ad_spec: values.ad_spec?.trim() || null,
    topic: values.topic?.trim() || null,
    required_materials: splitDelimitedText(values.required_materials),
    material_status: values.material_status || "待確認主題",
    owner: values.owner?.trim() || null,
    submission_date: values.submission_date || null,
    result_notes: values.result_notes?.trim() || null,
    attachment: values.attachment?.trim() || null,
    updated_at: nowIso(),
  };
}

function openCreateAssociationPublicationModal(associationId) {
  const association = findAssociation(associationId);
  if (!association || association.archived_at) return;
  openAssociationPublicationModal({ association_id: association.id, owner: state.auth.email });
}

function openEditAssociationPublicationModal(id) {
  const publication = findAssociationPublication(id);
  const association = findAssociation(publication?.association_id);
  if (!publication || isCancelledAssociationPublication(publication) || association?.archived_at) return;
  openAssociationPublicationModal(publication);
}

function openAssociationPublicationModal(publication = {}) {
  const isEdit = Boolean(publication.id);
  openModal(isEdit ? "編輯期刊排程" : "新增期刊排程", associationPublicationFormHtml(publication, publication.association_id), {
    submitLabel: isEdit ? "儲存變更" : "建立期刊排程",
    onSubmit: async (form) => {
      const values = formValues(form);
      const payload = associationPublicationPayload(values);
      if (!payload.association_id) throw new Error("缺少所屬公會。");
      if (!payload.publication_name) throw new Error("請輸入期刊名稱。");

      if (isEdit) {
        await api("PATCH", `association_publication_schedules?id=eq.${encodeURIComponent(publication.id)}`, payload);
      } else {
        await api("POST", "association_publication_schedules", payload);
      }

      state.associationDetailId = payload.association_id;
      closeModal();
      await loadExistingData();
    },
  });
}

function openCancelAssociationPublicationModal(id) {
  const publication = findAssociationPublication(id);
  const association = findAssociation(publication?.association_id);
  if (!publication || isCancelledAssociationPublication(publication) || association?.archived_at) return;

  openModal("取消期刊排程", `
    <p class="empty-note">確定要取消「${escapeHtml(publication.publication_name || "未命名期刊")}」嗎？取消後期刊排程會移到歷史紀錄，合作概覽也會排除這筆。</p>
    <div class="form-grid">
      <label class="form-field is-wide">
        <span>取消原因（選填）</span>
        <textarea name="cancel_reason"></textarea>
      </label>
    </div>
  `, {
    submitLabel: "確認取消",
    submitTone: "danger",
    onSubmit: async (form) => {
      const values = formValues(form);
      await api("PATCH", `association_publication_schedules?id=eq.${encodeURIComponent(id)}`, {
        cancelled_at: nowIso(),
        cancelled_by: state.auth.email,
        cancel_reason: values.cancel_reason?.trim() || null,
        updated_at: nowIso(),
      });
      state.associationDetailId = publication.association_id;
      closeModal();
      await loadExistingData();
    },
  });
}

function associationFeeFormHtml(fee = {}, associationId = "") {
  const selectedAssociationId = fee.association_id || associationId;
  return `
    <input type="hidden" name="association_id" value="${escapeAttr(selectedAssociationId)}">
    <div class="form-section">
      <h3>年費 / 會費資訊</h3>
      <div class="form-grid">
        <label class="form-field is-wide">
          <span>所屬公會</span>
          <input value="${escapeAttr(associationDisplayName(findAssociation(selectedAssociationId) || {}))}" readonly>
        </label>
        <label class="form-field">
          <span>年度</span>
          <input name="year" type="number" min="2000" step="1" value="${escapeAttr(fee.year || new Date().getFullYear())}">
        </label>
        <label class="form-field">
          <span>金額</span>
          <input name="fee_amount" type="number" min="0" step="1" value="${escapeAttr(fee.fee_amount ?? "")}">
        </label>
        <label class="form-field">
          <span>繳費狀態</span>
          <select name="payment_status">${associationFeePaymentOptions(fee.payment_status || "未繳")}</select>
        </label>
        <label class="form-field">
          <span>繳費日</span>
          <input name="payment_date" type="date" value="${escapeAttr(formatDate(fee.payment_date))}">
        </label>
        <label class="form-field">
          <span>到期日</span>
          <input name="due_date" type="date" value="${escapeAttr(formatDate(fee.due_date))}">
        </label>
        <label class="form-field">
          <span>續會提醒日</span>
          <input name="renewal_reminder_date" type="date" value="${escapeAttr(formatDate(fee.renewal_reminder_date))}">
        </label>
      </div>
    </div>

    <div class="form-section">
      <h3>收據與備註</h3>
      <div class="form-grid">
        <label class="form-field">
          <span>收據狀態</span>
          <input name="receipt_status" value="${escapeAttr(fee.receipt_status || "")}" placeholder="例如：未收到、已收到、待補">
        </label>
        <label class="form-field is-wide">
          <span>收據附件 / 連結</span>
          <input name="receipt_attachment" value="${escapeAttr(fee.receipt_attachment || "")}" placeholder="貼上連結或檔名">
        </label>
        <label class="form-field is-wide">
          <span>備註</span>
          <textarea name="notes">${escapeHtml(fee.notes || "")}</textarea>
        </label>
      </div>
    </div>
  `;
}

function associationFeePayload(values = {}) {
  return {
    association_id: values.association_id,
    year: Number(values.year) || new Date().getFullYear(),
    fee_amount: numericOrNull(values.fee_amount),
    payment_status: values.payment_status || "未繳",
    payment_date: values.payment_date || null,
    due_date: values.due_date || null,
    receipt_status: values.receipt_status?.trim() || null,
    receipt_attachment: values.receipt_attachment?.trim() || null,
    renewal_reminder_date: values.renewal_reminder_date || null,
    notes: values.notes?.trim() || null,
    updated_at: nowIso(),
  };
}

function openCreateAssociationFeeModal(associationId) {
  const association = findAssociation(associationId);
  if (!association || association.archived_at) return;
  openAssociationFeeModal({ association_id: association.id });
}

function openEditAssociationFeeModal(id) {
  const fee = findAssociationFee(id);
  const association = findAssociation(fee?.association_id);
  if (!fee || fee.cancelled_at || association?.archived_at) return;
  openAssociationFeeModal(fee);
}

function openAssociationFeeModal(fee = {}) {
  const isEdit = Boolean(fee.id);
  openModal(isEdit ? "編輯年費 / 會費" : "新增年費 / 會費", associationFeeFormHtml(fee, fee.association_id), {
    submitLabel: isEdit ? "儲存變更" : "建立年費",
    onSubmit: async (form) => {
      const values = formValues(form);
      const payload = associationFeePayload(values);
      if (!payload.association_id) throw new Error("缺少所屬公會。");

      if (isEdit) {
        await api("PATCH", `association_fee_records?id=eq.${encodeURIComponent(fee.id)}`, payload);
      } else {
        await api("POST", "association_fee_records", payload);
      }

      state.associationDetailId = payload.association_id;
      closeModal();
      await loadExistingData();
    },
  });
}

function openCancelAssociationFeeModal(id) {
  const fee = findAssociationFee(id);
  const association = findAssociation(fee?.association_id);
  if (!fee || fee.cancelled_at || association?.archived_at) return;

  openModal("取消年費 / 會費", `
    <p class="empty-note">確定要取消「${escapeHtml(String(fee.year || "未填年度"))} 年費 / 會費」嗎？取消後會從費用清單與總支出彙總排除，但歷史紀錄會保留。</p>
    <div class="form-grid">
      <label class="form-field is-wide">
        <span>取消原因（選填）</span>
        <textarea name="cancel_reason"></textarea>
      </label>
    </div>
  `, {
    submitLabel: "確認取消",
    submitTone: "danger",
    onSubmit: async (form) => {
      const values = formValues(form);
      await api("PATCH", `association_fee_records?id=eq.${encodeURIComponent(id)}`, {
        cancelled_at: nowIso(),
        cancelled_by: state.auth.email,
        cancel_reason: values.cancel_reason?.trim() || null,
        updated_at: nowIso(),
      });
      state.associationDetailId = fee.association_id;
      closeModal();
      await loadExistingData();
    },
  });
}

function associationBenefitFormHtml(benefit = {}, associationId = "") {
  const selectedAssociationId = benefit.association_id || associationId;
  return `
    <input type="hidden" name="association_id" value="${escapeAttr(selectedAssociationId)}">
    <div class="form-section">
      <h3>權益基本資訊</h3>
      <div class="form-grid">
        <label class="form-field is-wide">
          <span>所屬公會</span>
          <input value="${escapeAttr(associationDisplayName(findAssociation(selectedAssociationId) || {}))}" readonly>
        </label>
        <label class="form-field is-wide">
          <span>權益名稱 *</span>
          <input name="benefit_name" value="${escapeAttr(benefit.benefit_name || "")}" required>
        </label>
        <label class="form-field">
          <span>權益類型</span>
          <input name="benefit_type" list="associationBenefitTypeOptions" value="${escapeAttr(benefit.benefit_type || "其他")}">
          <datalist id="associationBenefitTypeOptions">${associationBenefitTypeSuggestions(benefit.benefit_type || "")}</datalist>
        </label>
        <label class="form-field">
          <span>使用狀態</span>
          <select name="usage_status">${associationBenefitUsageOptions(benefit.usage_status || "未使用")}</select>
        </label>
        <label class="form-field">
          <span>有效期限</span>
          <input name="valid_until" type="date" value="${escapeAttr(formatDate(benefit.valid_until))}">
        </label>
        <label class="form-field">
          <span>負責人</span>
          <input name="owner" value="${escapeAttr(benefit.owner || state.auth.email || "")}">
        </label>
      </div>
    </div>

    <div class="form-section">
      <h3>說明與備註</h3>
      <div class="form-grid">
        <label class="form-field is-wide">
          <span>權益說明</span>
          <textarea name="description">${escapeHtml(benefit.description || "")}</textarea>
        </label>
        <label class="form-field is-wide">
          <span>備註</span>
          <textarea name="notes">${escapeHtml(benefit.notes || "")}</textarea>
        </label>
      </div>
    </div>
  `;
}

function associationBenefitPayload(values = {}) {
  return {
    association_id: values.association_id,
    benefit_name: values.benefit_name?.trim(),
    benefit_type: values.benefit_type?.trim() || "其他",
    description: values.description?.trim() || null,
    usage_status: values.usage_status || "未使用",
    valid_until: values.valid_until || null,
    owner: values.owner?.trim() || null,
    notes: values.notes?.trim() || null,
    updated_at: nowIso(),
  };
}

function openCreateAssociationBenefitModal(associationId) {
  const association = findAssociation(associationId);
  if (!association || association.archived_at) return;
  openAssociationBenefitModal({ association_id: association.id, owner: state.auth.email });
}

function openEditAssociationBenefitModal(id) {
  const benefit = findAssociationBenefit(id);
  const association = findAssociation(benefit?.association_id);
  if (!benefit || benefit.archived_at || association?.archived_at) return;
  openAssociationBenefitModal(benefit);
}

function openAssociationBenefitModal(benefit = {}) {
  const isEdit = Boolean(benefit.id);
  openModal(isEdit ? "編輯會員權益" : "新增會員權益", associationBenefitFormHtml(benefit, benefit.association_id), {
    submitLabel: isEdit ? "儲存變更" : "建立權益",
    onSubmit: async (form) => {
      const values = formValues(form);
      const payload = associationBenefitPayload(values);
      if (!payload.association_id) throw new Error("缺少所屬公會。");
      if (!payload.benefit_name) throw new Error("請輸入權益名稱。");

      if (isEdit) {
        await api("PATCH", `association_benefits?id=eq.${encodeURIComponent(benefit.id)}`, payload);
      } else {
        await api("POST", "association_benefits", payload);
      }

      state.associationDetailId = payload.association_id;
      closeModal();
      await loadExistingData();
    },
  });
}

function openArchiveAssociationBenefitModal(id) {
  const benefit = findAssociationBenefit(id);
  const association = findAssociation(benefit?.association_id);
  if (!benefit || benefit.archived_at || association?.archived_at) return;

  openModal("封存會員權益", `
    <p class="empty-note">確定要封存「${escapeHtml(benefit.benefit_name || "未命名權益")}」嗎？封存後會移到歷史紀錄，不會從資料庫刪除。</p>
    <div class="form-grid">
      <label class="form-field is-wide">
        <span>封存原因（選填）</span>
        <textarea name="archive_reason"></textarea>
      </label>
    </div>
  `, {
    submitLabel: "確認封存",
    submitTone: "danger",
    onSubmit: async (form) => {
      const values = formValues(form);
      await api("PATCH", `association_benefits?id=eq.${encodeURIComponent(id)}`, {
        archived_at: nowIso(),
        archived_by: state.auth.email,
        archive_reason: values.archive_reason?.trim() || null,
        updated_at: nowIso(),
      });
      state.associationDetailId = benefit.association_id;
      closeModal();
      await loadExistingData();
    },
  });
}

function associationNoteFormHtml(note = {}, associationId = "") {
  const selectedAssociationId = note.association_id || associationId;
  return `
    <input type="hidden" name="association_id" value="${escapeAttr(selectedAssociationId)}">
    <div class="form-section">
      <h3>備註 / 附件連結</h3>
      <div class="form-grid">
        <label class="form-field is-wide">
          <span>所屬公會</span>
          <input value="${escapeAttr(associationDisplayName(findAssociation(selectedAssociationId) || {}))}" readonly>
        </label>
        <label class="form-field is-wide">
          <span>備註標題 *</span>
          <input name="note_title" value="${escapeAttr(note.note_title || "")}" required>
        </label>
        <label class="form-field">
          <span>負責人</span>
          <input name="owner" value="${escapeAttr(note.owner || state.auth.email || "")}">
        </label>
        <label class="form-field is-wide">
          <span>附件 / 連結</span>
          <input name="attachment" value="${escapeAttr(note.attachment || "")}" placeholder="貼上連結或檔名">
        </label>
        <label class="form-field is-wide">
          <span>備註內容</span>
          <textarea name="note">${escapeHtml(note.note || "")}</textarea>
        </label>
      </div>
    </div>
  `;
}

function associationNotePayload(values = {}) {
  return {
    association_id: values.association_id,
    note_title: values.note_title?.trim(),
    note: values.note?.trim() || null,
    attachment: values.attachment?.trim() || null,
    owner: values.owner?.trim() || null,
    updated_at: nowIso(),
  };
}

function openCreateAssociationNoteModal(associationId) {
  const association = findAssociation(associationId);
  if (!association || association.archived_at) return;
  openAssociationNoteModal({ association_id: association.id, owner: state.auth.email });
}

function openEditAssociationNoteModal(id) {
  const note = findAssociationNote(id);
  const association = findAssociation(note?.association_id);
  if (!note || note.cancelled_at || association?.archived_at) return;
  openAssociationNoteModal(note);
}

function openAssociationNoteModal(note = {}) {
  const isEdit = Boolean(note.id);
  openModal(isEdit ? "編輯備註 / 附件連結" : "新增備註 / 附件連結", associationNoteFormHtml(note, note.association_id), {
    submitLabel: isEdit ? "儲存變更" : "建立備註",
    onSubmit: async (form) => {
      const values = formValues(form);
      const payload = associationNotePayload(values);
      if (!payload.association_id) throw new Error("缺少所屬公會。");
      if (!payload.note_title) throw new Error("請輸入備註標題。");

      if (isEdit) {
        await api("PATCH", `association_notes?id=eq.${encodeURIComponent(note.id)}`, payload);
      } else {
        await api("POST", "association_notes", payload);
      }

      state.associationDetailId = payload.association_id;
      closeModal();
      await loadExistingData();
    },
  });
}

function openCancelAssociationNoteModal(id) {
  const note = findAssociationNote(id);
  const association = findAssociation(note?.association_id);
  if (!note || note.cancelled_at || association?.archived_at) return;

  openModal("取消備註 / 附件連結", `
    <p class="empty-note">確定要取消「${escapeHtml(note.note_title || "未命名備註")}」嗎？取消後會移到歷史紀錄，不會從資料庫刪除。</p>
    <div class="form-grid">
      <label class="form-field is-wide">
        <span>取消原因（選填）</span>
        <textarea name="cancel_reason"></textarea>
      </label>
    </div>
  `, {
    submitLabel: "確認取消",
    submitTone: "danger",
    onSubmit: async (form) => {
      const values = formValues(form);
      await api("PATCH", `association_notes?id=eq.${encodeURIComponent(id)}`, {
        cancelled_at: nowIso(),
        cancelled_by: state.auth.email,
        cancel_reason: values.cancel_reason?.trim() || null,
        updated_at: nowIso(),
      });
      state.associationDetailId = note.association_id;
      closeModal();
      await loadExistingData();
    },
  });
}

function campaignFormHtml(campaign = {}) {
  const vendorsText = Array.isArray(campaign.vendors) ? campaign.vendors.join("\n") : "";
  return `
    <div class="form-section">
      <h3>基本資訊</h3>
      <div class="form-grid">
        <label class="form-field is-wide">
          <span>專案名稱 *</span>
          <input name="name" value="${escapeAttr(campaign.name || "")}" required>
        </label>
        <label class="form-field">
          <span>狀態</span>
          <select name="status">
            ${selectOptions([["預計規劃", "預計規劃"], ["估價中", "估價中"], ["進行中", "進行中"], ["補助申請", "補助申請"], ["結案", "結案"]], campaign.status || "預計規劃")}
          </select>
        </label>
        <label class="form-field">
          <span>重要性</span>
          <select name="priority">
            ${selectOptions([["高", "高"], ["中", "中"], ["低", "低"]], campaign.priority || "中")}
          </select>
        </label>
        <label class="form-field">
          <span>負責人</span>
          <input name="owner" value="${escapeAttr(campaign.owner || "")}">
        </label>
        <label class="form-field">
          <span>負責單位</span>
          <input name="owner_unit" value="${escapeAttr(campaign.owner_unit || "")}">
        </label>
        <label class="form-field is-wide">
          <span>專案說明 / 目的</span>
          <textarea name="purpose">${escapeHtml(campaign.purpose || "")}</textarea>
        </label>
      </div>
    </div>

    <div class="form-section">
      <h3>預算與補助</h3>
      <div class="form-grid">
        <label class="form-field">
          <span>預算</span>
          <input name="budget" type="number" min="0" step="1" value="${escapeAttr(campaign.budget ?? "")}">
        </label>
        <label class="form-field">
          <span>實支</span>
          <input name="actual_spend" type="number" min="0" step="1" value="${escapeAttr(campaign.actual_spend ?? "")}">
        </label>
        <label class="form-field">
          <span>預估補助</span>
          <input name="subsidy_planned" type="number" min="0" step="1" value="${escapeAttr(campaign.subsidy_planned ?? "")}">
        </label>
        <label class="form-field">
          <span>實際補助</span>
          <input name="subsidy_received" type="number" min="0" step="1" value="${escapeAttr(campaign.subsidy_received ?? "")}">
        </label>
        <label class="form-field">
          <span>美的補助申請號碼</span>
          <input name="midea_budget_code" value="${escapeAttr(campaign.midea_budget_code || "")}">
        </label>
        <label class="form-field">
          <span>機票費用</span>
          <input name="flight_cost" type="number" min="0" step="1" value="${escapeAttr(campaign.flight_cost ?? "")}">
        </label>
        <label class="form-field">
          <span>付款狀態</span>
          <input name="payment_status" value="${escapeAttr(campaign.payment_status || "")}">
        </label>
        <label class="form-field">
          <span>請款狀態</span>
          <input name="claim_status" value="${escapeAttr(campaign.claim_status || "")}">
        </label>
      </div>
    </div>

    <div class="form-section">
      <h3>公會與外部單位</h3>
      <div class="form-grid">
        <label class="form-field">
          <span>關聯公會</span>
          <select name="association_id">${associationOptions(campaign.association_id || "")}</select>
        </label>
        <label class="form-field">
          <span>公會活動類型</span>
          <input name="association_activity_type" list="associationActivityTypeOptions" value="${escapeAttr(campaign.association_activity_type || "")}" placeholder="可自由輸入新類型">
          <datalist id="associationActivityTypeOptions">${associationActivitySuggestions(campaign.association_activity_type || "")}</datalist>
        </label>
        <label class="form-field is-wide">
          <span>外包廠商文字清單</span>
          <textarea name="vendors" placeholder="每行一筆，正式多廠商管理請使用「合作廠商 / 交付物」">${escapeHtml(vendorsText)}</textarea>
        </label>
      </div>
    </div>

    <div class="form-section">
      <h3>期間與備註</h3>
      <div class="form-grid">
        <label class="form-field">
          <span>預計開始</span>
          <input name="planned_start" type="date" value="${escapeAttr(formatDate(campaign.planned_start))}">
        </label>
        <label class="form-field">
          <span>預計結束</span>
          <input name="planned_end" type="date" value="${escapeAttr(formatDate(campaign.planned_end))}">
        </label>
        <label class="form-field">
          <span>實際開始</span>
          <input name="actual_start" type="date" value="${escapeAttr(formatDate(campaign.actual_start))}">
        </label>
        <label class="form-field">
          <span>實際結束</span>
          <input name="actual_end" type="date" value="${escapeAttr(formatDate(campaign.actual_end))}">
        </label>
        <label class="form-field is-wide">
          <span>備註</span>
          <textarea name="notes">${escapeHtml(campaign.notes || "")}</textarea>
        </label>
      </div>
    </div>
  `;
}

function parseCampaignVendors(value = "") {
  return String(value)
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitDelimitedText(value = "") {
  return String(value)
    .split(/[、,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function numericOrNull(value) {
  return value === "" || value == null ? null : Number(value);
}

function campaignPayload(values = {}) {
  return {
    name: values.name.trim(),
    association_id: values.association_id || null,
    association_activity_type: values.association_activity_type?.trim() || null,
    budget: numericOrNull(values.budget),
    actual_spend: numericOrNull(values.actual_spend),
    subsidy_planned: numericOrNull(values.subsidy_planned),
    subsidy_received: numericOrNull(values.subsidy_received),
    midea_budget_code: values.midea_budget_code?.trim() || null,
    payment_status: values.payment_status?.trim() || null,
    claim_status: values.claim_status?.trim() || null,
    flight_cost: numericOrNull(values.flight_cost),
    purpose: values.purpose?.trim() || null,
    status: values.status || "預計規劃",
    priority: values.priority || "中",
    vendors: parseCampaignVendors(values.vendors),
    owner: values.owner?.trim() || null,
    owner_unit: values.owner_unit?.trim() || null,
    planned_start: values.planned_start || null,
    planned_end: values.planned_end || null,
    actual_start: values.actual_start || null,
    actual_end: values.actual_end || null,
    notes: values.notes?.trim() || null,
    updated_at: nowIso(),
  };
}

async function nextCampaignSortOrder() {
  const rows = await safeGET("marketing_campaigns?select=sort_order&sort_order=not.is.null&order=sort_order.asc&limit=1", null);
  const remoteMin = Array.isArray(rows) && rows[0]?.sort_order != null ? Number(rows[0].sort_order) : NaN;
  if (Number.isFinite(remoteMin)) return remoteMin - 10;

  const localSorts = [...state.data.campaigns, ...state.data.archivedCampaigns]
    .map((campaign) => Number(campaign.sort_order))
    .filter(Number.isFinite);
  if (localSorts.length) return Math.min(...localSorts) - 10;
  return 990;
}

function openCreateCampaignModal() {
  openCampaignModal();
}

function openEditCampaignModal(id) {
  const campaign = findCampaign(id);
  if (!campaign) return;
  openCampaignModal(campaign);
}

function openCampaignModal(campaign = {}) {
  const isEdit = Boolean(campaign.id);
  openModal(isEdit ? "編輯行銷案主檔" : "新增行銷案主檔", campaignFormHtml(campaign), {
    submitLabel: isEdit ? "儲存變更" : "建立行銷案",
    onSubmit: async (form) => {
      const values = formValues(form);
      const payload = campaignPayload(values);
      if (!payload.name) throw new Error("請輸入專案名稱。");

      if (isEdit) {
        await api("PATCH", `marketing_campaigns?id=eq.${encodeURIComponent(campaign.id)}`, payload);
      } else {
        payload.sort_order = await nextCampaignSortOrder();
        await api("POST", "marketing_campaigns", payload);
      }

      closeModal();
      await loadExistingData();
    },
  });
}

function openArchiveCampaignModal(id) {
  const campaign = state.data.campaigns.find((item) => String(item.id) === String(id));
  if (!campaign) return;

  openModal("封存行銷案", `
    <p class="empty-note">
      確定要封存「${escapeHtml(campaign.name || "未命名行銷案")}」嗎？封存後會從進行中列表與新增廠商合作下拉移除，但既有廠商、交付物、費用與歷史資料會保留。
    </p>
    <div class="form-grid">
      <label class="form-field is-wide">
        <span>封存原因</span>
        <textarea name="archive_reason" placeholder="例如：專案已結案、年度計畫調整、暫停執行"></textarea>
      </label>
    </div>
  `, {
    submitLabel: "確認封存",
    submitTone: "danger",
    onSubmit: async (form) => {
      const values = formValues(form);
      await api("PATCH", `marketing_campaigns?id=eq.${encodeURIComponent(id)}`, {
        archived_at: nowIso(),
        archived_by: state.auth.email,
        archive_reason: values.archive_reason?.trim() || null,
        updated_at: nowIso(),
      });
      closeModal();
      await loadExistingData();
    },
  });
}

function campaignTaskFormHtml(task = {}) {
  return `
    <div class="form-grid">
      <label class="form-field">
        <span>排序</span>
        <input name="seq" type="number" step="1" value="${escapeAttr(task.seq ?? "")}">
      </label>
      <label class="form-field is-wide">
        <span>任務名稱</span>
        <input name="task_name" value="${escapeAttr(task.task_name || "")}" required>
      </label>
      <label class="form-field">
        <span>負責人</span>
        <input name="owner" value="${escapeAttr(task.owner || state.auth.email || "")}">
      </label>
      <label class="form-field">
        <span>狀態</span>
        <select name="status">
          ${selectOptions([["未開始", "未開始"], ["進行中", "進行中"], ["待確認", "待確認"], ["已完成", "已完成"]], task.status || "未開始")}
        </select>
      </label>
      <label class="form-field">
        <span>預計開始</span>
        <input name="planned_start" type="date" value="${escapeAttr(formatDate(task.planned_start))}">
      </label>
      <label class="form-field">
        <span>預計結束</span>
        <input name="planned_end" type="date" value="${escapeAttr(formatDate(task.planned_end))}">
      </label>
      <label class="form-field">
        <span>完成度 %</span>
        <input name="completion_pct" type="number" min="0" max="100" step="1" value="${escapeAttr(task.completion_pct ?? 0)}">
      </label>
      <label class="form-field is-wide">
        <span>預期產出</span>
        <textarea name="expected_output">${escapeHtml(task.expected_output || "")}</textarea>
      </label>
      <label class="form-field is-wide">
        <span>備註</span>
        <textarea name="notes">${escapeHtml(task.notes || "")}</textarea>
      </label>
    </div>
  `;
}

function campaignTaskPayload(values = {}, campaignId = "") {
  return {
    campaign_id: campaignId,
    seq: numericOrNull(values.seq) ?? 0,
    task_name: values.task_name.trim(),
    owner: values.owner?.trim() || null,
    planned_start: values.planned_start || null,
    planned_end: values.planned_end || null,
    status: values.status || "未開始",
    completion_pct: numericOrNull(values.completion_pct) ?? 0,
    expected_output: values.expected_output?.trim() || null,
    notes: values.notes?.trim() || null,
  };
}

function openCreateCampaignTaskModal(campaignId) {
  const campaign = findCampaign(campaignId);
  if (!campaign) return;
  openModal("新增專案任務", campaignTaskFormHtml({ owner: state.auth.email }), {
    submitLabel: "建立任務",
    onSubmit: async (form) => {
      const values = formValues(form);
      await api("POST", "marketing_campaign_tasks", campaignTaskPayload(values, campaignId));
      closeModal();
      state.campaignDetailId = campaignId;
      await loadExistingData();
    },
  });
}

function openEditCampaignTaskModal(id) {
  const task = findCampaignTask(id);
  if (!task) return;
  openModal("編輯專案任務", campaignTaskFormHtml(task), {
    submitLabel: "儲存變更",
    onSubmit: async (form) => {
      const values = formValues(form);
      await api("PATCH", `marketing_campaign_tasks?id=eq.${encodeURIComponent(id)}`, campaignTaskPayload(values, task.campaign_id));
      closeModal();
      state.campaignDetailId = task.campaign_id;
      await loadExistingData();
    },
  });
}

function openCancelCampaignTaskModal(id) {
  const task = findCampaignTask(id);
  if (!task) return;
  openModal("取消專案任務", `
    <p class="empty-note">確定要取消「${escapeHtml(task.task_name || "未命名任務")}」嗎？取消後會保留在歷史紀錄中，不會直接刪除。</p>
    <div class="form-grid">
      <label class="form-field is-wide">
        <span>取消原因（選填）</span>
        <textarea name="cancel_reason"></textarea>
      </label>
    </div>
  `, {
    submitLabel: "確認取消",
    submitTone: "danger",
    onSubmit: async (form) => {
      const values = formValues(form);
      await api("PATCH", `marketing_campaign_tasks?id=eq.${encodeURIComponent(id)}`, {
        cancelled_at: nowIso(),
        cancelled_by: state.auth.email,
        cancel_reason: values.cancel_reason?.trim() || null,
      });
      closeModal();
      state.campaignDetailId = task.campaign_id;
      await loadExistingData();
    },
  });
}

function campaignBudgetItemFormHtml(item = {}) {
  return `
    <div class="form-grid">
      <label class="form-field">
        <span>排序</span>
        <input name="seq" type="number" step="1" value="${escapeAttr(item.seq ?? "")}">
      </label>
      <label class="form-field is-wide">
        <span>項目名稱</span>
        <input name="item_name" value="${escapeAttr(item.item_name || "")}" required>
      </label>
      <label class="form-field">
        <span>費用性質</span>
        <input name="budget_nature" value="${escapeAttr(item.budget_nature || "")}" placeholder="例如：場地、裝潢、印刷、補助">
      </label>
      <label class="form-field">
        <span>台幣金額</span>
        <input name="amount_twd" type="number" min="0" step="1" value="${escapeAttr(item.amount_twd ?? "")}">
      </label>
      <label class="form-field">
        <span>匯率</span>
        <input name="exchange_rate" type="number" min="0" step="0.0001" value="${escapeAttr(item.exchange_rate ?? "")}">
      </label>
      <label class="form-field">
        <span>人民幣金額</span>
        <input name="amount_rmb" type="number" min="0" step="1" value="${escapeAttr(item.amount_rmb ?? "")}">
      </label>
      <label class="form-field">
        <span>報價狀態</span>
        <select name="quote_status">
          ${selectOptions([["待報價", "待報價"], ["待拆價", "待拆價"], ["已報價", "已報價"], ["待核定", "待核定"], ["已核定", "已核定"]], item.quote_status || "待報價")}
        </select>
      </label>
      <label class="form-field">
        <span>付款狀態</span>
        <select name="payment_status">
          ${selectOptions([["未請款", "未請款"], ["待付款", "待付款"], ["已付款", "已付款"], ["不需付款", "不需付款"]], item.payment_status || "未請款")}
        </select>
      </label>
      <label class="form-field">
        <span>付款日</span>
        <input name="payment_date" type="date" value="${escapeAttr(formatDate(item.payment_date))}">
      </label>
      <label class="form-field is-wide">
        <span>估算依據 / 備註</span>
        <textarea name="basis_note">${escapeHtml(item.basis_note || "")}</textarea>
      </label>
    </div>
  `;
}

function campaignBudgetItemPayload(values = {}, campaignId = "") {
  return {
    campaign_id: campaignId,
    seq: numericOrNull(values.seq) ?? 0,
    item_name: values.item_name.trim(),
    budget_nature: values.budget_nature?.trim() || null,
    amount_twd: numericOrNull(values.amount_twd),
    exchange_rate: numericOrNull(values.exchange_rate),
    amount_rmb: numericOrNull(values.amount_rmb),
    basis_note: values.basis_note?.trim() || null,
    quote_status: values.quote_status || "待報價",
    payment_status: values.payment_status || "未請款",
    payment_date: values.payment_date || null,
  };
}

function openCreateCampaignBudgetItemModal(campaignId) {
  const campaign = findCampaign(campaignId);
  if (!campaign) return;
  openModal("新增預算項目", campaignBudgetItemFormHtml(), {
    submitLabel: "建立預算項目",
    onSubmit: async (form) => {
      const values = formValues(form);
      await api("POST", "marketing_campaign_budget_items", campaignBudgetItemPayload(values, campaignId));
      closeModal();
      state.campaignDetailId = campaignId;
      await loadExistingData();
    },
  });
}

function openEditCampaignBudgetItemModal(id) {
  const item = findCampaignBudgetItem(id);
  if (!item) return;
  openModal("編輯預算項目", campaignBudgetItemFormHtml(item), {
    submitLabel: "儲存變更",
    onSubmit: async (form) => {
      const values = formValues(form);
      await api("PATCH", `marketing_campaign_budget_items?id=eq.${encodeURIComponent(id)}`, campaignBudgetItemPayload(values, item.campaign_id));
      closeModal();
      state.campaignDetailId = item.campaign_id;
      await loadExistingData();
    },
  });
}

function openCancelCampaignBudgetItemModal(id) {
  const item = findCampaignBudgetItem(id);
  if (!item) return;
  openModal("取消預算項目", `
    <p class="empty-note">確定要取消「${escapeHtml(item.item_name || "未命名費用")}」嗎？取消後不會納入總支出彙總，但會保留歷史紀錄。</p>
    <div class="form-grid">
      <label class="form-field is-wide">
        <span>取消原因（選填）</span>
        <textarea name="cancel_reason"></textarea>
      </label>
    </div>
  `, {
    submitLabel: "確認取消",
    submitTone: "danger",
    onSubmit: async (form) => {
      const values = formValues(form);
      await api("PATCH", `marketing_campaign_budget_items?id=eq.${encodeURIComponent(id)}`, {
        cancelled_at: nowIso(),
        cancelled_by: state.auth.email,
        cancel_reason: values.cancel_reason?.trim() || null,
      });
      closeModal();
      state.campaignDetailId = item.campaign_id;
      await loadExistingData();
    },
  });
}

function campaignDocumentTypeOptions() {
  return [
    ["報價單", "報價單"],
    ["合約", "合約"],
    ["設計稿", "設計稿"],
    ["印刷檔", "印刷檔"],
    ["施工照片", "施工照片"],
    ["完工照片", "完工照片"],
    ["攤位設計圖", "攤位設計圖"],
    ["大會文件", "大會文件"],
    ["廠商資料", "廠商資料"],
    ["其他", "其他"],
  ];
}

function campaignDocumentFormHtml(document = {}, isCreate = false) {
  const fileLabel = document.file_path ? (document.file_name || document.file_path) : "尚未上傳檔案";
  return `
    <div class="form-grid">
      <label class="form-field">
        <span>文件類型</span>
        <select name="doc_type">${selectOptions(campaignDocumentTypeOptions(), document.doc_type || "其他")}</select>
      </label>
      <label class="form-field is-wide">
        <span>文件標題</span>
        <input name="title" value="${escapeAttr(document.title || "")}" required>
      </label>
      <label class="form-field">
        <span>版本註記</span>
        <input name="version_note" value="${escapeAttr(document.version_note || "")}" placeholder="例如：v1、廠商報價初版、核定版">
      </label>
      <label class="form-field is-wide">
        <span>備註</span>
        <textarea name="notes">${escapeHtml(document.notes || "")}</textarea>
      </label>
      <label class="form-field is-wide">
        <span>目前檔案</span>
        <input value="${escapeAttr(fileLabel)}" readonly>
      </label>
      ${isCreate ? `
        <label class="form-field is-wide">
          <span>上傳文件</span>
          <input name="document_file" type="file" required>
        </label>
      ` : ""}
    </div>
  `;
}

function campaignDocumentPayload(values = {}, campaignId = "") {
  return {
    campaign_id: campaignId,
    doc_type: values.doc_type || "其他",
    title: values.title.trim(),
    version_note: values.version_note?.trim() || null,
    notes: values.notes?.trim() || null,
  };
}

function openCreateCampaignDocumentModal(campaignId) {
  const campaign = findCampaign(campaignId);
  if (!campaign) return;
  openModal("新增專案文件版本", campaignDocumentFormHtml({}, true), {
    submitLabel: "建立文件",
    onSubmit: async (form) => {
      const values = formValues(form);
      const file = form.elements.document_file?.files?.[0] || null;
      if (!file) throw new Error("請選擇要上傳的文件。");
      if (file.size > CAMPAIGN_DOCUMENT_FILE_MAX_BYTES) {
        throw new Error(`檔案超過上傳上限 ${formatFileSize(CAMPAIGN_DOCUMENT_FILE_MAX_BYTES)}，請壓縮後再上傳。`);
      }

      let uploadedPath = "";
      try {
        uploadedPath = await uploadStorageFile("campaign-documents", file);
        await api("POST", "marketing_campaign_documents", {
          ...campaignDocumentPayload(values, campaignId),
          file_path: uploadedPath,
          file_name: file.name,
        });
      } catch (error) {
        if (uploadedPath) {
          try {
            await deleteStorageFile("campaign-documents", uploadedPath);
          } catch (cleanupError) {
            console.warn("campaign document rollback failed", cleanupError);
          }
        }
        throw error;
      }

      closeModal();
      state.campaignDetailId = campaignId;
      await loadExistingData();
    },
  });
}

function openEditCampaignDocumentModal(id) {
  const document = findCampaignDocument(id);
  if (!document) return;
  openModal("編輯專案文件資訊", campaignDocumentFormHtml(document, false), {
    submitLabel: "儲存變更",
    onSubmit: async (form) => {
      const values = formValues(form);
      await api("PATCH", `marketing_campaign_documents?id=eq.${encodeURIComponent(id)}`, campaignDocumentPayload(values, document.campaign_id));
      closeModal();
      state.campaignDetailId = document.campaign_id;
      await loadExistingData();
    },
  });
}

function openArchiveCampaignDocumentModal(id) {
  const document = findCampaignDocument(id);
  if (!document) return;
  openModal("封存專案文件", `
    <p class="empty-note">確定要封存「${escapeHtml(document.title || document.file_name || "未命名文件")}」嗎？檔案與資料列會保留，但不再出現在目前文件清單。</p>
    <div class="form-grid">
      <label class="form-field is-wide">
        <span>封存原因（選填）</span>
        <textarea name="archive_reason"></textarea>
      </label>
    </div>
  `, {
    submitLabel: "確認封存",
    submitTone: "danger",
    onSubmit: async (form) => {
      const values = formValues(form);
      await api("PATCH", `marketing_campaign_documents?id=eq.${encodeURIComponent(id)}`, {
        archived_at: nowIso(),
        archived_by: state.auth.email,
        archive_reason: values.archive_reason?.trim() || null,
      });
      closeModal();
      state.campaignDetailId = document.campaign_id;
      await loadExistingData();
    },
  });
}

async function openCampaignDocumentFile(id, button) {
  const document = findCampaignDocument(id);
  if (!document?.file_path) return;

  const popup = window.open("about:blank", "_blank");
  if (popup) popup.opener = null;
  const originalText = button?.textContent || "開啟";
  if (button) {
    button.disabled = true;
    button.textContent = "產生連結...";
  }

  try {
    const signedUrl = await getSignedUrl("campaign-documents", document.file_path);
    if (popup) {
      popup.location.href = signedUrl;
    } else {
      window.open(signedUrl, "_blank", "noopener");
    }
  } catch (error) {
    if (popup) popup.close();
    console.warn("campaign document open failed", error);
    alert(error.message || "無法開啟文件，請稍後再試。");
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = originalText;
    }
  }
}

function campaignRiskTypeOptions() {
  return [
    ["預算", "預算"],
    ["時程", "時程"],
    ["廠商", "廠商"],
    ["原廠", "原廠"],
    ["素材", "素材"],
    ["業務配合", "業務配合"],
    ["補助請款", "補助請款"],
    ["其他", "其他"],
  ];
}

function campaignRiskFormHtml(risk = {}) {
  return `
    <div class="form-grid">
      <label class="form-field">
        <span>類型</span>
        <select name="risk_type">${selectOptions(campaignRiskTypeOptions(), risk.risk_type || "其他")}</select>
      </label>
      <label class="form-field">
        <span>影響程度</span>
        <select name="impact_level">${selectOptions([["高", "高"], ["中", "中"], ["低", "低"]], risk.impact_level || "中")}</select>
      </label>
      <label class="form-field is-wide">
        <span>事項名稱</span>
        <input name="title" value="${escapeAttr(risk.title || "")}" required>
      </label>
      <label class="form-field">
        <span>負責人</span>
        <input name="owner" value="${escapeAttr(risk.owner || state.auth.email || "")}">
      </label>
      <label class="form-field">
        <span>狀態</span>
        <select name="status">${selectOptions([["待處理", "待處理"], ["處理中", "處理中"], ["暫緩", "暫緩"], ["已解決", "已解決"]], risk.status || "待處理")}</select>
      </label>
      <label class="form-field">
        <span>到期 / 決策日</span>
        <input name="due_date" type="date" value="${escapeAttr(formatDate(risk.due_date))}">
      </label>
      <label class="form-field is-wide checkbox-field">
        <input name="show_on_dashboard" type="checkbox" ${risk.show_on_dashboard ? "checked" : ""}>
        <span>顯示在總經理戰情室</span>
      </label>
      <label class="form-field is-wide">
        <span>說明</span>
        <textarea name="description">${escapeHtml(risk.description || "")}</textarea>
      </label>
      <label class="form-field is-wide">
        <span>解決 / 決議備註</span>
        <textarea name="resolution_note">${escapeHtml(risk.resolution_note || "")}</textarea>
      </label>
    </div>
  `;
}

function campaignRiskPayload(values = {}, campaignId = "") {
  return {
    campaign_id: campaignId,
    risk_type: values.risk_type || "其他",
    title: values.title.trim(),
    description: values.description?.trim() || null,
    impact_level: values.impact_level || "中",
    owner: values.owner || state.auth.email,
    due_date: values.due_date || null,
    status: values.status || "待處理",
    show_on_dashboard: values.show_on_dashboard === "on",
    resolution_note: values.resolution_note?.trim() || null,
    updated_at: nowIso(),
  };
}

function openCreateCampaignRiskModal(campaignId) {
  const campaign = findCampaign(campaignId);
  if (!campaign) return;
  openModal("新增風險 / 待決事項", campaignRiskFormHtml(), {
    submitLabel: "建立事項",
    onSubmit: async (form) => {
      const values = formValues(form);
      await api("POST", "marketing_campaign_risks", campaignRiskPayload(values, campaignId));
      closeModal();
      state.campaignDetailId = campaignId;
      await loadExistingData();
    },
  });
}

function openEditCampaignRiskModal(id) {
  const risk = findCampaignRisk(id);
  if (!risk) return;
  openModal("編輯風險 / 待決事項", campaignRiskFormHtml(risk), {
    submitLabel: "儲存變更",
    onSubmit: async (form) => {
      const values = formValues(form);
      await api("PATCH", `marketing_campaign_risks?id=eq.${encodeURIComponent(id)}`, campaignRiskPayload(values, risk.campaign_id));
      closeModal();
      state.campaignDetailId = risk.campaign_id;
      await loadExistingData();
    },
  });
}

function openArchiveCampaignRiskModal(id) {
  const risk = findCampaignRisk(id);
  if (!risk) return;
  openModal("封存風險 / 待決事項", `
    <p class="empty-note">確定要封存「${escapeHtml(risk.title || "未命名事項")}」嗎？封存後不會出現在戰情室與進行中清單，但歷史紀錄會保留。</p>
    <div class="form-grid">
      <label class="form-field is-wide">
        <span>封存原因（選填）</span>
        <textarea name="archive_reason"></textarea>
      </label>
    </div>
  `, {
    submitLabel: "確認封存",
    submitTone: "danger",
    onSubmit: async (form) => {
      const values = formValues(form);
      await api("PATCH", `marketing_campaign_risks?id=eq.${encodeURIComponent(id)}`, {
        archived_at: nowIso(),
        archived_by: state.auth.email,
        archive_reason: values.archive_reason?.trim() || null,
        updated_at: nowIso(),
      });
      closeModal();
      state.campaignDetailId = risk.campaign_id;
      await loadExistingData();
    },
  });
}

function riskUpdateFormHtml(update = {}) {
  return `
    <div class="form-grid">
      <label class="form-field">
        <span>更新人</span>
        <input name="updated_by" value="${escapeAttr(update.updated_by || state.auth.email || "")}" readonly>
      </label>
      <label class="form-field">
        <span>更新日</span>
        <input name="update_date" type="date" value="${escapeAttr(formatDate(update.update_date) || localDateString())}">
      </label>
      <label class="form-field">
        <span>下次追蹤日</span>
        <input name="next_followup_date" type="date" value="${escapeAttr(formatDate(update.next_followup_date))}">
      </label>
      <label class="form-field is-wide checkbox-field">
        <input name="is_important" type="checkbox" ${update.is_important ? "checked" : ""}>
        <span>標記為重要追蹤</span>
      </label>
      <label class="form-field is-wide">
        <span>追蹤內容</span>
        <textarea name="update_note" required>${escapeHtml(update.update_note || "")}</textarea>
      </label>
    </div>
  `;
}

function riskUpdatePayload(values = {}, riskId = "") {
  return {
    risk_id: riskId,
    update_note: values.update_note.trim(),
    updated_by: values.updated_by || state.auth.email,
    update_date: values.update_date || localDateString(),
    next_followup_date: values.next_followup_date || null,
    is_important: values.is_important === "on",
  };
}

async function touchCampaignRisk(riskId) {
  await api("PATCH", `marketing_campaign_risks?id=eq.${encodeURIComponent(riskId)}`, { updated_at: nowIso() });
}

function openCreateRiskUpdateModal(riskId) {
  const risk = findCampaignRisk(riskId);
  if (!risk) return;
  openModal("新增風險追蹤", riskUpdateFormHtml(), {
    submitLabel: "建立追蹤",
    onSubmit: async (form) => {
      const values = formValues(form);
      await api("POST", "marketing_campaign_risk_updates", riskUpdatePayload(values, riskId));
      await touchCampaignRisk(riskId);
      closeModal();
      state.campaignDetailId = risk.campaign_id;
      await loadExistingData();
    },
  });
}

function openEditRiskUpdateModal(id) {
  const update = findCampaignRiskUpdate(id);
  if (!update) return;
  const risk = findCampaignRisk(update.risk_id);
  if (!risk) return;
  openModal("編輯風險追蹤", riskUpdateFormHtml(update), {
    submitLabel: "儲存變更",
    onSubmit: async (form) => {
      const values = formValues(form);
      await api("PATCH", `marketing_campaign_risk_updates?id=eq.${encodeURIComponent(id)}`, riskUpdatePayload(values, update.risk_id));
      await touchCampaignRisk(update.risk_id);
      closeModal();
      state.campaignDetailId = risk.campaign_id;
      await loadExistingData();
    },
  });
}

function openCancelRiskUpdateModal(id) {
  const update = findCampaignRiskUpdate(id);
  if (!update) return;
  const risk = findCampaignRisk(update.risk_id);
  if (!risk) return;
  openModal("取消風險追蹤", `
    <p class="empty-note">確定要取消這筆追蹤紀錄嗎？取消後會保留在歷史紀錄中，不會直接刪除。</p>
    <div class="form-grid">
      <label class="form-field is-wide">
        <span>取消原因（選填）</span>
        <textarea name="cancel_reason"></textarea>
      </label>
    </div>
  `, {
    submitLabel: "確認取消",
    submitTone: "danger",
    onSubmit: async (form) => {
      const values = formValues(form);
      await api("PATCH", `marketing_campaign_risk_updates?id=eq.${encodeURIComponent(id)}`, {
        cancelled_at: nowIso(),
        cancelled_by: state.auth.email,
        cancel_reason: values.cancel_reason?.trim() || null,
      });
      await touchCampaignRisk(update.risk_id);
      closeModal();
      state.campaignDetailId = risk.campaign_id;
      await loadExistingData();
    },
  });
}

function campaignPerformanceFormHtml(performance = {}, campaign = {}) {
  return `
    <div class="form-section">
      <h3>歸因與觸及</h3>
      <div class="form-grid">
        <label class="form-field is-wide">
          <span>行銷案</span>
          <input value="${escapeAttr(campaign.name || "未命名行銷案")}" readonly>
        </label>
        <label class="form-field">
          <span>主要 Channel</span>
          <input name="channel" list="performance-channel-options" value="${escapeAttr(performance.channel || "")}" placeholder="例如：公會、展覽、LINE、標案">
          <datalist id="performance-channel-options">${performanceChannelSuggestions(performance.channel || "")}</datalist>
        </label>
        <label class="form-field">
          <span>觸及人數</span>
          <input name="reach_count" type="number" min="0" step="1" value="${escapeAttr(performance.reach_count ?? 0)}">
        </label>
        <label class="form-field">
          <span>名單數</span>
          <input name="lead_count" type="number" min="0" step="1" value="${escapeAttr(performance.lead_count ?? 0)}">
        </label>
        <label class="form-field">
          <span>詢問數</span>
          <input name="inquiry_count" type="number" min="0" step="1" value="${escapeAttr(performance.inquiry_count ?? 0)}">
        </label>
      </div>
    </div>

    <div class="form-section">
      <h3>商機與成交</h3>
      <div class="form-grid">
        <label class="form-field">
          <span>有效商機數</span>
          <input name="qualified_lead_count" type="number" min="0" step="1" value="${escapeAttr(performance.qualified_lead_count ?? 0)}">
        </label>
        <label class="form-field">
          <span>預估商機金額</span>
          <input name="estimated_opportunity_amount" type="number" min="0" step="1" value="${escapeAttr(performance.estimated_opportunity_amount ?? 0)}">
        </label>
        <label class="form-field">
          <span>成交件數</span>
          <input name="deal_count" type="number" min="0" step="1" value="${escapeAttr(performance.deal_count ?? 0)}">
        </label>
        <label class="form-field">
          <span>成交金額</span>
          <input name="deal_amount" type="number" min="0" step="1" value="${escapeAttr(performance.deal_amount ?? 0)}">
        </label>
        <label class="form-field is-wide">
          <span>備註</span>
          <textarea name="notes">${escapeHtml(performance.notes || "")}</textarea>
        </label>
      </div>
    </div>
  `;
}

function campaignPerformancePayload(values = {}, campaignId = "") {
  return {
    campaign_id: campaignId,
    channel: values.channel?.trim() || null,
    reach_count: numericOrNull(values.reach_count) ?? 0,
    lead_count: numericOrNull(values.lead_count) ?? 0,
    inquiry_count: numericOrNull(values.inquiry_count) ?? 0,
    qualified_lead_count: numericOrNull(values.qualified_lead_count) ?? 0,
    estimated_opportunity_amount: numericOrNull(values.estimated_opportunity_amount) ?? 0,
    deal_count: numericOrNull(values.deal_count) ?? 0,
    deal_amount: numericOrNull(values.deal_amount) ?? 0,
    notes: values.notes?.trim() || null,
    updated_at: nowIso(),
  };
}

function isUniqueCampaignPerformanceError(error) {
  const message = String(error?.message || error || "");
  return message.includes("23505") || message.includes("marketing_campaign_performance_campaign_unique");
}

function openCampaignPerformanceModal(campaignId) {
  const campaign = findCampaign(campaignId);
  if (!campaign) return;
  const performance = performanceForCampaign(campaignId) || {};
  const isEdit = Boolean(performance.id);

  openModal(isEdit ? "編輯成效資料" : "新增成效資料", campaignPerformanceFormHtml(performance, campaign), {
    submitLabel: isEdit ? "儲存變更" : "建立成效資料",
    onSubmit: async (form) => {
      const values = formValues(form);
      const payload = campaignPerformancePayload(values, campaignId);

      try {
        if (isEdit) {
          await api("PATCH", `marketing_campaign_performance?id=eq.${encodeURIComponent(performance.id)}`, payload);
        } else {
          await api("POST", "marketing_campaign_performance", payload);
        }
      } catch (error) {
        if (isUniqueCampaignPerformanceError(error)) {
          state.campaignDetailId = campaignId;
          await loadExistingData();
          throw new Error("此行銷案已有成效資料，請重新打開此專案後編輯既有紀錄。");
        }
        throw error;
      }

      closeModal();
      state.campaignDetailId = campaignId;
      await loadExistingData();
    },
  });
}

function openApprovalReviewModal(id) {
  const request = state.data.approvalRequests.find((item) => item.id === id);
  if (!request) return;
  openModal("處理審核事項", `
    <div class="form-grid">
      <label class="form-field is-wide">
        <span>事項</span>
        <input value="${escapeAttr(request.title || approvalEntityLabel(request.entity_type))}" readonly>
      </label>
      <label class="form-field">
        <span>決策</span>
        <select name="status">
          ${selectOptions([["已核准", "已核准"], ["需修正", "需修正"]], request.status === "需修正" ? "需修正" : "已核准")}
        </select>
      </label>
      <label class="form-field">
        <span>金額</span>
        <input value="${escapeAttr(formatMoney(request.amount))}" readonly>
      </label>
      <label class="form-field is-wide">
        <span>決策說明</span>
        <textarea name="decision_note">${escapeHtml(request.decision_note || "")}</textarea>
      </label>
    </div>
  `, {
    submitLabel: "送出決策",
    onSubmit: async (form) => {
      const values = formValues(form);
      await api("PATCH", `approval_requests?id=eq.${encodeURIComponent(id)}`, {
        status: values.status,
        decision_note: values.decision_note?.trim() || null,
        decided_by: state.auth.email,
        decided_at: nowIso(),
        updated_at: nowIso(),
      });
      if (request.entity_type === "vendor_quote") {
        await api("PATCH", `marketing_campaign_vendors?id=eq.${encodeURIComponent(request.entity_id)}`, {
          quote_status: values.status === "已核准" ? "已核准" : "需修正",
          updated_at: nowIso(),
        });
      }
      closeModal();
      await loadExistingData();
    },
  });
}

function downloadTextFile(content, filename) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function exportCurrentSummary() {
  if (state.page === "weekly") {
    exportWeeklyReport();
    return;
  }

  const title = document.getElementById("pageTitle").textContent;
  const kpis = [...document.querySelectorAll(".kpi-card")]
    .map((card) => {
      const label = card.querySelector(".kpi-label")?.textContent || "";
      const value = card.querySelector(".kpi-value")?.textContent || "";
      const note = card.querySelector(".kpi-note")?.textContent || "";
      return `${label}: ${value} (${note})`;
    })
    .join("\n");
  const content = [`${title} 摘要`, `匯出時間：${new Date().toLocaleString("zh-Hant-TW")}`, "", kpis].join("\n");
  downloadTextFile(content, `meisun-marketing-os-${state.role}-${state.page}.txt`);
}

function exportWeeklyReport() {
  const summary = weeklySummaryData();
  downloadTextFile(weeklyReportText(summary), `meisun-marketing-os-weekly-${summary.start}-${summary.end}.txt`);
}

async function copyWeeklyReport() {
  const text = weeklyReportText(weeklySummaryData());
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
  window.alert("已複製本週週報文字。");
}

function render() {
  const meta = roleMeta[state.role];
  const page = pages[state.role][state.page];

  document.getElementById("roleEyebrow").textContent = welcomeLine();
  document.getElementById("pageTitle").textContent = page.title;
  document.getElementById("pageSubtitle").textContent = page.subtitle;
  document.getElementById("primaryAction").textContent = primaryActionLabel(meta);
  document.getElementById("secondaryAction").textContent = secondaryActionLabel();

  renderNav(meta.nav);
  renderKpis(buildCurrentKpis(page));
  renderSections(buildCurrentSections(page));

  document.querySelectorAll(".role-button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.role === state.role);
    button.disabled = !state.auth.canSwitchRoles && button.dataset.role !== state.role;
  });

  const roleSwitch = document.querySelector(".role-switch");
  roleSwitch.classList.toggle("is-hidden", !state.auth.canSwitchRoles);
  roleSwitch.classList.toggle("is-locked", !state.auth.canSwitchRoles);
}

function welcomeLine() {
  const role = roleLabel(state.role);
  const name = displayUserName();
  return `${role} ${name}，歡迎回來。${dailyGreetingMessage()}`;
}

function displayUserName() {
  return state.auth.displayName || inferNameFromEmail(state.auth.email) || "夥伴";
}

function inferNameFromEmail(email = "") {
  const localPart = String(email).split("@")[0] || "";
  if (!localPart) return "";
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function dailyGreetingMessage() {
  const messages = [
    "今天又是美好的一天。",
    "今天適合把重要的事往前推一點。",
    "願今天的決策清楚、行動順利。",
    "今天也穩穩掌握節奏。",
    "把關鍵事項看清楚，剩下的就交給團隊推進。",
    "今天適合聚焦在最有價值的機會上。",
    "每個進度都有脈絡，今天就從最重要的一項開始。",
  ];
  const today = new Date().toISOString().slice(0, 10);
  const seed = `${state.auth.email || state.role}-${today}`;
  const index = [...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0) % messages.length;
  return messages[index];
}

function primaryActionLabel(meta) {
  if (state.role === "sales") return "提出素材需求";
  if (state.page === "weekly") return "複製週報";
  if (state.role === "executive") return "查看待決策";
  if (state.role === "marketing" && state.page === "campaigns") return "新增行銷案";
  if (state.role === "marketing" && state.page === "requests") return "新增需求單";
  if (state.role === "marketing" && state.page === "vendors") return "新增廠商合作";
  if (state.role === "marketing" && state.page === "associations") return "新增公會";
  if (state.role === "marketing" && state.page === "knowledge") return "新增知識條目";
  return meta.primaryAction;
}

function secondaryActionLabel() {
  if (state.page === "weekly") return "匯出週報";
  return "匯出摘要";
}

function buildCurrentKpis(page) {
  const key = `${state.role}:${state.page}`;
  const dynamicKpis = {
    "executive:weekly": weeklyKpis(),
    "executive:budget": expenseKpis(),
    "executive:leads": leadKpis(),
    "executive:channels": channelKpis(),
    "executive:decisions": approvalKpis(),
    "marketing:budget": expenseKpis(),
    "marketing:channels": channelKpis(),
    "marketing:associations": associationKpis(),
    "marketing:vendors": vendorKpis(),
    "marketing:knowledge": knowledgeKpis(),
    "marketing:requests": requestKpis(),
    "marketing:weekly": weeklyKpis(),
    "sales:dashboard": salesDashboardKpis(),
    "sales:resources": resourceKpis(),
    "sales:knowledge": knowledgeKpis(),
    "sales:requests": requestKpis(),
  };

  return dynamicKpis[key] || page.kpis;
}

function weeklyKpis() {
  const summary = weeklySummaryData();
  return [
    ["週期", `${summary.start.slice(5)} ~ ${summary.end.slice(5)}`, "本週一到今天"],
    ["異動行銷案", String(summary.changedCampaigns.length), "本週有資料異動"],
    ["待處理", String(summary.nextPriorities.length), "下週優先事項"],
    ["成效更新", String(summary.weeklyPerformance.length), "本週更新成效資料"],
  ];
}

function salesDashboardKpis() {
  const resources = activeResources();
  const externalResources = resources.filter((resource) => resource.is_external_usable).length;
  const leads = visibleSalesLeads();
  const knowledgeItems = visibleKnowledgeItems(false);
  const requests = visibleSalesRequests(false);
  const pendingRequests = requests.filter((request) => !["已完成", "已取消"].includes(request.status || ""));
  return [
    ["可下載資料", String(resources.length), `${externalResources} 份可對外`, "resources"],
    ["我的名單", String(leads.length), "已指派給我的名單", "leads"],
    ["產品知識", String(knowledgeItems.length), "可查說法與比較", "knowledge"],
    ["待回報跟進", String(pendingRequests.length), "點擊查看需求單", "requests"],
  ];
}

function resourceKpis() {
  const resources = activeResources();
  if (!resources.length && state.dataStatus !== "live") {
    return pages.sales.resources.kpis;
  }

  const externalResources = resources.filter((resource) => resource.is_external_usable).length;
  const internalResources = resources.length - externalResources;
  const withFiles = resources.filter((resource) => resource.file_path).length;
  const withLinks = resources.filter((resource) => resource.resource_url || resource.canva_url).length;
  return [
    ["可用資源", String(resources.length), "未封存文宣資源"],
    ["可對外", String(externalResources), "可直接提供客戶"],
    ["僅內部", String(internalResources), "不可直接轉傳"],
    ["檔案 / 連結", `${withFiles} / ${withLinks}`, "可下載或開啟"],
  ];
}

function leadKpis() {
  if (!state.data.leads.length) return pages.executive.leads.kpis;

  const total = state.data.leads.length;
  const qualified = state.data.leads.filter((lead) => ["有效名單", "業務跟進", "形成商機", "需主管協助"].includes(lead.stage)).length;
  const opportunities = state.data.leads.filter((lead) => ["形成商機", "需主管協助"].includes(lead.stage)).length;
  const needsExecutive = state.data.leads.filter((lead) => lead.stage === "需主管協助").length;
  const conversionRate = qualified ? Math.round((opportunities / qualified) * 100) : 0;

  return [
    ["詢問 / 接觸", String(total), "已建立於 leads 的名單總數"],
    ["有效名單", String(qualified), "可分派業務追蹤"],
    ["形成商機", String(opportunities), `${needsExecutive} 件需主管協助`],
    ["平均轉換", `${conversionRate}%`, "以有效名單轉商機計算"],
  ];
}

function channelKpis() {
  const rows = channelPerformanceRows();
  if (!rows.length) {
    const page = pages[state.role]?.channels || pages.executive.channels;
    return page.kpis;
  }

  const best = rows[0];
  const totalLeads = rows.reduce((sum, row) => sum + Number(row.totalLeads || 0), 0);
  const totalQualified = rows.reduce((sum, row) => sum + Number(row.qualified || 0), 0);
  const totalDealAmount = rows.reduce((sum, row) => sum + Number(row.dealAmount || 0), 0);
  const adjustmentRows = rows.filter((row) => row.judgment.label === "調整").length;

  return [
    ["最佳來源", best.channel, `${best.judgment.label}；有效名單 ${formatCount(best.qualified)}`],
    ["總名單", formatCount(totalLeads), "成效資料為主，leads 來源補缺"],
    ["有效名單", formatCount(totalQualified), `平均有效率 ${ratioText(totalQualified, totalLeads)}`],
    ["成交金額", formatCurrencyFull(totalDealAmount), adjustmentRows ? `${adjustmentRows} 個 Channel 建議調整` : "目前無需調整標記"],
  ];
}

function associationKpis() {
  if (!state.data.associations.length && !state.data.associationCooperations.length && !state.data.associationTags.length && !state.data.associationTasks.length && !state.data.associationTaskExpenses.length && !state.data.associationEvents.length && !state.data.associationPublications.length && !state.data.associationFees.length && !state.data.associationBenefits.length && !state.data.associationNotes.length) {
    if (state.dataStatus === "live") {
      return [
        ["公會 / 單位", "0", "尚未建立公會資料"],
        ["合作紀錄", "0", "尚未建立合作紀錄"],
        ["關係標籤", "0", "尚未建立關係標籤"],
        ["待確認", "0", "目前沒有待確認公會資料"],
      ];
    }

    return pages.marketing.associations.kpis;
  }

  const totalAssociations = state.data.associations.length;
  const activeCooperations = state.data.associationCooperations.filter((item) => !isCancelledAssociationCooperation(item));
  const openCooperations = activeCooperations.filter((item) => !["已結束", "已完成"].includes(item.stage)).length;
  const openTasks = state.data.associationTasks.filter((task) => !["已完成"].includes(task.task_status)).length;
  const openEvents = state.data.associationEvents.filter((event) => !["已結束", "已完成"].includes(event.event_status)).length;
  const openPublications = state.data.associationPublications.filter((publication) => !["已確認刊出", "已刊登"].includes(publication.material_status)).length;
  const pendingFees = state.data.associationFees.filter((fee) => !["已繳", "不適用"].includes(fee.payment_status)).length;
  const pendingExpenses = state.data.associationTaskExpenses.filter((expense) => !["已付款", "不適用"].includes(expense.payment_status)).length;
  const pending = activeCooperations.filter((item) => String(item.stage || "").includes("待") || !item.due_date).length
    + state.data.associationTasks.filter((task) => String(task.task_status || "").includes("待") || !task.due_date).length
    + state.data.associationEvents.filter((event) => String(event.event_status || "").includes("待") || !event.event_date).length
    + state.data.associationPublications.filter((publication) => String(publication.material_status || "").includes("待") || !publication.deadline_date).length
    + pendingFees
    + pendingExpenses;

  return [
    ["公會 / 單位", String(totalAssociations), "既有公會資料"],
    ["年費 / 權益", String(state.data.associationFees.length + state.data.associationBenefits.length), `年費 ${pendingFees} 筆待處理、權益 ${state.data.associationBenefits.length} 筆`],
    ["活動 / 期刊", String(state.data.associationEvents.length + state.data.associationPublications.length), `活動 ${openEvents}、期刊 ${openPublications} 筆待追蹤`],
    ["待確認", String(pending), `任務 ${openTasks}、合作概覽 ${openCooperations} 筆仍需追蹤`],
  ];
}

function vendorKpis() {
  if (!state.data.campaignVendors.length) {
    if (state.dataStatus === "live") {
      return [
        ["合作單位", "0", "尚未建立廠商合作"],
        ["交付物", "0", "尚未建立廠商合作與交付物"],
        ["待核准報價", "0", "尚未建立報價狀態"],
        ["附件完整度", "0%", "新增廠商合作後可追蹤文件完整度"],
      ];
    }

    return pages.marketing.vendors.kpis;
  }

  const deliverables = state.data.campaignVendors.flatMap((vendor) => (
    Array.isArray(vendor.marketing_campaign_vendor_deliverables)
      ? vendor.marketing_campaign_vendor_deliverables
      : []
  ));
  const pendingQuotes = state.data.campaignVendors.filter((vendor) => ["待報價", "待核准"].includes(vendor.quote_status)).length;
  const linkedVendorCount = new Set(state.data.vendorDocuments.map((document) => document.vendor_id).filter(Boolean)).size;
  const attachmentRate = state.data.campaignVendors.length
    ? Math.round((linkedVendorCount / state.data.campaignVendors.length) * 100)
    : 0;

  return [
    ["合作單位", String(state.data.campaignVendors.length), "專案廠商合作資料"],
    ["交付物", String(deliverables.length), `${deliverables.filter((item) => item.status !== "已完成").length} 件未完成`],
    ["待核准報價", String(pendingQuotes), "待報價或待核准"],
    ["附件完整度", `${attachmentRate}%`, "以已連結廠商文件計算"],
  ];
}

function approvalKpis() {
  if (!state.data.approvalRequests.length) {
    if (state.dataStatus === "live") {
      return [
        ["待核准", "0", "目前沒有待審核事項"],
        ["需修正", "0", "目前沒有退回補資料"],
        ["逾期提醒", "0", "目前沒有逾期審核"],
        ["已處理", "0", "目前沒有已核准紀錄"],
      ];
    }

    return pages.executive.decisions.kpis;
  }

  const pending = state.data.approvalRequests.filter((request) => request.status === "待審核").length;
  const revision = state.data.approvalRequests.filter((request) => request.status === "需修正").length;
  const overdue = state.data.approvalRequests.filter((request) => (
    request.due_date
    && request.due_date < new Date().toISOString().slice(0, 10)
    && isOpenApprovalRequest(request)
  )).length;
  const approved = state.data.approvalRequests.filter((request) => request.status === "已核准").length;

  return [
    ["待核准", String(pending), "等待總經理審核"],
    ["需修正", String(revision), "已退回補資料"],
    ["逾期提醒", String(overdue), "超過期限尚未完成"],
    ["已處理", String(approved), "已核准項目"],
  ];
}

function requestKpis() {
  if (!state.data.salesRequests.length) {
    const page = pages[state.role]?.requests;
    return page?.kpis || [];
  }

  const total = visibleSalesRequests(state.role === "marketing").length;
  const open = visibleSalesRequests(state.role === "marketing").filter((request) => request.status !== "已完成").length;
  const urgent = visibleSalesRequests(state.role === "marketing").filter((request) => ["急件", "急", "高"].includes(request.priority)).length;
  const done = visibleSalesRequests(state.role === "marketing").filter((request) => request.status === "已完成").length;

  return [
    ["需求總數", String(total), "已建立需求單"],
    ["未完成", String(open), "待處理、處理中或待確認"],
    ["急件", String(urgent), "需優先排程"],
    ["已完成", String(done), "可回填資源或通知業務"],
  ];
}

function expenseKpis() {
  if (!state.data.expenses.length) {
    const page = pages[state.role]?.budget;
    return page?.kpis || [];
  }

  const total = state.data.expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const unpaid = state.data.expenses.filter((expense) => expense.payment_status !== "已付款").length;
  const paid = state.data.expenses.filter((expense) => expense.payment_status === "已付款").length;
  const vendorExpenses = state.data.expenses.filter((expense) => expense.source_table === "marketing_campaign_vendors").length;

  return [
    ["總支出", formatMoney(total), "所有費用彙總"],
    ["未付款", String(unpaid), "尚未標記為已付款"],
    ["已付款", String(paid), "已完成付款"],
    ["廠商費用", String(vendorExpenses), "已納入合作廠商費用"],
  ];
}

function knowledgeKpis() {
  const isMarketing = state.role === "marketing";
  const items = visibleKnowledgeItems(isMarketing);
  if (!items.length && state.dataStatus !== "live") {
    const page = pages[state.role]?.knowledge;
    return page?.kpis || [];
  }

  const usable = items.filter((item) => item.visibility_status === "可對外").length;
  const internal = items.filter((item) => item.visibility_status === "僅內部").length;
  const pending = items.filter((item) => item.visibility_status === "待確認").length;
  const blocked = items.filter((item) => item.visibility_status === "禁止使用").length;

  if (!isMarketing) {
    const resources = activeResources();
    const externalResources = resources.filter((resource) => resource.is_external_usable).length;
    const internalResources = resources.length - externalResources;
    return [
      ["可查條目", String(items.length), "可對外或僅內部"],
      ["可對外", String(usable), "可直接搭配客戶溝通"],
      ["僅內部", String(internal), "只供內部討論使用"],
      ["可用文宣", String(resources.length), `${externalResources} 份可對外 / ${internalResources} 份內部`],
    ];
  }

  return [
    ["知識條目", String(items.length), "已建立產品知識"],
    ["可對外", String(usable), "業務可對外使用"],
    ["僅內部 / 待確認", String(internal + pending), "需注意使用範圍"],
    ["禁止使用", String(blocked), "不應出現在業務話術"],
  ];
}

function buildCurrentSections(page) {
  const key = `${state.role}:${state.page}`;
  const dynamicSections = {
    "executive:dashboard": [weeklySummaryEntrySection(), campaignSummarySection(), projectOverviewSection(), campaignRiskSummarySection(), archivedCampaignsSection(), decisionListSection(), channelSummarySection(true)],
    "executive:budget": [budgetSection(), subsidySection()],
    "executive:leads": [leadFunnelSection(), executiveLeadRiskSection()],
    "executive:channels": [channelSummarySection(false), channelDecisionSection()],
    "executive:decisions": [decisionListSection(), campaignRiskSummarySection(), approvalFlowSection()],
    "executive:weekly": weeklySummarySections(),
    "marketing:dashboard": [weeklySummaryEntrySection(), campaignSummarySection(), marketingRiskInspectionCardsSection(), campaignRiskSummarySection(), marketingWorklistSection(), marketingTodoSection()],
    "marketing:campaigns": campaignPageSections(),
    "marketing:budget": [budgetSection(), subsidySection()],
    "marketing:channels": [channelSummarySection(false), channelDecisionSection()],
    "marketing:tenders": [tenderSection(), tenderAdminSection()],
    "marketing:vendors": [vendorSection(), cancelledVendorRecordsSection(), vendorFormPreviewSection()],
    "marketing:associations": associationPageSections(),
    "marketing:knowledge": [knowledgeSection(true), archivedKnowledgeSection(), marketingResourceManagerSection(), archivedMarketingResourcesSection(), knowledgeGovernanceSection()],
    "marketing:requests": [salesRequestSection(true), cancelledSalesRequestSection(true), requestKanbanSection()],
    "marketing:weekly": weeklySummarySections(),
    "sales:dashboard": [salesHomeResourcesSection(), salesTodoSection()],
    "sales:resources": [resourceLibrarySection()],
    "sales:knowledge": [knowledgeSection(false), salesKnowledgeResourcesSection()],
    "sales:leads": [salesLeadSection(), leadFollowUpSection()],
    "sales:requests": [salesRequestSection(false), cancelledSalesRequestSection(false), requestFormPreviewSection()],
  };

  return dynamicSections[key] || page.sections;
}

function campaignPageSections() {
  if (state.campaignDetailId) return campaignDetailSections();
  if (state.campaignInspectionMode) return campaignInspectionSections();
  return [campaignInspectionCardsSection(), projectOverviewSection(), archivedCampaignsSection()];
}

function renderNav(navItems) {
  const nav = document.getElementById("navList");
  nav.innerHTML = navItems.map(([id, label]) => `
    <button class="nav-button ${id === state.page ? "is-active" : ""}" type="button" data-page="${id}">${label}</button>
  `).join("");

  nav.querySelectorAll(".nav-button").forEach((button) => {
    button.addEventListener("click", () => {
      state.page = button.dataset.page;
      clearCampaignDrilldown();
      render();
    });
  });
}

function renderKpis(kpis) {
  document.getElementById("kpiGrid").innerHTML = kpis.map(([label, value, note, pageTarget]) => `
    <article class="kpi-card${pageTarget ? " is-clickable" : ""}"${pageTarget ? ` data-page-target="${escapeAttr(pageTarget)}"` : ""}>
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
  const header = `<div class="panel-header"><h2>${escapeHtml(section.title)}</h2>${section.headerAction ? `<div class="panel-header-action">${section.headerAction}</div>` : ""}</div>`;
  const tableClass = [
    "table",
    section.compact ? "is-compact" : "",
    section.tableClass || "",
  ].filter(Boolean).join(" ");

  if (section.type === "table") {
    return `
      <article class="panel${wideClass}">
        ${header}
        <div class="panel-body">
          ${renderTable(section, tableClass)}
          ${section.footer ? `<div class="section-footer">${section.footer}</div>` : ""}
        </div>
      </article>
    `;
  }

  if (section.type === "details-table") {
    return `
      <details class="panel details-panel${wideClass}">
        <summary class="panel-header details-summary">
          <h2>${escapeHtml(section.title)}</h2>
          <span>${escapeHtml(section.summary || "查看紀錄")}</span>
        </summary>
        <div class="panel-body">
          ${renderTable(section, tableClass)}
        </div>
      </details>
    `;
  }

  if (section.type === "list") {
    return `
      <article class="panel${wideClass}">
        ${header}
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
        ${header}
        <div class="panel-body mini-grid">
          ${section.cards.map(([title, body]) => `
            <div class="mini-card">
              <h3>${escapeHtml(title)}</h3>
              <div class="mini-card-body">${body}</div>
            </div>
          `).join("")}
        </div>
      </article>
    `;
  }

  if (section.type === "weekly-report") {
    return `
      <article class="panel${wideClass}">
        <div class="panel-header">
          <h2>${escapeHtml(section.title)}</h2>
          <div class="action-group">
            ${actionButton("複製週報", "copy-weekly-report", "", "is-primary")}
            ${actionButton("匯出 .txt", "export-weekly-report")}
          </div>
        </div>
        <div class="panel-body">
          <textarea class="weekly-report-text" readonly>${escapeHtml(section.text || "")}</textarea>
        </div>
      </article>
    `;
  }

  return `<article class="panel${wideClass}"><div class="panel-body empty-note">尚未定義內容。</div></article>`;
}

function renderTable(section, tableClass) {
  return `
    <table class="${tableClass}">
      <thead><tr>${section.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
      <tbody>
        ${section.rows.map((row) => {
          const cells = Array.isArray(row) ? row : row.cells;
          const rowClass = Array.isArray(row) ? "" : ` class="${escapeAttr(row.className || "")}"`;
          return `<tr${rowClass}>${cells.map((cell, index) => `<td data-label="${escapeAttr(section.headers[index] || "")}">${renderTableCell(cell)}</td>`).join("")}</tr>`;
        }).join("")}
      </tbody>
    </table>
  `;
}

function renderTableCell(cell) {
  if (cell == null) return "";
  if (isTrustedHtmlCell(cell)) return cell.__tableHtml;
  const html = String(cell);
  return isTrustedTableMarkup(html) ? html : escapeHtml(html);
}

function trustedTableHtml(html = "") {
  return { __tableHtml: String(html) };
}

function isTrustedHtmlCell(cell) {
  return Boolean(cell && typeof cell === "object" && typeof cell.__tableHtml === "string");
}

function isTrustedTableMarkup(html = "") {
  if (!html.includes("<")) return false;
  let remainder = html;
  remainder = remainder
    .replaceAll("<br>", "")
    .replace(/<span class="tag(?: [a-z-]+)?">/g, "")
    .replace(/<span class="cell-main">/g, "")
    .replace(/<span class="cell-sub">/g, "")
    .replaceAll("</span>", "")
    .replaceAll('<div class="action-group">', "")
    .replaceAll('<div class="deliverable-stack">', "")
    .replaceAll('<div class="deliverable-item">', "")
    .replaceAll('<div class="deliverable-item is-empty">', "")
    .replaceAll('<div class="deliverable-more">', "")
    .replaceAll('<div class="progress-track">', "")
    .replace(/<div class="progress-fill(?: [a-z-]+)?" style="width:\d+%">/g, "")
    .replaceAll("</div>", "")
    .replace(/<button class="inline-action(?: [a-z-]+)?" type="button" data-action="[^"]*" data-id="[^"]*"(?: disabled)?>/g, "")
    .replaceAll('<button class="inline-action" type="button" disabled>', "")
    .replaceAll("</button>", "");
  return !/[<>]/.test(remainder);
}

document.querySelectorAll(".role-button").forEach((button) => {
  button.addEventListener("click", () => {
    if (!state.auth.canSwitchRoles && button.dataset.role !== state.role) return;
    state.role = button.dataset.role;
    state.page = "dashboard";
    clearCampaignDrilldown();
    render();
  });
});

document.getElementById("primaryAction").addEventListener("click", () => {
  if (state.page === "weekly") {
    copyWeeklyReport();
    return;
  }

  if (state.role === "sales") {
    openCreateSalesRequestModal();
    return;
  }

  if (state.role === "executive") {
    state.page = "decisions";
    render();
    const firstPending = state.data.approvalRequests.find(isOpenApprovalRequest);
    if (firstPending) openApprovalReviewModal(firstPending.id);
    return;
  }

  if (state.role === "marketing" && state.page === "requests") {
    openCreateSalesRequestModal();
    return;
  }

  if (state.role === "marketing" && state.page === "campaigns") {
    clearCampaignDrilldown();
    openCreateCampaignModal();
    return;
  }

  if (state.role === "marketing" && state.page === "vendors") {
    openCreateCampaignVendorModal();
    return;
  }

  if (state.role === "marketing" && state.page === "associations") {
    openCreateAssociationModal();
    return;
  }

  if (state.role === "marketing" && state.page === "knowledge") {
    openCreateKnowledgeItemModal();
    return;
  }

  if (state.role === "marketing") {
    openCreateCampaignModal();
    return;
  }

  state.page = "requests";
  render();
});

document.getElementById("secondaryAction").addEventListener("click", exportCurrentSummary);

document.addEventListener("click", (event) => {
  const kpiCard = event.target.closest("[data-page-target]");
  if (kpiCard) {
    state.page = kpiCard.dataset.pageTarget;
    clearCampaignDrilldown();
    render();
    return;
  }

  const button = event.target.closest("[data-action]");
  if (!button || button.disabled) return;

  const { action, id } = button.dataset;
  if (action === "create-sales-lead") openCreateSalesLeadModal();
  if (action === "edit-sales-request") openEditSalesRequestModal(id);
  if (action === "view-sales-request") openViewSalesRequestModal(id);
  if (action === "cancel-sales-request") openCancelSalesRequestModal(id);
  if (action === "edit-campaign-vendor") openEditCampaignVendorModal(id);
  if (action === "cancel-campaign-vendor") openCancelCampaignVendorModal(id);
  if (action === "add-vendor-deliverable") openCreateVendorDeliverableModal(id);
  if (action === "edit-vendor-deliverable") openEditVendorDeliverableModal(id);
  if (action === "cancel-vendor-deliverable") openCancelVendorDeliverableModal(id);
  if (action === "send-vendor-approval") openVendorApprovalModal(id);
  if (action === "view-knowledge-item") openViewKnowledgeItemModal(id);
  if (action === "edit-knowledge-item") openEditKnowledgeItemModal(id);
  if (action === "archive-knowledge-item") openArchiveKnowledgeItemModal(id);
  if (action === "request-knowledge-update") openKnowledgeSupplementRequestModal(id);
  if (action === "add-knowledge-resource") openAddKnowledgeResourceModal(id);
  if (action === "remove-knowledge-resource") openRemoveKnowledgeResourceModal(id);
  if (action === "download-resource-file") openResourceFile(id, button);
  if (action === "open-resource-url") openResourceExternalLink(id, "url");
  if (action === "open-resource-canva") openResourceExternalLink(id, "canva");
  if (action === "create-marketing-resource") openCreateMarketingResourceModal();
  if (action === "edit-marketing-resource") openEditMarketingResourceModal(id);
  if (action === "archive-marketing-resource") openArchiveMarketingResourceModal(id);
  if (action === "create-association") openCreateAssociationModal();
  if (action === "view-association-detail") {
    state.page = "associations";
    state.associationDetailId = id;
    render();
  }
  if (action === "back-association-list") {
    state.associationDetailId = "";
    render();
  }
  if (action === "edit-association") openEditAssociationModal(id);
  if (action === "archive-association") openArchiveAssociationModal(id);
  if (action === "add-association-tag") openAddAssociationTagModal(id);
  if (action === "remove-association-tag") openRemoveAssociationTagModal(id);
  if (action === "create-association-task") openCreateAssociationTaskModal(id);
  if (action === "edit-association-task") openEditAssociationTaskModal(id);
  if (action === "cancel-association-task") openCancelAssociationTaskModal(id);
  if (action === "create-association-task-expense") openCreateAssociationTaskExpenseModal(id);
  if (action === "edit-association-task-expense") openEditAssociationTaskExpenseModal(id);
  if (action === "cancel-association-task-expense") openCancelAssociationTaskExpenseModal(id);
  if (action === "create-association-event") openCreateAssociationEventModal(id);
  if (action === "edit-association-event") openEditAssociationEventModal(id);
  if (action === "cancel-association-event") openCancelAssociationEventModal(id);
  if (action === "create-association-publication") openCreateAssociationPublicationModal(id);
  if (action === "edit-association-publication") openEditAssociationPublicationModal(id);
  if (action === "cancel-association-publication") openCancelAssociationPublicationModal(id);
  if (action === "create-association-fee") openCreateAssociationFeeModal(id);
  if (action === "edit-association-fee") openEditAssociationFeeModal(id);
  if (action === "cancel-association-fee") openCancelAssociationFeeModal(id);
  if (action === "create-association-benefit") openCreateAssociationBenefitModal(id);
  if (action === "edit-association-benefit") openEditAssociationBenefitModal(id);
  if (action === "archive-association-benefit") openArchiveAssociationBenefitModal(id);
  if (action === "create-association-note") openCreateAssociationNoteModal(id);
  if (action === "edit-association-note") openEditAssociationNoteModal(id);
  if (action === "cancel-association-note") openCancelAssociationNoteModal(id);
  if (action === "view-expense-source") openExpenseSource(id);
  if (action === "edit-expense-source") openEditExpenseSource(id);
  if (action === "cancel-expense-source") openCancelExpenseSource(id);
  if (action === "view-campaign-detail") {
    state.page = "campaigns";
    state.campaignInspectionMode = "";
    state.campaignDetailId = id;
    render();
  }
  if (action === "back-campaign-list") {
    clearCampaignDrilldown();
    render();
  }
  if (action === "view-campaign-inspection") {
    state.page = "campaigns";
    state.campaignDetailId = "";
    state.campaignInspectionMode = id;
    render();
  }
  if (action === "edit-campaign") openEditCampaignModal(id);
  if (action === "archive-campaign") openArchiveCampaignModal(id);
  if (action === "create-campaign-task") openCreateCampaignTaskModal(id);
  if (action === "edit-campaign-task") openEditCampaignTaskModal(id);
  if (action === "cancel-campaign-task") openCancelCampaignTaskModal(id);
  if (action === "create-campaign-budget-item") openCreateCampaignBudgetItemModal(id);
  if (action === "edit-campaign-budget-item") openEditCampaignBudgetItemModal(id);
  if (action === "cancel-campaign-budget-item") openCancelCampaignBudgetItemModal(id);
  if (action === "create-campaign-document") openCreateCampaignDocumentModal(id);
  if (action === "edit-campaign-document") openEditCampaignDocumentModal(id);
  if (action === "archive-campaign-document") openArchiveCampaignDocumentModal(id);
  if (action === "open-campaign-document") openCampaignDocumentFile(id, button);
  if (action === "create-campaign-risk") openCreateCampaignRiskModal(id);
  if (action === "edit-campaign-risk") openEditCampaignRiskModal(id);
  if (action === "archive-campaign-risk") openArchiveCampaignRiskModal(id);
  if (action === "create-risk-update") openCreateRiskUpdateModal(id);
  if (action === "edit-risk-update") openEditRiskUpdateModal(id);
  if (action === "cancel-risk-update") openCancelRiskUpdateModal(id);
  if (action === "edit-campaign-performance") openCampaignPerformanceModal(id);
  if (action === "review-approval") openApprovalReviewModal(id);
  if (action === "view-weekly-summary") {
    state.page = "weekly";
    clearCampaignDrilldown();
    render();
  }
  if (action === "view-decisions") {
    if (state.role === "executive") {
      state.page = "decisions";
      clearCampaignDrilldown();
      render();
      return;
    }
    openModal("待決策中心", `<p class="empty-note">此項目需由總經理在待決策中心處理；週報頁只做摘要提醒，不會自動新增或修改審核單。</p>`, {
      submitLabel: "關閉",
      hideCancel: true,
      onSubmit: async () => closeModal(),
    });
  }
  if (action === "copy-weekly-report") copyWeeklyReport();
  if (action === "export-weekly-report") exportWeeklyReport();
});

document.getElementById("modalClose").addEventListener("click", closeModal);
document.getElementById("modalCancel").addEventListener("click", closeModal);
document.getElementById("formModal").addEventListener("click", (event) => {
  if (event.target.id === "formModal") closeModal();
});

document.getElementById("modalForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!modalSubmitHandler) {
    closeModal();
    return;
  }

  const submit = document.getElementById("modalSubmit");
  const cancel = document.getElementById("modalCancel");
  const close = document.getElementById("modalClose");
  const sessionId = modalSessionId;
  submit.disabled = true;
  cancel.disabled = true;
  close.disabled = true;
  submit.textContent = submit.dataset.pendingLabel || pendingLabelForSubmitLabel(submit.textContent);
  modalSubmitting = true;
  modalPendingClose = false;
  setModalMessage("");
  try {
    await modalSubmitHandler(event.currentTarget);
  } catch (error) {
    console.warn("operation failed", error);
    setModalMessage(error.message || "操作失敗，請稍後再試。");
  } finally {
    if (sessionId !== modalSessionId) return;

    modalSubmitting = false;
    if (modalPendingClose) {
      closeModalNow();
      return;
    }

    submit.disabled = false;
    cancel.disabled = false;
    close.disabled = false;
    submit.textContent = submit.dataset.idleLabel || "送出";
  }
});

document.getElementById("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  const button = document.getElementById("loginButton");
  const message = document.getElementById("loginMessage");

  if (!email || !password) {
    message.textContent = "請輸入 email 與密碼。";
    return;
  }

  button.disabled = true;
  button.textContent = "登入中...";
  message.textContent = "";

  try {
    await signInWithPassword(email, password);
    await bootAuthenticatedApp(email);
  } catch (error) {
    message.textContent = error.message || "登入失敗，請確認帳號密碼。";
  }

  button.disabled = false;
  button.textContent = "登入";
});

document.getElementById("logoutButton").addEventListener("click", async () => {
  await signOut();
  showLogin();
});

async function loadExistingData() {
  state.dataStatus = "loading";
  render();

  try {
    const [
      campaigns,
      resources,
      tenders,
      leads,
      associations,
      associationTags,
      associationCooperations,
      associationStages,
      campaignVendors,
      campaignTasks,
      campaignBudgetItems,
      campaignDocuments,
      campaignRisks,
      campaignRiskUpdates,
      campaignPerformance,
      vendors,
      salesRequests,
      cancelledSalesRequests,
      approvalRequests,
      knowledgeItems,
      knowledgeResourceLinks,
      expenses,
      associationTasks,
      associationTaskExpenses,
      associationEvents,
      associationPublications,
      associationFees,
      associationBenefits,
      associationNotes,
    ] = await Promise.all([
      loadMarketingCampaigns(),
      loadMarketingResources(),
      loadTenderResults(),
      safeGET("leads?select=id,company_name,contact_name,source_channel,requirement_note,importance,assigned_sales,stage,next_step,next_followup_date,created_at&order=created_at.desc&limit=50"),
      safeGET("associations?limit=50"),
      safeGET("association_relationship_tags?select=id,association_id,tag,created_at&order=created_at.desc&limit=100"),
      safeGET("association_cooperation_overview?select=id,association_id,item_name,item_type,stage,owner,due_date,progress_pct,next_step,notes,created_at,source_table&order=due_date.asc.nullslast,created_at.desc&limit=80"),
      safeGET("association_stage_options?select=entity_type,stage_name,sort_order,pct_value&order=entity_type.asc,sort_order.asc"),
      loadCampaignVendors(),
      loadCampaignTasks(),
      loadCampaignBudgetItems(),
      loadCampaignDocuments(),
      loadCampaignRisks(),
      loadCampaignRiskUpdates(),
      loadCampaignPerformance(),
      safeGET("vendors?select=id,name,vendor_type,contact_name,contact_phone,contact_email&order=name.asc&limit=100"),
      loadSalesRequests(),
      loadCancelledSalesRequests(),
      safeGET("approval_requests?select=id,entity_type,entity_id,title,summary,amount,due_date,requested_by,approver_role,status,decided_by,decided_at,decision_note,created_at&order=created_at.desc&limit=100"),
      loadProductKnowledgeItems(),
      safeGET("product_knowledge_resource_links?select=id,knowledge_item_id,resource_id,created_at&order=created_at.desc&limit=500"),
      safeGET("all_expenses_overview?select=source_id,source_table,title,category,amount,amount_budget,amount_actual,payment_status,payment_date,campaign_id,association_id,vendor_id,owner_contact,created_at&order=payment_date.desc.nullslast,created_at.desc&limit=100"),
      loadAssociationTasks(),
      loadAssociationTaskExpenses(),
      loadAssociationEvents(),
      loadAssociationPublications(),
      loadAssociationFees(),
      loadAssociationBenefits(),
      loadAssociationNotes(),
    ]);

    state.data.campaigns = Array.isArray(campaigns) ? activeCampaigns(campaigns) : [];
    state.data.archivedCampaigns = Array.isArray(campaigns) ? archivedCampaigns(campaigns) : [];
    state.data.resources = Array.isArray(resources) ? resources : [];
    state.data.tenders = Array.isArray(tenders) ? tenders : [];
    state.data.leads = Array.isArray(leads) ? leads : [];
    state.data.associations = Array.isArray(associations) ? activeAssociations(associations) : [];
    state.data.archivedAssociations = Array.isArray(associations) ? archivedAssociations(associations) : [];
    state.data.associationTags = Array.isArray(associationTags) ? associationTags : [];
    state.data.associationCooperations = Array.isArray(associationCooperations) ? associationCooperations : [];
    state.data.associationStages = Array.isArray(associationStages) ? associationStages : [];
    state.data.associationTasks = Array.isArray(associationTasks) ? activeAssociationTasks(associationTasks) : [];
    state.data.cancelledAssociationTasks = Array.isArray(associationTasks) ? cancelledAssociationTasks(associationTasks) : [];
    state.data.associationTaskExpenses = Array.isArray(associationTaskExpenses) ? activeAssociationTaskExpenses(associationTaskExpenses) : [];
    state.data.cancelledAssociationTaskExpenses = Array.isArray(associationTaskExpenses) ? cancelledAssociationTaskExpenses(associationTaskExpenses) : [];
    state.data.associationEvents = Array.isArray(associationEvents) ? activeAssociationEvents(associationEvents) : [];
    state.data.cancelledAssociationEvents = Array.isArray(associationEvents) ? cancelledAssociationEvents(associationEvents) : [];
    state.data.associationPublications = Array.isArray(associationPublications) ? activeAssociationPublications(associationPublications) : [];
    state.data.cancelledAssociationPublications = Array.isArray(associationPublications) ? cancelledAssociationPublications(associationPublications) : [];
    state.data.associationFees = Array.isArray(associationFees) ? activeAssociationFees(associationFees) : [];
    state.data.cancelledAssociationFees = Array.isArray(associationFees) ? cancelledAssociationFees(associationFees) : [];
    state.data.associationBenefits = Array.isArray(associationBenefits) ? activeAssociationBenefits(associationBenefits) : [];
    state.data.archivedAssociationBenefits = Array.isArray(associationBenefits) ? archivedAssociationBenefits(associationBenefits) : [];
    state.data.associationNotes = Array.isArray(associationNotes) ? activeAssociationNotes(associationNotes) : [];
    state.data.cancelledAssociationNotes = Array.isArray(associationNotes) ? cancelledAssociationNotes(associationNotes) : [];
    state.data.campaignVendors = Array.isArray(campaignVendors) ? activeCampaignVendors(campaignVendors) : [];
    state.data.cancelledCampaignVendors = Array.isArray(campaignVendors) ? cancelledCampaignVendors(campaignVendors) : [];
    state.data.cancelledDeliverables = Array.isArray(campaignVendors) ? cancelledDeliverablesFromAll(campaignVendors) : [];
    state.data.campaignTasks = Array.isArray(campaignTasks) ? activeCampaignTasks(campaignTasks) : [];
    state.data.cancelledCampaignTasks = Array.isArray(campaignTasks) ? cancelledCampaignTasks(campaignTasks) : [];
    state.data.campaignBudgetItems = Array.isArray(campaignBudgetItems) ? activeCampaignBudgetItems(campaignBudgetItems) : [];
    state.data.cancelledCampaignBudgetItems = Array.isArray(campaignBudgetItems) ? cancelledCampaignBudgetItems(campaignBudgetItems) : [];
    state.data.campaignDocuments = Array.isArray(campaignDocuments) ? activeCampaignDocuments(campaignDocuments) : [];
    state.data.archivedCampaignDocuments = Array.isArray(campaignDocuments) ? archivedCampaignDocuments(campaignDocuments) : [];
    state.data.campaignRisks = Array.isArray(campaignRisks) ? activeCampaignRisks(campaignRisks) : [];
    state.data.archivedCampaignRisks = Array.isArray(campaignRisks) ? archivedCampaignRisks(campaignRisks) : [];
    state.data.campaignRiskUpdates = Array.isArray(campaignRiskUpdates) ? activeCampaignRiskUpdates(campaignRiskUpdates) : [];
    state.data.cancelledCampaignRiskUpdates = Array.isArray(campaignRiskUpdates) ? cancelledCampaignRiskUpdates(campaignRiskUpdates) : [];
    state.data.campaignPerformance = Array.isArray(campaignPerformance) ? campaignPerformance : [];
    state.data.vendors = Array.isArray(vendors) ? vendors : [];
    state.data.vendorDocuments = state.data.campaignDocuments.filter((document) => document.vendor_id);
    state.data.salesRequests = Array.isArray(salesRequests) ? salesRequests : [];
    state.data.cancelledSalesRequests = Array.isArray(cancelledSalesRequests) ? cancelledSalesRequests : [];
    state.data.approvalRequests = Array.isArray(approvalRequests) ? approvalRequests : [];
    state.data.knowledgeItems = Array.isArray(knowledgeItems) ? knowledgeItems : [];
    state.data.knowledgeResourceLinks = Array.isArray(knowledgeResourceLinks) ? knowledgeResourceLinks : [];
    state.data.expenses = Array.isArray(expenses) ? expenses : [];

    const liveCount = state.data.campaigns.length
      + state.data.archivedCampaigns.length
      + state.data.resources.length
      + state.data.tenders.length
      + state.data.leads.length
      + state.data.associations.length
      + state.data.archivedAssociations.length
      + state.data.associationTags.length
      + state.data.associationCooperations.length
      + state.data.associationStages.length
      + state.data.associationTasks.length
      + state.data.cancelledAssociationTasks.length
      + state.data.associationTaskExpenses.length
      + state.data.cancelledAssociationTaskExpenses.length
      + state.data.associationEvents.length
      + state.data.cancelledAssociationEvents.length
      + state.data.associationPublications.length
      + state.data.cancelledAssociationPublications.length
      + state.data.associationFees.length
      + state.data.cancelledAssociationFees.length
      + state.data.associationBenefits.length
      + state.data.archivedAssociationBenefits.length
      + state.data.associationNotes.length
      + state.data.cancelledAssociationNotes.length
      + state.data.campaignVendors.length
      + state.data.cancelledCampaignVendors.length
      + state.data.cancelledDeliverables.length
      + state.data.campaignTasks.length
      + state.data.cancelledCampaignTasks.length
      + state.data.campaignBudgetItems.length
      + state.data.cancelledCampaignBudgetItems.length
      + state.data.campaignDocuments.length
      + state.data.archivedCampaignDocuments.length
      + state.data.campaignRisks.length
      + state.data.archivedCampaignRisks.length
      + state.data.campaignRiskUpdates.length
      + state.data.cancelledCampaignRiskUpdates.length
      + state.data.campaignPerformance.length
      + state.data.vendors.length
      + state.data.vendorDocuments.length
      + state.data.salesRequests.length
      + state.data.cancelledSalesRequests.length
      + state.data.approvalRequests.length
      + state.data.knowledgeItems.length
      + state.data.knowledgeResourceLinks.length
      + state.data.expenses.length;
    state.dataStatus = liveCount > 0 ? "live" : "fallback";
  } catch (error) {
    console.warn("Existing data load failed", error);
    state.dataStatus = "error";
  }

  render();
}

async function loadMarketingCampaigns() {
  const fullSelect = "id,name,status,priority,budget,actual_spend,subsidy_planned,subsidy_received,midea_budget_code,payment_status,claim_status,flight_cost,partner,purpose,notes,planned_start,planned_end,actual_start,actual_end,owner,owner_unit,vendors,association_id,association_activity_type,sort_order,archived_at,archived_by,archive_reason,created_at";
  const withArchive = await safeGET(`marketing_campaigns?select=${fullSelect}&order=sort_order.asc.nullslast,created_at.desc&limit=100`, null);
  if (Array.isArray(withArchive)) return withArchive;

  return safeGET("marketing_campaigns?select=id,name,status,priority,budget,actual_spend,subsidy_planned,subsidy_received,partner,purpose,notes,planned_start,planned_end,actual_start,actual_end,created_at&order=sort_order.asc.nullslast,created_at.desc&limit=100");
}

async function loadCampaignTasks() {
  const withLifecycle = await safeGET("marketing_campaign_tasks?select=id,campaign_id,seq,task_name,owner,planned_start,planned_end,status,completion_pct,expected_output,notes,cancelled_at,cancelled_by,cancel_reason,created_at&order=planned_end.asc.nullslast,seq.asc,created_at.asc&limit=300", null);
  if (Array.isArray(withLifecycle)) return withLifecycle;

  return safeGET("marketing_campaign_tasks?select=id,campaign_id,seq,task_name,owner,planned_start,planned_end,status,completion_pct,expected_output,notes,created_at&order=planned_end.asc.nullslast,seq.asc,created_at.asc&limit=300");
}

async function loadAssociationTasks() {
  const withLifecycle = await safeGET("association_tasks?select=id,association_id,marketing_campaign_id,task_name,task_type,task_status,priority,start_date,due_date,completed_date,progress_pct,owner,description,next_step,required_materials,notes,attachment,cancelled_at,cancelled_by,cancel_reason,created_at,updated_at&order=due_date.asc.nullslast,updated_at.desc,created_at.desc&limit=300", null);
  if (Array.isArray(withLifecycle)) return withLifecycle;

  return safeGET("association_tasks?select=id,association_id,marketing_campaign_id,task_name,task_type,task_status,priority,start_date,due_date,completed_date,progress_pct,owner,description,next_step,required_materials,notes,attachment,created_at,updated_at&order=due_date.asc.nullslast,updated_at.desc,created_at.desc&limit=300");
}

async function loadAssociationTaskExpenses() {
  const withLifecycle = await safeGET("association_task_expenses?select=id,association_id,task_id,expense_type,budget_amount,actual_amount,payment_status,payment_date,receipt_status,receipt_attachment,notes,cancelled_at,cancelled_by,cancel_reason,created_at,updated_at&order=payment_date.asc.nullslast,updated_at.desc,created_at.desc&limit=300", null);
  if (Array.isArray(withLifecycle)) return withLifecycle;

  return safeGET("association_task_expenses?select=id,association_id,task_id,expense_type,budget_amount,actual_amount,payment_status,payment_date,receipt_status,receipt_attachment,notes,created_at,updated_at&order=payment_date.asc.nullslast,updated_at.desc,created_at.desc&limit=300");
}

async function loadAssociationEvents() {
  const withLifecycle = await safeGET("association_events?select=id,association_id,task_id,event_name,event_type,event_date,location,organizer,meisun_role,budget,actual_spend,required_materials,event_status,owner,result_notes,attachment,cancelled_at,cancelled_by,cancel_reason,created_at,updated_at&order=event_date.asc.nullslast,updated_at.desc,created_at.desc&limit=300", null);
  if (Array.isArray(withLifecycle)) return withLifecycle;

  return safeGET("association_events?select=id,association_id,task_id,event_name,event_type,event_date,location,organizer,meisun_role,budget,actual_spend,required_materials,event_status,owner,result_notes,attachment,created_at,updated_at&order=event_date.asc.nullslast,updated_at.desc,created_at.desc&limit=300");
}

async function loadAssociationPublications() {
  const withLifecycle = await safeGET("association_publication_schedules?select=id,association_id,task_id,publication_name,publish_date,deadline_date,ad_spec,topic,required_materials,material_status,owner,submission_date,result_notes,attachment,cancelled_at,cancelled_by,cancel_reason,created_at,updated_at&order=deadline_date.asc.nullslast,publish_date.asc.nullslast,updated_at.desc,created_at.desc&limit=300", null);
  if (Array.isArray(withLifecycle)) return withLifecycle;

  return safeGET("association_publication_schedules?select=id,association_id,task_id,publication_name,publish_date,deadline_date,ad_spec,topic,required_materials,material_status,owner,submission_date,result_notes,attachment,created_at,updated_at&order=deadline_date.asc.nullslast,publish_date.asc.nullslast,updated_at.desc,created_at.desc&limit=300");
}

async function loadAssociationFees() {
  const withLifecycle = await safeGET("association_fee_records?select=id,association_id,year,fee_amount,payment_status,payment_date,due_date,receipt_status,receipt_attachment,renewal_reminder_date,notes,cancelled_at,cancelled_by,cancel_reason,created_at,updated_at&order=year.desc,due_date.asc.nullslast,updated_at.desc,created_at.desc&limit=300", null);
  if (Array.isArray(withLifecycle)) return withLifecycle;

  return safeGET("association_fee_records?select=id,association_id,year,fee_amount,payment_status,payment_date,due_date,receipt_status,receipt_attachment,renewal_reminder_date,notes,created_at,updated_at&order=year.desc,due_date.asc.nullslast,updated_at.desc,created_at.desc&limit=300");
}

async function loadAssociationBenefits() {
  const withLifecycle = await safeGET("association_benefits?select=id,association_id,benefit_name,benefit_type,description,usage_status,valid_until,owner,notes,archived_at,archived_by,archive_reason,created_at,updated_at&order=valid_until.asc.nullslast,updated_at.desc,created_at.desc&limit=300", null);
  if (Array.isArray(withLifecycle)) return withLifecycle;

  return safeGET("association_benefits?select=id,association_id,benefit_name,benefit_type,description,usage_status,valid_until,owner,notes,created_at,updated_at&order=valid_until.asc.nullslast,updated_at.desc,created_at.desc&limit=300");
}

async function loadAssociationNotes() {
  const withLifecycle = await safeGET("association_notes?select=id,association_id,note_title,note,attachment,owner,cancelled_at,cancelled_by,cancel_reason,created_at,updated_at&order=updated_at.desc,created_at.desc&limit=300", null);
  if (Array.isArray(withLifecycle)) return withLifecycle;

  return safeGET("association_notes?select=id,association_id,note_title,note,attachment,owner,created_at,updated_at&order=updated_at.desc,created_at.desc&limit=300");
}

async function loadCampaignBudgetItems() {
  const withLifecycle = await safeGET("marketing_campaign_budget_items?select=id,campaign_id,seq,item_name,budget_nature,amount_twd,exchange_rate,amount_rmb,basis_note,quote_status,payment_status,payment_date,cancelled_at,cancelled_by,cancel_reason,created_at&order=seq.asc,created_at.asc&limit=300", null);
  if (Array.isArray(withLifecycle)) return withLifecycle;

  const withPayment = await safeGET("marketing_campaign_budget_items?select=id,campaign_id,seq,item_name,budget_nature,amount_twd,exchange_rate,amount_rmb,basis_note,quote_status,payment_status,payment_date,created_at&order=seq.asc,created_at.asc&limit=300", null);
  if (Array.isArray(withPayment)) return withPayment;

  return safeGET("marketing_campaign_budget_items?select=id,campaign_id,seq,item_name,budget_nature,amount_twd,exchange_rate,amount_rmb,basis_note,quote_status,created_at&order=seq.asc,created_at.asc&limit=300");
}

async function loadCampaignDocuments() {
  const withLifecycle = await safeGET("marketing_campaign_documents?select=id,campaign_id,doc_type,title,version_note,file_path,file_name,notes,vendor_id,deliverable_id,uploaded_at,archived_at,archived_by,archive_reason&order=uploaded_at.desc.nullslast,id.desc&limit=300", null);
  if (Array.isArray(withLifecycle)) return withLifecycle;

  return safeGET("marketing_campaign_documents?select=id,campaign_id,doc_type,title,version_note,file_path,file_name,notes,vendor_id,deliverable_id,uploaded_at&order=uploaded_at.desc.nullslast,id.desc&limit=300");
}

async function loadCampaignRisks() {
  const withLifecycle = await safeGET("marketing_campaign_risks?select=id,campaign_id,risk_type,title,description,impact_level,owner,due_date,status,show_on_dashboard,resolution_note,archived_at,archived_by,archive_reason,created_at,updated_at&order=due_date.asc.nullslast,updated_at.desc,created_at.desc&limit=300", null);
  if (Array.isArray(withLifecycle)) return withLifecycle;

  return safeGET("marketing_campaign_risks?select=id,campaign_id,risk_type,title,description,impact_level,owner,due_date,status,show_on_dashboard,resolution_note,created_at,updated_at&order=due_date.asc.nullslast,updated_at.desc,created_at.desc&limit=300");
}

async function loadCampaignRiskUpdates() {
  const withLifecycle = await safeGET("marketing_campaign_risk_updates?select=id,risk_id,update_note,updated_by,update_date,next_followup_date,is_important,cancelled_at,cancelled_by,cancel_reason,created_at&order=update_date.desc,created_at.desc&limit=500", null);
  if (Array.isArray(withLifecycle)) return withLifecycle;

  return safeGET("marketing_campaign_risk_updates?select=id,risk_id,update_note,updated_by,update_date,next_followup_date,is_important,created_at&order=update_date.desc,created_at.desc&limit=500");
}

async function loadCampaignPerformance() {
  const withChannel = await safeGET("marketing_campaign_performance?select=id,campaign_id,channel,reach_count,lead_count,inquiry_count,qualified_lead_count,estimated_opportunity_amount,deal_count,deal_amount,notes,created_at,updated_at&order=updated_at.desc.nullslast,created_at.desc&limit=300", null);
  if (Array.isArray(withChannel)) return withChannel;

  return safeGET("marketing_campaign_performance?select=id,campaign_id,reach_count,lead_count,inquiry_count,qualified_lead_count,estimated_opportunity_amount,deal_count,deal_amount,notes,created_at,updated_at&order=updated_at.desc.nullslast,created_at.desc&limit=300");
}

async function loadMarketingResources() {
  const withArchive = await safeGET("marketing_resources?select=id,title,resource_type,product_line,audience,version,resource_url,canva_url,file_path,file_name,file_size,is_external_usable,tags,notes,deleted_at,deleted_by,updated_at&order=updated_at.desc&limit=100", null);
  if (Array.isArray(withArchive)) return withArchive;

  const withEditableFields = await safeGET("marketing_resources?select=id,title,resource_type,product_line,audience,version,resource_url,canva_url,file_path,file_name,file_size,is_external_usable,tags,notes,updated_at&order=updated_at.desc&limit=100", null);
  if (Array.isArray(withEditableFields)) return withEditableFields;

  return safeGET("marketing_resources?select=id,title,resource_type,product_line,audience,version,resource_url,canva_url,file_path,file_name,file_size,is_external_usable,updated_at&order=updated_at.desc&limit=100");
}

async function loadProductKnowledgeItems() {
  const withArchive = await safeGET("product_knowledge_items?select=id,title,product_line,knowledge_type,target_segment,use_context,summary,detail,recommended_pitch,prohibited_pitch,related_competitor,evidence_level,visibility_status,owner,version,archived_at,archived_by,archive_reason,created_at,updated_at&order=updated_at.desc,created_at.desc&limit=100", null);
  state.knowledgeArchiveAvailable = Array.isArray(withArchive);
  if (Array.isArray(withArchive)) return withArchive;

  return safeGET("product_knowledge_items?select=id,title,product_line,knowledge_type,target_segment,use_context,summary,detail,recommended_pitch,prohibited_pitch,related_competitor,evidence_level,visibility_status,owner,version,created_at,updated_at&order=updated_at.desc,created_at.desc&limit=100");
}

async function loadTenderResults() {
  const withLead = await safeGET("tender_results?select=id,title,published_at,status,last_seen_at,matched_keywords,snippet,url,converted_lead_id&order=last_seen_at.desc&limit=20", null);
  if (Array.isArray(withLead)) return withLead;

  return safeGET("tender_results?select=id,title,published_at,status,last_seen_at,matched_keywords,snippet,url&order=last_seen_at.desc&limit=20");
}

async function loadCampaignVendors() {
  const withLifecycle = await safeGET("marketing_campaign_vendors?select=id,campaign_id,vendor_id,role_in_project,meisun_contact,quote_status,budget_amount,actual_amount,payment_status,payment_date,cancelled_at,cancelled_by,cancel_reason,created_at,vendors(name,vendor_type),marketing_campaign_vendor_deliverables(id,campaign_vendor_id,deliverable_name,owner,due_date,status,reviewer,attachment,notes,cancelled_at,cancelled_by,cancel_reason)&order=created_at.desc&limit=100", null);
  if (Array.isArray(withLifecycle)) return withLifecycle;

  return safeGET("marketing_campaign_vendors?select=id,campaign_id,vendor_id,role_in_project,meisun_contact,quote_status,budget_amount,actual_amount,payment_status,payment_date,created_at,vendors(name,vendor_type),marketing_campaign_vendor_deliverables(id,campaign_vendor_id,deliverable_name,owner,due_date,status,reviewer,attachment,notes)&order=created_at.desc&limit=100");
}

function activeCampaignVendors(campaignVendors = []) {
  return campaignVendors
    .filter((campaignVendor) => !campaignVendor.cancelled_at)
    .map((campaignVendor) => ({
      ...campaignVendor,
      marketing_campaign_vendor_deliverables: Array.isArray(campaignVendor.marketing_campaign_vendor_deliverables)
        ? campaignVendor.marketing_campaign_vendor_deliverables.filter((deliverable) => !deliverable.cancelled_at)
        : [],
    }));
}

function cancelledCampaignVendors(campaignVendors = []) {
  return campaignVendors.filter((campaignVendor) => Boolean(campaignVendor.cancelled_at));
}

function cancelledDeliverablesFromAll(campaignVendors = []) {
  return campaignVendors.flatMap((campaignVendor) => {
    const vendor = campaignVendor.vendors || {};
    const deliverables = Array.isArray(campaignVendor.marketing_campaign_vendor_deliverables)
      ? campaignVendor.marketing_campaign_vendor_deliverables
      : [];
    return deliverables
      .filter((deliverable) => Boolean(deliverable.cancelled_at))
      .map((deliverable) => ({
        campaignVendor,
        deliverable,
        vendorName: vendor.name || "未命名廠商",
      }));
  });
}

async function loadSalesRequests() {
  const withCancelAudit = await safeGET("sales_requests?select=id,request_name,requested_by,lead_id,request_type,priority,status,assigned_to,due_date,description,deliverable_resource_id,completed_at,cancelled_at,cancelled_by,created_at&cancelled_at=is.null&order=created_at.desc&limit=100", null);
  if (Array.isArray(withCancelAudit)) return withCancelAudit;

  return safeGET("sales_requests?select=id,request_name,requested_by,lead_id,request_type,priority,status,assigned_to,due_date,description,deliverable_resource_id,completed_at,created_at&status=neq.已取消&order=created_at.desc&limit=100");
}

async function loadCancelledSalesRequests() {
  const select = "id,request_name,requested_by,lead_id,request_type,priority,status,assigned_to,due_date,description,deliverable_resource_id,completed_at,cancelled_at,cancelled_by,created_at";
  const ownFilter = state.role === "sales" && state.auth.email
    ? `&requested_by=eq.${encodeURIComponent(state.auth.email)}`
    : "";
  const withCancelAudit = await safeGET(`sales_requests?select=${select}&cancelled_at=not.is.null${ownFilter}&order=cancelled_at.desc.nullslast,created_at.desc&limit=100`, null);
  if (Array.isArray(withCancelAudit)) return withCancelAudit;

  return safeGET(`sales_requests?select=${select}${ownFilter}&status=eq.已取消&order=created_at.desc&limit=100`);
}

render();
init();

async function init() {
  if (!(await hasValidSession())) {
    showLogin();
    return;
  }

  const user = await getCurrentUser();
  const email = user?.email || sessionStorage.getItem("ms_email") || "";
  if (!email) {
    showLogin();
    return;
  }

  await bootAuthenticatedApp(email);
}

async function bootAuthenticatedApp(email) {
  const access = await loadUserAccess(email);
  if (!access.allowed) {
    await signOut();
    showLogin("此帳號尚未開通平台權限，請聯絡管理者。");
    return;
  }
  if (access.mustChange) {
    await signOut();
    showLogin("此帳號需要先完成密碼變更，請先到原平台登入並更新密碼。");
    return;
  }

  const normalizedRole = normalizeRole(access.role);
  state.auth.email = email;
  state.auth.displayName = access.displayName || "";
  state.auth.role = access.role || normalizedRole;
  state.auth.canSwitchRoles = ["admin", "administrator", "系統管理者"].includes(String(access.role || "").toLowerCase());
  state.role = normalizedRole;
  state.page = "dashboard";
  sessionStorage.setItem("ms_email", email);
  sessionStorage.setItem("ms_role", access.role || normalizedRole);

  showApp();
  await loadExistingData();
}

function normalizeRole(role) {
  const key = String(role || "").trim().toLowerCase();
  return roleAliases[key] || "sales";
}

function showLogin(message = "") {
  document.getElementById("appShell").classList.add("is-hidden");
  document.getElementById("loginScreen").classList.remove("is-hidden");
  document.getElementById("loginMessage").textContent = message;
  state.dataStatus = "fallback";
}

function showApp() {
  document.getElementById("loginScreen").classList.add("is-hidden");
  document.getElementById("appShell").classList.remove("is-hidden");
  const userName = displayUserName();
  document.getElementById("currentUserLabel").textContent = userName === "夥伴" ? state.auth.email || "已登入" : userName;
  document.getElementById("currentUserNote").textContent = state.auth.canSwitchRoles
    ? `管理者權限・可切換視角・${state.auth.email || "公司帳號"}`
    : `${roleLabel(state.role)}權限・${state.auth.email || "公司帳號"}`;
  render();
}

function roleLabel(role) {
  return {
    executive: "總經理",
    marketing: "行銷總監",
    sales: "業務",
  }[role] || "業務";
}
