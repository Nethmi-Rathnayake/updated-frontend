import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import logo from "../../assets/usjp-logo__1_-removebg-preview.png";
import {
  getClubVerificationRequests,
  approveClubRequest,
  rejectClubRequest,
  getClubMembers,
  getMemberTypes,
  getFacilities,
  getFacilityAvailability,
  getClub,
  getClubPayments,
  getAttendances,
} from "../../services/coachService";
import { getMember } from "../../services/memberService";
import { storageUrl } from "../../services/api";

// ── Design tokens — aligned with the OTP LoginPage palette ──
// (clean blue gradient background, white rounded-2xl cards, blue-700 accents).
const PRIMARY = "#1d4ed8"; // blue-700, matches LoginPage text/accent
const PRIMARY_DARK = "#1e3a8a"; // blue-900, used for icon-chip gradients
// Sidebar gradient — a slightly darker blue than the accent so it reads as a
// deep navy-blue while staying in the LoginPage blue family.
const SIDEBAR_TOP = "#172554"; // blue-950
const SIDEBAR_BOTTOM = "#1e3a8a"; // blue-900
const NAVY = "#0f1c3f"; // headings
const LIGHT = "#e8f0fe"; // icon chip bg
const STORAGE_KEY = "sfmis_coach";

const todayStr = () => new Date().toISOString().slice(0, 10);

// Backend never returns a single "fullname" — it returns the name parts. Build a
// readable display name from initials (or the denoted name) + lastname.
const buildName = (initials, denoted, lastname) => {
  const lead = String(initials || denoted || "").trim();
  const tail = String(lastname || "").trim();
  return [lead, tail].filter(Boolean).join(" ") || "Unknown";
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
  club: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2M5 21H3m4-14h.01M11 7h.01M15 7h.01M7 11h.01M11 11h.01M15 11h.01M7 15h.01M11 15h.01M15 15h.01",
  requests: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  members: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  bookings: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  attendance: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7l2 2 4-4",
  payments: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
  logout: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
  refresh: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
  clock: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  check: "M5 13l4 4L19 7",
  x: "M6 18L18 6M6 6l12 12",
  bell: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
  dashboard: "M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z",
  facilities: "M3 21h18M5 21V7l8-4v18M19 21V11l-6-3M9 9h.01M9 12h.01M9 15h.01",
  analysis: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  coordinators: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
  settings: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z|M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  chevron: "M19 9l-7 7-7-7",
  user: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
};

const NAV = [
  { key: "club", label: "Dashboard", icon: ICONS.dashboard },
  { key: "members", label: "Members", icon: ICONS.members },
  { key: "facilities", label: "Facilities", icon: ICONS.facilities },
  { key: "bookings", label: "Booking", icon: ICONS.bookings },
  { key: "attendance", label: "Attendance", icon: ICONS.attendance },
  { key: "payments", label: "Payments", icon: ICONS.payments },
  { key: "analysis", label: "Analysis", icon: ICONS.analysis },
  { key: "coordinators", label: "Coordinators", icon: ICONS.coordinators },
  { key: "settings", label: "Settings", icon: ICONS.settings },
];

const VIEW_TITLES = {
  club: "Dashboard",
  members: "Members",
  facilities: "Facilities",
  bookings: "Booking",
  attendance: "Attendance",
  payments: "Payments",
  analysis: "Analysis",
  coordinators: "Coordinators",
  settings: "Settings",
};

const statusColor = (status) => {
  const s = String(status || "").toLowerCase();
  if (s.includes("active") || s.includes("paid") || s.includes("issued") || s.includes("approved") || s.includes("complete"))
    return { bg: "#dcfce7", color: "#15803d" };
  if (s.includes("pending") || s.includes("await")) return { bg: "#fef3c7", color: "#b45309" };
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
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white"
      style={{ width: size, height: size, backgroundColor: PRIMARY, fontSize: size * 0.36 }}>
      {initials}
    </div>
  );
};

export default function CoachDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  // Resolve the logged-in coach from navigation state (set by LoginPage) or the
  // session fallback so a refresh keeps us signed in.
  const [coach, setCoach] = useState(() => {
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

  const coachName = coach ? buildName(coach.initials, coach.name_denoted_by_initials, coach.lastname) : "";

  const [active, setActive] = useState("club");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const [club, setClub] = useState(null);
  const [requests, setRequests] = useState([]);
  const [members, setMembers] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actingId, setActingId] = useState(null);

  // Bookings (facility availability) state
  const [selectedFacilityId, setSelectedFacilityId] = useState(null);
  const [bookDate, setBookDate] = useState(todayStr());
  const [availability, setAvailability] = useState(null);
  const [availLoading, setAvailLoading] = useState(false);

  // Attendance state
  const [attendances, setAttendances] = useState([]);
  const [attDate, setAttDate] = useState("");
  const [attLoading, setAttLoading] = useState(false);

  // Coordinators (club coaches) state
  const [coordinators, setCoordinators] = useState([]);
  const [coordLoading, setCoordLoading] = useState(false);

  // Settings — refreshing the coach's own profile
  const [profileRefreshing, setProfileRefreshing] = useState(false);

  useEffect(() => {
    if (!coach) navigate("/login", { replace: true });
  }, [coach, navigate]);

  // The /verify-otp payload omits the photo (and some profile fields), so the
  // coach's own avatar would be blank. Enrich it once from the full member
  // record, which includes photo_path.
  useEffect(() => {
    if (!coach?.id || coach.photo_path) return;
    let on = true;
    getMember(coach.id)
      .then((full) => {
        if (on && full) {
          setCoach((prev) => {
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
  }, [coach?.id, coach?.photo_path]);

  const refreshRequests = useCallback(async () => {
    if (!coach?.id || !coach?.club_id) {
      setRequests([]);
      return;
    }
    try {
      setRequests(await getClubVerificationRequests(coach.id));
    } catch {
      setRequests([]);
    }
  }, [coach]);

  const refreshMembers = useCallback(async () => {
    if (!coach?.club_id) {
      setMembers([]);
      return;
    }
    try {
      setMembers(await getClubMembers(coach.club_id));
    } catch {
      setMembers([]);
    }
  }, [coach]);

  // Coordinators = the club's coaches. Resolve the "Coach" member-type id, then
  // fetch club members filtered to that type (falling back to a client-side
  // filter on member_type if the id can't be resolved).
  const loadCoordinators = useCallback(async () => {
    if (!coach?.club_id) {
      setCoordinators([]);
      return;
    }
    setCoordLoading(true);
    try {
      const types = await getMemberTypes().catch(() => []);
      const coachType = (Array.isArray(types) ? types : []).find((t) =>
        /coach/i.test(t.description)
      );
      const list = await getClubMembers(
        coach.club_id,
        coachType ? { member_type_id: coachType.category_id } : {}
      );
      const arr = Array.isArray(list) ? list : [];
      setCoordinators(coachType ? arr : arr.filter((m) => /coach/i.test(m.member_type)));
    } catch {
      setCoordinators([]);
      toast.error("Could not load coordinators.");
    } finally {
      setCoordLoading(false);
    }
  }, [coach]);

  // Settings — pull the latest copy of the coach's own member record.
  const refreshProfile = useCallback(async () => {
    if (!coach?.id) return;
    setProfileRefreshing(true);
    try {
      const full = await getMember(coach.id);
      if (full) {
        setCoach((prev) => {
          const merged = { ...prev, ...full };
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          return merged;
        });
        toast.success("Profile refreshed.");
      }
    } catch {
      toast.error("Could not refresh profile.");
    } finally {
      setProfileRefreshing(false);
    }
  }, [coach?.id]);

  // Initial load — club, requests, members, facilities, payments in parallel.
  useEffect(() => {
    if (!coach) return;
    let on = true;
    (async () => {
      setLoading(true);
      const [clb, reqs, mems, facs, pays] = await Promise.allSettled([
        coach.club_id ? getClub(coach.club_id) : Promise.resolve(null),
        coach.club_id ? getClubVerificationRequests(coach.id) : Promise.resolve([]),
        coach.club_id ? getClubMembers(coach.club_id) : Promise.resolve([]),
        getFacilities(),
        coach.club_id ? getClubPayments(coach.club_id) : Promise.resolve([]),
      ]);
      if (!on) return;
      setClub(clb.status === "fulfilled" ? clb.value : null);
      setRequests(reqs.status === "fulfilled" ? reqs.value : []);
      setMembers(mems.status === "fulfilled" ? mems.value : []);
      const facList = facs.status === "fulfilled" ? facs.value : [];
      setFacilities(facList);
      if (facList.length) setSelectedFacilityId((id) => id ?? facList[0].id);
      setPayments(pays.status === "fulfilled" ? pays.value : []);
      setLoading(false);
    })();
    return () => {
      on = false;
    };
  }, [coach]);

  // Load facility availability when the Bookings tab is open with a selection.
  useEffect(() => {
    if (active !== "bookings" || !selectedFacilityId) return;
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

  // Load attendance when the Attendance tab is open (optionally filtered by date).
  useEffect(() => {
    if (active !== "attendance") return;
    let on = true;
    setAttLoading(true);
    getAttendances(attDate ? { date: attDate } : {})
      .then((data) => on && setAttendances(Array.isArray(data) ? data : []))
      .catch(() => {
        if (on) {
          setAttendances([]);
          toast.error("Could not load attendance.");
        }
      })
      .finally(() => on && setAttLoading(false));
    return () => {
      on = false;
    };
  }, [active, attDate]);

  // Load coordinators when the Coordinators tab is opened.
  useEffect(() => {
    if (active !== "coordinators") return;
    loadCoordinators();
  }, [active, loadCoordinators]);

  const handleApprove = async (memberId) => {
    setActingId(memberId);
    try {
      await approveClubRequest(memberId, coach.id);
      toast.success("Member approved as a club student.");
      await Promise.all([refreshRequests(), refreshMembers()]);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not approve member.");
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (memberId) => {
    setActingId(memberId);
    try {
      await rejectClubRequest(memberId, coach.id);
      toast.success("Member rejected and moved to Independent.");
      await Promise.all([refreshRequests(), refreshMembers()]);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not reject member.");
    } finally {
      setActingId(null);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    navigate("/", { replace: true });
  };

  // Header refresh — reloads the core datasets plus whatever the active tab
  // needs, with a spinning indicator while in flight.
  const handleRefresh = async () => {
    if (!coach || refreshing) return;
    setRefreshing(true);
    const tasks = [getFacilities().then(setFacilities).catch(() => {})];
    if (coach.club_id) {
      tasks.push(getClub(coach.club_id).then(setClub).catch(() => {}));
      tasks.push(refreshRequests());
      tasks.push(refreshMembers());
      tasks.push(getClubPayments(coach.club_id).then(setPayments).catch(() => {}));
    }
    if (active === "bookings" && selectedFacilityId) {
      tasks.push(getFacilityAvailability(selectedFacilityId, bookDate).then(setAvailability).catch(() => {}));
    }
    if (active === "attendance") {
      tasks.push(
        getAttendances(attDate ? { date: attDate } : {})
          .then((d) => setAttendances(Array.isArray(d) ? d : []))
          .catch(() => {})
      );
    }
    if (active === "coordinators") {
      tasks.push(loadCoordinators());
    }
    try {
      await Promise.all(tasks);
      toast.success("Dashboard refreshed.");
    } finally {
      setRefreshing(false);
    }
  };

  // Narrow global attendance feed to this coach's club members.
  const clubMemberIds = useMemo(() => new Set(members.map((m) => m.id)), [members]);
  const clubAttendances = useMemo(
    () => (clubMemberIds.size ? attendances.filter((a) => clubMemberIds.has(a.member_id)) : attendances),
    [attendances, clubMemberIds]
  );

  const stats = useMemo(
    () => [
      { label: "Club Members", value: members.length, icon: ICONS.members, accent: PRIMARY },
      { label: "Pending Requests", value: requests.length, icon: ICONS.requests, accent: "#d97706" },
      { label: "Payments", value: payments.length, icon: ICONS.payments, accent: "#0891b2" },
      { label: "Facilities", value: facilities.length, icon: ICONS.bookings, accent: "#16a34a" },
    ],
    [members.length, requests.length, payments.length, facilities.length]
  );

  if (!coach) return null;

  const selectedFacility = facilities.find((f) => f.id === selectedFacilityId);

  // ════════════════════════════════════════════ VIEWS ════════════════════════
  const MyClubView = () => (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map((s, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: LIGHT }}>
              <Icon path={s.icon} className="w-6 h-6" stroke={s.accent} width={2} />
            </div>
            <div className="min-w-0">
              <p className="font-extrabold truncate text-2xl" style={{ color: NAVY }}>{s.value}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {!coach.club_id ? (
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <EmptyState icon={ICONS.club} text="You are not linked to a club yet." />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Club details */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${PRIMARY_DARK}, ${PRIMARY})` }}>
                <Icon path={ICONS.club} className="w-7 h-7" stroke="#fff" width={1.8} />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-lg truncate" style={{ color: NAVY }}>{club?.club_name || coach.club_name || "—"}</h3>
                <p className="text-sm text-gray-400">{club?.club_id || coach.club_code || "—"}</p>
              </div>
              <div className="ml-auto"><Pill>{club?.club_status}</Pill></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6">
              <InfoRow label="Registration No" value={club?.reg_no} />
              <InfoRow label="Registration Year" value={club?.reg_year} />
              <InfoRow label="Primary Phone" value={club?.primary_phone_number} />
              <InfoRow label="Secondary Phone" value={club?.secondary_phone_number} />
              <InfoRow label="Membership Start" value={fmtDate(club?.membership_start_date)} />
              <InfoRow label="Membership End" value={fmtDate(club?.membership_end_date)} />
              <InfoRow label="No. of Coaches" value={club?.no_of_coaches} />
              <InfoRow label="Approved Members" value={club?.approved_member_count} />
              <InfoRow label="Pending Requests" value={club?.pending_member_request_count} />
              <InfoRow label="Address" value={club?.address} />
            </div>
          </div>

          {/* Recent members */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="font-bold text-sm mb-4" style={{ color: NAVY }}>Recent Members</h3>
            {!club?.recent_members?.length ? (
              <EmptyState icon={ICONS.members} text="No members yet." />
            ) : (
              <div className="space-y-3">
                {club.recent_members.slice(0, 6).map((m) => (
                  <div key={m.id} className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0">
                    <Avatar name={buildName(m.initials, m.name_denoted_by_initials, m.lastname)} url={storageUrl(m.photo_path) || m.photo_url} size={36} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: NAVY }}>
                        {buildName(m.initials, m.name_denoted_by_initials, m.lastname)}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{m.member_id}</p>
                    </div>
                    <Pill>{m.member_status}</Pill>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );

  const RequestsView = () => (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-sm" style={{ color: NAVY }}>Club Verification Requests ({requests.length})</h3>
        <button onClick={refreshRequests} className="text-xs font-semibold" style={{ color: PRIMARY }}>Refresh</button>
      </div>
      {!coach.club_id ? (
        <EmptyState icon={ICONS.club} text="You are not linked to a club yet." />
      ) : requests.length === 0 ? (
        <EmptyState icon={ICONS.check} text="No students are waiting for verification." />
      ) : (
        <div className="space-y-3">
          {requests.map((r) => {
            const name = buildName(r.initials, r.name_denoted_by_initials, r.lastname);
            return (
              <div key={r.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border border-gray-100">
                <Avatar name={name} url={storageUrl(r.photo_path) || r.photo_url} size={44} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: NAVY }}>{name}</p>
                  <p className="text-xs text-gray-400 break-words">
                    {r.member_id} · {r.email}{r.nic_number ? ` · NIC ${r.nic_number}` : ""}
                  </p>
                  <p className="text-xs text-gray-400">Requested: {r.requested_club_name || coach.club_name}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleApprove(r.id)}
                    disabled={actingId === r.id}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                    style={{ backgroundColor: "#16a34a" }}>
                    <Icon path={ICONS.check} className="w-4 h-4" stroke="#fff" width={2.5} />
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(r.id)}
                    disabled={actingId === r.id}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold disabled:opacity-50"
                    style={{ backgroundColor: "#fee2e2", color: "#b91c1c" }}>
                    <Icon path={ICONS.x} className="w-4 h-4" stroke="#b91c1c" width={2.5} />
                    Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const MembersView = () => (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-sm" style={{ color: NAVY }}>Club Members ({members.length})</h3>
        <button onClick={refreshMembers} className="text-xs font-semibold" style={{ color: PRIMARY }}>Refresh</button>
      </div>
      {members.length === 0 ? (
        <EmptyState icon={ICONS.members} text="No members in your club yet." />
      ) : (
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-left min-w-[640px]">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100">
                <th className="py-2 pr-3 font-medium">Member</th>
                <th className="py-2 px-3 font-medium">Member ID</th>
                <th className="py-2 px-3 font-medium">Type</th>
                <th className="py-2 px-3 font-medium">Status</th>
                <th className="py-2 pl-3 font-medium">Payment</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const name = buildName(m.initials, m.name_denoted_by_initials, m.lastname);
                return (
                  <tr key={m.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={name} url={storageUrl(m.photo_path) || m.photo_url} size={36} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: NAVY }}>{name}</p>
                          <p className="text-xs text-gray-400 truncate">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs text-gray-600">{m.member_id}</td>
                    <td className="py-3 px-3 text-xs text-gray-600">{m.member_type}</td>
                    <td className="py-3 px-3"><Pill>{m.member_status}</Pill></td>
                    <td className="py-3 pl-3"><Pill>{m.payment_status}</Pill></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const BookingsView = () => {
    const timeCols = availability?.slots?.[0]?.time_slots || [];
    return (
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h3 className="font-bold text-sm mb-4" style={{ color: NAVY }}>Facility Availability</h3>

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
          <EmptyState icon={ICONS.bookings} text="Select a facility and date to see availability." />
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h3 className="font-bold text-sm" style={{ color: NAVY }}>Attendance ({clubAttendances.length})</h3>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={attDate}
            onChange={(e) => setAttDate(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
          />
          {attDate && (
            <button onClick={() => setAttDate("")} className="text-xs font-semibold" style={{ color: PRIMARY }}>Clear</button>
          )}
        </div>
      </div>
      {attLoading ? (
        <p className="text-sm text-gray-400 py-10 text-center">Loading attendance…</p>
      ) : clubAttendances.length === 0 ? (
        <EmptyState icon={ICONS.attendance} text="No attendance records for your club members." />
      ) : (
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-left min-w-[680px]">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100">
                <th className="py-2 pr-3 font-medium">Member</th>
                <th className="py-2 px-3 font-medium">Member ID</th>
                <th className="py-2 px-3 font-medium">Scanned At</th>
                <th className="py-2 px-3 font-medium">Booking Date</th>
                <th className="py-2 pl-3 font-medium">Code</th>
              </tr>
            </thead>
            <tbody>
              {clubAttendances.map((a) => {
                const name = buildName(a.member_initials, a.member_name_denoted_by_initials, a.member_lastname);
                return (
                  <tr key={a.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-3 pr-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: NAVY }}>{name}</p>
                        <p className="text-xs text-gray-400 truncate">{a.member_email || "—"}</p>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs text-gray-600">{a.member_code || "—"}</td>
                    <td className="py-3 px-3 text-xs text-gray-600">{fmtDateTime(a.scanned_at)}</td>
                    <td className="py-3 px-3 text-xs text-gray-600">{fmtDate(a.booking_date)}</td>
                    <td className="py-3 pl-3 text-xs text-gray-600 font-mono">{a.scanned_code || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-gray-400 mt-4">Showing attendance scans for members of your club.</p>
    </div>
  );

  const PaymentsView = () => (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <h3 className="font-bold text-sm mb-4" style={{ color: NAVY }}>Club Payments ({payments.length})</h3>
      {!coach.club_id ? (
        <EmptyState icon={ICONS.club} text="You are not linked to a club yet." />
      ) : payments.length === 0 ? (
        <EmptyState icon={ICONS.payments} text="No payments recorded for your club." />
      ) : (
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-left min-w-[760px]">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100">
                <th className="py-2 pr-3 font-medium">Reference</th>
                <th className="py-2 px-3 font-medium">Payer</th>
                <th className="py-2 px-3 font-medium">Type</th>
                <th className="py-2 px-3 font-medium">Amount</th>
                <th className="py-2 px-3 font-medium">Status</th>
                <th className="py-2 pl-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => {
                const payer = p.payer_id
                  ? buildName(p.payer_initials, p.payer_name_denoted_by_initials, p.payer_lastname)
                  : p.club_name || "Club";
                return (
                  <tr key={p.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-3 pr-3 text-xs font-mono text-gray-600">{p.payment_reference || "—"}</td>
                    <td className="py-3 px-3">
                      <p className="text-sm font-semibold truncate" style={{ color: NAVY }}>{payer}</p>
                      <p className="text-xs text-gray-400 truncate">{p.payer_code || p.club_code || "—"}</p>
                    </td>
                    <td className="py-3 px-3 text-xs text-gray-600">{p.payment_type || "—"}</td>
                    <td className="py-3 px-3 text-xs font-semibold text-gray-700 whitespace-nowrap">{money(p.amount)}</td>
                    <td className="py-3 px-3"><Pill>{p.payment_status}</Pill></td>
                    <td className="py-3 pl-3 text-xs text-gray-600">{fmtDate(p.paid_at || p.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const FacilitiesView = () => (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <h3 className="font-bold text-sm mb-4" style={{ color: NAVY }}>Facilities ({facilities.length})</h3>
      {facilities.length === 0 ? (
        <EmptyState icon={ICONS.facilities} text="No facilities are configured yet." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {facilities.map((f) => (
            <div key={f.id} className="rounded-xl border border-gray-100 p-4 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `linear-gradient(135deg, ${PRIMARY_DARK}, ${PRIMARY})` }}>
                  <Icon path={ICONS.facilities} className="w-6 h-6" stroke="#fff" width={1.8} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold truncate" style={{ color: NAVY }}>{f.facility_name || "—"}</p>
                  <p className="text-xs text-gray-400 truncate">{f.facility_code || f.location || ""}</p>
                </div>
                <Pill>{f.facility_status}</Pill>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Booking fee</span>
                <span className="text-xs font-semibold text-gray-700">{money(f.booking_fee)}</span>
              </div>
              <button
                onClick={() => { setSelectedFacilityId(f.id); setActive("bookings"); }}
                className="mt-1 w-full py-2 rounded-lg text-xs font-semibold text-white transition"
                style={{ backgroundColor: PRIMARY }}>
                View availability
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const AnalysisView = () => {
    const statusCounts = members.reduce((acc, m) => {
      const k = m.member_status || "Unknown";
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});
    const statusRows = Object.entries(statusCounts).sort((a, b) => b[1] - a[1]);
    const maxCount = statusRows.reduce((mx, [, n]) => Math.max(mx, n), 0) || 1;
    return (
      <>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {stats.map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: LIGHT }}>
                <Icon path={s.icon} className="w-6 h-6" stroke={s.accent} width={2} />
              </div>
              <div className="min-w-0">
                <p className="font-extrabold truncate text-2xl" style={{ color: NAVY }}>{s.value}</p>
                <p className="text-xs text-gray-400">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="font-bold text-sm mb-4" style={{ color: NAVY }}>Members by Status</h3>
          {statusRows.length === 0 ? (
            <EmptyState icon={ICONS.analysis} text="No member data to analyse yet." />
          ) : (
            <div className="space-y-3">
              {statusRows.map(([status, count]) => (
                <div key={status}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-600 font-medium">{status}</span>
                    <span className="text-gray-400">{count}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(count / maxCount) * 100}%`, backgroundColor: PRIMARY }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </>
    );
  };

  const CoordinatorsView = () => (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-sm" style={{ color: NAVY }}>Coordinators ({coordinators.length})</h3>
        <button onClick={loadCoordinators} className="text-xs font-semibold" style={{ color: PRIMARY }}>Refresh</button>
      </div>
      {!coach.club_id ? (
        <EmptyState icon={ICONS.club} text="You are not linked to a club yet." />
      ) : coordLoading ? (
        <p className="text-sm text-gray-400 py-10 text-center">Loading coordinators…</p>
      ) : coordinators.length === 0 ? (
        <EmptyState icon={ICONS.coordinators} text="No coordinators (coaches) found for your club." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {coordinators.map((c) => {
            const name = buildName(c.initials, c.name_denoted_by_initials, c.lastname);
            return (
              <div key={c.id} className="rounded-xl border border-gray-100 p-4 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <Avatar name={name} url={storageUrl(c.photo_path) || c.photo_url} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate" style={{ color: NAVY }}>{name}</p>
                    <p className="text-xs text-gray-400 truncate">{c.member_id}</p>
                  </div>
                  {c.id === coach.id && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: LIGHT, color: PRIMARY }}>You</span>
                  )}
                </div>
                <div className="text-xs text-gray-500 space-y-1">
                  <p className="break-words">{c.email || "—"}</p>
                  <p>{c.primary_phone_number || "—"}</p>
                </div>
                <div className="flex items-center gap-2 mt-auto">
                  <Pill>{c.member_status}</Pill>
                  <Pill>{c.payment_status}</Pill>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const SettingsView = () => (
    <div className="bg-white rounded-2xl shadow-sm p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-sm" style={{ color: NAVY }}>My Account</h3>
        <button
          onClick={refreshProfile}
          disabled={profileRefreshing}
          className="inline-flex items-center gap-1.5 text-xs font-semibold disabled:opacity-60"
          style={{ color: PRIMARY }}>
          <Icon path={ICONS.refresh} className={`w-4 h-4 ${profileRefreshing ? "animate-spin" : ""}`} stroke={PRIMARY} width={2} />
          {profileRefreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      <div className="flex items-center gap-4 mb-5">
        <Avatar name={coachName} url={storageUrl(coach.photo_path) || coach.photo_url} size={56} />
        <div className="min-w-0">
          <p className="font-bold text-base truncate" style={{ color: NAVY }}>{coachName}</p>
          <p className="text-xs text-gray-400 truncate">{coach.member_id} · {coach.member_type || "Coach"}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6">
        <InfoRow label="Email" value={coach.email} />
        <InfoRow label="NIC" value={coach.nic_number} />
        <InfoRow label="Primary Phone" value={coach.primary_phone_number} />
        <InfoRow label="Secondary Phone" value={coach.secondary_phone_number} />
        <InfoRow label="Club" value={coach.club_name} />
        <InfoRow label="Member Status" value={coach.member_status} />
        <InfoRow label="Payment Status" value={coach.payment_status} />
        <InfoRow label="Date of Birth" value={fmtDate(coach.date_of_birth)} />
        <InfoRow label="Address" value={coach.address} />
      </div>
      <p className="text-xs text-gray-400 mt-5">Your account details are read here from your member record.</p>
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
    switch (active) {
      case "members": return <MembersView />;
      case "facilities": return <FacilitiesView />;
      case "bookings": return <BookingsView />;
      case "attendance": return <AttendanceView />;
      case "payments": return <PaymentsView />;
      case "analysis": return <AnalysisView />;
      case "coordinators": return <CoordinatorsView />;
      case "settings": return <SettingsView />;
      default:
        // Dashboard — overview plus the pending student-verification requests
        // (approve/reject) so the coach can action them from the landing tab.
        return (
          <>
            <MyClubView />
            {coach.club_id && (
              <div className="mt-6">
                <RequestsView />
              </div>
            )}
          </>
        );
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
            <p className="text-[10px] text-blue-200">Coach Portal</p>
          </div>
        </div>

        {/* Coach card */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
          <Avatar name={coachName} url={storageUrl(coach.photo_path) || coach.photo_url} size={40} />
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate">{coachName}</p>
            <p className="text-[11px] truncate text-blue-200">{coach.club_name || "Coach"}</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map((n) => {
            const on = active === n.key;
            const badge = n.key === "requests" && requests.length > 0 ? requests.length : null;
            return (
              <button
                key={n.key}
                onClick={() => { setActive(n.key); setSidebarOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={{ backgroundColor: on ? "rgba(255,255,255,0.18)" : "transparent", color: on ? "#fff" : "rgba(255,255,255,0.75)" }}>
                <Icon path={n.icon} className="w-5 h-5" width={1.8} />
                <span className="flex-1 text-left">{n.label}</span>
                {badge && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white text-blue-700">{badge}</span>
                )}
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

      {/* Mobile overlay */}
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
              <p className="text-xs text-gray-400 truncate">Welcome back, {coachName}</p>
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
            <div className="relative">
              <button
                className="relative text-gray-500 hover:text-blue-700 transition p-1.5 rounded-lg hover:bg-gray-100"
                aria-label="Notifications"
                aria-haspopup="true"
                aria-expanded={notifOpen}
                title={requests.length > 0 ? `${requests.length} pending student request(s)` : "No pending requests"}
                onClick={() => setNotifOpen((o) => !o)}>
                <Icon path={ICONS.bell} className="w-5 h-5" stroke="currentColor" width={1.8} />
                {requests.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center" style={{ backgroundColor: "#ef4444" }}>{requests.length}</span>}
              </button>

              {notifOpen && (
                <>
                  {/* Click-away layer */}
                  <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-gray-100 z-40 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-bold" style={{ color: NAVY }}>Notifications</p>
                      {requests.length > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: LIGHT, color: PRIMARY }}>
                          {requests.length} pending
                        </span>
                      )}
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                      {!coach.club_id ? (
                        <p className="px-4 py-8 text-center text-sm text-gray-400">You are not linked to a club yet.</p>
                      ) : requests.length === 0 ? (
                        <div className="px-4 py-8 flex flex-col items-center text-center">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: LIGHT }}>
                            <Icon path={ICONS.check} className="w-6 h-6" stroke={PRIMARY} width={1.8} />
                          </div>
                          <p className="text-sm text-gray-400">You're all caught up — no pending requests.</p>
                        </div>
                      ) : (
                        requests.map((r) => {
                          const name = buildName(r.initials, r.name_denoted_by_initials, r.lastname);
                          return (
                            <div key={r.id} className="px-4 py-3 border-b border-gray-50 last:border-0">
                              <div className="flex items-center gap-3">
                                <Avatar name={name} url={storageUrl(r.photo_path) || r.photo_url} size={38} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold truncate" style={{ color: NAVY }}>{name}</p>
                                  <p className="text-xs text-gray-400 truncate">{r.member_id} · {r.email}</p>
                                </div>
                              </div>
                              <p className="text-xs text-gray-400 mt-1 break-words">
                                Requesting to join {r.requested_club_name || coach.club_name}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <button
                                  onClick={() => handleApprove(r.id)}
                                  disabled={actingId === r.id}
                                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                                  style={{ backgroundColor: "#16a34a" }}>
                                  <Icon path={ICONS.check} className="w-3.5 h-3.5" stroke="#fff" width={2.5} />
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleReject(r.id)}
                                  disabled={actingId === r.id}
                                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                                  style={{ backgroundColor: "#fee2e2", color: "#b91c1c" }}>
                                  <Icon path={ICONS.x} className="w-3.5 h-3.5" stroke="#b91c1c" width={2.5} />
                                  Reject
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <button
                      onClick={() => { setActive("club"); setNotifOpen(false); setSidebarOpen(false); }}
                      className="w-full px-4 py-2.5 text-xs font-semibold border-t border-gray-100 hover:bg-gray-50 transition"
                      style={{ color: PRIMARY }}>
                      Open Dashboard
                    </button>
                  </div>
                </>
              )}
            </div>
            <div className="relative">
              <button
                onClick={() => setProfileOpen((o) => !o)}
                aria-haspopup="true"
                aria-expanded={profileOpen}
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-gray-100 transition-colors">
                <Avatar name={coachName} url={storageUrl(coach.photo_path) || coach.photo_url} size={36} />
                <div className="hidden sm:block text-left leading-tight">
                  <p className="text-sm font-semibold truncate max-w-[140px]" style={{ color: NAVY }}>{coachName}</p>
                  <p className="text-[11px] text-gray-400">{coach.member_type || "Coach"}</p>
                </div>
                <Icon path={ICONS.chevron} className={`w-4 h-4 transition-transform ${profileOpen ? "rotate-180" : ""}`} stroke="#9ca3af" width={2} />
              </button>

              {profileOpen && (
                <>
                  {/* Click-away layer */}
                  <div className="fixed inset-0 z-30" onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-gray-100 z-40 overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                      <Avatar name={coachName} url={storageUrl(coach.photo_path) || coach.photo_url} size={40} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: NAVY }}>{coachName}</p>
                        <p className="text-xs text-gray-400 truncate">{coach.email || "—"}</p>
                      </div>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={() => { setActive("settings"); setProfileOpen(false); setSidebarOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <Icon path={ICONS.user} className="w-4 h-4" stroke="#6b7280" width={1.8} />
                        My Account
                      </button>
                      <button
                        onClick={() => { setActive("settings"); setProfileOpen(false); setSidebarOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <Icon path={ICONS.settings} className="w-4 h-4" stroke="#6b7280" width={1.8} />
                        Settings
                      </button>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold border-t border-gray-100 hover:bg-red-50 transition-colors"
                      style={{ color: "#dc2626" }}>
                      <Icon path={ICONS.logout} className="w-4 h-4" stroke="#dc2626" width={1.8} />
                      Logout
                    </button>
                  </div>
                </>
              )}
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
