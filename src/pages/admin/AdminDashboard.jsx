import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { listSystemUsers } from "../../services/systemUserService";
import { listRoles } from "../../services/systemRoleService";
import { TOKENS, Icon, ICONS, StatCard } from "../../components/common/DashboardUI";

// Back-office landing page. Shows a welcome header and overview cards. Each
// card's data is only fetched if the operator has permission to see it, so the
// dashboard degrades gracefully for limited roles. Visual language matches the
// member dashboards (stat cards, rounded-2xl white cards, blue accents).
export default function AdminDashboard() {
  const { user, role, permissions, can } = useAuth();

  const [userCount, setUserCount] = useState(null);
  const [activeCount, setActiveCount] = useState(null);
  const [roleCount, setRoleCount] = useState(null);

  useEffect(() => {
    if (can("view_system_users")) {
      listSystemUsers()
        .then((users) => {
          setUserCount(users.length);
          setActiveCount(users.filter((u) => u.is_active).length);
        })
        .catch(() => {});
    }
    if (can("view_roles")) {
      listRoles()
        .then((roles) => setRoleCount(roles.length))
        .catch(() => {});
    }
  }, [can]);

  const cards = [
    { show: can("view_system_users"), label: "System Users", value: userCount, to: "/admin/users", icon: ICONS.users, accent: TOKENS.PRIMARY },
    { show: can("view_system_users"), label: "Active Users", value: activeCount, to: "/admin/users", icon: ICONS.userCheck, accent: "#16a34a" },
    { show: can("view_roles"), label: "Roles", value: roleCount, to: null, icon: ICONS.roles, accent: "#7c3aed" },
  ].filter((c) => c.show);

  return (
    <div className="max-w-5xl">
      {/* Welcome card */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <div className="flex items-start gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${TOKENS.PRIMARY_DARK}, ${TOKENS.PRIMARY})` }}
          >
            <Icon path={ICONS.shield} className="w-7 h-7" stroke="#fff" width={1.8} />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold" style={{ color: TOKENS.NAVY }}>
              Welcome, {user?.name?.split(" ")[0] || "Operator"}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Signed in as <span className="font-semibold text-gray-700">{role}</span> ·{" "}
              {permissions.length} permission{permissions.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      </div>

      {cards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {cards.map((card) => {
            const inner = <StatCard label={card.label} value={card.value} icon={card.icon} accent={card.accent} />;
            return card.to ? (
              <Link key={card.label} to={card.to} className="block hover:opacity-90 transition">
                {inner}
              </Link>
            ) : (
              <div key={card.label}>{inner}</div>
            );
          })}
        </div>
      )}

      {can("view_system_users") && (
        <Link to="/admin/users" className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition shadow-sm hover:shadow-md">
          Manage System Users
          <Icon path={ICONS.arrowRight} className="w-4 h-4" width={2} />
        </Link>
      )}
    </div>
  );
}
