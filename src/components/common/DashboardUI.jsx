import React from "react";

// Shared dashboard design system — the same visual language used across the
// member-facing dashboards (see CoachDashboard). Centralised here so the
// back-office (admin) pages reuse one source of truth instead of duplicating
// colours/classes. Tokens and primitives match the member dashboards exactly.

// ── Design tokens (member palette) ──────────────────────────────────────────
export const TOKENS = {
  PRIMARY: "#1d4ed8", // blue-700 — accents, primary actions
  PRIMARY_DARK: "#1e3a8a", // blue-900 — icon-chip gradients
  SIDEBAR_TOP: "#172554", // blue-950 — sidebar gradient top
  SIDEBAR_BOTTOM: "#1e3a8a", // blue-900 — sidebar gradient bottom
  NAVY: "#0f1c3f", // headings
  LIGHT: "#e8f0fe", // icon chip / soft accent background
};

// Page gradient + font used by the in-app (logged-in) screens.
export const PAGE_BG = "bg-gradient-to-br from-blue-50 via-white to-blue-100";
export const APP_FONT = "Inter, system-ui, sans-serif";

// Shared form-control classes (large, rounded, blue focus ring).
export const inputClass =
  "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition";

export const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";

// Primary / secondary button class strings (consistent with the member pages).
export const btnPrimary =
  "inline-flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-sm px-4 py-2.5 transition shadow-sm hover:shadow-md";

export const btnSecondary =
  "inline-flex items-center justify-center gap-2 border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold rounded-lg text-sm px-4 py-2.5 transition";

// ── Icon (multi-path supported via "|" separator) ───────────────────────────
export const Icon = ({ path, className = "w-5 h-5", stroke = "currentColor", width = 1.8 }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke={stroke}>
    {path.split("|").map((d, i) => (
      <path key={i} strokeLinecap="round" strokeLinejoin="round" strokeWidth={width} d={d} />
    ))}
  </svg>
);

export const ICONS = {
  dashboard:
    "M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z",
  users:
    "M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4z",
  userCheck: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM6 21v-2a4 4 0 014-4h1m6 3l2 2 4-4",
  roles:
    "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
  key: "M15 7a2 2 0 012 2m4-2a6 6 0 01-7.743 5.743L11 14H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z",
  logout:
    "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
  menu: "M4 6h16M4 12h16M4 18h16",
  chevron: "M19 9l-7 7-7-7",
  plus: "M12 4v16m8-8H4",
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  edit: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
  user: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  x: "M6 18L18 6M6 6l12 12",
  check: "M5 13l4 4L19 7",
  shield: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  arrowRight: "M9 5l7 7-7 7",
};

// ── Status pill (same colour logic as the member dashboards) ────────────────
export const statusColor = (status) => {
  const s = String(status || "").toLowerCase();
  if (s.includes("active") || s.includes("paid") || s.includes("issued") || s.includes("approved") || s.includes("complete"))
    return { bg: "#dcfce7", color: "#15803d" };
  if (s.includes("pending") || s.includes("await") || s.includes("inactive")) return { bg: "#fef3c7", color: "#b45309" };
  if (s.includes("reject") || s.includes("fail") || s.includes("refund") || s.includes("deactiv")) return { bg: "#fee2e2", color: "#b91c1c" };
  return { bg: "#e5e7eb", color: "#4b5563" };
};

export const Pill = ({ children }) => {
  const c = statusColor(children);
  return (
    <span
      className="text-xs font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap"
      style={{ backgroundColor: c.bg, color: c.color }}
    >
      {children || "—"}
    </span>
  );
};

// ── Avatar (photo or initials) ──────────────────────────────────────────────
export const Avatar = ({ name, url, size = 40 }) => {
  const initials = String(name || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return url ? (
    <img src={url} alt={name} className="rounded-full object-cover flex-shrink-0" style={{ width: size, height: size }} />
  ) : (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white"
      style={{ width: size, height: size, backgroundColor: TOKENS.PRIMARY, fontSize: size * 0.36 }}
    >
      {initials}
    </div>
  );
};

// ── Stat card ───────────────────────────────────────────────────────────────
export const StatCard = ({ label, value, icon, accent = TOKENS.PRIMARY }) => (
  <div className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4">
    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: TOKENS.LIGHT }}>
      <Icon path={icon} className="w-6 h-6" stroke={accent} width={2} />
    </div>
    <div className="min-w-0">
      <p className="font-extrabold truncate text-2xl" style={{ color: TOKENS.NAVY }}>
        {value == null ? "—" : value}
      </p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  </div>
);

// ── Empty state ─────────────────────────────────────────────────────────────
export const EmptyState = ({ icon, text }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: TOKENS.LIGHT }}>
      <Icon path={icon} className="w-7 h-7" stroke={TOKENS.PRIMARY} width={1.6} />
    </div>
    <p className="text-sm text-gray-400">{text}</p>
  </div>
);

// ── Spinner ─────────────────────────────────────────────────────────────────
export const Spinner = ({ className = "w-8 h-8 text-blue-600" }) => (
  <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
  </svg>
);
