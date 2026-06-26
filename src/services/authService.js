import api from "./api";

// Backend routes (see SFMIS-Backend-main/routes/web.php):
//   POST /send-otp                 { email }
//   POST /verify-otp               { email, otp }
//   POST /api/member-registrations (multipart form data, session-gated by OTP)

export const sendOtp = (email) =>
  api.post("/send-otp", { email }).then((res) => res.data);

export const verifyOtp = (email, otp) =>
  api.post("/verify-otp", { email, otp }).then((res) => res.data);

// Note: do NOT set Content-Type manually here. When the body is a FormData,
// axios/the browser sets "multipart/form-data" together with the required
// boundary automatically; setting it by hand can drop the boundary.
export const registerMember = (formData) =>
  api.post("/api/member-registrations", formData).then((res) => res.data);
