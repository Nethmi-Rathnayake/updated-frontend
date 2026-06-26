import React, { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import { verifyOtp } from "../../services/authService";

export default function OtpStep({ email, onVerify, onResend }) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(165);
  const inputRefs = useRef([]);
  

  useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  const minutes = String(Math.floor(timer / 60)).padStart(2, "0");
  const seconds = String(timer % 60).padStart(2, "0");

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };
 
  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newOtp = [...otp];
    pasted.split("").forEach((ch, i) => { newOtp[i] = ch; });
    setOtp(newOtp);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length < 6) { setError("Please enter all 6 digits."); return; }
    try {
      setError("");
      setLoading(true);
      // The verify endpoint now also reports whether this email already belongs
      // to a registered user and their role. Hand the full response up so the
      // parent (LoginPage) can route accordingly. OTP validation itself is
      // unchanged — a failed verification still throws and is caught below.
      const data = await verifyOtp(email, code);
      toast.success("OTP Verified Successfully!");
      onVerify(data);
    } catch (err) {
      const message = err.response?.data?.message || "Invalid OTP.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 lg:p-12 w-full text-center">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Check Your Inbox</h2>
      <p className="text-base sm:text-lg text-gray-500 mb-1">We sent a 6-digit code to</p>
      <p className="text-base sm:text-lg font-semibold text-blue-700 mb-6 break-all">{email}</p>

      <div className="flex justify-center gap-2 sm:gap-3 mb-4" onPaste={handlePaste}>
        {otp.map((digit, i) => (
          <input
            key={i}
            ref={(el) => (inputRefs.current[i] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className="w-10 h-12 sm:w-14 sm:h-16 border-2 border-gray-300 rounded-lg text-center text-xl sm:text-2xl font-bold focus:outline-none focus:border-blue-600 transition"
          />
        ))}
      </div>

      {error && <p className="text-red-500 text-base mb-2">{error}</p>}

      <p className="text-base text-gray-500 mb-4">
        Code expires in{" "}
        <span className="text-red-500 font-semibold">{minutes}:{seconds}</span>{" "}
        <button onClick={() => { setTimer(165); setOtp(["","","","","",""]); onResend();
        toast.success("OTP resent successfully!"); }}
          className="text-blue-600 font-semibold hover:underline ml-1">
          Resend OTP
        </button>
      </p>

      <button
        onClick={handleVerify}
        disabled={loading || otp.join("").length < 6}
        className="w-full bg-blue-700 hover:bg-blue-800 active:bg-blue-900 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition text-lg shadow-sm hover:shadow-md"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Verifying…
          </span>
        ) : "Verify & Login"}
      </button>

      <p className="flex items-center justify-center gap-1.5 text-base text-gray-500 mt-4">
        <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Secure authentication
      </p>
    </div>
  );
}