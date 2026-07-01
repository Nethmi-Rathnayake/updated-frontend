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

// POST /api/member-registration-processes/{processId}/simulate-payment-success
// → test payment gateway. Given a registration PROCESS id, marks its pending
// registration-fee payment as paid and finalizes the member once all required
// steps (e.g. club verification) are done. Optionally pass the amount actually
// paid; it defaults server-side to the process's payable amount. Returns the
// updated process (+ member, once created).
export const simulatePaymentSuccess = (processId, paidAmount) =>
  api
    .post(
      `/api/member-registration-processes/${processId}/simulate-payment-success`,
      paidAmount != null ? { paid_amount: paidAmount } : {}
    )
    .then((r) => r.data);
