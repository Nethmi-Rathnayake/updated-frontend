import axios from "axios";

// Base origin of the Laravel backend (also where uploaded files are served).
export const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000";

// Central axios instance for talking to the Laravel backend.
// withCredentials is REQUIRED: the OTP -> registration flow relies on the
// Laravel session cookie, which only travels when credentials are enabled
// (and the backend has CORS supports_credentials=true).
const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    Accept: "application/json",
  },
});

// ── System-user (admin/RBAC) bearer token ──────────────────────────────────
// The public/member flow rides the Laravel session cookie (withCredentials).
// The separate back-office "system user" API is token-based (Sanctum): login
// returns a personal access token we store here and send as a Bearer header.
// Attaching it on every request is harmless for the session routes (they ignore
// the header) and required for the /api/system/* routes.
//
// The token lives in sessionStorage, NOT localStorage: it must survive an
// in-tab refresh (so an authenticated operator isn't logged out on reload), but
// it MUST NOT persist across browser sessions. Persisting it would silently
// re-authenticate on the next visit and bounce the user past the login page
// without entering credentials — admin access must require an explicit login.
const TOKEN_KEY = "sfmis_admin_token";

// One-time migration: remove any token left in localStorage by older builds so
// a stale persisted session can't auto-authenticate.
try {
  localStorage.removeItem(TOKEN_KEY);
} catch {
  /* storage unavailable — nothing to migrate */
}

export const getAdminToken = () => {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setAdminToken = (token) => {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable (private mode) — token stays in memory only */
  }
};

export const clearAdminToken = () => setAdminToken(null);

// Attach the Bearer token when present.
api.interceptors.request.use((config) => {
  const token = getAdminToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On a 401 from a system route, the token is dead/expired: drop it and bounce
// to the admin login (unless we're already mid-login, which surfaces its own
// "invalid credentials" message). Public routes are left untouched.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || "";
    const isSystemRoute = url.includes("/api/system/");
    const isLogin = url.includes("/api/system/login");

    if (status === 401 && isSystemRoute && !isLogin) {
      clearAdminToken();
      if (!window.location.pathname.startsWith("/admin/login")) {
        window.location.assign("/admin/login");
      }
    }
    return Promise.reject(error);
  }
);

// Build an absolute URL to a file in the backend's public storage.
// The backend's asset() helper embeds its configured APP_URL host, which can
// differ from the origin the SPA actually talks to (e.g. a LAN IP vs.
// localhost) — that mismatch makes <img> requests fail. We always re-point the
// path at API_BASE so photos load wherever the frontend is served from.
// Accepts either a stored relative path ("photos/x.jpg") or a full URL.
export const storageUrl = (pathOrUrl) => {
  if (!pathOrUrl) return null;
  const s = String(pathOrUrl);
  if (/^https?:\/\//i.test(s)) {
    const idx = s.indexOf("/storage/");
    return idx >= 0 ? `${API_BASE}${s.slice(idx)}` : s;
  }
  return `${API_BASE}/storage/${s.replace(/^\/+/, "")}`;
};

export default api;
