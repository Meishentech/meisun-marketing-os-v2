function getToken() {
  return sessionStorage.getItem("ms_token") || "";
}

function getHeaders(options = {}) {
  const { requireAuth = false, contentType = "application/json", prefer = "return=representation" } = options;
  const token = getToken();
  if (requireAuth && !token) {
    throw new Error("請先登入。");
  }

  const headers = {
    apikey: KEY,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (contentType) headers["Content-Type"] = contentType;
  if (prefer) headers.Prefer = prefer;
  return headers;
}

async function api(method, path, body) {
  const response = await fetch(`${SB}/rest/v1/${path}`, {
    method,
    headers: getHeaders({ requireAuth: true }),
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

async function getSignedUrl(bucket, path, expiresIn = 3600) {
  const response = await fetch(`${SB}/storage/v1/object/sign/${bucket}/${path}`, {
    method: "POST",
    headers: getHeaders({ requireAuth: true }),
    body: JSON.stringify({ expiresIn }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "無法取得檔案下載連結。");
  }

  const data = await response.json();
  if (!data.signedURL) throw new Error("無法取得檔案下載連結。");
  return `${SB}/storage/v1${data.signedURL}`;
}

function storageSafeFileName(name) {
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot) : "";
  const base = (dot >= 0 ? name.slice(0, dot) : name).replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${Date.now()}_${base}${ext}`;
}

async function uploadStorageFile(bucket, file) {
  const path = storageSafeFileName(file.name);
  const response = await fetch(`${SB}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: getHeaders({ requireAuth: true, contentType: file.type || "application/octet-stream", prefer: "" }),
    body: file,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "檔案上傳失敗。");
  }

  return path;
}

async function deleteStorageFile(bucket, path) {
  const response = await fetch(`${SB}/storage/v1/object/${bucket}/${path}`, {
    method: "DELETE",
    headers: getHeaders({ requireAuth: true, contentType: "", prefer: "" }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "檔案刪除失敗。");
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

function clearStoredSession() {
  ["ms_token", "ms_refresh", "ms_expires", "ms_email", "ms_role"].forEach((key) => {
    sessionStorage.removeItem(key);
  });
}

async function readAuthResponse(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (error) {
    return { msg: text };
  }
}

function authErrorMessage(data, fallback) {
  const raw = data.error_description || data.msg || data.message || "";
  const normalized = String(raw).toLowerCase();
  if (normalized.includes("rate limit")) {
    return "重設密碼信寄送太頻繁，請稍後再試；若急需登入，請聯絡管理員協助重設。";
  }
  return raw || fallback;
}

async function signInWithPassword(email, password) {
  const response = await fetch(`${SB}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await readAuthResponse(response);
  if (!response.ok || !data.access_token) {
    throw new Error(authErrorMessage(data, "帳號或密碼錯誤"));
  }

  storeSession(data, email);
  return data;
}

async function requestPasswordReset(email) {
  const response = await fetch(`${SB}/auth/v1/recover`, {
    method: "POST",
    headers: { apikey: KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      redirect_to: `${window.location.origin}${window.location.pathname}`,
    }),
  });

  const data = await readAuthResponse(response);
  if (!response.ok) {
    throw new Error(authErrorMessage(data, "無法寄出重設密碼信。"));
  }
  return data;
}

async function updateCurrentUserPassword(password) {
  const response = await fetch(`${SB}/auth/v1/user`, {
    method: "PUT",
    headers: getHeaders({ requireAuth: true }),
    body: JSON.stringify({ password }),
  });

  const data = await readAuthResponse(response);
  if (!response.ok) {
    throw new Error(authErrorMessage(data, "密碼更新失敗，請稍後再試。"));
  }
  return data;
}

async function markPasswordChanged(email) {
  return api("PATCH", `app_user_access?email=eq.${encodeURIComponent(email)}`, {
    must_change_password: false,
    updated_at: new Date().toISOString(),
  });
}

function applyRecoverySessionFromUrl() {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const accessToken = params.get("access_token");
  if (!accessToken) return false;

  storeSession({
    access_token: accessToken,
    refresh_token: params.get("refresh_token") || "",
    expires_in: Number(params.get("expires_in") || 3600),
  });
  window.history.replaceState(null, "", `${window.location.origin}${window.location.pathname}${window.location.search}`);
  return true;
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

  clearStoredSession();
}
