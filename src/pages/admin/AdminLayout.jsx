import React, { useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import logo from "../../assets/usjp-logo__1_-removebg-preview.png";
import { useAuth } from "../../hooks/useAuth";
import { TOKENS, PAGE_BG, APP_FONT, Icon, ICONS, Avatar } from "../../components/common/DashboardUI";

// Nav items for the back-office. Each is gated by a permission; Super Admin sees
// everything (can() bypasses). Items the operator lacks permission for are
// hidden. Roles & Permissions management is a planned follow-up — its entry is
// intentionally omitted until that page exists.
const NAV = [
  { to: "/admin", label: "Dashboard", permission: null, end: true, icon: ICONS.dashboard },
  { to: "/admin/users", label: "System Users", permission: "view_system_users", icon: ICONS.users },
];

export default function AdminLayout() {
  const { user, role, can, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const items = NAV.filter((item) => can(item.permission));

  // Current page title for the header (longest matching path wins so /admin/users
  // beats /admin).
  const current =
    [...NAV].sort((a, b) => b.to.length - a.to.length).find((n) =>
      n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)
    ) || NAV[0];

  const handleLogout = async () => {
    await logout();
    toast.success("Signed out.");
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className={`min-h-screen flex overflow-x-hidden ${PAGE_BG} m-0`} style={{ fontFamily: APP_FONT }}>
      {/* ══ SIDEBAR ══ */}
      <aside
        className={`fixed lg:static z-40 inset-y-0 left-0 w-64 flex flex-col transition-transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        style={{ background: `linear-gradient(180deg, ${TOKENS.SIDEBAR_TOP} 0%, ${TOKENS.SIDEBAR_BOTTOM} 100%)` }}
      >
        <div className="flex items-center gap-3 px-5 h-16 border-b border-white/10">
          <div className="w-9 h-9 rounded-full flex items-center justify-center bg-white">
            <img src={logo} alt="USJ" className="w-7 h-7 object-contain" />
          </div>
          <div className="leading-tight">
            <p className="text-white font-bold text-sm">USJ SPORTS</p>
            <p className="text-[10px] text-blue-200">Admin Portal</p>
          </div>
        </div>

        {/* Operator card */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
          <Avatar name={user?.name} size={40} />
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate">{user?.name}</p>
            <p className="text-[11px] truncate text-blue-200">{role}</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={({ isActive }) => ({
                backgroundColor: isActive ? "rgba(255,255,255,0.18)" : "transparent",
                color: isActive ? "#fff" : "rgba(255,255,255,0.75)",
              })}
            >
              <Icon path={item.icon} className="w-5 h-5 flex-shrink-0" width={1.8} />
              <span className="flex-1 text-left">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors"
            style={{ backgroundColor: "rgba(239,68,68,0.15)", color: "#fca5a5" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#ef4444";
              e.currentTarget.style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.15)";
              e.currentTarget.style.color = "#fca5a5";
            }}
          >
            <Icon path={ICONS.logout} className="w-5 h-5" width={1.8} />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* ══ MAIN ══ */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="bg-white/80 backdrop-blur h-16 flex items-center justify-between px-4 sm:px-6 shadow-sm sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button className="lg:hidden text-gray-600" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
              <Icon path={ICONS.menu} stroke={TOKENS.NAVY} width={2} />
            </button>
            <div className="min-w-0">
              <h1 className="font-bold text-base sm:text-lg truncate" style={{ color: TOKENS.NAVY }}>
                {current.label}
              </h1>
              <p className="text-xs text-gray-400 truncate">Welcome back, {user?.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-right leading-tight hidden sm:block">
              <p className="text-sm font-semibold truncate max-w-[160px]" style={{ color: TOKENS.NAVY }}>
                {user?.name}
              </p>
              <p className="text-[11px] text-gray-400">{role}</p>
            </div>
            <Avatar name={user?.name} size={36} />
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-8 lg:px-12 py-6 sm:py-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
