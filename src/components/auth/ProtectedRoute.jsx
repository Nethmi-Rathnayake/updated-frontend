import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { TOKENS, PAGE_BG, APP_FONT, Icon, ICONS, Spinner } from "../common/DashboardUI";

// Gate for back-office routes.
//   - Not authenticated        -> redirect to /admin/login (remembering where
//                                  they were headed so login can return there).
//   - Authenticated but missing `permission` (if given) -> "no access" screen.
//   - `requireSuperAdmin` set but the user isn't Super Admin -> "no access".
//   - Still re-hydrating a stored token -> brief spinner (avoids a flash of the
//     login page on refresh).
export default function ProtectedRoute({ permission, requireSuperAdmin, children }) {
  const { isAuthenticated, loading, can, isSuperAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${PAGE_BG}`} style={{ fontFamily: APP_FONT }}>
        <Spinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  if ((requireSuperAdmin && !isSuperAdmin) || (permission && !can(permission))) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${PAGE_BG} px-4`} style={{ fontFamily: APP_FONT }}>
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-red-50">
            <Icon path={ICONS.shield} className="w-8 h-8 text-red-500" stroke="#ef4444" width={1.8} />
          </div>
          <h2 className="text-xl font-bold mb-1" style={{ color: TOKENS.NAVY }}>
            Access Denied
          </h2>
          <p className="text-sm text-gray-500">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return children;
}
