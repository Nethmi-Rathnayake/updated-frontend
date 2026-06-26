import React from "react";
import { Toaster } from "react-hot-toast";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/auth/LoginPage";
import SelectRegistration from "./pages/auth/SelectRegistration";
import StudentRegistration from "./pages/auth/StudentRegistration";
import ClubRegistration from "./pages/auth/ClubRegistration";
import RegistrationStatus from "./pages/auth/RegistrationStatus";
import PaymentMethod from "./pages/auth/PaymentMethod";
import CoachDashboard from "./pages/coach/CoachDashboard";
import StudentDashboard from "./pages/student/StudentDashboard";
import IndependentDashboard from "./pages/independent/IndependentDashboard";

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" reverseOrder={false} />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/select-registration" element={<SelectRegistration />} />
        <Route path="/student-registration" element={<StudentRegistration />} />
        <Route path="/club-registration" element={<ClubRegistration />} />
        <Route path="/registration-status" element={<RegistrationStatus />} />
        <Route path="/payment-method" element={<PaymentMethod />} />
        <Route path="/coach-dashboard" element={<CoachDashboard />} />
        <Route path="/student-dashboard" element={<StudentDashboard />} />
        <Route path="/independent-dashboard" element={<IndependentDashboard />} />
        {/* Legacy paths kept so existing links/bookmarks still work */}
        <Route path="/register" element={<StudentRegistration />} />
        <Route path="/clubregister" element={<ClubRegistration />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;