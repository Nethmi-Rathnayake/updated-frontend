import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import logo from "../../assets/usjp-logo__1_-removebg-preview.png";
import AuthShell from "../../components/auth/AuthShell";
import { useAuth } from "../../hooks/useAuth";

// Back-office login (system users / RBAC). Shares the member LoginPage design
// language — the AuthShell split-screen layout, the same branded white card,
// large rounded inputs and blue-700 primary button — while keeping the
// email + password form system users require (instead of the OTP flow).
export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, loading } = useAuth();

  // Where to land after login: wherever ProtectedRoute bounced them from, else
  // the dashboard.
  const from = location.state?.from || "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Already signed in (e.g. navigated here directly) → skip to the dashboard.
  useEffect(() => {
    if (!loading && isAuthenticated) navigate(from, { replace: true });
  }, [loading, isAuthenticated, from, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError("");
    setSubmitting(true);
    try {
      const user = await login(email.trim(), password);
      toast.success(`Welcome back, ${user.name}!`);
      navigate(from, { replace: true });
    } catch (err) {
      const status = err?.response?.status;
      const msg =
        err?.response?.data?.message ||
        (status === 401 ? "Invalid email or password." : "Login failed. Please try again.");
      setError(msg);
      setSubmitting(false);
    }
  };

  const inputBase =
    "w-full border rounded-xl px-4 py-4 text-lg focus:outline-none focus:ring-2 transition";

  return (
    <AuthShell>
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 lg:p-12 w-full">
          {/* USJ branding — matches the member login card */}
          <div className="flex items-center gap-3 sm:gap-5 mb-6 sm:mb-8">
            <img
              src={logo}
              alt="USJ Logo"
              className="w-16 h-16 sm:w-24 sm:h-24 object-contain flex-shrink-0"
            />
            <div>
              <p className="font-semibold text-gray-800 text-sm sm:text-xl leading-tight whitespace-nowrap">
                University of Sri Jayewardenepura
              </p>
              <p className="text-sm sm:text-lg text-blue-600">Sports Facility — Admin Portal</p>
            </div>
          </div>

          <h2 className="text-center text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            System Login
          </h2>
          <p className="text-center text-gray-500 text-lg mb-8">
            Sign in with your operator credentials.
          </p>

          <form onSubmit={handleSubmit} noValidate>
            <label htmlFor="admin-email" className="block text-lg font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              id="admin-email"
              type="email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@sjp.ac.lk"
              className={`${inputBase} mb-4 ${
                error ? "border-red-400 focus:ring-red-400 bg-red-50" : "border-gray-300 focus:ring-blue-500"
              }`}
            />

            <label htmlFor="admin-password" className="block text-lg font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`${inputBase} pr-16 ${
                  error ? "border-red-400 focus:ring-red-400 bg-red-50" : "border-gray-300 focus:ring-blue-500"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 px-4 flex items-center text-sm font-semibold text-blue-600 hover:text-blue-800"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            {error && (
              <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || !email || !password}
              className="w-full bg-blue-700 hover:bg-blue-800 active:bg-blue-900 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition mt-6 text-lg shadow-sm hover:shadow-md"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Signing in…
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>

        <p className="text-base text-gray-500 text-center mt-8">
          © {new Date().getFullYear()} University of Sri Jayewardenepura
        </p>
      </div>
    </AuthShell>
  );
}
