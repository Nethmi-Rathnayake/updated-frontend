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
