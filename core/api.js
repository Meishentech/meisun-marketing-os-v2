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
    const rows = await GET(`app_user_access?email=eq.${encodeURIComponent(email)}&select=email,display_name,role,is_active,must_change_password`);
    if (!rows?.length) return { allowed: false, role: "" };
    const row = rows[0];
    return {
      allowed: row.is_active !== false,
      displayName: row.display_name || "",
      role: row.role || "",
      mustChange: row.must_change_password === true,
    };
  } catch (error) {
    console.warn("app_user_access role read unavailable, retrying limited columns", error);
    try {
      const rows = await GET(`app_user_access?email=eq.${encodeURIComponent(email)}&select=email,display_name,is_active,must_change_password`);
      if (!rows?.length) return { allowed: false, role: "" };
      const row = rows[0];
      return {
        allowed: row.is_active !== false,
        displayName: row.display_name || "",
        role: "",
        mustChange: row.must_change_password === true,
      };
    } catch (fallbackError) {
      console.warn("app_user_access unavailable", fallbackError);
      return { allowed: true, role: "" };
    }
  }
}

function storeSession(data, email = "") {
  if (data.access_token) sessionStorage.setItem("ms_token", data.access_token);
  if (data.refresh_token) sessionStorage.setItem("ms_refresh", data.refresh_token);
  if (data.expires_in) sessionStorage.setItem("ms_expires", String(Date.now() + data.expires_in * 1000));
  if (email) sessionStorage.setItem("ms_email", email);
}

async function signInWithPassword(email, password) {
  const response = await fetch(`${SB}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.msg || "帳號或密碼錯誤");
  }

  storeSession(data, email);
  return data;
}

async function getCurrentUser() {
  const response = await fetch(`${SB}/auth/v1/user`, {
    headers: getHeaders(),
  });

  if (!response.ok) return null;
  return response.json();
}

async function refreshSession() {
  const refreshToken = sessionStorage.getItem("ms_refresh");
  if (!refreshToken) return false;

  const response = await fetch(`${SB}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { apikey: KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  const data = await response.json();
  if (!response.ok || !data.access_token) return false;
  storeSession(data);
  return true;
}

async function hasValidSession() {
  const token = getToken();
  if (!token) return false;

  const expiresAt = Number(sessionStorage.getItem("ms_expires") || 0);
  if (expiresAt && Date.now() > expiresAt - 60000) {
    return refreshSession();
  }

  return true;
}

async function signOut() {
  try {
    const token = getToken();
    if (token) {
      await fetch(`${SB}/auth/v1/logout`, {
        method: "POST",
        headers: { apikey: KEY, Authorization: `Bearer ${token}` },
      });
    }
  } catch (error) {
    console.warn("logout failed", error);
  }

  ["ms_token", "ms_refresh", "ms_expires", "ms_email", "ms_role"].forEach((key) => {
    sessionStorage.removeItem(key);
  });
}
