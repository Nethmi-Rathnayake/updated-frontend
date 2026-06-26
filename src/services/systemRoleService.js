import api from "./api";

// Roles & permissions. For the "Auth + Users first" pass we only need the roles
// list (to populate the role dropdown in the system-user create/edit form). The
// full role-management / permission-matrix UI is a planned follow-up; the
// remaining endpoints are stubbed here so that work has a home.
//
// GET /api/system/roles returns a plain array:
//   {id, name, description, permissions_count, system_users_count, ...}

export const listRoles = () =>
  api
    .get("/api/system/roles")
    .then((r) => (Array.isArray(r.data) ? r.data : []));

// GET /api/system/permissions — plain array of {id, name, description}.
// Exposed now for the upcoming permission-matrix editor.
export const listPermissions = () =>
  api
    .get("/api/system/permissions")
    .then((r) => (Array.isArray(r.data) ? r.data : []));
