import React, { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../hooks/useAuth";
import {
  listSystemUsers,
  createSystemUser,
  updateSystemUser,
  setSystemUserStatus,
  resetSystemUserPassword,
} from "../../services/systemUserService";
import { listRoles } from "../../services/systemRoleService";
import {
  TOKENS,
  Icon,
  ICONS,
  Pill,
  Avatar,
  EmptyState,
  Spinner,
  inputClass,
  labelClass,
  btnPrimary,
  btnSecondary,
} from "../../components/common/DashboardUI";

// ── Modal shell (matches the member-page modal styling) ─────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
        >
          <Icon path={ICONS.x} className="w-5 h-5" width={2} />
        </button>
        <h2 className="text-lg font-bold mb-4 pr-8" style={{ color: TOKENS.NAVY }}>
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}

// Pull a human message out of an axios error (top-level message + first field
// validation error if present).
function errMessage(err, fallback) {
  const data = err?.response?.data;
  if (data?.errors) {
    const first = Object.values(data.errors)[0];
    if (Array.isArray(first) && first[0]) return first[0];
  }
  return data?.message || fallback;
}

// ── User create / edit form ─────────────────────────────────────────────────
function UserForm({ mode, initial, roles, onCancel, onSaved }) {
  const isEdit = mode === "edit";
  const [name, setName] = useState(initial?.name || "");
  const [email, setEmail] = useState(initial?.email || "");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState(initial?.role_id || roles[0]?.id || "");
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setError("");
    setSaving(true);
    try {
      if (isEdit) {
        const updated = await updateSystemUser(initial.id, {
          name,
          email,
          role_id: Number(roleId),
          is_active: isActive,
        });
        toast.success("System user updated.");
        onSaved(updated);
      } else {
        const created = await createSystemUser({
          name,
          email,
          password,
          role_id: Number(roleId),
          is_active: isActive,
        });
        toast.success("System user created.");
        onSaved(created);
      }
    } catch (err) {
      setError(errMessage(err, "Could not save the user."));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelClass}>Name</label>
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <label className={labelClass}>Email</label>
        <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      {!isEdit && (
        <div>
          <label className={labelClass}>
            Password <span className="text-gray-400 font-normal">(min 8 characters)</span>
          </label>
          <input
            type="password"
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </div>
      )}
      <div>
        <label className={labelClass}>Role</label>
        <select className={inputClass} value={roleId} onChange={(e) => setRoleId(e.target.value)} required>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        Active
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onCancel} className={`${btnSecondary} flex-1`}>
          Cancel
        </button>
        <button type="submit" disabled={saving} className={`${btnPrimary} flex-1`}>
          {saving ? "Saving…" : isEdit ? "Save Changes" : "Create User"}
        </button>
      </div>
    </form>
  );
}

// ── Reset password form ─────────────────────────────────────────────────────
function ResetPasswordForm({ user, onCancel, onDone }) {
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setError("");
    setSaving(true);
    try {
      await resetSystemUserPassword(user.id, password);
      toast.success(`Password reset for ${user.name}.`);
      onDone();
    } catch (err) {
      setError(errMessage(err, "Could not reset the password."));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-gray-500">
        Set a new password for <span className="font-semibold text-gray-700">{user.name}</span>. Their active
        sessions will be signed out.
      </p>
      <div>
        <label className={labelClass}>
          New password <span className="text-gray-400 font-normal">(min 8 characters)</span>
        </label>
        <input
          type="password"
          className={inputClass}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onCancel} className={`${btnSecondary} flex-1`}>
          Cancel
        </button>
        <button type="submit" disabled={saving} className={`${btnPrimary} flex-1`}>
          {saving ? "Resetting…" : "Reset Password"}
        </button>
      </div>
    </form>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function SystemUsers() {
  const { user: currentUser, can, isSuperAdmin } = useAuth();

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState(""); // "", "active", "inactive"
  const [busyId, setBusyId] = useState(null);

  // modal: { type: "create" | "edit" | "reset", user? }
  const [modal, setModal] = useState(null);

  const canCreate = can("create_system_users");
  const canEdit = can("edit_system_users");
  const canToggle = can("deactivate_system_users");
  const canReset = can("reset_system_user_password");

  // Roles a non-Super-Admin may assign exclude "Super Admin" (backend rejects it
  // anyway — we just don't offer it).
  const assignableRoles = useMemo(
    () => (isSuperAdmin ? roles : roles.filter((r) => r.name !== "Super Admin")),
    [roles, isSuperAdmin]
  );

  const fetchUsers = useCallback(() => {
    setLoading(true);
    const params = {};
    if (search.trim()) params.search = search.trim();
    if (roleFilter) params.role_id = roleFilter;
    if (statusFilter) params.is_active = statusFilter === "active";
    listSystemUsers(params)
      .then(setUsers)
      .catch((err) => toast.error(errMessage(err, "Could not load system users.")))
      .finally(() => setLoading(false));
  }, [search, roleFilter, statusFilter]);

  // Debounce the search/filter-driven refetch.
  useEffect(() => {
    const t = setTimeout(fetchUsers, 300);
    return () => clearTimeout(t);
  }, [fetchUsers]);

  useEffect(() => {
    listRoles().then(setRoles).catch(() => {});
  }, []);

  const handleToggleStatus = async (u) => {
    setBusyId(u.id);
    try {
      const updated = await setSystemUserStatus(u.id, !u.is_active);
      setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, ...updated } : x)));
      toast.success(updated.is_active ? "User activated." : "User deactivated.");
    } catch (err) {
      toast.error(errMessage(err, "Could not change the user's status."));
    } finally {
      setBusyId(null);
    }
  };

  const onSaved = () => {
    setModal(null);
    fetchUsers();
  };

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold" style={{ color: TOKENS.NAVY }}>
            System Users
          </h1>
          <p className="text-sm text-gray-500">Manage back-office operator accounts.</p>
        </div>
        {canCreate && (
          <button onClick={() => setModal({ type: "create" })} className={btnPrimary}>
            <Icon path={ICONS.plus} className="w-4 h-4" width={2} />
            Add User
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
            <Icon path={ICONS.search} className="w-4 h-4" width={1.8} />
          </span>
          <input
            className={`${inputClass} pl-9`}
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className={`${inputClass} w-auto`} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">All roles</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <select className={`${inputClass} w-auto`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Spinner />
            <p className="text-sm text-gray-400">Loading system users…</p>
          </div>
        ) : users.length === 0 ? (
          <EmptyState icon={ICONS.users} text="No system users found." />
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-left min-w-[720px]">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100">
                  <th className="py-2 pr-3 font-medium">User</th>
                  <th className="py-2 px-3 font-medium">Role</th>
                  <th className="py-2 px-3 font-medium">Status</th>
                  <th className="py-2 pl-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  return (
                    <tr key={u.id} className="border-b border-gray-50 last:border-0">
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.name} size={38} />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate flex items-center gap-2" style={{ color: TOKENS.NAVY }}>
                              {u.name}
                              {isSelf && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: TOKENS.LIGHT, color: TOKENS.PRIMARY }}>
                                  You
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-gray-400 truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold whitespace-nowrap">
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <Pill>{u.is_active ? "Active" : "Inactive"}</Pill>
                      </td>
                      <td className="py-3 pl-3">
                        <div className="flex items-center justify-end gap-3">
                          {canEdit && (
                            <button
                              onClick={() => setModal({ type: "edit", user: u })}
                              className="inline-flex items-center gap-1 text-xs font-semibold"
                              style={{ color: TOKENS.PRIMARY }}
                            >
                              <Icon path={ICONS.edit} className="w-4 h-4" width={1.8} />
                              Edit
                            </button>
                          )}
                          {canReset && (
                            <button
                              onClick={() => setModal({ type: "reset", user: u })}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-800"
                            >
                              <Icon path={ICONS.key} className="w-4 h-4" width={1.8} />
                              Reset
                            </button>
                          )}
                          {canToggle && (
                            <button
                              onClick={() => handleToggleStatus(u)}
                              disabled={isSelf || busyId === u.id}
                              title={isSelf ? "You can't change your own status" : ""}
                              className={`text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed ${
                                u.is_active ? "text-red-500 hover:text-red-700" : "text-green-600 hover:text-green-800"
                              }`}
                            >
                              {busyId === u.id ? "…" : u.is_active ? "Deactivate" : "Activate"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {modal?.type === "create" && (
        <Modal title="Add System User" onClose={() => setModal(null)}>
          <UserForm mode="create" roles={assignableRoles} onCancel={() => setModal(null)} onSaved={onSaved} />
        </Modal>
      )}
      {modal?.type === "edit" && (
        <Modal title="Edit System User" onClose={() => setModal(null)}>
          <UserForm mode="edit" initial={modal.user} roles={assignableRoles} onCancel={() => setModal(null)} onSaved={onSaved} />
        </Modal>
      )}
      {modal?.type === "reset" && (
        <Modal title="Reset Password" onClose={() => setModal(null)}>
          <ResetPasswordForm user={modal.user} onCancel={() => setModal(null)} onDone={() => setModal(null)} />
        </Modal>
      )}
    </div>
  );
}
