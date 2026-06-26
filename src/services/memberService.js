import api from "./api";

// Member data layer — wraps the existing backend endpoints
// (see SFMIS-Backend/routes/web.php). The show endpoint wraps its single
// result in an outer array ([[ … ]]); it is unwrapped here so callers get a
// plain object.

// GET /api/members/{id} → full member record (+ registration process rows).
export const getMember = (id) =>
  api.get(`/api/members/${id}`).then((r) => (Array.isArray(r.data) ? r.data[0] : r.data));

// PUT /api/members/{id} → update a member's editable personal details
// (title, names, gender, NIC, phones, DOB, address, photo). It's a partial
// update: only the fields present in the FormData are changed.
//
// We send an actual POST with a `_method=PUT` field (Laravel method spoofing)
// rather than a real PUT, because the form can upload a photo as
// multipart/form-data and PHP does not populate multipart bodies on PUT/PATCH
// requests. The response wraps the updated record in an outer array (like
// show); it is unwrapped here so callers get a plain object.
export const updateMember = (id, formData) => {
  formData.append("_method", "PUT");
  return api
    .post(`/api/members/${id}`, formData)
    .then((r) => (Array.isArray(r.data) ? r.data[0] : r.data));
};

// GET /api/payments?payer_id=… → this member's own payments.
export const getMemberPayments = (payerId) =>
  api.get(`/api/payments`, { params: { payer_id: payerId } }).then((r) => (Array.isArray(r.data) ? r.data : []));

// POST /api/payment/simulate-success/{id} → test payment gateway. Given a
// member's NUMERIC id, marks the pending registration-fee payment as completed,
// completes the Payment workflow step, and flips the member to Active once all
// required steps are done. Returns the updated member/payment summary.
export const simulatePaymentSuccess = (memberId) =>
  api.post(`/api/payment/simulate-success/${memberId}`).then((r) => r.data);

// Returns true if a member account exists for this exact email. Used by the
// login page to decide — BEFORE sending an OTP — whether the person is
// registered. There is no dedicated "exists" endpoint, so we reuse the members
// search (LIKE match) and confirm an exact, case-insensitive email match so a
// partial hit (e.g. "a@b.com" inside "xa@b.com") can't be a false positive.
export const isEmailRegistered = (email) => {
  const target = String(email || "").trim().toLowerCase();
  if (!target) return Promise.resolve(false);
  return api
    .get(`/api/members`, { params: { search: target } })
    .then((r) => (Array.isArray(r.data) ? r.data : []))
    .then((members) => members.some((m) => String(m.email || "").toLowerCase() === target));
};
