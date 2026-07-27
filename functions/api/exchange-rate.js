const CBC_DAILY_RATE_URL = "https://cpx.cbc.gov.tw/api/OpenData/BP01D01_GetData?period=Day";
const FALLBACK_RATE_URL = "https://open.er-api.com/v6/latest/CNY";

export async function onRequest({ request }) {
  if (request.method === "OPTIONS") return json({}, 204);
  if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);

  const authHeader = request.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "請先登入平台後再抓取匯率。" }, 401);

  try {
    const official = await fetchCbcCnyTwdRate();
    if (official) return json(official);
  } catch (error) {
    console.warn("CBC exchange rate unavailable", error);
  }

  try {
    const fallback = await fetchFallbackCnyTwdRate();
    return json(fallback);
  } catch (error) {
    return json({ error: error.message || "目前無法取得匯率。" }, 502);
  }
}

async function fetchCbcCnyTwdRate() {
  const response = await fetch(CBC_DAILY_RATE_URL, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`央行匯率資料讀取失敗：${response.status}`);

  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error("央行匯率資料格式不符。");

  for (const row of rows.slice().reverse()) {
    const ntdPerUsd = pickNumeric(row, ["NTD/USD", "新台幣", "台幣", "NTD"]);
    const cnyValue = pickNumeric(row, ["CNY/USD", "人民幣", "CNY", "RMB"]);
    if (!ntdPerUsd || !cnyValue) continue;

    const cnyToTwd = cnyValue > 1 ? ntdPerUsd / cnyValue : ntdPerUsd * cnyValue;
    if (!Number.isFinite(cnyToTwd) || cnyToTwd <= 0) continue;

    return {
      base: "CNY",
      target: "TWD",
      rate: Number(cnyToTwd.toFixed(4)),
      source: "中央銀行開放資料",
      sourceUrl: CBC_DAILY_RATE_URL,
      rateDate: pickDate(row),
      note: "以最近一筆央行日資料換算；若遇非營業日，通常為前一營業日。",
    };
  }

  return null;
}

async function fetchFallbackCnyTwdRate() {
  const response = await fetch(FALLBACK_RATE_URL, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`備援匯率資料讀取失敗：${response.status}`);

  const data = await response.json();
  const rate = Number(data?.rates?.TWD);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error("備援匯率資料格式不符。");

  return {
    base: "CNY",
    target: "TWD",
    rate: Number(rate.toFixed(4)),
    source: "Open Exchange Rate API 備援",
    sourceUrl: FALLBACK_RATE_URL,
    rateDate: data.time_last_update_utc || "",
    note: "央行資料暫時無法讀取時使用備援公開匯率。",
  };
}

function pickNumeric(row = {}, preferredKeys = []) {
  const entries = Object.entries(row);
  for (const preferred of preferredKeys) {
    const normalizedPreferred = normalizeKey(preferred);
    const match = entries.find(([key]) => normalizeKey(key).includes(normalizedPreferred));
    const value = numericValue(match?.[1]);
    if (value) return value;
  }
  return null;
}

function pickDate(row = {}) {
  const entries = Object.entries(row);
  const match = entries.find(([key]) => /date|日期|年月日|資料期間/i.test(String(key)));
  return match?.[1] ? String(match[1]) : "";
}

function numericValue(value) {
  const parsed = Number(String(value ?? "").replace(/,/g, "").trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizeKey(key = "") {
  return String(key).replace(/\s+/g, "").toUpperCase();
}

function json(body, status = 200) {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=1800",
    },
  });
}
