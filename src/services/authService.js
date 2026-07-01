import api, { setMemberToken, clearMemberToken } from "./api";

// Backend routes (see SFMIS-Backend/routes/web.php + routes/api.php):
//   POST /send-otp                 { email }        → { account_exists, registration_in_progress, ... }
//   POST /verify-otp               { email, otp }   → { account_exists, token, member, redirect_to, ... }
//   POST /api/member-registrations (multipart form data, session-gated by OTP)
//   GET  /api/member/me            (member bearer token)
//   POST /api/member/logout        (member bearer token)

export const sendOtp = (email) =>
  api.post("/send-otp", { email }).then((res) => res.data);

// verify-otp now issues a Sanctum bearer token for existing members. Capture it
// here (centralized) so every caller — login and the registration pages —
// automatically establishes the member session on a successful verify.
export const verifyOtp = (email, otp) =>
  api.post("/verify-otp", { email, otp }).then((res) => {
    const data = res.data || {};
    if (data.token) setMemberToken(data.token);
    return data;
  });

// The logged-in member's own record (works with the member bearer token).
export const getMemberMe = () =>
  api.get("/api/member/me").then((res) => res.data?.member ?? res.data);

// Ends the member session: revokes the token server-side, then clears it
// locally regardless of the request outcome.
export const memberLogout = () =>
  api
    .post("/api/member/logout")
    .catch(() => {})
    .finally(() => clearMemberToken());

// Note: do NOT set Content-Type manually here. When the body is a FormData,
// axios/the browser sets "multipart/form-data" together with the required
// boundary automatically; setting it by hand can drop the boundary.
export const registerMember = (formData) =>
  api.post("/api/member-registrations", formData).then((res) => res.data);
