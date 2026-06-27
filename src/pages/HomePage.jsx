import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import logo from "../assets/usjp-logo__1_-removebg-preview.png";
import poolImg from "../assets/swiming pool image.jpg";
import { sendOtp } from "../services/authService";
import { isEmailRegistered } from "../services/memberService";

// ── Design tokens (shared across the whole app) ──
const NAVY = "#0f1c3f";
const BLUE = "#1a56db";
const BLUE_HOVER = "#1648c8";
const GOLD = "#e8a020";
const LIGHT_BLUE = "#e8f0fe";

// Tabs rendered inside the page (no route change).
const TABS = ["Home", "About Us", "Facilities", "Membership", "How It Works"];

const SvgIcon = ({ path, className = "w-6 h-6", stroke = "currentColor", fill = "none", width = 1.8 }) => (
  <svg className={className} fill={fill} viewBox="0 0 24 24" stroke={stroke}>
    {path.split("|").map((d, i) => (
      <path key={i} strokeLinecap="round" strokeLinejoin="round" strokeWidth={width} d={d} />
    ))}
  </svg>
);

// ════════════════════════════════════════════════
// DATA
// ════════════════════════════════════════════════
const FEATURES = [
  { icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", title: "Facility Booking", desc: "Book pool lanes, gym and sports facilities online." },
  { icon: "M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 000-2H5a1 1 0 000 2zm0 0v6a1 1 0 001 1h2", title: "QR Access", desc: "Secure and contactless entry with QR scanning." },
  { icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z", title: "Memberships", desc: "Manage student, coach and independent memberships." },
  { icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", title: "Attendance Tracking", desc: "Automatic attendance through gate scanning." },
  { icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z", title: "Online Payments", desc: "Pay membership and booking fees securely online." },
];

const WHO_CAN_USE = [
  { icon: "M12 14l9-5-9-5-9 5 9 5z|M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z", title: "Students", desc: "Register under a coach or as an independent user and access sports facilities." },
  { icon: "M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z|M21 12a9 9 0 11-18 0 9 9 0 0118 0z", title: "Coaches", desc: "Register clubs, manage members, approve students and book facilities." },
  { icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z", title: "Independent Users", desc: "Register without a coach and enjoy access to selected facilities." },
];

const STATS = [
  { value: "5,000+", label: "Active Members" },
  { value: "50+", label: "Sports Facilities" },
  { value: "100+", label: "Daily Bookings" },
];

const FACILITIES = [
  { icon: "M3 12h18M3 12c2 0 3 1.5 4.5 1.5S10.5 12 12 12s3 1.5 4.5 1.5S19 12 21 12M3 17c2 0 3 1.5 4.5 1.5S10.5 17 12 17s3 1.5 4.5 1.5S19 17 21 17", title: "Swimming Pool", desc: "Olympic-size pool with dedicated training and recreational lanes.", gradient: "linear-gradient(135deg,#1a56db,#0ea5e9)" },
  { icon: "M6.5 6.5l11 11M21 21l-1-1M3 3l1 1M18 6l3-3M6 18l-3 3M6.5 17.5L3 21M17.5 6.5L21 3M8 8l-2 2m10 6l-2 2", title: "Gymnasium", desc: "Fully-equipped fitness centre with modern strength and cardio gear.", gradient: "linear-gradient(135deg,#7c3aed,#4f46e5)" },
  { icon: "M4 4h16v16H4zM4 12h16M12 4v16", title: "Indoor Courts", desc: "Badminton, basketball and volleyball courts under one roof.", gradient: "linear-gradient(135deg,#0891b2,#1a56db)" },
  { icon: "M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6", title: "Outdoor Fields", desc: "Cricket, football and athletics grounds for every sport.", gradient: "linear-gradient(135deg,#16a34a,#0891b2)" },
  { icon: "M12 2a10 10 0 100 20 10 10 0 000-20zM2 12h20M12 2c3 3 3 17 0 20M12 2c-3 3-3 17 0 20", title: "Tennis Courts", desc: "Professional tennis courts for training, practice and matches.", gradient: "linear-gradient(135deg,#ea580c,#e8a020)" },
  { icon: "M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7M12 11v10", title: "Sports Complex", desc: "Multi-purpose complex for events, tournaments and competitions.", gradient: "linear-gradient(135deg,#0f1c3f,#1a56db)" },
];

const PLANS = [
  {
    name: "Student",
    price: "2,000",
    period: "per year",
    desc: "For university students joining under a coach or club.",
    features: ["Register under a coach / club", "Access to selected facilities", "QR-based gate access", "Attendance tracking", "Online booking & payments"],
    highlight: false,
  },
  {
    name: "Coach / Club",
    price: "5,000",
    period: "per year",
    desc: "For coaches registering and managing a sports club.",
    features: ["Register & manage a club", "Approve student members", "Manage up to 2 coaches included", "Priority facility booking", "Club dashboard & reports"],
    highlight: true,
  },
  {
    name: "Independent",
    price: "2,000",
    period: "per year",
    desc: "For members who want access without a coach.",
    features: ["Register without a coach", "Access to selected facilities", "QR-based gate access", "Attendance tracking", "Online booking & payments"],
    highlight: false,
  },
];

const BENEFITS = [
  { icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", title: "Online Booking", desc: "Reserve facilities anytime, anywhere." },
  { icon: "M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M16 20h4M4 12h4M5 8h2a1 1 0 000-2H5a1 1 0 000 2zm0 0v6a1 1 0 001 1h2", title: "QR Access", desc: "Contactless entry at every gate." },
  { icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm6 0V9a2 2 0 012-2h2a2 2 0 012 2v10a2 2 0 01-2 2h-2a2 2 0 01-2-2z", title: "Attendance Tracking", desc: "Your visits logged automatically." },
  { icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z", title: "Secure Payments", desc: "Pay fees safely online." },
  { icon: "M9 17v-2a4 4 0 014-4h4M3 7h18M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7", title: "Member Dashboard", desc: "Track plans, bookings and history." },
  { icon: "M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M12 6.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z", title: "Priority Support", desc: "Help whenever you need it." },
];

const STEPS = [
  { icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z", title: "Register", desc: "Create your account and verify your email with a one-time OTP." },
  { icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01", title: "Choose a Plan", desc: "Pick a student, coach or independent membership that fits you." },
  { icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z", title: "Make Payment", desc: "Pay your membership fee securely through online payment." },
  { icon: "M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M16 20h4M4 12h4M5 8h2a1 1 0 000-2H5a1 1 0 000 2zm0 0v6a1 1 0 001 1h2", title: "Get Your QR", desc: "Receive your digital membership QR code and ID card." },
  { icon: "M5 13l4 4L19 7", title: "Access Facilities", desc: "Scan your QR at the gate and enjoy world-class facilities." },
];

const FOOTER_COLUMNS = [
  { title: "Quick Links", links: ["Home", "About Us", "Facilities", "Membership", "How It Works"] },
  { title: "Facilities", links: ["Swimming Pool", "Gym", "Indoor Courts", "Outdoor Fields", "Sports Complex"] },
  { title: "Help & Support", links: ["FAQs", "User Guide", "Terms & Conditions", "Privacy Policy", "Contact Support"] },
];

// ════════════════════════════════════════════════
// SHARED UI
// ════════════════════════════════════════════════
const PrimaryButton = ({ children, onClick, className = "" }) => (
  <button
    onClick={onClick}
    className={`px-6 py-3 rounded-xl text-lg font-semibold text-white transition shadow-sm hover:shadow-md active:scale-[0.98] ${className}`}
    style={{ backgroundColor: BLUE }}
    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = BLUE_HOVER)}
    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = BLUE)}>
    {children}
  </button>
);

const SectionHeading = ({ eyebrow, title, subtitle, light = false }) => (
  <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10 lg:mb-14">
    {eyebrow && (
      <p className="text-base font-bold tracking-widest uppercase mb-2" style={{ color: light ? "#93b4ff" : BLUE }}>
        {eyebrow}
      </p>
    )}
    <h2 className="text-[1.5714rem] sm:text-[2rem] lg:text-[2.5714rem] font-extrabold leading-tight" style={{ color: light ? "#fff" : NAVY }}>{title}</h2>
    {subtitle && (
      <p className="mt-3 text-base sm:text-lg leading-relaxed" style={{ color: light ? "rgba(255,255,255,0.7)" : "#6b7280" }}>
        {subtitle}
      </p>
    )}
  </div>
);

// Quick-access login card shown in the home hero. It's a lightweight entry point
// to the email-OTP flow: the user types their email here and the OTP is sent
// straight from this card, then we hand off to the /login OTP-verification step
// (carrying the email through router state) so the user never has to press
// "Send OTP" again on the login page.
const LoginCard = ({ navigate }) => {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  // Set when the typed email has no account — we show a popup right here on the
  // home page (no redirect) asking the user to register first.
  const [notRegistered, setNotRegistered] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const target = email.trim();
    if (!target.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setSending(true);
    try {
      // Logging in requires an existing account. Check FIRST and, if the email
      // isn't registered, show the "No Account Found" popup HERE (no OTP sent,
      // no redirect) prompting the user to register. If the lookup itself fails,
      // fall through and send anyway — verify-otp still guards the account.
      let registered = true;
      try {
        registered = await isEmailRegistered(target);
      } catch {
        registered = true;
      }
      if (!registered) {
        setNotRegistered(true);
        toast.error("No account found. Please register first.");
        return;
      }
      // Registered — send the OTP here, then jump straight to the OTP step.
      await sendOtp(target);
      toast.success("OTP sent successfully!");
      navigate("/login", { state: { email: target, otpSent: true } });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
    <div className="bg-white rounded-2xl shadow-2xl p-7">
      {/* USJ Branding — matches the login page (EmailStep) card */}
      <div className="flex items-center gap-3 mb-6">
        <img src={logo} alt="USJ" className="w-14 h-14 object-contain flex-shrink-0" />
        <div>
          <p className="font-semibold text-lg leading-tight" style={{ color: NAVY }}>University of Sri Jayewardenepura</p>
          <p className="text-base" style={{ color: BLUE }}>Sports Facility Portal</p>
        </div>
      </div>

      <h2 className="text-center text-3xl sm:text-4xl font-bold mb-2" style={{ color: NAVY }}>
        Sign In
      </h2>
      <p className="text-base sm:text-lg text-gray-500 mb-6 leading-relaxed text-center">
        <span className="font-bold" style={{ color: BLUE }}>Already registered?</span> Sign in to your account.
      </p>

      <form onSubmit={submit}>
        <label className="block text-base sm:text-lg font-medium text-gray-700 mb-2">Email Address</label>
        <input
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(""); }}
          placeholder="yourname@sjp.ac.lk"
          className={`w-full h-12 lg:h-[3.7143rem] border rounded-lg px-4 text-base lg:text-lg focus:outline-none focus:ring-2 mb-1 transition ${
            error ? "border-red-400 focus:ring-red-400 bg-red-50" : "border-gray-300 focus:ring-blue-500"
          }`}
        />
        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
        <button
          type="submit"
          disabled={sending || !email.includes("@")}
          className="w-full h-12 lg:h-[3.7143rem] mt-3 text-white font-semibold rounded-lg text-base lg:text-lg transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md active:scale-[0.98]"
          style={{ backgroundColor: BLUE }}
          onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = BLUE_HOVER; }}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = BLUE)}>
          {sending ? "Sending OTP…" : "Sign In with OTP →"}
        </button>
      </form>

      <div className="text-center mt-5">
        <p className="text-lg text-gray-500">
          New here?{" "}
          <button onClick={() => navigate("/select-registration")} className="font-semibold hover:underline" style={{ color: BLUE }}>
            Register
          </button>
        </p>
      </div>
    </div>

    {/* No Account Found — popup shown on the home page itself (no redirect)
        when the typed email isn't registered. */}
    {notRegistered && (
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="home-no-account-title"
        onClick={() => setNotRegistered(false)}
      >
        <div
          className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setNotRegistered(false)}
            aria-label="Close"
            className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-amber-50">
            <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 id="home-no-account-title" className="text-xl font-bold text-gray-900 mb-1">No Account Found</h2>
          <p className="text-sm text-gray-500 mb-1">No registration exists for</p>
          <p className="text-sm font-semibold mb-5 break-all" style={{ color: BLUE }}>{email}</p>
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-4 mb-5">
            <p className="text-base font-semibold text-amber-700">Please register first to sign in.</p>
          </div>
          <button
            onClick={() => navigate("/select-registration", { state: { email: email.trim() } })}
            className="w-full text-white font-semibold py-3 rounded-lg text-sm transition mb-3"
            style={{ backgroundColor: BLUE }}
          >
            Register Now
          </button>
          <button
            onClick={() => setNotRegistered(false)}
            className="w-full font-semibold text-sm hover:underline"
            style={{ color: BLUE }}
          >
            Use a Different Email
          </button>
        </div>
      </div>
    )}
    </>
  );
};

// Compact hero used on every sub-tab (About / Facilities / Membership / How It Works).
const PageHero = ({ eyebrow, title, subtitle, primaryCta, onPrimary }) => (
  <section className="relative overflow-hidden min-h-[24.2857rem] sm:min-h-[27.1429rem]">
    <img src={poolImg} alt="" className="absolute inset-0 w-full h-full object-cover" />
    <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(7,20,45,0.96) 0%, rgba(7,20,45,0.88) 45%, rgba(7,20,45,0.55) 80%, rgba(7,20,45,0.25) 100%)" }} />
    <div className="relative z-10 max-w-[114.2857rem] mx-auto px-8 sm:px-12 lg:px-16 flex items-center min-h-[24.2857rem] sm:min-h-[27.1429rem] py-20">
      <div className="max-w-2xl pt-12 sm:pt-16">
        <p className="text-base font-bold tracking-widest uppercase mb-3" style={{ color: "#60a5fa" }}>{eyebrow}</p>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-tight">{title}</h1>
        <p className="mt-4 text-[1.0714rem] sm:text-[1.1429rem] lg:text-[1.2857rem] leading-relaxed" style={{ color: "rgba(255,255,255,0.78)" }}>{subtitle}</p>
        {primaryCta && (
          <div className="mt-7">
            <PrimaryButton onClick={onPrimary}>{primaryCta}</PrimaryButton>
          </div>
        )}
      </div>
    </div>
  </section>
);

// ════════════════════════════════════════════════
// TABS
// ════════════════════════════════════════════════
function HomeTab({ navigate }) {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden min-h-[34.2857rem] sm:min-h-[40rem] lg:min-h-[42.8571rem]">
        <img src={poolImg} alt="Swimming Pool" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(7,20,45,0.95) 0%, rgba(7,20,45,0.88) 35%, rgba(7,20,45,0.55) 60%, rgba(7,20,45,0.15) 100%)" }} />
        <div className="relative z-10 max-w-[114.2857rem] mx-auto px-8 sm:px-12 lg:px-16 min-h-[34.2857rem] sm:min-h-[40rem] lg:min-h-[42.8571rem] flex items-center py-24 lg:py-20">
          <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-4 items-center">
            <div className="max-w-2xl w-full">
              <p className="text-sm sm:text-base font-semibold tracking-widest mb-3" style={{ color: "#60a5fa" }}>WELCOME TO</p>
              <h1 className="text-[2rem] sm:text-[2.5714rem] lg:text-[3.4286rem] font-bold text-white leading-tight">
                Sports Facility<br />Management &<br />Access Control System
              </h1>
              <p className="mt-4 text-[1.0714rem] sm:text-[1.1429rem] lg:text-[1.2857rem] leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>
                A smart, secure and centralized platform to manage sports facilities, memberships, bookings, access and payments for a better sports experience.
              </p>
            </div>

            {/* LOGIN CARD */}
            <div className="w-full sm:max-w-[30rem] lg:max-w-[35.7143rem] mx-auto lg:mx-0 lg:justify-self-end">
              <LoginCard navigate={navigate} />
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES STRIP */}
      <section className="relative -mt-8 z-20 px-8 sm:px-12 lg:px-16">
        <div className="max-w-[102.8571rem] mx-auto bg-white rounded-2xl shadow-xl p-6 sm:p-8 lg:p-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-0">
            {FEATURES.map((f, i) => (
              <div key={i} className={`flex flex-col items-center text-center gap-4 px-4 py-6 group cursor-pointer rounded-xl hover:bg-blue-50 transition ${i !== 0 ? "lg:border-l" : ""}`} style={{ borderColor: "#eef2f9" }}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110" style={{ backgroundColor: "#eaf1fe" }}>
                  <SvgIcon path={f.icon} className="w-7 h-7" stroke="#2563eb" />
                </div>
                <div>
                  <p className="font-bold text-[1.1429rem] lg:text-[1.2857rem] mb-1" style={{ color: "#0c43db" }}>{f.title}</p>
                  <p className="text-[1rem] lg:text-[1.0714rem] text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHO CAN USE */}
      <section className="py-12 sm:py-16 lg:py-24 px-8 sm:px-12 lg:px-16" style={{ backgroundColor: "rgba(15,28,63,0.55)" }}>
        <div className="max-w-[114.2857rem] mx-auto">
          <h2 className="text-[1.5714rem] sm:text-[2rem] lg:text-[2.5714rem] font-extrabold leading-tight text-center mb-8 sm:mb-10 lg:mb-14 text-white">Who Can Use This System?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-12">
            {WHO_CAN_USE.map((item, i) => (
              <div key={i} className="bg-white rounded-2xl p-8 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow">
                <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: LIGHT_BLUE }}>
                  <SvgIcon path={item.icon} className="w-7 h-7" stroke={BLUE} />
                </div>
                <div>
                  <p className="font-bold text-lg mb-2" style={{ color: NAVY }}>{item.title}</p>
                  <p className="text-base text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function AboutTab({ navigate }) {
  return (
    <>
      <PageHero
        eyebrow="About Us"
        title="Empowering a Healthier Campus Community"
        subtitle="The Physical Education Unit of the University of Sri Jayewardenepura promotes fitness, sportsmanship and well-being through modern facilities and smart, accessible technology."
        primaryCta="Join Us Today"
        onPrimary={() => navigate("/select-registration")}
      />

      {/* OUR MISSION */}
      <section className="py-12 sm:py-16 lg:py-24 px-8 sm:px-12 lg:px-16 bg-white">
        <div className="max-w-[91.4286rem] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          <div className="lg:col-span-1 flex justify-center">
            <div className="w-28 h-28 rounded-3xl flex items-center justify-center" style={{ backgroundColor: LIGHT_BLUE }}>
              <SvgIcon path="M12 2l2.4 7.4H22l-6 4.6 2.3 7.4-6.3-4.6L5.7 21l2.3-7.4-6-4.6h7.6z" className="w-14 h-14" stroke={BLUE} />
            </div>
          </div>
          <div className="lg:col-span-2">
            <p className="text-base font-bold tracking-widest uppercase mb-2" style={{ color: BLUE }}>Our Mission</p>
            <h2 className="text-xl sm:text-2xl font-extrabold mb-4" style={{ color: NAVY }}>Sports, Technology & Excellence</h2>
            <p className="text-lg leading-relaxed text-gray-600">
              We aim to make sports facilities accessible to every student, coach and member of our community. By bringing bookings, memberships, access control and payments onto one secure platform, we remove barriers and let everyone focus on what matters — staying active, training hard and enjoying the game.
            </p>
          </div>
        </div>
      </section>

      {/* WHAT WE DO */}
      <section className="py-12 sm:py-16 lg:py-24 px-8 sm:px-12 lg:px-16" style={{ backgroundColor: "#f0f2f5" }}>
        <div className="max-w-[114.2857rem] mx-auto">
          <SectionHeading eyebrow="What We Do" title="Everything You Need in One Platform" subtitle="From booking a lane to managing a club, our system handles the full sports facility experience." />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((f, i) => (
              <div key={i} className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: LIGHT_BLUE }}>
                  <SvgIcon path={f.icon} className="w-7 h-7" stroke={BLUE} />
                </div>
                <p className="font-bold text-lg mb-1" style={{ color: NAVY }}>{f.title}</p>
                <p className="text-base text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="py-12 sm:py-16 lg:py-20 px-8 sm:px-12 lg:px-16" style={{ backgroundColor: NAVY }}>
        <div className="max-w-[91.4286rem] mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          {STATS.map((s, i) => (
            <div key={i}>
              <p className="text-3xl sm:text-4xl font-extrabold" style={{ color: "#60a5fa" }}>{s.value}</p>
              <p className="text-lg mt-2" style={{ color: "rgba(255,255,255,0.7)" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function FacilitiesTab({ navigate }) {
  return (
    <>
      <PageHero
        eyebrow="Facilities"
        title="World-Class Facilities for Every Athlete"
        subtitle="Explore our range of modern sports facilities — from an Olympic-size pool to fully-equipped courts and grounds, all bookable online."
        primaryCta="Book a Facility"
        onPrimary={() => navigate("/login")}
      />

      <section className="py-12 sm:py-16 lg:py-24 px-8 sm:px-12 lg:px-16 bg-white">
        <div className="max-w-[114.2857rem] mx-auto">
          <SectionHeading eyebrow="Our Facilities" title="Train, Play and Compete" subtitle="Each facility is maintained to the highest standard and available to all eligible members." />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {FACILITIES.map((f, i) => (
              <div key={i} className="rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow border border-gray-100 bg-white flex flex-col">
                <div className="h-36 flex items-center justify-center" style={{ background: f.gradient }}>
                  <SvgIcon path={f.icon} className="w-14 h-14" stroke="#fff" width={1.6} />
                </div>
                <div className="p-7 flex flex-col flex-1">
                  <p className="font-bold text-xl mb-1" style={{ color: NAVY }}>{f.title}</p>
                  <p className="text-base text-gray-500 leading-relaxed flex-1">{f.desc}</p>
                  <button
                    onClick={() => navigate("/login")}
                    className="mt-4 inline-flex items-center gap-1.5 text-base font-semibold self-start" style={{ color: BLUE }}>
                    Book now
                    <SvgIcon path="M14 5l7 7m0 0l-7 7m7-7H3" className="w-3.5 h-3.5" width={2} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function MembershipTab({ navigate }) {
  return (
    <>
      <PageHero
        eyebrow="Membership"
        title="Membership Plans for Everyone"
        subtitle="Whether you're a student, a coach or an independent member, there's a plan that gives you the access you need at a fair price."
        primaryCta="Get Started"
        onPrimary={() => navigate("/select-registration")}
      />

      {/* PLANS */}
      <section className="py-12 sm:py-16 lg:py-24 px-8 sm:px-12 lg:px-16" style={{ backgroundColor: "#f0f2f5" }}>
        <div className="max-w-[102.8571rem] mx-auto">
          <SectionHeading eyebrow="Choose Your Plan" title="Simple, Transparent Pricing" subtitle="All plans are billed annually. Prices are shown in Sri Lankan Rupees (LKR)." />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            {PLANS.map((p, i) => (
              <div
                key={i}
                className="relative rounded-2xl p-10 flex flex-col"
                style={{
                  backgroundColor: p.highlight ? NAVY : "#fff",
                  boxShadow: p.highlight ? "0 20px 40px -12px rgba(15,28,63,0.45)" : "0 1px 3px rgba(0,0,0,0.08)",
                  transform: p.highlight ? "scale(1.03)" : "none",
                }}>
                <p className="font-bold text-xl" style={{ color: p.highlight ? "#fff" : NAVY }}>{p.name}</p>
                <p className="text-base mt-1 mb-5" style={{ color: p.highlight ? "rgba(255,255,255,0.65)" : "#9ca3af" }}>{p.desc}</p>
                <div className="flex items-end gap-1 mb-6">
                  <span className="text-lg font-semibold mb-1" style={{ color: p.highlight ? "rgba(255,255,255,0.7)" : "#6b7280" }}>LKR</span>
                  <span className="text-3xl font-extrabold" style={{ color: p.highlight ? "#fff" : NAVY }}>{p.price}</span>
                  <span className="text-base mb-1.5" style={{ color: p.highlight ? "rgba(255,255,255,0.6)" : "#9ca3af" }}>/ {p.period}</span>
                </div>
                <ul className="space-y-3 flex-1 mb-6">
                  {p.features.map((feat, j) => (
                    <li key={j} className="flex items-start gap-2.5">
                      <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: p.highlight ? "rgba(96,165,250,0.25)" : LIGHT_BLUE }}>
                        <SvgIcon path="M5 13l4 4L19 7" className="w-2.5 h-2.5" stroke={p.highlight ? "#93b4ff" : BLUE} width={3} />
                      </span>
                      <span className="text-base leading-relaxed" style={{ color: p.highlight ? "rgba(255,255,255,0.85)" : "#4b5563" }}>{feat}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate("/select-registration")}
                  className="w-full py-3 rounded-xl text-lg font-semibold transition-colors"
                  style={{ backgroundColor: p.highlight ? GOLD : BLUE, color: p.highlight ? "#3b2a00" : "#fff" }}>
                  Get Started
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="py-12 sm:py-16 lg:py-24 px-8 sm:px-12 lg:px-16 bg-white">
        <div className="max-w-[114.2857rem] mx-auto">
          <SectionHeading eyebrow="Membership Benefits" title="Every Plan Comes Packed with Value" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {BENEFITS.map((b, i) => (
              <div key={i} className="flex items-start gap-4 rounded-2xl p-7 border border-gray-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: LIGHT_BLUE }}>
                  <SvgIcon path={b.icon} className="w-6 h-6" stroke={BLUE} />
                </div>
                <div>
                  <p className="font-bold text-lg mb-1" style={{ color: NAVY }}>{b.title}</p>
                  <p className="text-base text-gray-500 leading-relaxed">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function HowItWorksTab({ navigate }) {
  return (
    <>
      <PageHero
        eyebrow="How It Works"
        title="Simple Steps to Access and Enjoy Facilities"
        subtitle="Getting started takes just a few minutes. Register, choose your plan, pay online and start booking facilities right away."
        primaryCta="Start Now"
        onPrimary={() => navigate("/select-registration")}
      />

      <section className="py-12 sm:py-16 lg:py-24 px-8 sm:px-12 lg:px-16 bg-white">
        <div className="max-w-[114.2857rem] mx-auto">
          <SectionHeading eyebrow="How It Works" title="From Sign-Up to Game Day in 5 Steps" subtitle="A smooth, fully online process — no paperwork, no queues." />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
            {STEPS.map((s, i) => (
              <div key={i} className="relative bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-base font-bold mx-auto mb-4" style={{ backgroundColor: NAVY, color: "#fff" }}>
                  {i + 1}
                </div>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: LIGHT_BLUE }}>
                  <SvgIcon path={s.icon} className="w-7 h-7" stroke={BLUE} width={2} />
                </div>
                <p className="font-bold text-lg mb-1" style={{ color: NAVY }}>{s.title}</p>
                <p className="text-base text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>

          {/* CTA banner */}
          <div className="mt-16 rounded-3xl p-6 sm:p-8 lg:p-12 text-center" style={{ background: "linear-gradient(120deg,#0f1c3f,#1a56db)" }}>
            <h3 className="text-xl font-extrabold text-white mb-2">Ready to get started?</h3>
            <p className="text-lg mb-6" style={{ color: "rgba(255,255,255,0.75)" }}>Create your account today and access world-class facilities in minutes.</p>
            <div className="flex flex-wrap gap-4 justify-center">
              <button onClick={() => navigate("/select-registration")} className="px-7 py-3 rounded-xl text-lg font-semibold transition hover:opacity-90 active:scale-[0.98] shadow-sm hover:shadow-md" style={{ backgroundColor: GOLD, color: "#3b2a00" }}>Register Now →</button>
              <button onClick={() => navigate("/login")} className="px-7 py-3 rounded-xl text-lg font-semibold border border-white/50 text-white bg-white/10 hover:bg-white/20 transition active:scale-[0.98]">Sign In</button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

// ════════════════════════════════════════════════
// PAGE
// ════════════════════════════════════════════════
export default function HomePage() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeTab, setActiveTab] = useState("Home");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const goToTab = (tab) => {
    setActiveTab(tab);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const renderTab = () => {
    switch (activeTab) {
      case "About Us": return <AboutTab navigate={navigate} />;
      case "Facilities": return <FacilitiesTab navigate={navigate} />;
      case "Membership": return <MembershipTab navigate={navigate} />;
      case "How It Works": return <HowItWorksTab navigate={navigate} />;
      default: return <HomeTab navigate={navigate} />;
    }
  };

  return (
    <div className="min-h-screen font-sans bg-white overflow-x-hidden" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* ══ NAVBAR ══ */}
      <nav className="fixed top-0 left-0 right-0 z-50 transition-all" style={{ backgroundColor: scrolled ? "rgba(10,20,50,0.97)" : "rgba(10,20,50,0.85)", backdropFilter: "blur(8px)" }}>
        <div className="max-w-[114.2857rem] mx-auto px-8 sm:px-12 lg:px-16 flex items-center justify-between h-20">
          {/* Logo */}
          <button className="flex items-center gap-2 sm:gap-3 min-w-0" onClick={() => goToTab("Home")}>
            <img src={logo} alt="USJ" className="w-10 h-10 sm:w-12 sm:h-12 object-contain flex-shrink-0" />
            <div className="text-left min-w-0">
              <p className="text-white font-bold text-[0.7857rem] sm:text-lg leading-tight truncate">University of Sri Jayewardenepura</p>
              <p className="text-[0.7143rem] sm:text-base leading-tight truncate" style={{ color: GOLD }}>Physical Education Unit</p>
            </div>
          </button>

          {/* Desktop nav links */}
          <div className="hidden lg:flex items-center gap-6 xl:gap-8">
            {TABS.map((link) => {
              const active = activeTab === link;
              return (
                <button key={link} onClick={() => goToTab(link)}
                  className="text-base xl:text-lg font-medium transition-colors relative group whitespace-nowrap"
                  style={{ color: active ? "#fff" : "rgba(255,255,255,0.75)" }}>
                  {link}
                  {active && <span className="absolute -bottom-1 left-0 right-0 h-0.5 rounded" style={{ backgroundColor: GOLD }} />}
                  <span className="absolute -bottom-1 left-0 right-0 h-0.5 rounded scale-x-0 group-hover:scale-x-100 transition-transform origin-left" style={{ backgroundColor: GOLD }} />
                </button>
              );
            })}
          </div>

          {/* CTA buttons */}
          <div className="hidden lg:flex items-center gap-3 xl:gap-4">
            <button onClick={() => navigate("/login")} className="px-4 xl:px-6 py-2.5 rounded-lg text-base xl:text-lg font-semibold border transition-colors whitespace-nowrap" style={{ borderColor: "#fff", color: "#fff" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}>
              Sign In
            </button>
            <button onClick={() => navigate("/select-registration")} className="px-4 xl:px-6 py-2.5 rounded-lg text-base xl:text-lg font-semibold transition-colors whitespace-nowrap" style={{ backgroundColor: BLUE, color: "#fff" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = BLUE_HOVER)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = BLUE)}>
              Register
            </button>
          </div>

          {/* Mobile hamburger */}
          <button className="lg:hidden text-white p-2" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="lg:hidden px-4 pb-4 space-y-1" style={{ backgroundColor: "rgba(10,20,50,0.97)" }}>
            {TABS.map((link) => (
              <button key={link} onClick={() => goToTab(link)}
                className="block w-full text-left text-lg py-2.5"
                style={{ color: activeTab === link ? GOLD : "rgba(255,255,255,0.8)" }}>
                {link}
              </button>
            ))}
            <div className="flex gap-3 pt-2">
              <button onClick={() => navigate("/login")} className="flex-1 py-3 rounded-lg text-lg font-semibold border border-white text-white">Sign In</button>
              <button onClick={() => navigate("/select-registration")} className="flex-1 py-3 rounded-lg text-lg font-semibold text-white" style={{ backgroundColor: BLUE }}>Register</button>
            </div>
          </div>
        )}
      </nav>

      {/* ══ ACTIVE TAB ══ */}
      {renderTab()}

      {/* ══ FOOTER ══ */}
      <footer className="pt-6 pb-4 sm:pt-10 sm:pb-6 px-8 sm:px-12 lg:px-16" style={{ backgroundColor: "rgba(10,20,50,0.95)" }}>
        <div className="max-w-[114.2857rem] mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6 lg:gap-8 pb-5 sm:pb-8 border-b border-white border-opacity-10">
            {/* Brand — full width on mobile */}
            <div className="col-span-2 sm:col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                <img src={logo} alt="USJ" className="w-7 h-7 sm:w-9 sm:h-9 object-contain flex-shrink-0" />
                <div>
                  <p className="text-white font-bold text-sm sm:text-base leading-tight">University of Sri Jayewardenepura</p>
                  <p className="text-xs sm:text-sm" style={{ color: GOLD }}>Physical Education Unit</p>
                </div>
              </div>
              <p className="text-xs sm:text-sm leading-relaxed mb-3" style={{ color: "rgba(255,255,255,0.7)" }}>
                Empowering a healthy campus community through sports, technology and excellence.
              </p>
              <div className="flex gap-2">
                {[
                  "M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z",
                  "M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37zM17.5 6.5h.01M6.5 6.5A11.5 11.5 0 0017.5 17.5",
                  "M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.41 19.54C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.96A29 29 0 0023 12a29 29 0 00-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z",
                  "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
                ].map((path, i) => (
                  <button key={i} aria-label="Social link"
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-colors"
                    style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.18)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)")}>
                    <SvgIcon path={path} className="w-3 h-3 sm:w-4 sm:h-4" stroke="white" />
                  </button>
                ))}
              </div>
            </div>

            {/* Link columns */}
            {FOOTER_COLUMNS.map((col) => (
              <div key={col.title}>
                <p className="text-white font-bold text-xs sm:text-sm mb-2 sm:mb-3 uppercase tracking-wide">{col.title}</p>
                <div className="space-y-1 sm:space-y-2">
                  {col.links.map((link) => {
                    const isTab = TABS.includes(link);
                    return (
                      <button key={link}
                        onClick={() => (isTab ? goToTab(link) : null)}
                        className="block text-xs sm:text-sm transition-colors hover:text-white text-left"
                        style={{ color: "rgba(255,255,255,0.65)" }}>
                        {link}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Contact */}
            <div className="col-span-2 sm:col-span-1">
              <p className="text-white font-bold text-xs sm:text-sm mb-2 sm:mb-3 uppercase tracking-wide">Contact Us</p>
              <div className="space-y-2">
                {[
                  { icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z|M15 11a3 3 0 11-6 0 3 3 0 016 0z", text: "Physical Education Unit\nUniversity of Sri Jayewardenepura\nNugegoda, Sri Lanka" },
                  { icon: "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z", text: "011 275 0000" },
                  { icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z", text: "peu@sjp.ac.lk" },
                  { icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", text: "Mon–Fri: 8.00 AM – 5.00 PM" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <SvgIcon path={item.icon} className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" stroke={GOLD} />
                    <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-line" style={{ color: "rgba(255,255,255,0.65)" }}>{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="pt-3 sm:pt-5 text-center">
            <p className="text-xs sm:text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
              © 2026 University of Sri Jayewardenepura — Physical Education Unit. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
