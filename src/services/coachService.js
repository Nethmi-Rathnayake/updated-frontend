import api from "./api";

// Coach dashboard data layer — wraps the existing backend endpoints
// (see SFMIS-Backend/routes/web.php). Some endpoints wrap their single result
// in an outer array ([[ ... ]]); those are unwrapped here so callers get a
// plain object.

// GET /api/coaches/{coachId}/club-verification-requests → array of pending requests
export const getClubVerificationRequests = (coachId) =>
  api.get(`/api/coaches/${coachId}/club-verification-requests`).then((r) => r.data);

// POST /api/club-verification-requests/{memberId}/approve { coach_id }
export const approveClubRequest = (memberId, coachId) =>
  api
    .post(`/api/club-verification-requests/${memberId}/approve`, { coach_id: coachId })
    .then((r) => (Array.isArray(r.data) ? r.data[0] : r.data));

// POST /api/club-verification-requests/{memberId}/reject { coach_id }
export const rejectClubRequest = (memberId, coachId) =>
  api
    .post(`/api/club-verification-requests/${memberId}/reject`, { coach_id: coachId })
    .then((r) => (Array.isArray(r.data) ? r.data[0] : r.data));

// GET /api/members?club_id=…[&member_type_id=…&…] → array of club members.
// Extra params (e.g. member_type_id) are forwarded to the same endpoint, so the
// caller can narrow to a single member type (used for Coordinators = coaches).
export const getClubMembers = (clubId, params = {}) =>
  api.get(`/api/members`, { params: { club_id: clubId, ...params } }).then((r) => r.data);

// GET /api/member-types → array of Member Type categories ({category_id, description}).
// Used to resolve the "Coach" type id so coordinators can be fetched by type.
export const getMemberTypes = () => api.get(`/api/member-types`).then((r) => r.data);

// GET /api/facilities → array of facilities (with slot_count + booking_fee)
export const getFacilities = () => api.get(`/api/facilities`).then((r) => r.data);

// GET /api/facilities/{id}/availability?date=YYYY-MM-DD → availability object
// (the endpoint returns [[ {…} ]], so unwrap the first element).
export const getFacilityAvailability = (facilityId, date) =>
  api
    .get(`/api/facilities/${facilityId}/availability`, { params: { date } })
    .then((r) => (Array.isArray(r.data) ? r.data[0] : r.data));

// GET /api/clubs/{id} → club detail object (the endpoint returns [[ {…} ]],
// so unwrap the first element).
export const getClub = (clubId) =>
  api.get(`/api/clubs/${clubId}`).then((r) => (Array.isArray(r.data) ? r.data[0] : r.data));

// GET /api/payments?club_id=… → array of payments for the club.
export const getClubPayments = (clubId) =>
  api.get(`/api/payments`, { params: { club_id: clubId } }).then((r) => r.data);

// GET /api/attendances?date=… → array of attendance scans. The backend has no
// club filter, so callers narrow to their club members client-side.
export const getAttendances = (params = {}) =>
  api.get(`/api/attendances`, { params }).then((r) => r.data);
