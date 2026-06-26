import api, { setAdminToken, clearAdminToken } from "./api";

// Back-office "system user" auth (RBAC). Separate from the member OTP flow:
// this is a password login that returns a Sanctum bearer token.
//   POST /api/system/login   { email, password } -> { token, user }
//   GET  /api/system/me                          -> { user }
//   POST /api/system/logout

// Logs in and persists the bearer token so subsequent /api/system/* calls are
// authenticated. Returns the user object (id, name, email, role{id,name},
// permissions[], is_active, last_login_at).
export const systemLogin = async (email, password) => {
  const { data } = await api.post("/api/system/login", { email, password });
  if (data?.token) setAdminToken(data.token);
  return data.user;
};

// Re-fetches the current system user from the stored token (used to re-hydrate
// auth state on a page refresh). Throws on 401 if the token is invalid/expired.
export const systemMe = async () => {
  const { data } = await api.get("/api/system/me");
  return data.user;
};

// Logs out server-side (revokes the current token) and clears local storage.
// We clear locally even if the network call fails so the UI always logs out.
export const systemLogout = async () => {
  try {
    await api.post("/api/system/logout");
  } finally {
    clearAdminToken();
  }
};
