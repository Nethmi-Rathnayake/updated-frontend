import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../../assets/usjp-logo__1_-removebg-preview.png";
import AuthShell from "../../components/auth/AuthShell";

// Shown after OTP verification when the email is NOT yet registered.
// Asks the user whether they want to register as a Student or as a Club,
// then routes to the matching registration page.
export default function SelectRegistration() {
  const navigate = useNavigate();
  const location = useLocation();
  // The verified email is forwarded from LoginPage so the registration pages
  // can pre-use it if they want (they currently re-collect/verify it).
  const email = location.state?.email;

  const goToStudent = () =>
    navigate("/student-registration", { state: { email } });

  const goToClub = () =>
    navigate("/club-registration", { state: { email } });

  return (
    <AuthShell>
      <div className="w-full max-w-3xl">
        <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 lg:p-10 w-full">
          {/* USJ Branding */}
          <div className="flex items-center gap-3 sm:gap-4 pb-5 mb-6 border-b border-gray-100">
            <img
              src={logo}
              alt="USJ Logo"
              className="w-14 h-14 sm:w-16 sm:h-16 object-contain flex-shrink-0"
            />
            <div>
              <p className="font-bold text-gray-900 text-base sm:text-xl leading-tight">
                University of Sri Jayewardenepura
              </p>
              <p className="text-sm sm:text-base text-blue-600 font-medium">Sports Facility Portal</p>
            </div>
          </div>

          {/* Heading with centered icon chip */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Please select the option that best describes you.
            </h2>
            {email && (
              <p className="text-sm font-semibold text-blue-700 mt-2 break-all">{email}</p>
            )}
          </div>

          {/* Registration option cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {/* Register as Member (blue) */}
            <div className="flex flex-col rounded-2xl border border-blue-100 bg-blue-50/30 p-5 sm:p-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
                <h3 className="text-lg font-bold text-blue-700 mb-2">Register as Member</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  For individuals who want to access and use sports facilities and services.
                </p>
              </div>
              <ul className="mt-5 mb-6 space-y-2.5">
                {["Book sports facilities", "Join activities & programs", "View your bookings", "Personal dashboard"].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-gray-600">
                    <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={goToStudent}
                className="mt-auto w-full bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white font-semibold py-3 rounded-xl transition text-base shadow-sm hover:shadow-md flex items-center justify-center gap-2"
              >
                Select
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>

            {/* Register as Club (green) */}
            <div className="flex flex-col rounded-2xl border border-green-100 bg-green-50/30 p-5 sm:p-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                <h3 className="text-lg font-bold text-green-700 mb-2">Register as Club</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  For sports clubs and teams to manage their members and bookings.
                </p>
              </div>
              <ul className="mt-5 mb-6 space-y-2.5">
                {["Manage club members", "Book facilities for your club", "Manage events & activities", "Club dashboard & reports"].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-gray-600">
                    <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={goToClub}
                className="mt-auto w-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold py-3 rounded-xl transition text-base shadow-sm hover:shadow-md flex items-center justify-center gap-2"
              >
                Select
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>

          {/* Already have an account */}
          <button
            onClick={() => navigate("/")}
            className="w-full mt-6 rounded-xl bg-blue-50 hover:bg-blue-100 py-4 flex items-center justify-center gap-2 text-base text-gray-600 transition"
          >
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            Already have an account? <span className="font-semibold text-blue-700 underline">Login here</span>
          </button>

          <p className="text-xs text-gray-400 text-center mt-6">
            © {new Date().getFullYear()} University of Sri Jayewardenepura. All rights reserved.
          </p>
        </div>
      </div>
    </AuthShell>
  );
}
