import api from "./api";

// Roles & permissions management (Super Admin only on the UI; the backend also
// enforces this via the create_roles / edit_roles / delete_roles /
// assign_role_permissions permissions).
//
// Response-shape note (mirrors systemUserService): list endpoints return a plain
// array, while show/store/update/updatePermissions return nested single-element
// arrays. `unwrap()` peels that nesting so callers get a plain object.
const unwrap = (data) => {
  let v = data;
  while (Array.isArray(v) && v.length === 1) v = v[0];
  return v;
};

// GET /api/system/roles — plain array:
//   {id, name, description, permissions_count, system_users_count, ...}
export const listRoles = () =>
  api.get("/api/system/roles").then((r) => (Array.isArray(r.data) ? r.data : []));

// GET /api/system/permissions — plain array of {id, name, description}.
export const listPermissions = () =>
  api.get("/api/system/permissions").then((r) => (Array.isArray(r.data) ? r.data : []));

// GET /api/system/roles/{id} — role detail including its `permissions` array.
export const getRole = (id) =>
  api.get(`/api/system/roles/${id}`).then((r) => unwrap(r.data));

// POST /api/system/roles  { name, description } — creates a role (no permissions
// yet; assign them separately via updateRolePermissions).
export const createRole = (payload) =>
  api.post("/api/system/roles", payload).then((r) => unwrap(r.data));

// PUT /api/system/roles/{id}  { name?, description? }
export const updateRole = (id, payload) =>
  api.put(`/api/system/roles/${id}`, payload).then((r) => unwrap(r.data));

// DELETE /api/system/roles/{id}  -> { message }
export const deleteRole = (id) => api.delete(`/api/system/roles/${id}`).then((r) => r.data);

// PUT /api/system/roles/{id}/permissions  { permission_ids: number[] }
// Replaces (syncs) the role's permission set.
export const updateRolePermissions = (id, permissionIds) =>
  api
    .put(`/api/system/roles/${id}/permissions`, { permission_ids: permissionIds })
    .then((r) => unwrap(r.data));

// Convenience flow for the create-role-with-permissions UI: the backend's create
// endpoint only accepts name/description, so we create the role first and then
// assign the chosen permissions in a second call. Returns the role (with its
// permissions loaded when any were assigned).
export const createRoleWithPermissions = async ({ name, description, permission_ids = [] }) => {
  const role = await createRole({ name, description });
  if (permission_ids.length) {
    return updateRolePermissions(role.id, permission_ids);
  }
  return role;
};
