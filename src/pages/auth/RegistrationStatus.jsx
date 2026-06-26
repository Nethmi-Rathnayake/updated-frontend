import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../../assets/usjp-logo__1_-removebg-preview.png";
import { getMember } from "../../services/memberService";
import { storageUrl } from "../../services/api";

// Shown after an ALREADY-REGISTERED member verifies their OTP but has NOT yet
// paid. They can't enter a dashboard, so we show a READ-ONLY summary of the
// details they submitted plus where they are in the registration workflow.
// Details can be viewed but not edited until payment is complete.
//
// The basic member payload comes from /verify-otp via navigation state; we then
// fetch the full record (phones, address, NIC, photo, processes) from
// GET /api/members/{id} so every submitted field is visible.

const buildName = (initials, denoted, lastname) => {
  const lead = String(initials || denoted || "").trim();
  const tail = String(lastname || "").trim();
  return [lead, tail].filter(Boolean).join(" ") || "—";
};

const fmtDate = (v) => {
  if (!v) return "—";
  const s = String(v);
  return s.length >= 10 ? s.slice(0, 10) : s;
};

const isPaid = (m) => String(m?.payment_status || "").toLowerCase().includes("paid");

const statusColor = (status) => {
  const s = String(status || "").toLowerCase();
  if (s.includes("active") || s.includes("paid") || s.includes("issued") || s.includes("approved"))
    return { bg: "#dcfce7", color: "#15803d" };
  if (s.includes("pending") || s.includes("await") || s.includes("verification"))
    return { bg: "#fef3c7", color: "#b45309" };
  if (s.includes("reject") || s.includes("fail")) return { bg: "#fee2e2", color: "#b91c1c" };
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

const StepIcon = ({ state }) => {
  // state: "done" | "active" | "todo"
  const bg = state === "done" ? "#dcfce7" : state === "active" ? "#fef3c7" : "#f3f4f6";
  const color = state === "done" ? "#16a34a" : state === "active" ? "#d97706" : "#9ca3af";
  const d =
    state === "done"
      ? "M5 13l4 4L19 7"
      : state === "active"
      ? "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z";
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: bg }}>
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color }}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={state === "done" ? 3 : 2} d={d} />
      </svg>
    </div>
  );
};

// A grouped block of fields inside the profile card.
const Section = ({ title, icon, children }) => (
  <section>
    <div className="flex items-center gap-2.5 mb-5">
      <span className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
        {icon}
      </span>
      <h3 className="text-sm font-bold text-gray-900">{title}</h3>
    </div>
    <dl className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-10 gap-y-6">
      {children}
    </dl>
  </section>
);

// A single label / value pair. `wide` spans the full row (e.g. address).
const Field = ({ label, value, wide }) => (
  <div className={wide ? "sm:col-span-2 xl:col-span-3" : ""}>
    <dt className="text-xs font-medium text-gray-500">{label}</dt>
    <dd className="mt-1 text-sm text-gray-800 break-words [overflow-wrap:anywhere]">
      {value || "—"}
    </dd>
  </div>
);

export default function RegistrationStatus() {
  const navigate = useNavigate();
  const location = useLocation();

  const initial = location.state?.member || null;
  const email = location.state?.email || initial?.email || "";

  const [member, setMember] = useState(initial);
  const [loading, setLoading] = useState(Boolean(initial?.id));

  // No member in state (e.g. page opened directly) → back to login.
  useEffect(() => {
    if (!initial) navigate("/login", { replace: true });
  }, [initial, navigate]);

  // Enrich the basic payload with the full submitted record.
  useEffect(() => {
    if (!initial?.id) return;
    let on = true;
    getMember(initial.id)
      .then((full) => on && full && setMember((prev) => ({ ...prev, ...full })))
      .catch(() => {})
      .finally(() => on && setLoading(false));
    return () => {
      on = false;
    };
  }, [initial]);

  const isClubStudent = String(member?.member_type || "").toLowerCase().includes("club");
  const clubVerified = Boolean(member?.club_id);
  const paid = isPaid(member);

  // Workflow tracker — reflects the member's real status.
  const steps = useMemo(() => {
    const out = [
      { label: "Email verified", state: "done" },
      { label: "Registration form submitted", state: "done" },
    ];
    if (isClubStudent) {
      out.push({ label: "Club verification", state: clubVerified ? "done" : "active" });
    }
    out.push({
      label: "Payment",
      state: paid ? "done" : isClubStudent && !clubVerified ? "todo" : "active",
    });
    return out;
  }, [isClubStudent, clubVerified, paid]);

  if (!member) return null;

  const name = buildName(member.initials, member.name_denoted_by_initials, member.lastname);
  const photoUrl = storageUrl(member.photo_path) || member.photo_url || null;

  // Submitted fields grouped into logical sections for the profile card.
  const personal = [
    ["Member ID", member.member_id],
    ["Title", member.title],
    ["Full Name", name],
    ["Gender", member.member_gender],
    ["Date of Birth", fmtDate(member.date_of_birth)],
    ["NIC (Student / Guardian)", member.nic_number],
  ];
  const contact = [
    ["Email Address", member.email || email],
    ["Primary Phone", member.primary_phone_number],
    ["Secondary Phone", member.secondary_phone_number],
  ];
  const membership = [
    ["Membership Type", member.member_type],
    ...(isClubStudent
      ? [["Club", member.club_name || member.requested_club_name]]
      : []),
  ];

  const canPay = !(isClubStudent && !clubVerified);

  const Loader = ({ label }) => (
    <div className="flex items-center gap-2 py-10 text-sm text-gray-400">
      <svg className="animate-spin w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
      </svg>
      {label}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 m-0 px-4 sm:px-8 lg:px-12 xl:px-16 py-8">
      <div className="mx-auto w-full max-w-[1600px]">
        {/* ── Top bar ───────────────────────────────────────────────── */}
        <header className="flex items-center justify-between gap-4 bg-white rounded-2xl shadow-sm border border-gray-100 px-5 sm:px-8 py-4 mb-6">
          <div className="flex items-center gap-3">
            <img src={logo} alt="USJ Logo" className="w-12 h-12 sm:w-14 sm:h-14 object-contain flex-shrink-0" />
            <div>
              <p className="font-semibold text-gray-800 text-sm leading-tight whitespace-nowrap">University of Sri Jayewardenepura</p>
              <p className="text-xs text-blue-600">Sports Facility Portal</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <div className="text-right min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate max-w-[220px]">{name}</p>
              <p className="text-xs text-gray-500 truncate max-w-[220px]">{member.email || email}</p>
            </div>
            <div className="w-11 h-11 rounded-full overflow-hidden border border-gray-200 bg-gray-100 flex items-center justify-center flex-shrink-0">
              {photoUrl ? (
                <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-base font-semibold text-gray-400">{(name[0] || "?").toUpperCase()}</span>
              )}
            </div>
          </div>
        </header>

        {/* ── Payment-pending banner ────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:p-8 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 bg-amber-50">
              <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-gray-900">Payment Pending</h1>
              <p className="text-sm text-gray-500 mt-1 max-w-2xl">
                Welcome back, <span className="font-semibold text-blue-700">{name}</span>. Your registration is
                submitted but not yet active — complete your payment to activate your membership.
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <Pill>{member.member_status}</Pill>
                <Pill>{member.payment_status}</Pill>
              </div>
            </div>
          </div>
        </div>

        {/* ── Main dashboard grid ───────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left: profile / submitted details (read-only) */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Profile header strip */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 p-6 lg:p-8 bg-gradient-to-r from-blue-50/70 to-transparent border-b border-gray-100">
              <div className="w-32 h-36 rounded-xl overflow-hidden border-2 border-white shadow-md bg-gray-100 flex items-center justify-center flex-shrink-0">
                {photoUrl ? (
                  <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs text-gray-300">No photo</span>
                )}
              </div>
              <div className="text-center sm:text-left min-w-0">
                <h2 className="text-lg font-bold text-gray-900 break-words">{name}</h2>
                <p className="text-sm text-gray-500 mt-1">{member.member_id || "—"}</p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-blue-50 text-blue-700">
                    {member.member_type || "Member"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    View only
                  </span>
                </div>
              </div>
            </div>

            {/* Grouped detail sections */}
            <div className="p-6 lg:p-8">
              {loading ? (
                <Loader label="Loading your submitted details…" />
              ) : (
                <div className="space-y-10">
                  <Section
                    title="Personal Information"
                    icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                  >
                    {personal.map(([label, value]) => (
                      <Field key={label} label={label} value={value} />
                    ))}
                  </Section>

                  <Section
                    title="Contact Information"
                    icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
                  >
                    {contact.map(([label, value]) => (
                      <Field key={label} label={label} value={value} />
                    ))}
                    <Field label="Address" value={member.address} wide />
                  </Section>

                  <Section
                    title="Membership Information"
                    icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a4 4 0 014-4z" /></svg>}
                  >
                    {membership.map(([label, value]) => (
                      <Field key={label} label={label} value={value} />
                    ))}
                  </Section>
                </div>
              )}

              <p className="text-xs text-gray-400 mt-10 pt-6 border-t border-gray-100">
                Your details can't be changed until payment is complete.
              </p>
            </div>
          </div>

          {/* Right rail: progress + next steps */}
          <div className="space-y-6">
            {/* Registration progress timeline */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:p-7">
              <h2 className="font-bold text-sm text-gray-900 mb-6">Registration Progress</h2>
              <div className="relative">
                {steps.map((s, i) => (
                  <div key={s.label} className="relative flex gap-4 pb-6 last:pb-0">
                    {i < steps.length - 1 && (
                      <span className={`absolute left-4 top-8 -ml-px w-0.5 h-[calc(100%-1rem)] ${s.state === "done" ? "bg-green-300" : "bg-gray-200"}`} />
                    )}
                    <StepIcon state={s.state} />
                    <div className="pt-0.5">
                      <p className={`text-xs font-semibold ${s.state === "todo" ? "text-gray-400" : "text-gray-800"}`}>
                        {s.label}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {s.state === "done" ? "Completed" : s.state === "active" ? "In progress" : "Pending"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Next step / actions */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:p-7">
              <h2 className="font-bold text-sm text-gray-900 mb-2">Next Step</h2>
              {canPay ? (
                <>
                  <p className="text-sm text-gray-500 mb-5">
                    Complete your payment to activate your membership and access the portal.
                  </p>
                  <button
                    onClick={() => navigate("/payment-method", { state: { member, email } })}
                    className="w-full inline-flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white font-semibold py-3.5 rounded-xl text-sm transition shadow-sm hover:shadow-md"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    Complete Payment Now
                  </button>
                </>
              ) : (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 mb-5">
                  Your club must verify you before payment is enabled. You'll be notified once approved.
                </p>
              )}
              <button
                onClick={() => navigate("/login", { replace: true })}
                className="w-full text-sm font-medium text-gray-500 hover:text-blue-600 transition mt-3"
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-500 text-center mt-10">
          © {new Date().getFullYear()} University of Sri Jayewardenepura
        </p>
      </div>
    </div>
  );
}
