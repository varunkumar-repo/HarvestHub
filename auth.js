const AUTH_KEY = "fm_role";
const AUTH_TOKEN_KEY = "fm_token";
const AUTH_REFRESH_TOKEN_KEY = "fm_refresh_token";
const AUTH_EXPIRES_AT_KEY = "fm_expires_at";
const AUTH_USER_KEY = "fm_user";
const API_BASE = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  ? "http://localhost:5000/api"
  : "https://harvesthub-6qpo.onrender.com/api";


function setRole(role) {
  localStorage.setItem(AUTH_KEY, role);
}

function setSession(accessToken, user, refreshToken = "", expiresIn = 0) {
  if (accessToken) localStorage.setItem(AUTH_TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, refreshToken);
  if (expiresIn) localStorage.setItem(AUTH_EXPIRES_AT_KEY, `${Date.now() + Number(expiresIn) * 1000}`);
  if (user) localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  if (user?.role) setRole(user.role);
}

function getToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY) || "";
}

function getRefreshToken() {
  return localStorage.getItem(AUTH_REFRESH_TOKEN_KEY) || "";
}

function getExpiresAt() {
  return Number(localStorage.getItem(AUTH_EXPIRES_AT_KEY) || "0");
}

function isTokenExpired() {
  const expiresAt = getExpiresAt();
  if (!expiresAt) return false;
  return Date.now() >= (expiresAt - 5000);
}

function getUser() {
  const raw = localStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getRole() {
  return localStorage.getItem(AUTH_KEY) || getUser()?.role || null;
}

function clearRole() {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
  localStorage.removeItem(AUTH_EXPIRES_AT_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

function loginPageForCurrentContext() {
  const path = (window.location.pathname || "").toLowerCase();
  if (path.includes("admin")) return "admin-login.html";
  return "customer-login.html";
}

function redirectToLoginWithReason() {
  const target = loginPageForCurrentContext();
  if (window.location.pathname.toLowerCase().endsWith(target.toLowerCase())) return;
  window.location.href = target;
}

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken })
    });
    const payload = await response.json();
    if (!response.ok || !payload?.accessToken) return false;
    setSession(payload.accessToken, payload.user || getUser(), "", payload.expiresIn || 900);
    return true;
  } catch {
    return false;
  }
}

async function logoutSession() {
  const refreshToken = getRefreshToken();
  try {
    if (refreshToken) {
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken })
      });
    }
  } catch {
    // ignore network errors on logout
  }
  clearRole();
}

async function apiFetch(path, options = {}) {
  if (getToken() && isTokenExpired()) {
    const ok = await refreshAccessToken();
    if (!ok) {
      clearRole();
      redirectToLoginWithReason();
      throw new Error("Session expired. Please login again.");
    }
  }

  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  let payload = null;

  if (response.status === 401 && getRefreshToken()) {
    const ok = await refreshAccessToken();
    if (ok) {
      const retryHeaders = {
        ...headers,
        Authorization: `Bearer ${getToken()}`
      };
      response = await fetch(`${API_BASE}${path}`, { ...options, headers: retryHeaders });
    }
  }

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok) {
    if (response.status === 401) {
      clearRole();
      redirectToLoginWithReason();
    }
    const detail = payload?.error ? `${payload.message} ${payload.error}` : payload?.message;
    throw new Error(detail || `Request failed (${response.status})`);
  }
  return payload;
}

function requireRole(role, fallback) {
  if (getRole() !== role) {
    window.location.href = fallback;
  }
}
