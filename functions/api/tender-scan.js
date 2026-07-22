const DEFAULT_SUPABASE_URL = "https://apgrclmrkarxlajmhnpa.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwZ3JjbG1ya2FyeGxham1obnBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2Mjk1NzQsImV4cCI6MjA5OTIwNTU3NH0.qmiZsy4tIkprrhdggCZK_qyr0OuRVFk3sr576CdkLYw";

const DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; MeisunTenderMonitor/2.0)",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

const CATEGORY_RULES = {
  bid_open: { label: "招標 / 投標中", score: 30, terms: ["招標", "公開招標", "投標", "領標", "開標", "招商"] },
  procurement: { label: "採購 / 報價", score: 24, terms: ["採購", "報價", "徵求", "邀標", "標案", "公告"] },
  deadline: { label: "截止 / 開標日期", score: 10, terms: ["截止", "期限", "開標日期", "投標截止", "收件截止"] },
  chiller: { label: "冰水主機", score: 45, terms: ["冰水主機", "冰水機", "冰機", "chiller", "Chiller"] },
  central_ac: { label: "中央空調 / 空調設備", score: 34, terms: ["中央空調", "空調設備", "空調系統", "空調工程", "空調"] },
  ventilation: { label: "通風設備", score: 26, terms: ["通風設備", "通風系統", "排風", "排煙", "送風"] },
  maglev: { label: "磁浮 / 磁懸浮", score: 50, terms: ["磁浮", "磁懸浮", "磁軸承"] },
  exclude_closed: { label: "排除決標 / 得標", score: -80, terms: ["決標", "得標", "流標", "廢標", "結果公告", "得標廠商"] },
  exclude_residential: { label: "降低家用冷氣", score: -40, terms: ["家用冷氣", "分離式冷氣", "窗型冷氣", "冷氣機", "冷氣維修"] },
};

const DEFAULT_SCAN_CATEGORIES = Object.keys(CATEGORY_RULES);
const FILTER_THRESHOLDS = {
  "保守": { high: 55, review: 0 },
  "平衡": { high: 70, review: 25 },
  "嚴格": { high: 85, review: 45 },
};

export async function onRequest({ request, env = {} }) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const authHeader = request.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return json({ error: "請先登入平台後再掃描。" }, 401);
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    return json({ error: "掃描參數格式錯誤。" }, 400);
  }

  const projectId = body.projectId;
  if (!projectId) return json({ error: "缺少監測專案 ID。" }, 400);

  const sb = createSupabaseClient({
    supabaseUrl: env.SUPABASE_URL || DEFAULT_SUPABASE_URL,
    apiKey: env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY,
    authHeader,
  });

  const startedAt = new Date().toISOString();
  let project = null;
  let run = null;

  try {
    project = (await sb.get(`tender_projects?id=eq.${encodeURIComponent(projectId)}&limit=1`))?.[0];
    if (!project) return json({ error: "找不到招標監測專案。" }, 404);
    if (project.is_active === false) return json({ error: "此監測專案目前停用。" }, 400);

    run = (await sb.post("tender_scan_runs", { project_id: project.id, status: "running" }))?.[0];
    const keywords = await sb.get(`tender_keywords?project_id=eq.${encodeURIComponent(project.id)}&is_active=eq.true&order=created_at.asc`);
    const explicitWords = (keywords || []).map((item) => item.keyword).filter(Boolean);
    const words = explicitWords.length ? explicitWords : inferWordsFromProject(project);
    if (!words.length) throw new Error("此專案沒有啟用中的關鍵字或搜尋指令。");

    const pages = projectPageUrls(project.source_url, project.page_limit || 1);
    const candidates = new Map();

    for (const pageUrl of pages) {
      const html = await fetchHtml(pageUrl);
      for (const item of extractScanCandidates(html, pageUrl)) {
        if (!candidates.has(item.url)) candidates.set(item.url, item);
      }
    }

    let foundCount = 0;
    let newCount = 0;
    const matches = [];

    for (const item of candidates.values()) {
      let detailHtml = "";
      try {
        detailHtml = await fetchHtml(item.url);
      } catch {
        detailHtml = "";
      }

      const detailText = htmlToText(detailHtml);
      const extractedTitle = cleanText(extractTitle(detailHtml));
      const title = extractedTitle && !looksLikeGenericTitle(extractedTitle) ? extractedTitle : cleanText(item.title);
      const haystack = `${title}\n${item.pageText || ""}\n${detailText}`;
      const matchedKeywords = words.filter((word) => haystack.includes(word));
      const relevance = evaluateTenderRelevance({
        text: haystack,
        matchedKeywords,
        scanCategories: project.scan_categories,
        filterMode: project.filter_mode,
      });

      if (!matchedKeywords.length && relevance.score < relevance.thresholds.review) continue;

      foundCount += 1;
      const existing = await sb.get(`tender_results?project_id=eq.${encodeURIComponent(project.id)}&url=eq.${encodeURIComponent(item.url)}&select=id&limit=1`);
      const payload = {
        title: title || item.url,
        published_at: extractPublishedDate(haystack),
        matched_keywords: matchedKeywords,
        snippet: makeSnippet(haystack, matchedKeywords[0]),
        relevance_score: relevance.score,
        relevance_level: relevance.level,
        relevance_reasons: relevance.reasons,
      };

      if (existing?.[0]?.id) {
        await sb.patch(`tender_results?id=eq.${existing[0].id}`, {
          ...payload,
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } else {
        await sb.post("tender_results", {
          project_id: project.id,
          url: item.url,
          ...payload,
        });
        newCount += 1;
      }

      matches.push({ title: payload.title, url: item.url, matchedKeywords, relevance });
    }

    await sb.patch(`tender_scan_runs?id=eq.${run.id}`, {
      status: "success",
      checked_pages: pages.length,
      found_count: foundCount,
      new_count: newCount,
      finished_at: new Date().toISOString(),
    });
    await sb.patch(`tender_projects?id=eq.${project.id}`, {
      last_scanned_at: startedAt,
      last_scan_status: `成功：命中 ${foundCount} 筆，新發現 ${newCount} 筆`,
      updated_at: new Date().toISOString(),
    });

    return json({
      projectId: project.id,
      checkedPages: pages.length,
      foundCount,
      newCount,
      matches: matches.slice(0, 20),
    });
  } catch (error) {
    if (run?.id) {
      await sb.patch(`tender_scan_runs?id=eq.${run.id}`, {
        status: "failed",
        error_message: error.message || "掃描失敗",
        finished_at: new Date().toISOString(),
      }).catch(() => {});
    }
    if (project?.id) {
      await sb.patch(`tender_projects?id=eq.${project.id}`, {
        last_scanned_at: startedAt,
        last_scan_status: `失敗：${error.message || "掃描失敗"}`,
        updated_at: new Date().toISOString(),
      }).catch(() => {});
    }
    return json({ error: error.message || "掃描失敗" }, 500);
  }
}

function createSupabaseClient({ supabaseUrl, apiKey, authHeader }) {
  async function request(method, path, body) {
    const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
      method,
      headers: {
        apikey: apiKey,
        Authorization: authHeader,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) throw new Error(`Supabase ${method} ${path} 失敗：${response.status} ${await response.text()}`);
    if (response.status === 204) return null;
    return response.json();
  }

  return {
    get: (path) => request("GET", path),
    post: (path, body) => request("POST", path, body),
    patch: (path, body) => request("PATCH", path, body),
  };
}

function projectPageUrls(sourceUrl, pageLimit = 1) {
  if (!sourceUrl || sourceUrl.startsWith("active-search://")) throw new Error("此版本即時掃描需要指定監測網址。");
  const limit = Math.max(1, Math.min(Number(pageLimit) || 1, 10));
  const urls = [];
  for (let pageNo = 1; pageNo <= limit; pageNo += 1) {
    const url = new URL(sourceUrl);
    if (url.searchParams.has("pageNo") || limit > 1) url.searchParams.set("pageNo", String(pageNo));
    urls.push(url.toString());
  }
  return urls;
}

async function fetchHtml(url) {
  const response = await fetch(url, { headers: DEFAULT_HEADERS });
  if (!response.ok) throw new Error(`讀取公告頁失敗 ${response.status}: ${url}`);
  const buffer = await response.arrayBuffer();
  const contentType = response.headers.get("content-type") || "";
  const firstPass = new TextDecoder("utf-8").decode(buffer);
  const charset = (contentType.match(/charset=([^;]+)/i)?.[1] || firstPass.match(/charset=["']?([\w-]+)/i)?.[1] || "utf-8").toLowerCase();
  try {
    return new TextDecoder(charset === "big5" ? "big5" : charset).decode(buffer);
  } catch {
    return firstPass;
  }
}

function extractScanCandidates(html, baseUrl, maxLinks = 80) {
  const links = extractTenderLinks(html, baseUrl, maxLinks);
  if (links.length) return links.map((link) => ({ ...link, pageText: htmlToText(html).slice(0, 2000) }));

  const genericLinks = [];
  const pageText = htmlToText(html).slice(0, 2000);
  const pattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = pattern.exec(html)) && genericLinks.length < maxLinks) {
    const title = cleanText(htmlToText(match[2]));
    if (!title || title.length < 4) continue;
    if (!/(招標|採購|標案|公告|空調|冰水|通風|磁浮|投標|報價)/i.test(`${title} ${match[1]}`)) continue;
    genericLinks.push({
      title,
      url: new URL(decodeHtml(match[1]), baseUrl).toString(),
      pageText,
    });
  }
  return genericLinks;
}

function extractTenderLinks(html, baseUrl, maxLinks = 80) {
  const links = [];
  const pattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = pattern.exec(html)) && links.length < maxLinks) {
    const href = decodeHtml(match[1]);
    if (!/page_name=detail/i.test(href) && !/(detail|tender|bid|procurement)/i.test(href)) continue;
    const titleAttr = match[0].match(/\btitle=["']([^"']+)["']/i)?.[1];
    const title = cleanText(decodeHtml(titleAttr || htmlToText(match[2])));
    if (!title) continue;
    links.push({ title, url: new URL(href, baseUrl).toString() });
  }
  return links;
}

function evaluateTenderRelevance({ text = "", matchedKeywords = [], scanCategories = [], filterMode = "保守" }) {
  const categories = Array.isArray(scanCategories) && scanCategories.length ? scanCategories : DEFAULT_SCAN_CATEGORIES;
  const reasons = [];
  let score = matchedKeywords.length ? Math.min(40, matchedKeywords.length * 18) : 0;

  for (const id of categories) {
    const rule = CATEGORY_RULES[id];
    if (!rule) continue;
    const hits = rule.terms.filter((term) => text.includes(term));
    if (!hits.length) continue;
    score += rule.score;
    reasons.push(`${rule.label}: ${hits.slice(0, 3).join("、")}`);
  }

  score = Math.max(0, Math.min(100, score));
  const thresholds = FILTER_THRESHOLDS[filterMode] || FILTER_THRESHOLDS["保守"];
  const level = score >= thresholds.high ? "高相關" : score >= thresholds.review ? "待確認" : "低相關";
  return { score, level, reasons: reasons.slice(0, 5), thresholds };
}

function inferWordsFromProject(project = {}) {
  const queries = Array.isArray(project.search_queries) ? project.search_queries : [];
  return [...new Set(queries.flatMap((query) => String(query).split(/\s+/)).map((word) => word.trim()).filter((word) => word.length >= 2))];
}

function extractTitle(html = "") {
  return decodeHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "");
}

function looksLikeGenericTitle(title = "") {
  return /^(首頁|公告|查詢|列表|招標公告|採購公告)$/i.test(title.trim());
}

function extractPublishedDate(text = "") {
  const western = text.match(/(20\d{2})[./-](\d{1,2})[./-](\d{1,2})/);
  if (western) return normalizeDate(western[1], western[2], western[3]);
  const roc = text.match(/(?:民國)?(1\d{2})[./年-](\d{1,2})[./月-](\d{1,2})/);
  if (roc) return normalizeDate(String(Number(roc[1]) + 1911), roc[2], roc[3]);
  return null;
}

function normalizeDate(year, month, day) {
  const yyyy = String(year).padStart(4, "0");
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function makeSnippet(text = "", keyword = "") {
  const normalized = cleanText(text);
  if (!keyword) return normalized.slice(0, 160);
  const index = normalized.indexOf(keyword);
  if (index < 0) return normalized.slice(0, 160);
  return normalized.slice(Math.max(0, index - 60), index + 120);
}

function htmlToText(html = "") {
  return decodeHtml(String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " "));
}

function cleanText(value = "") {
  return String(value).replace(/\s+/g, " ").trim();
}

function decodeHtml(value = "") {
  return String(value)
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
