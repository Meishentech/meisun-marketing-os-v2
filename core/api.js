function getToken() {
  return sessionStorage.getItem("ms_token") || "";
}

function getHeaders() {
  const token = getToken();
  return {
    apikey: KEY,
    Authorization: `Bearer ${token || KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
}

async function api(method, path, body) {
  const response = await fetch(`${SB}/rest/v1/${path}`, {
    method,
    headers: getHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Supabase request failed: ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

const GET = (path) => api("GET", path);

async function safeGET(path, fallback = []) {
  try {
    return await GET(path);
  } catch (error) {
    console.warn("Supabase read fallback", path, error);
    return fallback;
  }
}

async function loadUserAccess(email) {
  try {
    const rows = await GET(`app_user_access?email=eq.${encodeURIComponent(email)}&select=email,role,is_active,must_change_password`);
    if (!rows?.length) return { allowed: false, role: "" };
    const row = rows[0];
    return {
      allowed: row.is_active !== false,
      role: row.role || "",
      mustChange: row.must_change_password === true,
    };
  } catch (error) {
    console.warn("app_user_access unavailable", error);
    return { allowed: true, role: "" };
  }
}
