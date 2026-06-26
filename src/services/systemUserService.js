import api from "./api";

// System-user (back-office operator) management. RBAC-gated on the backend;
// every call here requires a valid bearer token (handled by the api instance).
//
// Response-shape note: the backend wraps single-record writes inconsistently —
// index/permissions return a plain array, show returns [obj], and
// store/update/updateStatus return [[ {message, ...obj} ]]. `unwrap()` peels any
// nesting of single-element arrays so callers always get a plain object.
const unwrap = (data) => {
  let v = data;
  while (Array.isArray(v) && v.length === 1) v = v[0];
  return v;
};

// GET /api/system/users — optional { search, role_id, is_active } filters.
// Returns a plain array of users: {id,name,email,role_id,role,is_active,...}.
export const listSystemUsers = (params = {}) =>
  api
    .get("/api/system/users", { params })
    .then((r) => (Array.isArray(r.data) ? r.data : []));

// GET /api/system/users/{id}
export const getSystemUser = (id) =>
  api.get(`/api/system/users/${id}`).then((r) => unwrap(r.data));

// POST /api/system/users  { name, email, password, role_id, is_active? }
// Returns the created user (with an extra `message` field).
export const createSystemUser = (payload) =>
  api.post("/api/system/users", payload).then((r) => unwrap(r.data));

// PUT /api/system/users/{id}  partial: { name?, email?, role_id?, is_active? }
export const updateSystemUser = (id, payload) =>
  api.put(`/api/system/users/${id}`, payload).then((r) => unwrap(r.data));

// PATCH /api/system/users/{id}/status  { is_active }
export const setSystemUserStatus = (id, isActive) =>
  api
    .patch(`/api/system/users/${id}/status`, { is_active: isActive })
    .then((r) => unwrap(r.data));

// POST /api/system/users/{id}/reset-password  { password }  -> { message }
export const resetSystemUserPassword = (id, password) =>
  api
    .post(`/api/system/users/${id}/reset-password`, { password })
    .then((r) => r.data);
