import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import logo from "../../assets/usjp-logo__1_-removebg-preview.png";
import {
  getFacilities,
  getFacilityAvailability,
  getClub,
  getAttendances,
} from "../../services/coachService";
import { getMemberPayments, updateMember } from "../../services/memberService";
import { getMemberMe, memberLogout } from "../../services/authService";
import { storageUrl } from "../../services/api";

// Shared dashboard for the two self-booking member roles:
//   • variant="club"        → Club Student (also gets a "My Club" tab)
//   • variant="independent" → Independent member
// Both can book facilities and review their own attendance, payments and
// profile. Wrapped by StudentDashboard / IndependentDashboard.

// ── Design tokens — shared with the LoginPage / CoachDashboard blue family ──
const PRIMARY = "#1d4ed8"; // blue-700
const PRIMARY_DARK = "#1e3a8a"; // blue-900
const NAVY = "#0f1c3f";
const LIGHT = "#e8f0fe";
const SIDEBAR_TOP = "#172554"; // blue-950
const SIDEBAR_BOTTOM = "#1e3a8a"; // blue-900

const todayStr = () => new Date().toISOString().slice(0, 10);

const buildName = (initials, denoted, lastname) => {
  const lead = String(initials || denoted || "").trim();
  const tail = String(lastname || "").trim();
  return [lead, tail].filter(Boolean).join(" ") || "Member";
};

const fmtDate = (v) => {
  if (!v) return "—";
  const s = String(v);
  return s.length >= 10 ? s.slice(0, 10) : s;
};

const fmtDateTime = (v) => {
  if (!v) return "—";
  const s = String(v).replace("T", " ");
  return s.length >= 16 ? s.slice(0, 16) : s;
};

const money = (v) =>
  v == null || v === "" ? "—" : `LKR ${Number(v).toLocaleString("en-LK", { minimumFractionDigits: 2 })}`;

const Icon = ({ path, className = "w-5 h-5", stroke = "currentColor", width = 1.8 }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke={stroke}>
    {path.split("|").map((d, i) => (
      <path key={i} strokeLinecap="round" strokeLinejoin="round" strokeWidth={width} d={d} />
    ))}
  </svg>
);

const ICONS = {
  dashboard: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  book: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  attendance: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7l2 2 4-4",
  payments: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
  club: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2M5 21H3m4-14h.01M11 7h.01M15 7h.01M7 11h.01M11 11h.01M15 11h.01M7 15h.01M11 15h.01M15 15h.01",
  profile: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  edit: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
  logout: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
  refresh: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
  clock: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  check: "M5 13l4 4L19 7",
  card: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
  bell: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
};

const statusColor = (status) => {
  const s = String(status || "").toLowerCase();
  if (s.includes("active") || s.includes("paid") || s.includes("issued") || s.includes("approved") || s.includes("complete"))
    return { bg: "#dcfce7", color: "#15803d" };
  if (s.includes("pending") || s.includes("await") || s.includes("verification") || s.includes("print"))
    return { bg: "#fef3c7", color: "#b45309" };
  if (s.includes("reject") || s.includes("fail") || s.includes("refund")) return { bg: "#fee2e2", color: "#b91c1c" };
  return { bg: "#e5e7eb", color: "#4b5563" };
};

const Pill = ({ children }) => {
  const c = statusColor(children);
  return (
    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap" style={{ backgroundColor: c.bg, color: c.color }}>
      {children || "—"}
    </span>
  );
};

const Avatar = ({ name, url, size = 40 }) => {
  const initials = String(name || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return url ? (
    <img src={url} alt={name} className="rounded-full object-cover flex-shrink-0" style={{ width: size, height: size }} />
  ) : (
    <div className="rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white" style={{ width: size, height: size, backgroundColor: PRIMARY, fontSize: size * 0.36 }}>
      {initials}
    </div>
  );
};

export default function MemberDashboard({ variant = "independent" }) {
  const navigate = useNavigate();
  const location = useLocation();

  const isClub = variant === "club";
  const STORAGE_KEY = "sfmis_member";
  const portalLabel = isClub ? "Student Portal" : "Independent Portal";

  // Resolve the logged-in member from navigation state or the session fallback.
  const [member, setMember] = useState(() => {
    const fromState = location.state?.member;
    if (fromState) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(fromState));
      return fromState;
    }
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
    } catch {
      return null;
    }
  });

  const memberName = member ? buildName(member.initials, member.name_denoted_by_initials, member.lastname) : "";
  const photoUrl = storageUrl(member?.photo_path) || member?.photo_url || null;

  const [active, setActive] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [club, setClub] = useState(null);
  const [facilities, setFacilities] = useState([]);
  const [attendances, setAttendances] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Book Facility state
  const [selectedFacilityId, setSelectedFacilityId] = useState(null);
  const [bookDate, setBookDate] = useState(todayStr());
  const [availability, setAvailability] = useState(null);
  const [availLoading, setAvailLoading] = useState(false);

  // Profile editing — members may update their address and phone numbers.
  // Held at the top level so the inline ProfileView keeps its state across
  // re-renders. Maps to PUT /api/members/{id} (partial update).
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    primary_phone: "",
    secondary_phone: "",
    address: "",
  });
  const [profileErrors, setProfileErrors] = useState({});

  // Matches the backend rules: primary must be a mobile (07X XXXXXXX);
  // secondary is any 9-digit local number (optional).
  const isValidPrimaryPhone = (p) => /^(?:0|94|\+94)?7\d{8}$/.test(String(p).replace(/\s/g, ""));
  const isValidSecondaryPhone = (p) => /^(?:0|94|\+94)?\d{9}$/.test(String(p).replace(/\s/g, ""));

  const startEditProfile = () => {
    setProfileForm({
      primary_phone: member.primary_phone_number || "",
      secondary_phone: member.secondary_phone_number || "",
      address: member.address || "",
    });
    setProfileErrors({});
    setEditingProfile(true);
  };

  const cancelEditProfile = () => {
    setEditingProfile(false);
    setProfileErrors({});
  };

  const saveProfile = async () => {
    const errs = {};
    if (!profileForm.primary_phone.trim()) errs.primary_phone = "Primary phone is required.";
    else if (!isValidPrimaryPhone(profileForm.primary_phone))
      errs.primary_phone = "Enter a valid mobile number (e.g. 071 234 5678).";
    if (profileForm.secondary_phone && !isValidSecondaryPhone(profileForm.secondary_phone))
      errs.secondary_phone = "Enter a valid phone number or leave it empty.";
    if (!profileForm.address.trim()) errs.address = "Address is required.";
    if (Object.keys(errs).length) {
      setProfileErrors(errs);
      return;
    }

    setSavingProfile(true);
    try {
      const fd = new FormData();
      fd.append("primary_phone", profileForm.primary_phone.trim());
      fd.append("secondary_phone", profileForm.secondary_phone.trim());
      fd.append("address", profileForm.address.trim());
      const updated = await updateMember(member.id, fd);
      setMember((prev) => {
        const merged = { ...prev, ...updated };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        return merged;
      });
      setEditingProfile(false);
      toast.success("Profile updated.");
    } catch (err) {
      const data = err?.response?.data;
      const firstError = data?.errors ? Object.values(data.errors)[0]?.[0] : null;
      toast.error(firstError || data?.message || "Could not update your details.");
    } finally {
      setSavingProfile(false);
    }
  };

  useEffect(() => {
    if (!member) navigate("/login", { replace: true });
  }, [member, navigate]);

  // The /verify-otp payload omits the photo (and some fields) — enrich once from
  // the member's own record. /api/member/me works with the member token; the
  // admin /members/{id} endpoint does not.
  useEffect(() => {
    if (!member?.id || member.photo_path) return;
    let on = true;
    getMemberMe()
      .then((full) => {
        if (on && full) {
          setMember((prev) => {
            const merged = { ...prev, ...full };
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            return merged;
          });
        }
      })
      .catch(() => {});
    return () => {
      on = false;
    };
  }, [member?.id, member?.photo_path]);

  // Initial load — facilities, my attendance, my payments, my club (club only).
  // NOTE: attendance and payments are served only by admin-permission endpoints;
  // a member token can't reach them, so those settle as empty here (the sections
  // degrade to their empty state rather than erroring). This needs a member-
  // facing backend endpoint to populate.
  useEffect(() => {
    if (!member?.id) return;
    let on = true;
    (async () => {
      setLoading(true);
      const [facs, atts, pays, clb] = await Promise.allSettled([
        getFacilities(),
        getAttendances({ member_id: member.id }),
        getMemberPayments(member.id),
        isClub && member.club_id ? getClub(member.club_id) : Promise.resolve(null),
      ]);
      if (!on) return;
      const facList = facs.status === "fulfilled" ? facs.value : [];
      setFacilities(facList);
      if (facList.length) setSelectedFacilityId((id) => id ?? facList[0].id);
      setAttendances(atts.status === "fulfilled" && Array.isArray(atts.value) ? atts.value : []);
      setPayments(pays.status === "fulfilled" ? pays.value : []);
      setClub(clb.status === "fulfilled" ? clb.value : null);
      setLoading(false);
    })();
    return () => {
      on = false;
    };
  }, [member?.id, member?.club_id, isClub]);

  // Availability when the Book Facility tab is open with a selection.
  useEffect(() => {
    if (active !== "book" || !selectedFacilityId) return;
    let on = true;
    setAvailLoading(true);
    getFacilityAvailability(selectedFacilityId, bookDate)
      .then((data) => on && setAvailability(data))
      .catch(() => {
        if (on) {
          setAvailability(null);
          toast.error("Could not load availability.");
        }
      })
      .finally(() => on && setAvailLoading(false));
    return () => {
      on = false;
    };
  }, [active, selectedFacilityId, bookDate]);

  const handleLogout = () => {
    memberLogout();
    sessionStorage.removeItem(STORAGE_KEY);
    navigate("/", { replace: true });
  };

  const handleRefresh = useCallback(async () => {
    if (!member?.id || refreshing) return;
    setRefreshing(true);
    const tasks = [
      getFacilities().then(setFacilities).catch(() => {}),
      getAttendances({ member_id: member.id })
        .then((d) => setAttendances(Array.isArray(d) ? d : []))
        .catch(() => {}),
      getMemberPayments(member.id).then(setPayments).catch(() => {}),
    ];
    if (isClub && member.club_id) tasks.push(getClub(member.club_id).then(setClub).catch(() => {}));
    if (active === "book" && selectedFacilityId) {
      tasks.push(getFacilityAvailability(selectedFacilityId, bookDate).then(setAvailability).catch(() => {}));
    }
    try {
      await Promise.all(tasks);
      toast.success("Dashboard refreshed.");
    } finally {
      setRefreshing(false);
    }
  }, [member, refreshing, isClub, active, selectedFacilityId, bookDate]);

  const stats = useMemo(
    () => [
      { label: "Membership", value: member?.member_status || "—", icon: ICONS.check, accent: "#16a34a" },
      { label: "Payment", value: member?.payment_status || "—", icon: ICONS.payments, accent: PRIMARY },
      { label: "ID Card", value: member?.card_status || "—", icon: ICONS.card, accent: "#0891b2" },
      { label: "My Attendance", value: attendances.length, icon: ICONS.attendance, accent: "#d97706", isCount: true },
    ],
    [member, attendances.length]
  );

  const NAV = useMemo(
    () => [
      { key: "dashboard", label: "Dashboard", icon: ICONS.dashboard },
      { key: "book", label: "Book Facility", icon: ICONS.book },
      { key: "attendance", label: "My Attendance", icon: ICONS.attendance },
      { key: "payments", label: "Payments", icon: ICONS.payments },
      ...(isClub ? [{ key: "club", label: "My Club", icon: ICONS.club }] : []),
      { key: "profile", label: "Profile", icon: ICONS.profile },
    ],
    [isClub]
  );

  const VIEW_TITLES = {
    dashboard: "Dashboard",
    book: "Book Facility",
    attendance: "My Attendance",
    payments: "Payments",
    club: "My Club",
    profile: "Profile",
  };

  if (!member) return null;

  const selectedFacility = facilities.find((f) => f.id === selectedFacilityId);

  // ════════════════════════════════════════════ VIEWS ════════════════════════
  const DashboardView = () => (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map((s, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: LIGHT }}>
              <Icon path={s.icon} className="w-6 h-6" stroke={s.accent} width={2} />
            </div>
            <div className="min-w-0">
              <p className={`font-extrabold truncate ${s.isCount ? "text-2xl" : "text-base"}`} style={{ color: NAVY }}>{s.value}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile summary */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-4 mb-5">
            <Avatar name={memberName} url={photoUrl} size={56} />
            <div className="min-w-0">
              <h3 className="font-bold text-lg truncate" style={{ color: NAVY }}>{memberName}</h3>
              <p className="text-sm text-gray-400">{member.member_type || (isClub ? "Club Student" : "Independent")} · {member.member_id}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6">
            <InfoRow label="Email" value={member.email} />
            <InfoRow label="Gender" value={member.member_gender} />
            <InfoRow label="Membership Status" value={<Pill>{member.member_status}</Pill>} />
            <InfoRow label="Payment Status" value={<Pill>{member.payment_status}</Pill>} />
            <InfoRow label="Membership Start" value={fmtDate(member.membership_start_date)} />
            <InfoRow label="Membership End" value={fmtDate(member.membership_end_date)} />
            {isClub && <InfoRow label="Club" value={member.club_name || member.requested_club_name} />}
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="font-bold text-sm mb-4" style={{ color: NAVY }}>Quick Actions</h3>
          <button onClick={() => setActive("book")} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-2 text-sm font-semibold text-white" style={{ backgroundColor: PRIMARY }}>
            <Icon path={ICONS.book} className="w-5 h-5" stroke="#fff" width={1.8} /> Book a Facility
          </button>
          <button onClick={() => setActive("attendance")} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-2 text-sm font-semibold" style={{ backgroundColor: LIGHT, color: PRIMARY }}>
            <Icon path={ICONS.attendance} className="w-5 h-5" stroke={PRIMARY} width={1.8} /> View My Attendance
          </button>
          <button onClick={() => setActive("payments")} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold" style={{ backgroundColor: LIGHT, color: PRIMARY }}>
            <Icon path={ICONS.payments} className="w-5 h-5" stroke={PRIMARY} width={1.8} /> View My Payments
          </button>
        </div>
      </div>
    </>
  );

  const BookFacilityView = () => {
    const timeCols = availability?.slots?.[0]?.time_slots || [];
    return (
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h3 className="font-bold text-sm mb-4" style={{ color: NAVY }}>Book a Facility</h3>
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <select
            value={selectedFacilityId || ""}
            onChange={(e) => setSelectedFacilityId(Number(e.target.value))}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700">
            {facilities.length === 0 && <option>No facilities available</option>}
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>{f.facility_name}</option>
            ))}
          </select>
          <input
            type="date"
            value={bookDate}
            min={todayStr()}
            onChange={(e) => setBookDate(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
          />
        </div>

        <div className="flex flex-wrap gap-4 mb-4 text-xs text-gray-500">
          <LegendDot color="#dcfce7" border="#16a34a" label="Available" />
          <LegendDot color="#fee2e2" border="#ef4444" label="Full" />
          <LegendDot color="#fef3c7" border="#f59e0b" label="Blocked" />
        </div>

        {availLoading ? (
          <p className="text-sm text-gray-400 py-10 text-center">Loading availability…</p>
        ) : !availability ? (
          <EmptyState icon={ICONS.book} text="Select a facility and date to see availability." />
        ) : !availability.facility_available_for_booking ? (
          <EmptyState icon={ICONS.clock} text="This facility is currently not available for booking." />
        ) : timeCols.length === 0 ? (
          <EmptyState icon={ICONS.clock} text="No time slots configured for this facility." />
        ) : (
          <>
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="border-separate" style={{ borderSpacing: "4px" }}>
                <thead>
                  <tr>
                    <th className="sticky left-0 bg-white" />
                    {timeCols.map((t) => (
                      <th key={t.time_slot_id} className="text-[10px] font-medium text-gray-500 px-1 whitespace-nowrap">
                        {String(t.start_time).slice(0, 5)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {availability.slots.map((slot) => (
                    <tr key={slot.id}>
                      <td className="sticky left-0 bg-white text-xs font-semibold pr-2 whitespace-nowrap" style={{ color: NAVY }}>
                        {slot.slot_code}
                      </td>
                      {slot.time_slots.map((ts) => {
                        const style = ts.available
                          ? { backgroundColor: "#dcfce7", borderColor: "#16a34a", color: "#15803d" }
                          : ts.is_blocked
                          ? { backgroundColor: "#fef3c7", borderColor: "#f59e0b", color: "#b45309" }
                          : { backgroundColor: "#fee2e2", borderColor: "#ef4444", color: "#b91c1c" };
                        const title = ts.is_blocked
                          ? `Blocked${ts.block_reason ? `: ${ts.block_reason}` : ""}`
                          : ts.is_full
                          ? "Full"
                          : `Available · LKR ${ts.fee}`;
                        return (
                          <td key={ts.facility_slot_time_slot_id}>
                            <button
                              disabled={!ts.available}
                              title={title}
                              onClick={() => toast.success(`${slot.slot_code} ${String(ts.start_time).slice(0, 5)} selected — booking checkout coming soon.`)}
                              className="w-10 h-8 rounded border text-[10px] font-semibold transition disabled:cursor-not-allowed"
                              style={style}>
                              {ts.available ? "✓" : ts.is_blocked ? "✕" : "•"}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 mt-4">
              Showing live availability for <span className="font-semibold">{selectedFacility?.facility_name}</span> on {bookDate}. Booking fee: LKR {selectedFacility?.booking_fee ?? "—"}.
            </p>
          </>
        )}
      </div>
    );
  };

  const AttendanceView = () => (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <h3 className="font-bold text-sm mb-4" style={{ color: NAVY }}>My Attendance ({attendances.length})</h3>
      {attendances.length === 0 ? (
        <EmptyState icon={ICONS.attendance} text="You have no attendance records yet." />
      ) : (
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-left min-w-[600px]">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100">
                <th className="py-2 pr-3 font-medium">Scanned At</th>
                <th className="py-2 px-3 font-medium">Booking Date</th>
                <th className="py-2 px-3 font-medium">Slots</th>
                <th className="py-2 px-3 font-medium">Fee</th>
                <th className="py-2 pl-3 font-medium">Code</th>
              </tr>
            </thead>
            <tbody>
              {attendances.map((a) => (
                <tr key={a.id} className="border-b border-gray-50 last:border-0">
                  <td className="py-3 pr-3 text-xs text-gray-600">{fmtDateTime(a.scanned_at)}</td>
                  <td className="py-3 px-3 text-xs text-gray-600">{fmtDate(a.booking_date)}</td>
                  <td className="py-3 px-3 text-xs text-gray-600">{a.total_slots ?? "—"}</td>
                  <td className="py-3 px-3 text-xs text-gray-600 whitespace-nowrap">{money(a.total_fee)}</td>
                  <td className="py-3 pl-3 text-xs text-gray-600 font-mono">{a.scanned_code || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const PaymentsView = () => (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <h3 className="font-bold text-sm mb-4" style={{ color: NAVY }}>My Payments ({payments.length})</h3>
      {payments.length === 0 ? (
        <EmptyState icon={ICONS.payments} text="You have no payment records yet." />
      ) : (
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-left min-w-[640px]">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100">
                <th className="py-2 pr-3 font-medium">Reference</th>
                <th className="py-2 px-3 font-medium">Type</th>
                <th className="py-2 px-3 font-medium">Amount</th>
                <th className="py-2 px-3 font-medium">Status</th>
                <th className="py-2 pl-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 last:border-0">
                  <td className="py-3 pr-3 text-xs font-mono text-gray-600">{p.payment_reference || "—"}</td>
                  <td className="py-3 px-3 text-xs text-gray-600">{p.payment_type || "—"}</td>
                  <td className="py-3 px-3 text-xs font-semibold text-gray-700 whitespace-nowrap">{money(p.amount)}</td>
                  <td className="py-3 px-3"><Pill>{p.payment_status}</Pill></td>
                  <td className="py-3 pl-3 text-xs text-gray-600">{fmtDate(p.paid_at || p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const ClubView = () => (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <h3 className="font-bold text-sm mb-4" style={{ color: NAVY }}>My Club</h3>
      {!member.club_id ? (
        <EmptyState icon={ICONS.club} text="You are not linked to a club yet." />
      ) : !club ? (
        <p className="text-sm text-gray-400 py-8 text-center">Loading club…</p>
      ) : (
        <>
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${PRIMARY_DARK}, ${PRIMARY})` }}>
              <Icon path={ICONS.club} className="w-7 h-7" stroke="#fff" width={1.8} />
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-lg truncate" style={{ color: NAVY }}>{club.club_name}</h4>
              <p className="text-sm text-gray-400">{club.club_id}</p>
            </div>
            <div className="ml-auto"><Pill>{club.club_status}</Pill></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6">
            <InfoRow label="Registration No" value={club.reg_no} />
            <InfoRow label="Registration Year" value={club.reg_year} />
            <InfoRow label="Primary Phone" value={club.primary_phone_number} />
            <InfoRow label="No. of Coaches" value={club.no_of_coaches} />
            <InfoRow label="Members" value={club.approved_member_count} />
            <InfoRow label="Address" value={club.address} />
          </div>
        </>
      )}
    </div>
  );

  const profileInputCls = (name) =>
    `w-full rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 transition ${
      profileErrors[name]
        ? "border border-red-400 focus:ring-red-400"
        : "border border-gray-200 focus:ring-blue-500"
    }`;

  const setProfileField = (name) => (e) => {
    const { value } = e.target;
    setProfileForm((f) => ({ ...f, [name]: value }));
    setProfileErrors((x) => (x[name] ? { ...x, [name]: "" } : x));
  };

  const ProfileView = () => (
    <div className="bg-white rounded-2xl shadow-sm p-6 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Avatar name={memberName} url={photoUrl} size={72} />
        <div className="min-w-0">
          <h3 className="font-bold text-lg" style={{ color: NAVY }}>{memberName}</h3>
          <p className="text-sm text-gray-400">{member.member_type || (isClub ? "Club Student" : "Independent")}</p>
        </div>
        {!editingProfile && (
          <button
            onClick={startEditProfile}
            className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold flex-shrink-0"
            style={{ backgroundColor: LIGHT, color: PRIMARY }}>
            <Icon path={ICONS.edit} className="w-4 h-4" stroke={PRIMARY} width={1.8} /> Edit Details
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
        <InfoRow label="Member ID" value={member.member_id} />
        <InfoRow label="Title" value={member.title} />
        <InfoRow label="Email" value={member.email} />
        <InfoRow label="Gender" value={member.member_gender} />
        <InfoRow label="NIC / Student ID" value={member.nic_number} />
        <InfoRow label="Date of Birth" value={fmtDate(member.date_of_birth)} />
        {isClub && <InfoRow label="Club" value={member.club_name || member.requested_club_name} />}
        <InfoRow label="Membership Status" value={<Pill>{member.member_status}</Pill>} />
        <InfoRow label="Payment Status" value={<Pill>{member.payment_status}</Pill>} />
        <InfoRow label="ID Card Status" value={<Pill>{member.card_status}</Pill>} />
      </div>

      {/* Contact details — editable by the member */}
      <div className="mt-6 pt-5 border-t border-gray-100">
        <h4 className="font-bold text-sm mb-4" style={{ color: NAVY }}>Contact Details</h4>
        {editingProfile ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Primary Phone</label>
              <input
                type="tel"
                inputMode="tel"
                value={profileForm.primary_phone}
                onChange={setProfileField("primary_phone")}
                placeholder="071 234 5678"
                className={profileInputCls("primary_phone")}
              />
              {profileErrors.primary_phone && <p className="text-xs text-red-500 mt-1">{profileErrors.primary_phone}</p>}
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Secondary Phone</label>
              <input
                type="tel"
                inputMode="tel"
                value={profileForm.secondary_phone}
                onChange={setProfileField("secondary_phone")}
                placeholder="077 234 5678"
                className={profileInputCls("secondary_phone")}
              />
              {profileErrors.secondary_phone && <p className="text-xs text-red-500 mt-1">{profileErrors.secondary_phone}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-500 mb-1.5">Address</label>
              <input
                value={profileForm.address}
                onChange={setProfileField("address")}
                placeholder="No. 1, Main Street, Colombo"
                className={profileInputCls("address")}
              />
              {profileErrors.address && <p className="text-xs text-red-500 mt-1">{profileErrors.address}</p>}
            </div>
            <div className="sm:col-span-2 flex items-center gap-3 mt-1">
              <button
                onClick={saveProfile}
                disabled={savingProfile}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition disabled:opacity-60"
                style={{ backgroundColor: PRIMARY }}>
                {savingProfile ? "Saving…" : "Save Changes"}
              </button>
              <button
                onClick={cancelEditProfile}
                disabled={savingProfile}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50 transition disabled:opacity-60">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
            <InfoRow label="Primary Phone" value={member.primary_phone_number} />
            <InfoRow label="Secondary Phone" value={member.secondary_phone_number} />
            <InfoRow label="Address" value={member.address} />
          </div>
        )}
      </div>
    </div>
  );

  const renderView = () => {
    if (loading) return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <svg className="animate-spin w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        <p className="text-sm text-gray-400">Loading your dashboard…</p>
      </div>
    );
    // Invoked as plain functions (not <X />) so their JSX is inlined into this
    // component's tree — editable text inputs (Profile) then keep focus across
    // re-renders instead of remounting on every keystroke.
    switch (active) {
      case "book": return BookFacilityView();
      case "attendance": return AttendanceView();
      case "payments": return PaymentsView();
      case "club": return ClubView();
      case "profile": return ProfileView();
      default: return DashboardView();
    }
  };

  return (
    <div className="min-h-screen flex overflow-x-hidden bg-gradient-to-br from-blue-50 via-white to-blue-100 m-0" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* ══ SIDEBAR ══ */}
      <aside
        className={`fixed lg:static z-40 inset-y-0 left-0 w-64 flex flex-col transition-transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        style={{ background: `linear-gradient(180deg, ${SIDEBAR_TOP} 0%, ${SIDEBAR_BOTTOM} 100%)` }}>
        <div className="flex items-center gap-3 px-5 h-16 border-b border-white/10">
          <div className="w-9 h-9 rounded-full flex items-center justify-center bg-white">
            <img src={logo} alt="USJ" className="w-7 h-7 object-contain" />
          </div>
          <div className="leading-tight">
            <p className="text-white font-bold text-sm">USJ SPORTS</p>
            <p className="text-[10px] text-blue-200">{portalLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
          <Avatar name={memberName} url={photoUrl} size={40} />
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate">{memberName}</p>
            <p className="text-[11px] truncate text-blue-200">{member.member_type || (isClub ? "Club Student" : "Independent")}</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map((n) => {
            const on = active === n.key;
            return (
              <button
                key={n.key}
                onClick={() => { setActive(n.key); setSidebarOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={{ backgroundColor: on ? "rgba(255,255,255,0.18)" : "transparent", color: on ? "#fff" : "rgba(255,255,255,0.75)" }}>
                <Icon path={n.icon} className="w-5 h-5" width={1.8} />
                <span className="flex-1 text-left">{n.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors"
            style={{ backgroundColor: "rgba(239,68,68,0.15)", color: "#fca5a5" }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#ef4444"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.15)"; e.currentTarget.style.color = "#fca5a5"; }}>
            <Icon path={ICONS.logout} className="w-5 h-5" width={1.8} />
            Logout
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* ══ MAIN ══ */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="bg-white/80 backdrop-blur h-16 flex items-center justify-between px-4 sm:px-6 shadow-sm sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button className="lg:hidden text-gray-600" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
              <Icon path="M4 6h16M4 12h16M4 18h16" stroke={NAVY} width={2} />
            </button>
            <div className="min-w-0">
              <h1 className="font-bold text-base sm:text-lg truncate" style={{ color: NAVY }}>{VIEW_TITLES[active]}</h1>
              <p className="text-xs text-gray-400 truncate">Welcome back, {memberName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-60"
              style={{ backgroundColor: LIGHT, color: PRIMARY }}
              aria-label="Refresh"
              title="Refresh dashboard">
              <Icon path={ICONS.refresh} className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} stroke={PRIMARY} width={2} />
              <span className="hidden sm:inline">{refreshing ? "Refreshing…" : "Refresh"}</span>
            </button>
            <button className="relative text-gray-500 p-1.5 rounded-lg hover:bg-gray-100 transition" aria-label="Notifications">
              <Icon path={ICONS.bell} className="w-5 h-5" stroke="#6b7280" width={1.8} />
            </button>
            <div title={memberName} className="cursor-pointer">
              <Avatar name={memberName} url={photoUrl} size={36} />
            </div>
          </div>
        </header>

        <main className="flex-1 px-8 sm:px-12 py-6 sm:py-8 overflow-y-auto">{renderView()}</main>
      </div>
    </div>
  );
}

// ── Small presentational helpers ──
function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0 gap-3">
      <span className="text-xs text-gray-400 flex-shrink-0">{label}</span>
      <span className="text-xs font-medium text-gray-700 text-right break-words">{value === 0 ? 0 : value || "—"}</span>
    </div>
  );
}

function EmptyState({ icon, text }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: LIGHT }}>
        <Icon path={icon} className="w-7 h-7" stroke={PRIMARY} width={1.6} />
      </div>
      <p className="text-sm text-gray-400">{text}</p>
    </div>
  );
}

function LegendDot({ color, border, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-3.5 h-3.5 rounded border" style={{ backgroundColor: color, borderColor: border }} />
      {label}
    </span>
  );
}
