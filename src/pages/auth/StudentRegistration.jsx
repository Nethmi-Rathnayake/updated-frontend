import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/usjp-logo__1_-removebg-preview.png";
import api from "../../services/api";
import AuthShell from "../../components/auth/AuthShell";
import {
  sendOtp as sendOtpRequest,
  verifyOtp as verifyOtpRequest,
  registerMember,
} from "../../services/authService";
import { isEmailRegistered } from "../../services/memberService";
import PaymentMethod from "./PaymentMethod";

// =============================================
// All backend calls go through the shared axios instance (src/services/api.js)
// and the auth service (src/services/authService.js). withCredentials is enabled
// there so the Laravel session cookie carries the OTP-verified state across the
// send-otp → verify-otp → member-registration flow.
// =============================================

// Steps: "email" → "otp" → "details" → "summary" → "submitted"
//   details  = Tab 1, collects all registration information
//   summary  = Tab 2, read-only review before final submission

const TITLE_OPTIONS = ["Mr", "Mrs", "Ms", "Miss", "Dr", "Rev."];

export default function StudentRegistration() {
  const navigate = useNavigate();

  // ── Step tracking ──────────────────────────
  // "email" | "otp" | "details" | "summary" | "submitted"
  const [step, setStep] = useState("email");

  // ── Email & OTP ────────────────────────────
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [otpSending, setOtpSending] = useState(false);

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState("");
  const [otpVerifying, setOtpVerifying] = useState(false);
  // Set when /verify-otp reports the email already belongs to a registered
  // member — such users may not register again and are sent back to login.
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [timer, setTimer] = useState(165);
  const inputRefs = useRef([]);

  // ── Clubs ──────────────────────────────────
  const [clubs, setClubs] = useState([]);
  const [clubsLoading, setClubsLoading] = useState(true);
  const [clubsError, setClubsError] = useState("");

  // ── Genders (category-driven; from GET /api/member-genders) ──
  const [genders, setGenders] = useState([]);

  // ── Form ───────────────────────────────────
  const [membershipType, setMembershipType] = useState("");
  const [selectedClub, setSelectedClub] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoError, setPhotoError] = useState("");
  // Ref to the hidden file input so we can reset its value on removal.
  // Without this, re-selecting the SAME file after removing it won't fire the
  // input's onChange (the value is unchanged), so the new preview never shows.
  const photoInputRef = useRef(null);
  const [form, setForm] = useState({
    title: "",
    initials: "",
    nameWithInitials: "", // Name denoted by initials
    lastName: "",
    memberGenderId: "",
    studentId: "", // optional — maps to the API `nic` field
    dob: "",
    primaryPhone: "",
    secondaryPhone: "",
    address: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  // The member created by a successful registration (carries the numeric id +
  // display name), and whether the "select payment method" popup is open.
  const [submittedMember, setSubmittedMember] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  // Per-field validation messages, keyed by the form field name (plus the
  // pseudo-fields "membershipType" and "club"). A non-empty value drives both
  // the red outline on the field and the inline message rendered beneath it.
  const [fieldErrors, setFieldErrors] = useState({});

  // ── Photo preview URL (memoized to avoid blob leak on every render) ──
  const photoPreviewUrl = useMemo(
    () => (photoFile ? URL.createObjectURL(photoFile) : null),
    [photoFile]
  );

  useEffect(() => {
    return () => {
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    };
  }, [photoPreviewUrl]);

  // ── Timer countdown ────────────────────────
  useEffect(() => {
    if (step !== "otp" || timer <= 0) return;
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [step, timer]);

  const minutes = String(Math.floor(timer / 60)).padStart(2, "0");
  const seconds = String(timer % 60).padStart(2, "0");

  // ── Load clubs + genders once we reach the details tab ──
  useEffect(() => {
    if (step !== "details") return;
    // =============================================
    // API CALL — GET /api/clubs
    // Response: [{ id: 1, club_name: "Cricket Club", ... }, ...]
    // =============================================
    api
      .get("/api/clubs")
      .then((res) => {
        // Students may only register under an approved (Active) club, so
        // filter out any club that isn't currently Active before listing.
        const approvedClubs = (res.data || []).filter(
          (c) => c.club_status === "Active"
        );
        setClubs(approvedClubs);
        setClubsLoading(false);
      })
      .catch(() => {
        setClubsError("Failed to load clubs. Please refresh.");
        setClubsLoading(false);
      });

    // =============================================
    // API CALL — GET /api/member-genders
    // Response: [{ category_id, category_code, description }, ...]
    // =============================================
    api
      .get("/api/member-genders")
      .then((res) => setGenders(res.data))
      .catch(() => setGenders([]));
  }, [step]);

  // ── Handlers ───────────────────────────────

  // Send OTP — separated from resend to avoid double-reset.
  // Returns true on success so callers can decide whether to advance the step.
  const sendOtp = async () => {
    setOtpSending(true);
    // =============================================
    // API CALL — POST /send-otp   Body: { email }
    // =============================================
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
    // Block re-registration BEFORE sending an OTP: if this email already has an
    // account, show the "already registered" popup instead of emailing a code.
    // The lookup reuses the members search (no dedicated backend endpoint); if
    // it fails we fall through and let verify-otp's account_exists check catch
    // the duplicate after verification.
    setOtpSending(true);
    let registered = false;
    try {
      registered = await isEmailRegistered(email);
    } catch {
      registered = false;
    } finally {
      setOtpSending(false);
    }
    if (registered) {
      setAlreadyRegistered(true);
      return;
    }
    const ok = await sendOtp();
    if (!ok) {
      setEmailError("Failed to send OTP. Please try again.");
      return;
    }
    setTimer(165);
    setOtp(["", "", "", "", "", ""]);
    setStep("otp");
  };

  const handleResendOtp = async () => {
    setOtp(["", "", "", "", "", ""]);
    setOtpError("");
    const ok = await sendOtp();
    if (!ok) {
      setOtpError("Failed to resend OTP. Please try again.");
      return;
    }
    setTimer(165);
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
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
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
    // =============================================
    // API CALL — POST /verify-otp   Body: { email, otp: code }
    // =============================================
    try {
      const data = await verifyOtpRequest(email, code);
      // Already-registered users cannot register again — the OTP still
      // verifies (so they're authenticated), but route them to login instead
      // of the registration form rather than letting them fill it and be
      // rejected at submit by the backend's unique-email rule.
      if (data?.account_exists) {
        setAlreadyRegistered(true);
        return;
      }
      setStep("details");
    } catch (err) {
      setOtpError(
        err?.response?.data?.message || "Invalid OTP. Please try again."
      );
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    // Clear this field's error as soon as the user starts correcting it.
    setFieldErrors((fe) => (fe[name] ? { ...fe, [name]: "" } : fe));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setPhotoError("Photo must be less than 2MB.");
      setPhotoFile(null);
      return;
    }
    setPhotoError("");
    setFieldErrors((fe) => (fe.photo ? { ...fe, photo: "" } : fe));
    setPhotoFile(file);
  };

  // Sri Lankan phone validation — accepts local (0XX…) or country-code
  // (+94… / 94…) formats, matching the backend rules. Spaces are ignored.
  //   primary   → must be a mobile: optional 0/94/+94 prefix + 7 + 8 digits
  //   secondary → any 9-digit local number with an optional 0/94/+94 prefix
  const isValidPrimaryPhone = (phone) =>
    /^(?:\+94|94|0)?7\d{8}$/.test(phone.replace(/\s/g, ""));
  const isValidSecondaryPhone = (phone) =>
    /^(?:\+94|94|0)?\d{9}$/.test(phone.replace(/\s/g, ""));

  // Initials must be single letters each followed by a dot, e.g. "T.N." or
  // "A.B.C." (spaces between them are tolerated). Rejects "TN", "T.N", "Tharindu".
  const isValidInitials = (value) =>
    /^([A-Za-z]\.\s?)+$/.test(value.trim());

  // NIC (National Identity Card) — matches the backend rule: the old format is
  // 9 digits followed by V/X, the new format is 12 digits.
  const isValidNIC = (value) =>
    /^(?:\d{9}[vVxX]|\d{12})$/.test(value.trim());

  // Validate everything collected on Tab 1. Returns a map of
  // field-name → message (empty map means valid). The photo lives outside
  // `form`, so its message is tracked under the "photo" key and mirrored into
  // `photoError` so it renders in the photo block.
  const validateDetails = () => {
    const errs = {};
    if (!photoFile) errs.photo = "Please upload your profile photo.";
    if (!form.title) errs.title = "Please select a title.";
    if (!form.initials.trim()) errs.initials = "Please enter your initials.";
    else if (!isValidInitials(form.initials))
      errs.initials = "Use dots between initials, e.g. T.N. or A.B.C.";
    if (!form.nameWithInitials.trim())
      errs.nameWithInitials = "Please enter the name denoted by your initials.";
    if (!form.lastName.trim()) errs.lastName = "Please enter your last name.";
    if (!form.memberGenderId) errs.memberGenderId = "Please select your gender.";
    if (!form.studentId.trim())
      errs.studentId = "Please enter your NIC (or guardian's NIC).";
    else if (!isValidNIC(form.studentId))
      errs.studentId = "Enter a valid NIC — 9 digits + V/X (e.g. 200012345V) or 12 digits.";
    if (!form.primaryPhone.trim())
      errs.primaryPhone = "Please enter your primary phone.";
    else if (!isValidPrimaryPhone(form.primaryPhone))
      errs.primaryPhone = "Enter a valid phone number (e.g. 0712345678 or +94712345678).";
    if (form.secondaryPhone && !isValidSecondaryPhone(form.secondaryPhone))
      errs.secondaryPhone = "Enter a valid secondary phone number or leave it empty.";
    if (!form.address.trim()) errs.address = "Please enter your address.";
    if (!membershipType) errs.membershipType = "Please select a membership type.";
    if (membershipType === "club" && !selectedClub)
      errs.club = "Please select a club.";
    return errs;
  };

  // Push a validation result into state: field outlines/messages via
  // `fieldErrors`, the photo message via `photoError`, and a single summary
  // line above the action button. Returns true when the form is valid.
  const applyValidation = (errs) => {
    setFieldErrors(errs);
    setPhotoError(errs.photo || "");
    const valid = Object.keys(errs).length === 0;
    setSubmitError(valid ? "" : "Please correct the highlighted fields below.");
    return valid;
  };

  // Tab 1 → Tab 2. Block on validation so the summary only ever shows
  // data the backend will accept.
  const handleNext = () => {
    if (!applyValidation(validateDetails())) return;
    setStep("summary");
  };

  const selectedGender = genders.find(
    (g) => String(g.category_id) === String(form.memberGenderId)
  );
  const selectedClubName = clubs.find(
    (c) => String(c.id) === String(selectedClub)
  )?.club_name;

  const handleSubmit = async () => {
    // Final guard — the user can only reach here via a validated Tab 1,
    // but re-check in case state was edited.
    const errs = validateDetails();
    if (!applyValidation(errs)) {
      setStep("details");
      return;
    }

    // =============================================
    // API CALL — POST /api/member-registrations (multipart/form-data).
    // The backend (MemberRegistrationController) accepts camelCase aliases:
    // title, initials, nameWithInitials, lastName, memberGenderId, nic,
    // primaryPhone, secondaryPhone, dob, address,
    // membershipType (club|club_student|independent), clubId, photo.
    // =============================================
    const fd = new FormData();
    fd.append("email", email);
    fd.append("title", form.title);
    fd.append("initials", form.initials);
    fd.append("nameWithInitials", form.nameWithInitials);
    fd.append("lastName", form.lastName);
    fd.append("memberGenderId", form.memberGenderId);
    // The "Student ID or Guardian ID" input maps to the API's `nic` field.
    if (form.studentId) fd.append("nic", form.studentId);
    if (form.dob) fd.append("dob", form.dob);
    // Strip spaces so a number typed as "+94 71 234 5678" matches the
    // backend's no-space phone regex.
    fd.append("primaryPhone", form.primaryPhone.replace(/\s/g, ""));
    if (form.secondaryPhone) fd.append("secondaryPhone", form.secondaryPhone.replace(/\s/g, ""));
    fd.append("address", form.address);
    fd.append("membershipType", membershipType);
    if (membershipType === "club") fd.append("clubId", selectedClub);
    fd.append("photo", photoFile);

    setSubmitError("");
    setSubmitting(true);
    try {
      // The backend returns the new member wrapped in an array
      // ([{ member_id, payment_id, amount, ... }]); member_id here is the
      // NUMERIC primary id PaymentMethod needs. Peel any array nesting.
      let data = await registerMember(fd);
      while (Array.isArray(data)) data = data[0];
      setSubmittedMember({
        id: data?.member_id,
        member_id: data?.member_code || null,
        email,
        initials: form.initials,
        name_denoted_by_initials: form.nameWithInitials,
        lastname: form.lastName,
      });
      setStep("submitted");
    } catch (err) {
      const data = err?.response?.data;
      const firstError = data?.errors
        ? Object.values(data.errors)[0]?.[0]
        : null;
      setSubmitError(
        firstError || data?.message || "Registration failed. Please try again."
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
    <p className="text-base text-gray-500 text-center mt-8">
      © {new Date().getFullYear()} University of Sri Jayewardenepura
    </p>
  );

  // Shared branding block for the email/OTP gate cards (matches the login page
  // and the club registration gate — keeps both post-select-registration pages
  // visually identical).
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
    setStep("email");
    setEmail("");
    setEmailError("");
  };

  // ══════════════════════════════════════════
  // ALREADY REGISTERED — popup (blocks re-registration)
  // Shown before any OTP is sent when the typed email already has an account,
  // and again as a fallback if verify-otp reports account_exists. It overlays
  // the current step instead of navigating away, so the user stays put.
  // ══════════════════════════════════════════
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

  // ══════════════════════════════════════════
  // STEP 1 — EMAIL
  // ══════════════════════════════════════════
  if (step === "email") {
    return (
      <AuthShell>
        <div className="w-full max-w-2xl">
          <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 lg:p-12 w-full">
            <GateHeader />

            <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">
              Registration
            </h1>
            <p className="text-lg text-gray-500 mb-8 text-center">
              Enter your email to verify your identity before registering.
            </p>

            <label className="block text-lg font-medium text-gray-700 mb-2">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError("");
              }}
              placeholder="example@sjp.ac.lk"
              className="w-full border border-gray-300 rounded-xl px-4 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-1"
            />
            {emailError && (
              <p className="text-base text-red-500 mb-2">{emailError}</p>
            )}

            <button
              onClick={handleSendOtp}
              disabled={otpSending || !email}
              className="w-full bg-blue-700 hover:bg-blue-800 disabled:bg-blue-300 text-white font-semibold py-5 rounded-xl transition mt-4 text-lg"
            >
              {otpSending ? "Sending OTP…" : "Send OTP"}
            </button>

            <p className="flex items-center justify-center gap-1.5 text-base text-gray-500 mt-4">
              <svg
                className="w-4 h-4 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Email verification required to register
            </p>
          </div>

          <div className="text-center mt-6">
            <button
              onClick={() => navigate("/select-registration")}
              className="text-blue-600 font-semibold hover:underline text-lg"
            >
              ← Back to registration options
            </button>
          </div>
        </div>
        <Footer />
        {alreadyRegistered && <AlreadyRegisteredModal />}
      </AuthShell>
    );
  }

  // ══════════════════════════════════════════
  // STEP 2 — OTP VERIFY
  // ══════════════════════════════════════════
  if (step === "otp") {
    return (
      <AuthShell>
        <div className="w-full max-w-2xl">
          <div className="bg-white rounded-3xl shadow-xl p-12 w-full text-center">
            <GateHeader />

            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Verify Your Email
            </h2>
            <p className="text-lg text-gray-500 mb-1">
              Enter the 6 digit code sent to
            </p>
            <p className="text-lg font-semibold text-blue-700 mb-8">{email}</p>

            {/* OTP boxes */}
            <div
              className="flex justify-center gap-2 sm:gap-3 mb-4"
              onPaste={handleOtpPaste}
            >
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

            {otpError && (
              <p className="text-base text-red-500 mb-2">{otpError}</p>
            )}

            <p className="text-base text-gray-500 mb-4">
              {timer > 0 ? (
                <>
                  Code expires in{" "}
                  <span className="font-semibold text-red-500">
                    {minutes}:{seconds}
                  </span>
                </>
              ) : (
                <span className="text-red-500 font-semibold">Code expired.</span>
              )}{" "}
              <button
                onClick={handleResendOtp}
                disabled={otpSending}
                className="text-blue-600 font-semibold hover:underline ml-1 disabled:opacity-50"
              >
                {otpSending ? "Sending…" : "Resend OTP"}
              </button>
            </p>

            <button
              onClick={handleVerifyOtp}
              disabled={otpVerifying || otp.join("").length < 6}
              className="w-full bg-blue-700 hover:bg-blue-800 disabled:bg-blue-300 text-white font-semibold py-5 rounded-xl transition text-lg"
            >
              {otpVerifying ? "Verifying…" : "Verify & Continue"}
            </button>

            <button
              onClick={() => setStep("email")}
              className="mt-4 text-base text-gray-500 hover:text-blue-600 transition w-full"
            >
              Change email
            </button>
          </div>
        </div>
        <Footer />
        {alreadyRegistered && <AlreadyRegisteredModal />}
      </AuthShell>
    );
  }

  // The STEP 4 — SUBMITTED confirmation is no longer a separate page; it is
  // rendered as a popup over the summary (see the modal at the end of the main
  // return below).

  // ══════════════════════════════════════════
  // STEP 3 — REGISTRATION (Tab 1: details → Tab 2: summary)
  // ══════════════════════════════════════════
  const inputClass =
    "w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition";
  // Base (border/ring colours omitted) so the error/normal state can supply
  // them without Tailwind class-ordering ambiguity.
  const inputBase =
    "w-full rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 transition";
  // Field className that turns red when the named field has a validation error.
  const fieldClass = (name) =>
    `${inputBase} ${
      fieldErrors[name]
        ? "border border-red-500 focus:ring-red-500"
        : "border border-gray-300 focus:ring-blue-500"
    }`;
  // Inline error message rendered directly beneath a field.
  const fieldError = (name) =>
    fieldErrors[name] ? (
      <p className="text-xs text-red-500 mt-1">{fieldErrors[name]}</p>
    ) : null;
  const labelClass = "block text-sm font-medium text-gray-600 mb-1.5";
  const required = <span className="text-red-500">*</span>;

  // Shared card wrapper — generous padding + a hairline border so each section
  // reads as a distinct, breathable block instead of cramped rows.
  const cardClass =
    "bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 mb-5";

  // Consistent, visually-distinct section header: a blue accent bar + bold
  // title, an optional required marker, an optional helper subtitle, and a
  // hairline divider separating the header from its fields.
  const SectionHeading = ({ title, subtitle, req }) => (
    <div className="mb-5 pb-3 border-b border-gray-100">
      <div className="flex items-center gap-2.5">
        <span className="w-1 h-5 rounded-full bg-blue-600 flex-shrink-0" />
        <h2 className="text-[0.9375rem] font-bold text-gray-900">
          {title} {req && required}
        </h2>
      </div>
      {subtitle && (
        <p className="text-xs text-gray-400 mt-1.5 ml-3.5">{subtitle}</p>
      )}
    </div>
  );

  // Two-step tab indicator shared by both tabs.
  const TabSteps = () => (
    <div className="flex items-center gap-3 mb-4">
      {[
        { id: "details", n: 1, label: "Registration Details" },
        { id: "summary", n: 2, label: "Review & Submit" },
      ].map((t, i) => {
        const active = step === t.id;
        const done = t.id === "details" && step === "summary";
        return (
          <React.Fragment key={t.id}>
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 flex-shrink-0 ${
                  done
                    ? "bg-green-500 text-white border-green-500"
                    : active
                    ? "bg-blue-700 text-white border-blue-700"
                    : "bg-gray-200 text-gray-500 border-gray-200"
                }`}
              >
                {done ? (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  t.n
                )}
              </div>
              <span
                className={`text-xs font-semibold ${
                  active || done ? "text-blue-700" : "text-gray-500"
                }`}
              >
                {t.label}
              </span>
            </div>
            {i === 0 && (
              <div
                className={`flex-1 h-px ${
                  step === "summary" ? "bg-blue-600" : "bg-gray-200"
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  // Rows rendered on the Tab 2 summary, in entry order.
  const summaryRows = [
    ["Title", form.title],
    ["Initials", form.initials],
    ["Name Denoted by Initials", form.nameWithInitials],
    ["Last Name", form.lastName],
    ["Gender", selectedGender?.description],
    ["Email Address", email],
    ["Student NIC or Guardian NIC", form.studentId || "—"],
    ["Date of Birth", form.dob || "—"],
    ["Primary Phone", form.primaryPhone],
    ["Secondary Phone", form.secondaryPhone || "—"],
    ["Address", form.address],
    [
      "Membership Type",
      membershipType === "club" ? "Student Under Club" : "Independent User",
    ],
  ];
  if (membershipType === "club") {
    summaryRows.push(["Club", selectedClubName || "—"]);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 m-0 px-4 sm:px-8 lg:px-12 pt-28 pb-8">
      <NavBar />
      <div className="max-w-[114.2857rem] mx-auto w-full">
        <TabSteps />

        {/* ─────────────── TAB 1 — REGISTRATION DETAILS ─────────────── */}
        {step === "details" && (
          <>
            {/* Profile Photo — at the top of the page */}
            <div className={cardClass}>
              <SectionHeading
                title="Profile Photo"
                req
                subtitle="Used for your QR membership card · Min 300×300px · Max 2 MB · PNG/JPG"
              />
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                <div
                  className={`w-28 h-32 rounded-xl overflow-hidden border-2 bg-gray-100 flex items-center justify-center flex-shrink-0 ${
                    photoError ? "border-red-500" : "border-gray-200"
                  }`}
                >
                  {photoPreviewUrl ? (
                    <img
                      src={photoPreviewUrl}
                      alt="Preview"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <svg
                      className="w-10 h-10 text-gray-300"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  )}
                </div>

                <div className="flex flex-col items-start">
                  <label className="cursor-pointer">
                    <div className="px-6 py-2 rounded-lg border-2 border-gray-300 text-sm font-medium text-gray-700 hover:border-blue-500 hover:text-blue-600 transition text-center">
                      Upload Photo
                    </div>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept=".png,.jpg,.jpeg,.webp"
                      className="hidden"
                      onChange={handlePhotoChange}
                    />
                  </label>

                  {photoFile && (
                    <button
                      onClick={() => {
                        setPhotoFile(null);
                        setPhotoError("");
                        // Clear the input so the same file can be re-selected
                        // and still trigger onChange.
                        if (photoInputRef.current) photoInputRef.current.value = "";
                      }}
                      className="mt-2 text-xs font-medium text-blue-600 hover:underline"
                    >
                      Remove Photo
                    </button>
                  )}

                  {photoError && (
                    <p className="text-xs text-red-500 mt-2">{photoError}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Personal Information — identity details */}
            <div className={cardClass}>
              <SectionHeading
                title="Personal Information"
                subtitle="Your name and identity details."
              />

              {/* 1 col on phones → 3 cols on tablet/desktop. Wide fields
                  span columns so each row stays full and aligned. */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-5 gap-y-5">
                {/* Row 1 — Title · Initials · Last Name */}
                <div>
                  <label className={labelClass}>Title {required}</label>
                  <select
                    name="title"
                    value={form.title}
                    onChange={handleFormChange}
                    className={`${fieldClass("title")} text-gray-700`}
                  >
                    <option value="">-- Select --</option>
                    {TITLE_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  {fieldError("title")}
                </div>

                <div>
                  <label className={labelClass}>Initials {required}</label>
                  <input
                    name="initials"
                    autoComplete="off"
                    value={form.initials}
                    onChange={handleFormChange}
                    placeholder="T.N."
                    className={fieldClass("initials")}
                  />
                  {fieldError("initials")}
                </div>

                <div>
                  <label className={labelClass}>Last Name {required}</label>
                  <input
                    name="lastName"
                    autoComplete="family-name"
                    value={form.lastName}
                    onChange={handleFormChange}
                    placeholder="Perera"
                    className={fieldClass("lastName")}
                  />
                  {fieldError("lastName")}
                </div>

                {/* Row 2 — Name Denoted by Initials (2 cols) · Gender */}
                <div className="md:col-span-2">
                  <label className={labelClass}>
                    Name Denoted by Initials {required}
                  </label>
                  <input
                    name="nameWithInitials"
                    value={form.nameWithInitials}
                    onChange={handleFormChange}
                    placeholder="Tharindu Nimesh"
                    className={fieldClass("nameWithInitials")}
                  />
                  {fieldError("nameWithInitials")}
                </div>

                <div>
                  <label className={labelClass}>Gender {required}</label>
                  <select
                    name="memberGenderId"
                    value={form.memberGenderId}
                    onChange={handleFormChange}
                    className={`${fieldClass("memberGenderId")} text-gray-700`}
                  >
                    <option value="">-- Select --</option>
                    {genders.map((g) => (
                      <option key={g.category_id} value={g.category_id}>
                        {g.description}
                      </option>
                    ))}
                  </select>
                  {fieldError("memberGenderId")}
                </div>

                {/* Row 3 — Student NIC · Date of Birth */}
                <div>
                  <label className={labelClass}>
                    Student NIC <span>or Guardian NIC</span> {required}
                  </label>
                  <input
                    name="studentId"
                    value={form.studentId}
                    onChange={handleFormChange}
                    placeholder="200012345678"
                    className={fieldClass("studentId")}
                  />
                  {fieldError("studentId")}
                </div>

                <div>
                  <label className={labelClass}>Date of Birth</label>
                  <input
                    type="date"
                    name="dob"
                    value={form.dob}
                    onChange={handleFormChange}
                    max={new Date().toLocaleDateString("en-CA")}
                    className={`${inputClass} text-gray-700`}
                  />
                </div>
              </div>
            </div>

            {/* Contact Information — how we reach the member */}
            <div className={cardClass}>
              <SectionHeading
                title="Contact Information"
                subtitle="How we'll reach you."
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-5 gap-y-5">
                {/* Row 1 — Email (2 cols) · Primary Phone */}
                <div className="md:col-span-2">
                  <label className={labelClass}>
                    Email Address {required}
                  </label>
                  <input
                    type="email"
                    value={email}
                    readOnly
                    className={`${inputClass} bg-gray-50 text-gray-500 cursor-not-allowed`}
                  />
                </div>

                <div>
                  <label className={labelClass}>Primary Phone {required}</label>
                  <input
                    name="primaryPhone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={form.primaryPhone}
                    onChange={handleFormChange}
                    placeholder="071 234 5678"
                    className={fieldClass("primaryPhone")}
                  />
                  {fieldError("primaryPhone")}
                </div>

                {/* Row 2 — Secondary Phone · Address (2 cols) */}
                <div>
                  <label className={labelClass}>Secondary Phone</label>
                  <input
                    name="secondaryPhone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={form.secondaryPhone}
                    onChange={handleFormChange}
                    placeholder="077 234 5678"
                    className={fieldClass("secondaryPhone")}
                  />
                  {fieldError("secondaryPhone")}
                </div>

                <div className="md:col-span-2">
                  <label className={labelClass}>Address {required}</label>
                  <input
                    name="address"
                    autoComplete="street-address"
                    value={form.address}
                    onChange={handleFormChange}
                    placeholder="No. 1, Main Street, Colombo"
                    className={fieldClass("address")}
                  />
                  {fieldError("address")}
                </div>
              </div>
            </div>

            {/* Membership Details — type + (conditional) club selection */}
            <div className={cardClass}>
              <SectionHeading
                title="Membership Details"
                req
                subtitle="Choose how you'd like to join."
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition ${
                    membershipType === "club"
                      ? "border-blue-700 bg-blue-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="membershipType"
                    value="club"
                    checked={membershipType === "club"}
                    onChange={(e) => {
                      setMembershipType(e.target.value);
                      setFieldErrors((fe) => ({ ...fe, membershipType: "" }));
                    }}
                    className="mt-0.5 accent-blue-600"
                  />
                  <div>
                    <p className="font-semibold text-sm text-gray-800">
                      Student Under Club
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Register under a sports club. Requires payment and admin
                      approval.
                    </p>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition ${
                    membershipType === "independent"
                      ? "border-blue-700 bg-blue-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="membershipType"
                    value="independent"
                    checked={membershipType === "independent"}
                    onChange={(e) => {
                      setMembershipType(e.target.value);
                      setSelectedClub("");
                      setFieldErrors((fe) => ({
                        ...fe,
                        membershipType: "",
                        club: "",
                      }));
                    }}
                    className="mt-0.5 accent-blue-600"
                  />
                  <div>
                    <p className="font-semibold text-sm text-gray-800">
                      Independent User
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Book facilities independently. Requires payment and admin
                      approval.
                    </p>
                  </div>
                </label>
              </div>
              {fieldError("membershipType")}

              {/* Club Selection — only when registering under a club */}
              {membershipType === "club" && (
                <div className="mt-5 pt-5 border-t border-gray-100">
                  <label className={labelClass}>
                    Select Your Club {required}
                  </label>
                  {clubsError ? (
                    <p className="text-xs text-red-500">{clubsError}</p>
                  ) : (
                    <select
                      value={selectedClub}
                      onChange={(e) => {
                        setSelectedClub(e.target.value);
                        setFieldErrors((fe) =>
                          fe.club ? { ...fe, club: "" } : fe
                        );
                      }}
                      disabled={clubsLoading}
                      className={`${fieldClass("club")} md:max-w-sm text-gray-700 disabled:bg-gray-50 disabled:text-gray-500`}
                    >
                      <option value="">
                        {clubsLoading ? "Loading clubs..." : "-- Select a Club --"}
                      </option>
                      {clubs.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.club_name}
                        </option>
                      ))}
                    </select>
                  )}
                  {fieldError("club")}
                  <p className="text-xs text-gray-500 mt-1.5">
                    Your registration will be reviewed by the club and admin.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 mb-3">
              {submitError && (
                <p className="text-sm text-red-500 mr-auto">{submitError}</p>
              )}
              <button
                onClick={handleNext}
                className="bg-blue-700 hover:bg-blue-800 text-white font-semibold px-6 py-3 rounded-lg text-sm transition"
              >
                Next — Review
              </button>
            </div>
          </>
        )}

        {/* ─────────────── TAB 2 — REGISTRATION SUMMARY ─────────────── */}
        {(step === "summary" || step === "submitted") && (
          <>
            <div className="bg-white rounded-xl shadow-sm p-5 mb-4">
              <h2 className="font-bold text-sm mb-1 text-gray-900">
                Review Your Details
              </h2>
              <p className="text-xs text-gray-500 mb-5">
                Please confirm everything is correct before submitting.
              </p>

              <div className="flex flex-col sm:flex-row gap-6">
                {/* Photo */}
                <div className="flex-shrink-0 mx-auto sm:mx-0">
                  <div className="w-40 h-44 rounded-xl overflow-hidden border-2 border-gray-200 bg-gray-100 flex items-center justify-center">
                    {photoPreviewUrl ? (
                      <img
                        src={photoPreviewUrl}
                        alt="Profile"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-xs text-gray-300">No photo</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 text-center mt-2">
                    Profile Photo
                  </p>
                </div>

                {/* Field list */}
                <dl className="flex-1 divide-y divide-gray-100">
                  {summaryRows.map(([label, value]) => (
                    <div
                      key={label}
                      className="py-3 grid grid-cols-1 sm:grid-cols-3 gap-1"
                    >
                      <dt className="text-xs font-medium text-gray-500">
                        {label}
                      </dt>
                      <dd className="sm:col-span-2 text-sm text-gray-800 break-words">
                        {value || "—"}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mb-3">
              {submitError && (
                <p className="text-sm text-red-500 mr-auto">{submitError}</p>
              )}
              <button
                onClick={() => {
                  setSubmitError("");
                  setStep("details");
                }}
                disabled={submitting}
                className="font-semibold px-5 py-2 rounded-lg text-sm transition border-2 border-gray-300 text-gray-600 hover:border-gray-400 disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-blue-700 hover:bg-blue-800 active:bg-blue-900 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-lg text-sm transition shadow-sm hover:shadow-md"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Submitting…
                  </span>
                ) : "Submit Registration"}
              </button>
            </div>
          </>
        )}

        <div className="text-center pb-2 mt-2">
          <p className="text-sm text-gray-500">
            Already registered?{" "}
            <button
              onClick={() => navigate("/")}
              className="text-blue-600 font-semibold hover:underline"
            >
              Login with Email OTP
            </button>
          </p>
        </div>

        <Footer />
      </div>

      {/* ══ STEP 4 — SUBMITTED (popup over the summary) ══ */}
      {step === "submitted" && (
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
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Application Submitted!
            </h2>
            <p className="text-sm text-gray-500 mb-5">
              Complete your payment to activate your registration.
            </p>

            <div className="bg-gray-50 rounded-xl p-4 mb-5 text-left space-y-3">
              {[
                { label: "Email verified", done: true, active: false },
                { label: "Registration form submitted", done: true, active: false },
                { label: "Payment pending", done: false, active: true },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: s.done ? "#dcfce7" : s.active ? "#fef3c7" : "#f3f4f6",
                    }}
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      style={{ color: s.done ? "#16a34a" : s.active ? "#d97706" : "#9ca3af" }}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={s.done ? 3 : 2}
                        d={
                          s.done
                            ? "M5 13l4 4L19 7"
                            : s.active
                            ? "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        }
                      />
                    </svg>
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      s.done || s.active ? "text-gray-700" : "text-gray-500"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowPayment(true)}
              disabled={!submittedMember?.id}
              className="w-full bg-blue-700 hover:bg-blue-800 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg text-sm mb-3 transition"
            >
              Proceed to Payment
            </button>
            <button
              onClick={() => navigate("/")}
              className="w-full text-sm text-gray-500 hover:text-blue-600 transition"
            >
              Back to Login
            </button>
          </div>
        </div>
      )}

      {/* Select-payment-method popup — opened by "Proceed to Payment". On a
          successful payment we send the now-active member to the status page. */}
      {showPayment && submittedMember?.id && (
        <PaymentMethod
          member={submittedMember}
          email={email}
          onClose={() => setShowPayment(false)}
          onSuccess={() =>
            navigate("/registration-status", {
              state: { member: submittedMember, email },
            })
          }
        />
      )}
    </div>
  );
}