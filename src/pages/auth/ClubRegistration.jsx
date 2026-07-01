import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/usjp-logo__1_-removebg-preview.png";
import api from "../../services/api";
import AuthShell from "../../components/auth/AuthShell";
import {
  sendOtp as sendOtpRequest,
  verifyOtp as verifyOtpRequest,
} from "../../services/authService";
import PaymentMethod from "./PaymentMethod";

//const SPORTS = ["Cricket","Football","Badminton","Swimming","Athletics","Volleyball","Basketball","Tennis","Rugby","Netball","Table Tennis","Karate"];
// All years from the current year back to 1950 (descending). The current year
// is the newest selectable option, so future years are never offered.
const EARLIEST_YEAR = 1900;
const YEARS = Array.from(
  { length: new Date().getFullYear() - EARLIEST_YEAR + 1 },
  (_, i) => (new Date().getFullYear() - i).toString()
);
const TITLE_OPTIONS = ["Mr", "Mrs", "Ms", "Miss", "Dr", "Rev."];

// Accepted profile-photo MIME types (JPG/JPEG share image/jpeg).
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Seconds the "Resend OTP" button stays disabled after each send, so users
// can't hammer the send-otp endpoint.
const RESEND_COOLDOWN_SECONDS = 60;

const STEPS = [
  { num: 1, label: "Club Details", sub: "Basic information" },
  { num: 2, label: "Coach Details", sub: "Add coaches" },
  { num: 3, label: "Summary", sub: "Review & confirm" },
];

// ── Input helpers (module scope so their identity is STABLE across renders;
//    defining them inside the component remounts every <input> on each keystroke,
//    which makes fields lose focus while typing) ──
const Field = ({ label, required, error, children }) => (
  <div>
    <label className="block text-xs font-medium text-gray-700 mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
    {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
  </div>
);

const Input = ({ icon, error, ...props }) => (
  <div className="relative">
    {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">{icon}</span>}
    <input
      {...props}
      className={`w-full border rounded-lg py-3 text-sm focus:outline-none focus:ring-2 text-gray-700 placeholder-gray-400 ${
        error ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"
      } ${icon ? "pl-8 pr-3" : "px-3"}`}
    />
  </div>
);

// Shared select className that turns red when the field has a validation error.
const selectClass = (error) =>
  `w-full border rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 text-gray-700 ${
    error ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"
  }`;

const emptyCoach = () => ({
  id: Date.now() + Math.random(),
  title: "",
  initials: "",
  nameWithInitials: "", // Name denoted by initials
  lastName: "",
  memberGenderId: "",
  email: "",
  nationalId: "",
  primaryPhone: "",
  secondaryPhone: "",
  dob: "",
  address: "",
  photo: null,
  photoError: "",
});

export default function ClubRegistration() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  // The club created by a successful registration (carries the numeric id), and
  // whether the "select payment method" popup is open.
  const [registeredClub, setRegisteredClub] = useState(null);
  const [showPayment, setShowPayment] = useState(false);

  // ── Email verification gate (mirrors StudentRegistration) ──
  // phase "email" → "otp" → "wizard". The club details wizard (numeric `step`)
  // is only reachable once the email is OTP-verified.
  const [phase, setPhase] = useState("email"); // "email" | "otp" | "wizard"
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState("");
  const [otpVerifying, setOtpVerifying] = useState(false);
  // Set when /verify-otp reports the responsible-coach email already belongs to
  // a registered member — such users may not register a club again.
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [timer, setTimer] = useState(165);
  // Seconds left before "Resend OTP" can be clicked again (0 = enabled).
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef([]);

  // ── Timer countdown for the OTP screen ──
  useEffect(() => {
    if (phase !== "otp" || timer <= 0) return;
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [phase, timer]);

  // ── Resend cooldown countdown ──
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  const minutes = String(Math.floor(timer / 60)).padStart(2, "0");
  const seconds = String(timer % 60).padStart(2, "0");

  // ── OTP handlers ──
  const sendOtp = async () => {
    setOtpSending(true);
    try {
      await sendOtpRequest(email);
      return true;
    } catch (err) {
      return false;
    } finally {
      setOtpSending(false);
    }
  };

  const handleSendOtp = async () => {
    if (!email.includes("@")) {
      setEmailError("Enter a valid email address.");
      return;
    }
    setEmailError("");
    // Re-registration is caught after verification: verify-otp reports
    // account_exists, at which point we show the "already registered" popup.
    // (There is no public pre-send existence check, so we just send the code.)
    const ok = await sendOtp();
    if (!ok) {
      setEmailError("Failed to send OTP. Please try again.");
      return;
    }
    setTimer(165);
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    setOtp(["", "", "", "", "", ""]);
    setPhase("otp");
  };

  const handleResendOtp = async () => {
    // Ignore clicks while the cooldown is still running or a send is in flight.
    if (resendCooldown > 0 || otpSending) return;
    setOtp(["", "", "", "", "", ""]);
    setOtpError("");
    const ok = await sendOtp();
    if (!ok) {
      setOtpError("Failed to resend OTP. Please try again.");
      return;
    }
    setTimer(165);
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0)
      inputRefs.current[index - 1]?.focus();
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newOtp = [...otp];
    pasted.split("").forEach((ch, i) => {
      newOtp[i] = ch;
    });
    setOtp(newOtp);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleVerifyOtp = async () => {
    const code = otp.join("");
    if (code.length < 6) {
      setOtpError("Enter all 6 digits.");
      return;
    }
    setOtpError("");
    setOtpVerifying(true);
    try {
      const data = await verifyOtpRequest(email, code);
      // Already-registered emails cannot start a new club registration — the
      // backend rejects a duplicate primary-coach email at submit, so stop here
      // and send them to login instead of into the wizard.
      if (data?.account_exists) {
        setAlreadyRegistered(true);
        return;
      }
      setPhase("wizard");
    } catch (err) {
      setOtpError(err?.response?.data?.message || "Invalid OTP. Please try again.");
    } finally {
      setOtpVerifying(false);
    }
  };

  // Club details
  const [club, setClub] = useState({
    name: "",
    sport: "",
    year: "",
    registerNumber: "",
    primaryPhone: "",
    secondaryPhone: "",
    address: "",
  });
  const [clubErrors, setClubErrors] = useState({});

  // Coaches
  const [coaches, setCoaches] = useState([emptyCoach()]);
  // Per-coach file-input refs (keyed by coach id) so we can reset the input's
  // value on photo removal — otherwise re-selecting the SAME file won't fire
  // onChange and the new preview never shows.
  const coachPhotoRefs = useRef({});
  // Per-coach validation messages: { [coachId]: { field: message, ... } }.
  const [coachErrors, setCoachErrors] = useState({});
  // Summary line shown above the wizard nav when a step fails validation.
  const [navError, setNavError] = useState("");

  // ── Genders (category-driven; from GET /api/member-genders) ──
  const [genders, setGenders] = useState([]);
  useEffect(() => {
    if (phase !== "wizard") return;
    let active = true;
    api
      .get("/api/member-genders")
      .then((res) => active && setGenders(res.data))
      .catch(() => active && setGenders([]));
    return () => {
      active = false;
    };
  }, [phase]);

  // Submit state for POST /api/club-registrations
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Live fee preview — POST /api/club-registration-fee-preview { coach_count }.
  // Falls back to the local estimate if the call fails or the shape is unknown.
  const [feePreview, setFeePreview] = useState(null);
  useEffect(() => {
    if (phase !== "wizard") return;
    let active = true;
    api
      .post("/api/club-registration-fee-preview", { coach_count: coaches.length })
      .then((res) => active && setFeePreview(res.data))
      .catch(() => active && setFeePreview(null));
    return () => {
      active = false;
    };
  }, [phase, coaches.length]);

  const handleClubChange = (e) => {
    setClub({ ...club, [e.target.name]: e.target.value });
    setClubErrors({ ...clubErrors, [e.target.name]: "" });
  };

  // Clear a single coach's field-level error (no-op if there isn't one).
  const clearCoachError = (id, field) =>
    setCoachErrors((prev) => {
      if (!prev[id]?.[field]) return prev;
      return { ...prev, [id]: { ...prev[id], [field]: "" } };
    });

  const handleCoachChange = (id, field, value) => {
    setCoaches((prev) => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
    clearCoachError(id, field);
  };

  const handleCoachPhoto = (id, file) => {
    if (!file) return;
    // accept="" is only a picker hint — validate the real MIME type so drag-drop
    // or a renamed non-image file can't slip through.
    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      setCoaches((prev) => prev.map(c => c.id === id ? { ...c, photoError: "Use a JPG, PNG, or WebP image", photo: null } : c));
      return;
    }
    if (file.size > 1 * 1024 * 1024) {
      setCoaches((prev) => prev.map(c => c.id === id ? { ...c, photoError: "Max 1MB", photo: null } : c));
      return;
    }
    setCoaches((prev) => prev.map(c => c.id === id ? { ...c, photo: file, photoError: "" } : c));
    clearCoachError(id, "photo");
  };

  const addCoach = () => setCoaches([...coaches, emptyCoach()]);

  const removeCoach = (id) => {
    if (coaches.length === 1) return;
    setCoaches(coaches.filter(c => c.id !== id));
    // Drop any stored errors for the removed coach.
    setCoachErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  // Convenience accessor for a coach's field error in JSX.
  const coachErr = (id, field) => coachErrors[id]?.[field] || "";

  const validateClub = () => {
    const errs = {};
    if (!club.name.trim()) errs.name = "Required";
    if (!club.year) errs.year = "Required";
    if (!club.registerNumber.trim()) errs.registerNumber = "Required";
    if (!club.primaryPhone.trim()) errs.primaryPhone = "Required";
    if (!club.address.trim()) errs.address = "Required";
    setClubErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateCoaches = () => {
    const errs = {};
    coaches.forEach((c, i) => {
      const e = {};
      if (!c.title) e.title = "Required";
      if (!c.initials.trim()) e.initials = "Required";
      // Initials must be single letters each followed by a dot, e.g. "N.P."
      else if (!/^([A-Za-z]\.\s?)+$/.test(c.initials.trim()))
        e.initials = "Use a dot after each initial, e.g. N.P.";
      if (!c.nameWithInitials.trim()) e.nameWithInitials = "Required";
      if (!c.lastName.trim()) e.lastName = "Required";
      if (!c.memberGenderId) e.memberGenderId = "Required";
      if (!c.nationalId.trim()) e.nationalId = "Required";
      if (!c.primaryPhone.trim()) e.primaryPhone = "Required";
      if (!c.address.trim()) e.address = "Required";
      // Only the primary coach (index 0) must upload a photo.
      if (i === 0 && !c.photo) e.photo = "A profile photo is required.";
      // The primary coach reuses the OTP-verified email; additional coaches
      // must supply a valid email of their own (no OTP needed).
      if (i > 0 && (!c.email || !c.email.includes("@")))
        e.email = "Enter a valid email.";
      if (Object.keys(e).length) errs[c.id] = e;
    });
    setCoachErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && !validateClub()) {
      setNavError("Please correct the highlighted fields below.");
      return;
    }
    if (step === 2 && !validateCoaches()) {
      setNavError("Please correct the highlighted coach fields below.");
      return;
    }
    setNavError("");
    setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    // Only the primary coach (index 0) must have a photo; additional coaches
    // are optional. The backend requires coach_photos[0].
    if (!coaches[0]?.photo) {
      setSubmitError("A profile photo is required for the primary coach.");
      return;
    }

    // =============================================
    // API CALL — POST /api/club-registrations (multipart/form-data).
    // Documented fields (live OpenAPI): clubName, regNo, primaryPhoneNumber,
    // address, coaches (JSON string array), coach_photos[] (files, same order
    // as the coaches array). Gated by the OTP-verified session cookie, which
    // `api` carries via withCredentials.
    // =============================================
    const fd = new FormData();
    fd.append("email", email);
    fd.append("clubName", club.name);
    fd.append("regNo", club.registerNumber);
    fd.append("primaryPhoneNumber", club.primaryPhone);
    fd.append("address", club.address);

    const coachPayload = coaches.map((c, i) => ({
      title: c.title,
      initials: c.initials,
      // Backend (ClubRegistrationController::normalizedInput) maps these
      // camelCase keys → name_denoted_by_initials / lastname / member_gender_id.
      nameWithInitials: c.nameWithInitials,
      lastName: c.lastName,
      memberGenderId: c.memberGenderId,
      // Primary coach (index 0) is the OTP-verified email; the backend also
      // overrides coaches[0].email with the verified session email. Additional
      // coaches send the email typed in the form (stored only, no OTP).
      email: i === 0 ? email : c.email,
      nic: c.nationalId,
      primaryPhone: c.primaryPhone,
      secondaryPhone: c.secondaryPhone || null,
      dob: c.dob || null,
      address: c.address,
    }));
    fd.append("coaches", JSON.stringify(coachPayload));
    // Key each photo by its coach index (coach_photos[0], coach_photos[2], …)
    // so the backend pairs it with the matching coach even when a coach in
    // between has no photo. Only the primary coach's photo is mandatory.
    coaches.forEach((c, i) => {
      if (c.photo) fd.append(`coach_photos[${i}]`, c.photo);
    });

    setSubmitError("");
    setSubmitting(true);
    try {
      // Club registration now creates a PROCESS (not a club yet) and returns
      // { process_id, payable_amount, payment_reference, ... } wrapped in an
      // array. Peel any array nesting and carry the process details forward so
      // PaymentMethod can pay against the club registration process.
      let data = (await api.post("/api/club-registrations", fd))?.data;
      while (Array.isArray(data)) data = data[0];
      setRegisteredClub({
        process_id: data?.process_id,
        payable_amount: data?.payable_amount,
        payment_reference: data?.payment_reference,
        club_name: club.name,
      });
      setSubmitted(true);
    } catch (err) {
      const data = err?.response?.data;
      const firstError = data?.errors
        ? Object.values(data.errors)[0]?.[0]
        : null;
      setSubmitError(
        firstError ||
          data?.message ||
          "Club registration failed. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Top navigation bar — logo + branding only (matches the public site) ──
  const NavBar = () => (
    <nav
      className="fixed top-0 left-0 right-0 z-50"
      style={{ backgroundColor: "rgba(10,20,50,0.97)", backdropFilter: "blur(8px)" }}
    >
      <div className="max-w-[114.2857rem] mx-auto px-8 sm:px-12 lg:px-16 flex items-center h-20">
        {/* Logo + branding */}
        <button className="flex items-center gap-2 sm:gap-3 min-w-0" onClick={() => navigate("/")}>
          <img src={logo} alt="USJ" className="w-10 h-10 sm:w-12 sm:h-12 object-contain flex-shrink-0" />
          <div className="text-left min-w-0">
            <p className="text-white font-bold text-[0.7857rem] sm:text-lg leading-tight truncate">University of Sri Jayewardenepura</p>
            <p className="text-[0.7143rem] sm:text-base leading-tight truncate" style={{ color: "#e8a020" }}>Physical Education Unit</p>
          </div>
        </button>
      </div>
    </nav>
  );

  // Footer copyright shared by every step (matches the login page).
  const Footer = () => (
    <p className="text-base text-gray-500 text-center py-6">
      © {new Date().getFullYear()} University of Sri Jayewardenepura
    </p>
  );

  // ── Step indicator ───────────────────────────
  const StepBar = () => (
    <div className="flex items-center gap-0 mb-6">
      {STEPS.map((s, i) => (
        <React.Fragment key={s.num}>
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => step > s.num && setStep(s.num)}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 flex-shrink-0 transition-all ${
              step > s.num
                ? "bg-green-500 text-white border-green-500"
                : step === s.num
                ? "bg-blue-700 text-white border-blue-700"
                : "bg-white text-gray-500 border-gray-300"
            }`}>
              {step > s.num ? (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : s.num}
            </div>
            <div className="hidden sm:block">
              <p className={`text-xs font-semibold ${step === s.num ? "text-blue-700" : step > s.num ? "text-green-600" : "text-gray-500"}`}>{s.label}</p>
              <p className="text-xs text-gray-500">{s.sub}</p>
            </div>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`flex-1 h-px mx-3 ${step > s.num ? "bg-green-500" : "bg-gray-200"}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  // Shared branding block for the email/OTP gate cards (matches the login page).
  const GateHeader = () => (
    <div className="flex items-center gap-3 sm:gap-5 mb-6 sm:mb-10">
      <img src={logo} alt="USJ Logo" className="w-16 h-16 sm:w-24 sm:h-24 object-contain flex-shrink-0" />
      <div>
        <p className="font-semibold text-gray-800 text-sm sm:text-xl leading-tight whitespace-nowrap">University of Sri Jayewardenepura</p>
        <p className="text-sm sm:text-lg text-blue-600">Sports Facility Portal</p>
      </div>
    </div>
  );

  // Dismiss the "already registered" popup and return to the email step so the
  // user can enter a different address.
  const closeAlreadyRegistered = () => {
    setAlreadyRegistered(false);
    setPhase("email");
    setEmail("");
    setEmailError("");
  };

  // ══════════════════════════════════════════════
  // ALREADY REGISTERED — popup (blocks re-registration)
  // Shown before any OTP is sent when the typed email already has an account,
  // and again as a fallback if verify-otp reports account_exists. It overlays
  // the current step instead of navigating away, so the user stays put.
  // ══════════════════════════════════════════════
  const AlreadyRegisteredModal = () => (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="already-registered-title"
      onClick={closeAlreadyRegistered}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={closeAlreadyRegistered}
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
        <h2 id="already-registered-title" className="text-xl font-bold text-gray-900 mb-1">Email Already Registered</h2>
        <p className="text-sm text-gray-500 mb-1">An account already exists for</p>
        <p className="text-sm font-semibold text-blue-700 mb-5 break-all">{email}</p>
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-4 mb-5">
          <p className="text-base font-semibold text-amber-700">
            Please log in instead, or use a different email address to register.
          </p>
        </div>
        <button
          onClick={() => navigate("/login", { state: { email } })}
          className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 rounded-lg text-sm transition mb-3"
        >
          Log In
        </button>
        <button
          onClick={closeAlreadyRegistered}
          className="w-full text-blue-600 font-semibold text-sm hover:underline"
        >
          Use a Different Email
        </button>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════
  // GATE STEP 1 — EMAIL
  // ══════════════════════════════════════════════
  if (phase === "email") {
    return (
      <AuthShell>
        <div className="w-full max-w-2xl">
          <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 lg:p-12 w-full">
            <GateHeader />

            <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">Registration</h1>
            <p className="text-lg text-gray-500 mb-8 text-center">
              Enter the club's email to verify your identity before registering.
            </p>

            <label className="block text-lg font-medium text-gray-700 mb-2">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
              placeholder="club@sjp.ac.lk"
              className="w-full border border-gray-300 rounded-xl px-4 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-1"
            />
            {emailError && <p className="text-base text-red-500 mb-2">{emailError}</p>}

            <button
              onClick={handleSendOtp}
              disabled={otpSending || !email}
              className="w-full bg-blue-700 hover:bg-blue-800 disabled:bg-blue-300 text-white font-semibold py-5 rounded-xl text-lg mt-4 transition">
              {otpSending ? "Sending OTP…" : "Send OTP"}
            </button>

            <p className="flex items-center justify-center gap-1.5 text-base text-gray-500 mt-4">
              <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Email verification required to register
            </p>
          </div>

          <div className="text-center mt-6">
            <button onClick={() => navigate("/select-registration")} className="text-lg text-blue-600 font-semibold hover:underline">
              ← Back to registration options
            </button>
          </div>
        </div>
        <Footer />
        {alreadyRegistered && <AlreadyRegisteredModal />}
      </AuthShell>
    );
  }

  // ══════════════════════════════════════════════
  // GATE STEP 2 — OTP VERIFY
  // ══════════════════════════════════════════════
  if (phase === "otp") {
    return (
      <AuthShell>
        <div className="w-full max-w-2xl">
          <div className="bg-white rounded-3xl shadow-xl p-12 w-full text-center">
            <GateHeader />

            <h2 className="text-3xl font-bold text-gray-900 mb-2">Verify Your Email</h2>
            <p className="text-lg text-gray-500 mb-1">Enter the 6 digit code sent to</p>
            <p className="text-lg font-semibold text-blue-700 mb-8">{email}</p>

            <div className="flex justify-center gap-2 sm:gap-3 mb-4" onPaste={handleOtpPaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (inputRefs.current[i] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className="w-10 h-12 sm:w-14 sm:h-16 border-2 border-gray-300 rounded-lg text-center text-xl sm:text-2xl font-bold focus:outline-none focus:border-blue-600 transition"
                />
              ))}
            </div>

            {otpError && <p className="text-base text-red-500 mb-2">{otpError}</p>}

            <p className="text-base text-gray-500 mb-4">
              {timer > 0 ? (
                <>Code expires in <span className="font-semibold text-red-500">{minutes}:{seconds}</span></>
              ) : (
                <span className="text-red-500 font-semibold">Code expired.</span>
              )}{" "}
              <button onClick={handleResendOtp} disabled={otpSending || resendCooldown > 0}
                className="text-blue-600 font-semibold hover:underline ml-1 disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed">
                {otpSending
                  ? "Sending…"
                  : resendCooldown > 0
                  ? `Resend OTP in ${resendCooldown}s`
                  : "Resend OTP"}
              </button>
            </p>

            <button
              onClick={handleVerifyOtp}
              disabled={otpVerifying || otp.join("").length < 6}
              className="w-full bg-blue-700 hover:bg-blue-800 disabled:bg-blue-300 text-white font-semibold py-5 rounded-xl text-lg transition">
              {otpVerifying ? "Verifying…" : "Verify & Continue"}
            </button>

            <button onClick={() => setPhase("email")} className="mt-4 text-base text-gray-500 hover:text-blue-600 transition w-full">
              Change email
            </button>
          </div>
        </div>
        <Footer />
        {alreadyRegistered && <AlreadyRegisteredModal />}
      </AuthShell>
    );
  }

  // The SUBMITTED confirmation is no longer a separate page; it is rendered as a
  // popup over the summary (see the modal at the end of the main return below).

  // ══════════════════════════════════════════════
  // FEE CALCULATION (right panel)
  // ══════════════════════════════════════════════
  const baseFee = 5000;
  const extraCoaches = Math.max(0, coaches.length - 2);
  const extraFee = extraCoaches * 2500;
  const localTotal = baseFee + extraFee;
  // Prefer the server-calculated fee when the preview endpoint responds; the
  // exact key isn't pinned in the spec, so accept the common ones, else fall
  // back to the local estimate.
  const apiTotal =
    feePreview != null
      ? feePreview.total ??
        feePreview.total_fee ??
        feePreview.totalFee ??
        feePreview.fee ??
        feePreview.amount
      : null;
  const totalFee = apiTotal != null ? Number(apiTotal) : localTotal;

  // ══════════════════════════════════════════════
  // SUMMARY PANEL (right)
  // ══════════════════════════════════════════════
  const SummaryPanel = ({ twoColumn = false } = {}) => (
    <div className={twoColumn ? "grid grid-cols-1 lg:grid-cols-2 gap-5 items-start" : "space-y-3"}>
      {/* Club Info */}
      <div className="bg-white rounded-xl border border-gray-100 p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-blue-700">Club Information</p>
          {step !== 3 && (
            <button onClick={() => setStep(1)} className="text-xs flex items-center gap-1 text-blue-600">

              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Edit
            </button>
          )}
        </div>
        <div className={twoColumn ? "grid grid-cols-1 sm:grid-cols-2 gap-x-10" : ""}>
          {[
            ["Club Name", club.name || "—"],
            ["Sport", club.sport || "—"],
            ["Register Year", club.year || "—"],
            ["Register Number", club.registerNumber || "—"],
            ["Primary Phone", club.primaryPhone || "—"],
            ["Secondary Phone", club.secondaryPhone || "—"],
            ["Address", club.address || "—"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between py-1 border-b border-gray-50 last:border-0">
              <span className="text-xs text-gray-500">{k}</span>
              <span className="text-xs font-medium text-gray-700 text-right max-w-32 truncate">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Coach List */}
      {coaches.some(c => c.nameWithInitials || c.lastName) && (
        <div className="bg-white rounded-xl border border-gray-100 p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-blue-700">
              Coach List ({coaches.length} Coach{coaches.length > 1 ? "es" : ""})
            </p>
            {step !== 3 && (
              <button onClick={() => setStep(2)} className="text-xs flex items-center gap-1 text-blue-600">

                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
            )}
          </div>
          {coaches.map((c, i) => (
            <div key={c.id} className="py-3 border-b border-gray-50 last:border-0">
              {/* Coach header row */}
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {c.photo ? (
                    <img src={URL.createObjectURL(c.photo)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-semibold text-gray-800">
                      {[c.title, c.initials, c.lastName].filter(Boolean).join(" ") || "—"}
                    </p>
                    {c.nameWithInitials && (
                      <span className="text-xs text-gray-500">({c.nameWithInitials})</span>
                    )}
                    {i === 0 && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                        Primary Coach
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Coach details grid */}
              <div className={twoColumn ? "grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 pl-1" : "space-y-1 pl-1"}>
                {[
                  ["Email", i === 0 ? email : c.email],
                  ["Gender", genders.find((g) => String(g.category_id) === String(c.memberGenderId))?.description],
                  ["National ID", c.nationalId],
                  ["Primary Phone", c.primaryPhone],
                  ["Secondary Phone", c.secondaryPhone],
                  ["Date of Birth", c.dob],
                  ["Address", c.address],
                ].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <span className="text-xs text-gray-500 flex-shrink-0 w-28">{k}</span>
                    <span className="text-xs font-medium text-gray-700 break-words">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Fee Breakdown */}
      <div className={`bg-white rounded-xl border border-gray-100 p-3 ${twoColumn ? "lg:col-span-2" : ""}`}>
        <p className="text-xs font-bold mb-3 text-blue-700">Registration Fee</p>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-xs text-gray-500">Base fee (Club + 2 Coaches)</span>
            <span className="text-xs font-medium text-gray-700">LKR 5,000</span>
          </div>
          {extraCoaches > 0 && (
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Extra coaches ({extraCoaches} × LKR 2,500)</span>
              <span className="text-xs font-medium text-gray-700">LKR {extraFee.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between border-t pt-2 mt-2">
            <span className="text-xs font-bold text-gray-700">Total</span>
            <span className="text-sm font-bold text-blue-700">LKR {totalFee.toLocaleString()}</span>
          </div>
        </div>

        {step === 3 && (
          <div className="mt-3">
            {submitError && (
              <p className="text-xs text-red-500 mb-2 text-center">{submitError}</p>
            )}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full max-w-xs ml-auto bg-blue-700 hover:bg-blue-800 disabled:bg-blue-300 text-white font-semibold py-3 rounded-lg text-sm transition flex items-center justify-center gap-2">
              {submitting ? "Submitting…" : "Submit"}
              {!submitting && (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-blue-100 pt-28">
      <NavBar />
      {/* Cap the content at the same 1600px width as the student form and centre it,
          so it uses the full desktop width but doesn't stretch edge-to-edge on ultrawide. */}
      <div className="w-full max-w-[114.2857rem] mx-auto flex flex-col flex-1">

        <div className="flex flex-1">
        {/* Main content */}
        <div className="flex-1 p-4 sm:p-6 min-w-0">
          <StepBar />

          {/* ── STEP 1: Club Details ── */}
          {step === 1 && (
            <div>
              <h2 className="font-bold text-base mb-1 text-gray-900">Club Details</h2>
              <p className="text-xs text-gray-500 mb-4">Enter the basic information about your club.</p>

              <div className="bg-white rounded-xl shadow-sm p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <Field label="Club Name" required error={clubErrors.name}>
                    <Input name="name" value={club.name} onChange={handleClubChange} placeholder="Enter club name" error={clubErrors.name} />
                  </Field>
                  <Field label="Register Year" required error={clubErrors.year}>
                    <select name="year" value={club.year} onChange={handleClubChange}
                      className={selectClass(clubErrors.year)}>
                      <option value="">Select year</option>
                      {YEARS.map(y => <option key={y}>{y}</option>)}
                    </select>
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <Field label="Register Number" required error={clubErrors.registerNumber}>
                    <Input icon="#" name="registerNumber" value={club.registerNumber} onChange={handleClubChange} placeholder="Enter register number" error={clubErrors.registerNumber} />
                  </Field>
                  <Field label="Primary Phone Number" required error={clubErrors.primaryPhone}>
                    <Input icon="📞" name="primaryPhone" value={club.primaryPhone} onChange={handleClubChange} placeholder="Enter primary phone number" error={clubErrors.primaryPhone} />
                  </Field>
                  <Field label="Secondary Phone Number">
                    <Input icon="📞" name="secondaryPhone" value={club.secondaryPhone} onChange={handleClubChange} placeholder="Enter secondary phone number" />
                  </Field>
                </div>

                <div className="mt-4">
                  <Field label="Address" required error={clubErrors.address}>
                    <Input name="address" value={club.address} onChange={handleClubChange} placeholder="Sports Complex, University of Sri Jayewardenepura" error={clubErrors.address} />
                  </Field>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: Coach Details ── */}
          {step === 2 && (
            <div>
              <div className="mb-1">
                <h2 className="font-bold text-base text-gray-900">Coach Details</h2>
                <p className="text-xs text-gray-500">Add one or more coaches to your club.</p>
              </div>

              <p className="text-xs text-gray-500 mb-4 mt-2">
                You can reorder coaches by order added. The first coach will be the primary coach.
              </p>

              {/* Pricing notice — simple, user-facing fee explanation. */}
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl p-4 mb-4">
                <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-amber-800">Registration fee</p>
                  <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                    The registration fee includes up to <span className="font-semibold">2 coaches</span> for{" "}
                    <span className="font-semibold">LKR 5,000</span>. Each additional coach is charged{" "}
                    <span className="font-semibold">LKR 2,500</span>.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {coaches.map((coach, idx) => (
                  <div key={coach.id} className="relative bg-white rounded-xl shadow-sm p-5">
                    {/* Remove */}
                    {idx !== 0 && (
                      <button onClick={() => removeCoach(coach.id)}
                        aria-label="Remove coach"
                        className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 hover:border-red-300 hover:text-red-700 transition">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Remove
                      </button>
                    )}
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                      {/* Photo — enlarged & prominent so it's easy to spot */}
                      <div className="flex flex-col items-center gap-2 flex-shrink-0 w-full sm:w-44">
                        <p className="text-xs font-semibold text-gray-700 self-start sm:self-center">
                          Coach Photo <span className="text-red-500">*</span>
                        </p>
                        <div className={`w-36 h-40 rounded-xl overflow-hidden border-2 bg-gray-100 flex items-center justify-center ${
                          coach.photoError || coachErr(coach.id, "photo") ? "border-red-500" : "border-gray-200"
                        }`}>
                          {coach.photo ? (
                            <img src={URL.createObjectURL(coach.photo)} alt="" className="w-full h-full object-contain" />
                          ) : (
                            <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          )}
                        </div>
                        <label className="cursor-pointer w-full">
                          <div className="px-4 py-2 rounded-lg border-2 border-gray-300 text-xs font-medium text-gray-700 hover:border-blue-500 hover:text-blue-600 transition text-center">
                            {coach.photo ? "Change Photo" : "Upload Photo"}
                          </div>
                          <input
                            ref={el => { coachPhotoRefs.current[coach.id] = el; }}
                            type="file" accept=".png,.jpg,.jpeg,.webp" className="hidden"
                            onChange={e => handleCoachPhoto(coach.id, e.target.files[0])} />
                        </label>
                        {coach.photo && (
                          <button
                            type="button"
                            onClick={() => {
                              setCoaches(prev => prev.map(c => c.id === coach.id ? { ...c, photo: null, photoError: "" } : c));
                              // Reset the input so re-selecting the same file fires onChange.
                              if (coachPhotoRefs.current[coach.id]) coachPhotoRefs.current[coach.id].value = "";
                            }}
                            className="text-xs font-medium text-red-500 hover:underline"
                          >
                            Remove Photo
                          </button>
                        )}
                        <p className="text-xs text-gray-400 text-center leading-snug">PNG / JPG · used on the coach's QR card</p>
                        {(coach.photoError || coachErr(coach.id, "photo")) && (
                          <p className="text-xs text-red-500 text-center">
                            {coach.photoError || coachErr(coach.id, "photo")}
                          </p>
                        )}
                      </div>

                      {/* Fields */}
                      <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <Field label="Title" required error={coachErr(coach.id, "title")}>
                          <select
                            value={coach.title}
                            onChange={e => handleCoachChange(coach.id, "title", e.target.value)}
                            className={selectClass(coachErr(coach.id, "title"))}
                          >
                            <option value="">-- Select --</option>
                            {TITLE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </Field>
                        <Field label="Initials" required error={coachErr(coach.id, "initials")}>
                          <Input value={coach.initials} onChange={e => handleCoachChange(coach.id, "initials", e.target.value)} placeholder="N.P." error={coachErr(coach.id, "initials")} />
                        </Field>
                        <Field label="Name Denoted by Initials" required error={coachErr(coach.id, "nameWithInitials")}>
                          <Input value={coach.nameWithInitials} onChange={e => handleCoachChange(coach.id, "nameWithInitials", e.target.value)} placeholder="Nimal Perera" error={coachErr(coach.id, "nameWithInitials")} />
                        </Field>
                        <Field label="Last Name" required error={coachErr(coach.id, "lastName")}>
                          <Input value={coach.lastName} onChange={e => handleCoachChange(coach.id, "lastName", e.target.value)} placeholder="Perera" error={coachErr(coach.id, "lastName")} />
                        </Field>
                        <Field label="Gender" required error={coachErr(coach.id, "memberGenderId")}>
                          <select
                            value={coach.memberGenderId}
                            onChange={e => handleCoachChange(coach.id, "memberGenderId", e.target.value)}
                            className={selectClass(coachErr(coach.id, "memberGenderId"))}
                          >
                            <option value="">-- Select --</option>
                            {genders.map(g => <option key={g.category_id} value={g.category_id}>{g.description}</option>)}
                          </select>
                        </Field>
                        <Field label="Email" required error={idx === 0 ? "" : coachErr(coach.id, "email")}>
                          {idx === 0 ? (
                            <Input
                              icon="📧"
                              type="email"
                              value={email}
                              readOnly
                              title="Verified email (auto-filled from OTP verification)"
                              style={{ backgroundColor: "#f3f4f6", color: "#6b7280", cursor: "not-allowed" }}
                            />
                          ) : (
                            <Input
                              icon="📧"
                              type="email"
                              value={coach.email}
                              onChange={e => handleCoachChange(coach.id, "email", e.target.value)}
                              placeholder="coach@example.com"
                              error={coachErr(coach.id, "email")}
                            />
                          )}
                        </Field>
                        <Field label="National ID Number" required error={coachErr(coach.id, "nationalId")}>
                          <Input value={coach.nationalId} onChange={e => handleCoachChange(coach.id, "nationalId", e.target.value)} placeholder="812345678V" error={coachErr(coach.id, "nationalId")} />
                        </Field>
                        <Field label="Primary Phone" required error={coachErr(coach.id, "primaryPhone")}>
                          <Input icon="📞" value={coach.primaryPhone} onChange={e => handleCoachChange(coach.id, "primaryPhone", e.target.value)} placeholder="077 123 4567" error={coachErr(coach.id, "primaryPhone")} />
                        </Field>
                        <Field label="Secondary Phone">
                          <Input icon="📞" value={coach.secondaryPhone} onChange={e => handleCoachChange(coach.id, "secondaryPhone", e.target.value)} placeholder="Enter secondary phone number" />
                        </Field>
                        <Field label="Date of Birth">
                          <input type="date" value={coach.dob}
                            onChange={e => handleCoachChange(coach.id, "dob", e.target.value)}
                            max={new Date().toLocaleDateString("en-CA")}
                            className="w-full border border-gray-200 rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700" />
                        </Field>
                        <div className="sm:col-span-2 lg:col-span-3">
                          <Field label="Address" required error={coachErr(coach.id, "address")}>
                            <Input value={coach.address} onChange={e => handleCoachChange(coach.id, "address", e.target.value)} placeholder="123, Lake View Road, Nugegoda" error={coachErr(coach.id, "address")} />
                          </Field>
                        </div>
                      </div>
                    </div>

                  </div>
                ))}
              </div>

              {/* Add another coach — placed below the cards so users can fill the
                  current coach and add the next without scrolling back to a header button. */}
              <div className="mt-4 flex justify-end">
                <button onClick={addCoach}
                  className="flex items-center justify-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg border-2 border-blue-700 text-blue-700 hover:bg-blue-50 transition">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Coach
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Summary (centered in main area) ── */}
          {step === 3 && (
            <div className="max-w-7xl mx-auto">
              <h2 className="font-bold text-base mb-1 text-center text-gray-900">Registration Summary</h2>
              <p className="text-xs text-gray-500 mb-4 text-center">Review your details before proceeding.</p>
              <SummaryPanel twoColumn />
            </div>
          )}

          {/* Validation summary for the current step */}
          {navError && step < 3 && (
            <p className={`text-sm text-red-500 mt-4 ${step === 3 ? "max-w-7xl mx-auto" : ""}`}>
              {navError}
            </p>
          )}

          {/* Bottom nav */}
          <div className={`flex items-center justify-between mt-6 ${step === 3 ? "max-w-7xl mx-auto" : ""}`}>
            <button
              onClick={() => step === 1 ? navigate("/") : setStep(s => s - 1)}
              className="px-5 py-3 border border-gray-300 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
              {step === 1 ? "Cancel" : "Back"}
            </button>
            {step < 3 && (
              <button onClick={handleNext}
                className="px-6 py-3 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm font-semibold transition flex items-center gap-2">
                {step === 2 ? "Next: Review Summary" : "Next"}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Right summary panel — live preview during steps 1–2 only.
            On step 3 the summary moves into the centered main area instead. */}
        {step !== 3 && (
          <div className="hidden lg:block w-72 xl:w-80 p-4 pt-6 flex-shrink-0">
            <p className="font-bold text-sm mb-1 text-gray-900">Registration Summary</p>
            <p className="text-xs text-gray-500 mb-4">Review your details before proceeding.</p>
            <SummaryPanel />
          </div>
        )}
        </div>

        <Footer />
      </div>

      {/* ══ SUBMITTED (popup over the summary) ══ */}
      {submitted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            className="bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 p-8 w-full max-w-md text-center"
          >
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-blue-50">
              <svg className="w-8 h-8 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Application Submitted!</h2>
            <p className="text-sm text-gray-500 mb-5">Complete your payment to activate your club registration.</p>
            <div className="bg-gray-50 rounded-xl p-4 mb-5 text-left space-y-3">
              {[
                { label: "Registration submitted", done: true },
                { label: "Payment pending", active: true },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: s.done ? "#dcfce7" : s.active ? "#fef3c7" : "#f3f4f6" }}>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      style={{ color: s.done ? "#16a34a" : s.active ? "#d97706" : "#9ca3af" }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={s.done ? 3 : 2}
                        d={s.done ? "M5 13l4 4L19 7" : s.active ? "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"} />
                    </svg>
                  </div>
                  <span className={`text-xs font-medium ${s.done || s.active ? "text-gray-700" : "text-gray-500"}`}>{s.label}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setShowPayment(true)}
              disabled={!registeredClub?.process_id}
              className="w-full bg-blue-700 hover:bg-blue-800 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg text-sm mb-3 transition">
              Proceed to Payment
            </button>
            <button onClick={() => navigate("/")} className="w-full text-sm text-gray-500 hover:text-blue-600">
              Back to Login
            </button>
          </div>
        </div>
      )}

      {/* Select-payment-method popup — opened by "Proceed to Payment". Pays the
          club-level registration fee, then returns to login on success. */}
      {showPayment && registeredClub?.process_id && (
        <PaymentMethod
          club={registeredClub}
          email={email}
          onClose={() => setShowPayment(false)}
          onSuccess={() => navigate("/login", { state: { email } })}
        />
      )}
    </div>
  );
}