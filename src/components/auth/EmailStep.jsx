import React, { useState } from "react";
import logo from "../../assets/usjp-logo__1_-removebg-preview.png";
import { sendOtp } from "../../services/authService";
import toast from "react-hot-toast";
// `beforeSend` (optional): async (email) => boolean. Runs before the OTP is
// sent; return false to abort (e.g. the email isn't registered). The login page
// uses it to block unregistered emails and prompt them to register instead.
export default function EmailStep({ onSend, beforeSend, initialEmail = "" }) {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      if (beforeSend) {
        const proceed = await beforeSend(email);
        if (!proceed) return; // aborted (caller shows its own message)
      }
      await sendOtp(email);
      toast.success("OTP sent successfully!");
      onSend(email);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to send OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 lg:p-12 w-full">

      {/* USJ Branding - logo  */}
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
          <p className="text-sm sm:text-lg text-blue-600">Sports Facility Portal</p>
        </div>
      </div>

      <h2 className="text-center text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
        Sign In
      </h2>
      <p className="text-center text-gray-500 text-lg mb-8">
        <span className="font-bold text-blue-700">Already registered?</span> Sign in to your account.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <label htmlFor="email-input" className="block text-lg font-medium text-gray-700 mb-2">
          Email Address
        </label>
        <input
          id="email-input"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="yourname@sjp.ac.lk"
          className={`w-full border rounded-xl px-4 py-4 text-lg focus:outline-none focus:ring-2 mb-1 transition ${
            error ? "border-red-400 focus:ring-red-400 bg-red-50" : "border-gray-300 focus:ring-blue-500"
          }`}
        />
        {error && (
          <p className="text-red-500 text-sm mb-2 flex items-center gap-1">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading || !email}
          className="w-full bg-blue-700 hover:bg-blue-800 active:bg-blue-900 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition mt-4 text-lg shadow-sm hover:shadow-md"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Sending OTP…
            </span>
          ) : "Send OTP"}
        </button>
      </form>
    </div>
  );
}