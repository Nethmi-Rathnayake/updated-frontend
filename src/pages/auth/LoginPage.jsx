import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import EmailStep from "../../components/auth/EmailStep";
import OtpStep from "../../components/auth/OtpStep";
import AuthShell from "../../components/auth/AuthShell";
import { sendOtp } from "../../services/authService";
import { isEmailRegistered } from "../../services/memberService";

// Map the authenticated user's role (from the /verify-otp "account routing
// details") to a placeholder message. The real dashboards aren't built yet, so
// an already-registered user is NOT redirected — we show a "Next to ..." message
// instead. Matching is keyword-based so it tolerates backend role variants
// (e.g. "club_student" / "Club Student", "coach" / "Coach", "independent").
function rolePlaceholderMessage(role) {
  const r = String(role || "").toLowerCase();
  if (r.includes("coach")) return "Next to Coach Dashboard";
  if (r.includes("independent")) return "Next to Independent Student Dashboard";
  if (r.includes("club")) return "Next to Club Student Dashboard";
  return null;
}

export default function LoginPage() {
  const location = useLocation();
  // The home-page login card hands off the typed email via router state so the
  // EmailStep field is prefilled here.
  const initialEmail = location.state?.email || "";
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState(initialEmail);
  // Placeholder message shown after a registered user verifies their OTP.
  const [loginMessage, setLoginMessage] = useState("");
  // Set when the verified email has no account — we ask them to register
  // instead of logging in.
  const [notRegistered, setNotRegistered] = useState(false);
  const navigate = useNavigate();

  const handleSendOtp = (sentEmail) => {
    setEmail(sentEmail);
    setStep("otp");
  };

  // Dismiss the "No Account Found" modal and keep the user on the login page
  // (return to the email step so they can try a different address).
  const closeNotRegistered = () => {
    setNotRegistered(false);
    setStep("email");
  };

  // Runs when the user clicks "Send OTP" (via EmailStep's beforeSend hook).
  // Logging in requires an existing account, so we check registration FIRST and
  // block the OTP for unregistered emails — prompting them to register instead.
  const handleBeforeSend = async (candidateEmail) => {
    try {
      const registered = await isEmailRegistered(candidateEmail);
      if (!registered) {
        setEmail(candidateEmail);
        setNotRegistered(true);
        toast.error("No account found. Please register to login.");
        return false; // abort — do not send OTP
      }
      return true; // registered — proceed to send OTP
    } catch {
      // If the lookup fails (network/server), don't block login — fall through
      // to the OTP flow, which still verifies the account on the backend.
      return true;
    }
  };

  const handleVerify = (data) => {
    // `data` is the /verify-otp response ("account routing details"). Resolve
    // the user's role and whether the email is already registered, tolerating
    // different backend key names.
    const member = data?.member ?? null;
    const role =
      data?.role ??
      data?.member_type ??
      data?.user_type ??
      data?.type ??
      data?.account_type ??
      data?.user?.role ??
      member?.member_type;
    const registered =
      data?.account_exists ??
      data?.userExists ??
      data?.registered ??
      data?.exists ??
      data?.is_registered ??
      Boolean(member);

    // Not registered: this email has no account, so they can't log in.
    // Ask them to register first instead of routing into the dashboards.
    if (!registered) {
      setNotRegistered(true);
      toast.error("No account found. Please register to login.");
      return;
    }

    // ── Already registered ────────────────────────────────────────────────
    // Branch on payment status:
    //   • Payment done  → send them to the relevant dashboard.
    //   • Payment pending → send them to the summary page so they can review
    //     their submitted details and complete payment.
    const paid = String(member?.payment_status || "").toLowerCase().includes("paid");

    if (!paid) {
      toast("Payment pending — review your details.", { icon: "💳" });
      navigate("/registration-status", { state: { member, email } });
      return;
    }

    // Paid — route to the relevant dashboard for the member's role.
    const r = String(role || "").toLowerCase();
    const isCoach = data?.redirect_to === "coach_dashboard" || r.includes("coach");

    if (member && isCoach) {
      toast.success("Welcome back, Coach!");
      navigate("/coach-dashboard", { state: { member } });
      return;
    }
    if (member && r.includes("club")) {
      toast.success("Welcome back!");
      navigate("/student-dashboard", { state: { member } });
      return;
    }
    if (member && r.includes("independent")) {
      toast.success("Welcome back!");
      navigate("/independent-dashboard", { state: { member } });
      return;
    }

    // Unknown role — fall back to a placeholder message.
    const text = rolePlaceholderMessage(role) || "Login successful. Your dashboard is under development.";
    setLoginMessage(text);
    toast.success(text);
  };

  // ── Post-login placeholder (registered user) ──────────────────────────────
  if (loginMessage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex flex-col items-center justify-center m-0 px-8 sm:px-12 lg:px-16">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-green-50">
            <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Login Successful</h2>
          <p className="text-sm text-gray-500 mb-1">Signed in as</p>
          <p className="text-sm font-semibold text-blue-700 mb-5">{email}</p>
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-4 mb-5">
            <p className="text-base font-semibold text-blue-700">{loginMessage}</p>
          </div>
          <button
            onClick={() => {
              setLoginMessage("");
              setStep("email");
              setEmail("");
            }}
            className="w-full text-blue-600 font-semibold text-sm hover:underline"
          >
            Back to Login
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-8">
          © {new Date().getFullYear()} University of Sri Jayewardenepura
        </p>
      </div>
    );
  }

  return (
    <AuthShell>
      {/* Login form (right panel) */}
      <div className="w-full flex flex-col items-center">
        {/* Step indicator */}
        <div className="flex items-center gap-2 sm:gap-4 mb-8 w-full max-w-sm sm:max-w-none justify-center">
          <div className="flex items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold border-2 ${
              step === "email"
                ? "bg-blue-700 text-white border-blue-700"
                : "bg-green-500 text-white border-green-500"
            }`}>
              {step === "otp" ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : "1"}
            </div>
            <span className={`text-sm sm:text-lg font-semibold ${step === "email" ? "text-blue-700" : "text-gray-500"}`}>
              Email OTP Login
            </span>
          </div>

          <div className={`h-px w-12 ${step === "otp" ? "bg-blue-600" : "bg-gray-300"}`} />

          <div className="flex items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold border-2 ${
              step === "otp"
                ? "bg-blue-700 text-white border-blue-700"
                : "bg-gray-200 text-gray-500 border-gray-200"
            }`}>
              2
            </div>
            <span className={`text-sm sm:text-lg font-semibold ${step === "otp" ? "text-blue-700" : "text-gray-500"}`}>
              OTP Verification
            </span>
          </div>
        </div>

        {/* Card */}
        <div className="w-full max-w-2xl">
          {step === "email"
            ? <EmailStep initialEmail={initialEmail} onSend={handleSendOtp} beforeSend={handleBeforeSend} />
            : <OtpStep email={email} onVerify={handleVerify} onResend={() => sendOtp(email)} />
          }

          {step === "otp" && (
            <button onClick={() => setStep("email")}
              className="w-full text-center text-base text-gray-500 hover:text-blue-600 mt-4 transition">
              Change email
            </button>
          )}

          <div className="text-center mt-5">
            <p className="text-lg text-gray-500">
              New student?{" "}
              <button onClick={() => navigate("/select-registration")}
                className="text-blue-600 font-semibold hover:underline">
                Register here
              </button>
            </p>
          </div>
        </div>

        <p className="text-base text-gray-500 mt-8">
          © {new Date().getFullYear()} University of Sri Jayewardenepura
        </p>
      </div>

      {/* No Account Found — popup modal. Overlays the login page (position:
          fixed) instead of navigating away, so the user stays put. */}
      {notRegistered && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="no-account-title"
          onClick={closeNotRegistered}
        >
          <div
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close (X) */}
            <button
              type="button"
              onClick={closeNotRegistered}
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
            <h2 id="no-account-title" className="text-xl font-bold text-gray-900 mb-1">No Account Found</h2>
            <p className="text-sm text-gray-500 mb-1">No registration exists for</p>
            <p className="text-sm font-semibold text-blue-700 mb-5 break-all">{email}</p>
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-4 mb-5">
              <p className="text-base font-semibold text-amber-700">Please register to login.</p>
            </div>
            <button
              onClick={() => navigate("/select-registration", { state: { email } })}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 rounded-lg text-sm transition mb-3"
            >
              Register Now
            </button>
            <button
              onClick={closeNotRegistered}
              className="w-full text-blue-600 font-semibold text-sm hover:underline"
            >
              Back to Login
            </button>
          </div>
        </div>
      )}
    </AuthShell>
  );
}