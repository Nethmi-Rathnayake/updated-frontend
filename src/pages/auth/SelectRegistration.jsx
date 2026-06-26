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
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 lg:p-12 w-full">
          {/* USJ Branding */}
          <div className="flex items-center gap-3 sm:gap-5 mb-6 sm:mb-10">
            <img
              src={logo}
              alt="USJ Logo"
              className="w-16 h-16 sm:w-24 sm:h-24 object-contain flex-shrink-0"
            />
            <div>
              <p className="font-semibold text-gray-800 text-base sm:text-2xl leading-tight whitespace-nowrap">
                University of Sri Jayewardenepura
              </p>
              <p className="text-sm sm:text-lg text-blue-600">Sports Facility Portal</p>
            </div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 text-center">
            How are you joining?
          </h2>
          <p className="text-base text-gray-500 text-center mb-2">Choose the registration type that applies to you.</p>
          {email && (
            <p className="text-sm font-semibold text-blue-700 text-center mb-2 break-all">{email}</p>
          )}
          <div className="flex flex-col gap-4 mt-6">
            <button
              onClick={goToStudent}
              className="w-full bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white font-semibold py-4 rounded-xl transition text-lg shadow-sm hover:shadow-md flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              Register as Member
            </button>
            <button
              onClick={goToClub}
              className="w-full border-2 border-blue-700 text-blue-700 hover:bg-blue-50 active:bg-blue-100 font-semibold py-4 rounded-xl transition text-lg flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Register as Coach / Club
            </button>
          </div>

          <button
            onClick={() => navigate("/")}
            className="w-full text-center text-base text-gray-500 hover:text-blue-600 mt-8 transition"
          >
            Back to login
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-500 mt-8">
        © {new Date().getFullYear()} University of Sri Jayewardenepura
      </p>
    </AuthShell>
  );
}
