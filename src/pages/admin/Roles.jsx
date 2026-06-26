import React, { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  listRoles,
  listPermissions,
  getRole,
  createRoleWithPermissions,
  updateRole,
  deleteRole,
  updateRolePermissions,
} from "../../services/systemRoleService";
import {
  TOKENS,
  Icon,
  ICONS,
  EmptyState,
  Spinner,
  inputClass,
  labelClass,
  btnPrimary,
  btnSecondary,
} from "../../components/common/DashboardUI";

// Default system roles cannot be renamed or deleted; Super Admin's permission
// set is also locked. Mirrors the backend's protected-role rules so the UI
// disables actions the API would reject with a 422.
const isProtectedRole = (name) => name === "Super Admin" || name === "Admin";

// Pull a human message out of an axios error.
function errMessage(err, fallback) {
  const data = err?.response?.data;
  if (data?.errors) {
    const first = Object.values(data.errors)[0];
    if (Array.isArray(first) && first[0]) return first[0];
  }
  return data?.message || fallback;
}

// ── Permission grouping (for the selection matrix) ──────────────────────────
// Ordered: the first matching category wins. Keeps the ~70 permissions readable
// by clustering them by the module they belong to.
const GROUPS = [
  { key: "dashboard", label: "Dashboard", match: (n) => n.includes("dashboard") },
  { key: "system_users", label: "System Users", match: (n) => n.includes("system_user") },
  { key: "roles", label: "Roles & Permissions", match: (n) => n.includes("role") || n.includes("permission") },
  { key: "members", label: "Members", match: (n) => n.includes("member") && !n.includes("club_member") },
  { key: "clubs", label: "Clubs", match: (n) => n.includes("club") },
  { key: "coaches", label: "Coaches", match: (n) => n.includes("coach") },
  { key: "facilities", label: "Facilities", match: (n) => n.includes("facilit") },
  { key: "bookings", label: "Bookings & Entry", match: (n) => n.includes("booking") || n.includes("entry") },
  { key: "payments", label: "Payments", match: (n) => n.includes("payment") || n.includes("refund") },
  { key: "fees", label: "Fees", match: (n) => n.includes("fee") },
  { key: "id_cards", label: "ID Cards", match: (n) => n.includes("card") },
  { key: "attendance", label: "Attendance", match: (n) => n.includes("attendance") || n.includes("scan") || n.includes("qr") },
  { key: "reports", label: "Reports", match: (n) => n.includes("report") },
  { key: "other", label: "Other", match: () => true },
];

const groupOf = (name) => GROUPS.find((g) => g.match(name)) || GROUPS[GROUPS.length - 1];

// ── Permission selection matrix ─────────────────────────────────────────────
function PermissionSelector({ permissions, selected, onChange, disabled }) {
  const [query, setQuery] = useState("");

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? permissions.filter(
          (p) => p.name.toLowerCase().includes(q) || String(p.description || "").toLowerCase().includes(q)
        )
      : permissions;
    const map = new Map(GROUPS.map((g) => [g.key, { ...g, items: [] }]));
    filtered.forEach((p) => map.get(groupOf(p.name).key).items.push(p));
    return [...map.values()].filter((g) => g.items.length > 0);
  }, [permissions, query]);

  const toggle = (id) => {
    if (disabled) return;
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    onChange(next);
  };

  const toggleGroup = (items, allSelected) => {
    if (disabled) return;
    const next = new Set(selected);
    items.forEach((p) => (allSelected ? next.delete(p.id) : next.add(p.id)));
    onChange(next);
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
            <Icon path={ICONS.search} className="w-4 h-4" width={1.8} />
          </span>
          <input
            className={`${inputClass} pl-9`}
            placeholder="Search permissions…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">
          {selected.size} selected
        </span>
      </div>

      <div className="border border-gray-200 rounded-xl max-h-72 overflow-y-auto divide-y divide-gray-100">
        {grouped.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No permissions match.</p>
        ) : (
          grouped.map((g) => {
            const allSelected = g.items.every((p) => selected.has(p.id));
            const someSelected = g.items.some((p) => selected.has(p.id));
            return (
              <div key={g.key} className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold uppercase tracking-wide" style={{ color: TOKENS.NAVY }}>
                    {g.label}
                  </p>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => toggleGroup(g.items, allSelected)}
                    className="text-[11px] font-semibold disabled:opacity-40"
                    style={{ color: TOKENS.PRIMARY }}
                  >
                    {allSelected ? "Clear all" : someSelected ? "Select rest" : "Select all"}
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {g.items.map((p) => {
                    const checked = selected.has(p.id);
                    return (
                      <label
                        key={p.id}
                        className={`flex items-start gap-2 px-2 py-1.5 rounded-lg text-sm ${
                          disabled ? "opacity-60" : "hover:bg-gray-50 cursor-pointer"
                        }`}
                        title={p.name}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggle(p.id)}
                          className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                        />
                        <span className="min-w-0">
                          <span className="block text-gray-700 leading-tight">
                            {p.description || p.name}
                          </span>
                          <span className="block text-[11px] text-gray-400 font-mono truncate">{p.name}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Modal shell ─────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, wide }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className={`relative w-full ${wide ? "max-w-2xl" : "max-w-md"} bg-white rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto`}
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

// ── Create role (name + description + permissions) ──────────────────────────
function CreateRoleForm({ permissions, onCancel, onSaved }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setError("");
    setSaving(true);
    try {
      await createRoleWithPermissions({
        name: name.trim(),
        description: description.trim() || null,
        permission_ids: [...selected],
      });
      toast.success("Role created.");
      onSaved();
    } catch (err) {
      setError(errMessage(err, "Could not create the role."));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelClass}>Role name</label>
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
      </div>
      <div>
        <label className={labelClass}>Description <span className="text-gray-400 font-normal">(optional)</span></label>
        <textarea
          className={`${inputClass} resize-none`}
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div>
        <label className={labelClass}>Permissions</label>
        <PermissionSelector permissions={permissions} selected={selected} onChange={setSelected} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onCancel} className={`${btnSecondary} flex-1`}>
          Cancel
        </button>
        <button type="submit" disabled={saving || !name.trim()} className={`${btnPrimary} flex-1`}>
          {saving ? "Creating…" : "Create Role"}
        </button>
      </div>
    </form>
  );
}

// ── Edit role name / description ────────────────────────────────────────────
function EditRoleForm({ role, onCancel, onSaved }) {
  const [name, setName] = useState(role.name || "");
  const [description, setDescription] = useState(role.description || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setError("");
    setSaving(true);
    try {
      await updateRole(role.id, { name: name.trim(), description: description.trim() || null });
      toast.success("Role updated.");
      onSaved();
    } catch (err) {
      setError(errMessage(err, "Could not update the role."));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelClass}>Role name</label>
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
      </div>
      <div>
        <label className={labelClass}>Description</label>
        <textarea
          className={`${inputClass} resize-none`}
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onCancel} className={`${btnSecondary} flex-1`}>
          Cancel
        </button>
        <button type="submit" disabled={saving || !name.trim()} className={`${btnPrimary} flex-1`}>
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}

// ── Edit role permissions ───────────────────────────────────────────────────
function PermissionsForm({ role, permissions, onCancel, onSaved }) {
  const [selected, setSelected] = useState(null); // null = still loading
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Load the role's current permissions to pre-check them.
  useEffect(() => {
    let on = true;
    getRole(role.id)
      .then((full) => {
        if (on) setSelected(new Set((full.permissions || []).map((p) => p.id)));
      })
      .catch(() => on && setSelected(new Set()));
    return () => {
      on = false;
    };
  }, [role.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving || selected == null) return;
    setError("");
    setSaving(true);
    try {
      await updateRolePermissions(role.id, [...selected]);
      toast.success("Permissions updated.");
      onSaved();
    } catch (err) {
      setError(errMessage(err, "Could not update permissions."));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-gray-500">
        Choose the permissions granted to <span className="font-semibold text-gray-700">{role.name}</span>. Users with
        this role inherit every permission selected here.
      </p>
      {selected == null ? (
        <div className="flex items-center justify-center py-10">
          <Spinner />
        </div>
      ) : (
        <PermissionSelector permissions={permissions} selected={selected} onChange={setSelected} />
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onCancel} className={`${btnSecondary} flex-1`}>
          Cancel
        </button>
        <button type="submit" disabled={saving || selected == null} className={`${btnPrimary} flex-1`}>
          {saving ? "Saving…" : "Save Permissions"}
        </button>
      </div>
    </form>
  );
}

// ── Delete confirmation ─────────────────────────────────────────────────────
function DeleteRoleConfirm({ role, onCancel, onDone }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setBusy(true);
    setError("");
    try {
      await deleteRole(role.id);
      toast.success("Role deleted.");
      onDone();
    } catch (err) {
      setError(errMessage(err, "Could not delete the role."));
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Delete the role <span className="font-semibold">{role.name}</span>? This cannot be undone.
      </p>
      {role.system_users_count > 0 && (
        <p className="text-sm text-amber-600">
          This role is assigned to {role.system_users_count} user{role.system_users_count === 1 ? "" : "s"} and cannot be
          deleted until they are reassigned.
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <button type="button" onClick={onCancel} className={`${btnSecondary} flex-1`}>
          Cancel
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={busy}
          className="flex-1 inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-semibold rounded-lg text-sm px-4 py-2.5 transition"
        >
          {busy ? "Deleting…" : "Delete Role"}
        </button>
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function Roles() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { type, role? }

  const fetchRoles = useCallback(() => {
    setLoading(true);
    listRoles()
      .then(setRoles)
      .catch((err) => toast.error(errMessage(err, "Could not load roles.")))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchRoles();
    listPermissions().then(setPermissions).catch(() => {});
  }, [fetchRoles]);

  const onSaved = () => {
    setModal(null);
    fetchRoles();
  };

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold" style={{ color: TOKENS.NAVY }}>
            Roles &amp; Permissions
          </h1>
          <p className="text-sm text-gray-500">
            Define roles and the permissions their users inherit. Super Admin only.
          </p>
        </div>
        <button onClick={() => setModal({ type: "create" })} className={btnPrimary}>
          <Icon path={ICONS.plus} className="w-4 h-4" width={2} />
          Add Role
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col items-center justify-center py-16 gap-3">
          <Spinner />
          <p className="text-sm text-gray-400">Loading roles…</p>
        </div>
      ) : roles.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <EmptyState icon={ICONS.roles} text="No roles defined yet." />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {roles.map((role) => {
            const protectedRole = isProtectedRole(role.name);
            const isSuperAdmin = role.name === "Super Admin";
            return (
              <div key={role.id} className="bg-white rounded-2xl shadow-sm p-5 flex flex-col">
                <div className="flex items-start gap-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${TOKENS.PRIMARY_DARK}, ${TOKENS.PRIMARY})` }}
                  >
                    <Icon path={ICONS.roles} className="w-6 h-6" stroke="#fff" width={1.8} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold truncate" style={{ color: TOKENS.NAVY }}>
                        {role.name}
                      </p>
                      {protectedRole && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: TOKENS.LIGHT, color: TOKENS.PRIMARY }}>
                          System
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{role.description || "—"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
                  <span>
                    <span className="font-bold" style={{ color: TOKENS.NAVY }}>
                      {isSuperAdmin ? "All" : role.permissions_count}
                    </span>{" "}
                    permissions
                  </span>
                  <span>
                    <span className="font-bold" style={{ color: TOKENS.NAVY }}>
                      {role.system_users_count}
                    </span>{" "}
                    user{role.system_users_count === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-50">
                  <button
                    onClick={() => setModal({ type: "permissions", role })}
                    disabled={isSuperAdmin}
                    title={isSuperAdmin ? "Super Admin always has all permissions" : ""}
                    className="inline-flex items-center gap-1 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ color: TOKENS.PRIMARY }}
                  >
                    <Icon path={ICONS.key} className="w-4 h-4" width={1.8} />
                    Permissions
                  </button>
                  <button
                    onClick={() => setModal({ type: "edit", role })}
                    disabled={protectedRole}
                    title={protectedRole ? "Default system roles cannot be renamed" : ""}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Icon path={ICONS.edit} className="w-4 h-4" width={1.8} />
                    Edit
                  </button>
                  <button
                    onClick={() => setModal({ type: "delete", role })}
                    disabled={protectedRole || role.system_users_count > 0}
                    title={
                      protectedRole
                        ? "Default system roles cannot be deleted"
                        : role.system_users_count > 0
                        ? "Reassign its users before deleting"
                        : ""
                    }
                    className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-700 disabled:opacity-40 disabled:cursor-not-allowed ml-auto"
                  >
                    <Icon path={ICONS.x} className="w-4 h-4" width={2} />
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {modal?.type === "create" && (
        <Modal title="Add Role" wide onClose={() => setModal(null)}>
          <CreateRoleForm permissions={permissions} onCancel={() => setModal(null)} onSaved={onSaved} />
        </Modal>
      )}
      {modal?.type === "edit" && (
        <Modal title="Edit Role" onClose={() => setModal(null)}>
          <EditRoleForm role={modal.role} onCancel={() => setModal(null)} onSaved={onSaved} />
        </Modal>
      )}
      {modal?.type === "permissions" && (
        <Modal title={`Permissions — ${modal.role.name}`} wide onClose={() => setModal(null)}>
          <PermissionsForm role={modal.role} permissions={permissions} onCancel={() => setModal(null)} onSaved={onSaved} />
        </Modal>
      )}
      {modal?.type === "delete" && (
        <Modal title="Delete Role" onClose={() => setModal(null)}>
          <DeleteRoleConfirm role={modal.role} onCancel={() => setModal(null)} onDone={onSaved} />
        </Modal>
      )}
    </div>
  );
}
