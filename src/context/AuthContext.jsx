import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { systemLogin, systemMe, systemLogout } from "../services/systemAuthService";
import { getAdminToken, clearAdminToken } from "../services/api";

// Auth state for the back-office (system-user / RBAC) area only. The public
// member flow is OTP/session-based and does NOT use this context.
//
// Shape held here:
//   user        -> { id, name, email, role:{id,name}, permissions:[], is_active }
//   permissions -> string[] of permission names granted to the user's role
//   role        -> the user's role name ("Super Admin", "Admin", ...)
//   loading     -> true while we re-hydrate from a stored token on first load
//
// Security note: this gates the UI for usability only. The backend re-checks
// every permission on every request — it is the real authority.

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Only spend a loading cycle if there's a token worth validating.
  const [loading, setLoading] = useState(() => Boolean(getAdminToken()));

  // On mount, if a token is present, validate it and hydrate the user. A dead
  // token throws (401) — the api interceptor clears it; we just drop the user.
  useEffect(() => {
    let active = true;
    if (!getAdminToken()) {
      setLoading(false);
      return;
    }
    systemMe()
      .then((u) => active && setUser(u))
      .catch(() => {
        clearAdminToken();
        if (active) setUser(null);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const u = await systemLogin(email, password);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    await systemLogout();
    setUser(null);
  }, []);

  const permissions = useMemo(() => user?.permissions ?? [], [user]);
  const role = user?.role?.name ?? null;

  // Permission check used to gate UI. Super Admin always passes (mirrors the
  // backend bypass), so newly added permissions not yet in its set still work.
  const can = useCallback(
    (permission) => {
      if (!user) return false;
      if (role === "Super Admin") return true;
      if (!permission) return true;
      return permissions.includes(permission);
    },
    [user, role, permissions]
  );

  const value = useMemo(
    () => ({
      user,
      role,
      permissions,
      loading,
      isAuthenticated: Boolean(user),
      isSuperAdmin: role === "Super Admin",
      login,
      logout,
      can,
    }),
    [user, role, permissions, loading, login, logout, can]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Internal hook; re-exported from hooks/useAuth.js for the conventional import.
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an <AuthProvider>");
  return ctx;
}

export default AuthContext;
