# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **⚠️ Aligned with the mid-2026 backend redesign, with one gap.** The frontend has been reconnected to the redesigned backend:
> - **Member auth** — `verify-otp` issues a Sanctum **bearer token**; it's captured centrally in `authService.verifyOtp` and stored via `setMemberToken` (`sfmis_member_token`, separate from the admin token). `api.js` attaches the member token to non-system routes and clears it + redirects to `/login` on a 401 from `/api/member/*`. Member logout revokes the token via `/api/member/logout`.
> - **Renamed/re-keyed endpoints** — payment simulation now targets `/api/{member|club}-registration-processes/{processId}/simulate-payment-success`; registration returns a `process_id` + `payable_amount` threaded through to `PaymentMethod`; coach approve/reject is keyed by `{processId}` (`r.process_id`).
> - **Existence checks** — the pre-OTP `isEmailRegistered` lookup (hit an admin-only endpoint) was removed; registration/login now branch on the OTP responses' `account_exists` / `registration_in_progress` / `registration_process`.
> - **The member's own record** loads via `/api/member/me` (`getMemberMe`), replacing the admin-only `/members/{id}`.
>
> **Remaining gap (needs a backend endpoint):** member/coach dashboards' **attendance, payment history, club-member lists, and ID-card-print requests** are served only by admin-permission endpoints a member token can't reach. Those calls are wrapped so they **degrade to empty state** rather than erroring; they'll stay empty until the backend exposes member-facing equivalents.
>
> See the root and `SFMIS-Backend/CLAUDE.md` for the backend's current shape.

## Commands

Create React App (react-scripts). Run from the `frontend/` directory:

- `npm start` — dev server at http://localhost:3000
- `npm run build` — production build to `build/`
- `npm test` — Jest + React Testing Library in interactive watch mode
- `npm test -- --watchAll=false src/App.test.js` — run a single test file once (non-watch)

There is no separate lint step; ESLint (`react-app`, `react-app/jest`) runs as part of `npm start`/`build`.

## Backend & environment

This is the **frontend only**. It talks to a separate Laravel backend (referenced in service files as `SFMIS-Backend`). Set the backend origin with `REACT_APP_API_URL` (defaults to `http://localhost:8000`). The backend must serve uploaded files and have CORS `supports_credentials=true`.

## Two distinct auth systems

The app has **two completely separate authentication flows** with **two separate Sanctum bearer tokens** (distinct audiences — a member token can't reach admin routes and vice-versa). Do not mix them:

1. **Member flow (public)** — email OTP → **Sanctum bearer token** (`sfmis_member_token` in `sessionStorage`). Covers login, registration, and the member/coach/student/independent dashboards (all at root paths, e.g. `/coach-dashboard`). Does **not** use `AuthContext`.
   - Flow: `POST /send-otp` → `POST /verify-otp` → (register) `POST /api/member-registrations`. `verify-otp` still relies on the Laravel **session** to hold the OTP, which is why the axios instance sets `withCredentials: true`; for an existing member it also returns a bearer token, captured centrally in `authService.verifyOtp` and stored via `setMemberToken`. The member's own record loads from `/api/member/me` (`getMemberMe`); logout revokes the token via `/api/member/logout`.
   - `authService.js` (OTP/register/me/logout), `memberService.js`, `coachService.js` are the data layers.

2. **Back-office flow (admin/RBAC)** — email+password → **Sanctum bearer token** (`sfmis_admin_token` in `sessionStorage`). Gated by `AuthProvider` + `ProtectedRoute`. All routes under `/admin/*`, hitting `/api/system/*`.
   - `systemAuthService.js`, `systemUserService.js`, `systemRoleService.js` are the data layers.
   - `AuthContext` (`src/context/AuthContext.jsx`) holds the admin user/role/permissions; `useAuth()` (re-exported from `src/hooks/useAuth.js`) exposes `can(permission)`, `isSuperAdmin`, etc. `can()` returns true for "Super Admin" on everything.

**Why `sessionStorage`, not `localStorage`:** both tokens must survive an in-tab refresh but must NOT persist across browser sessions (persisting would silently re-authenticate and bounce the user past login). `api.js` runs a one-time migration that removes any legacy `localStorage` copies.

The shared axios instance is `src/services/api.js`. Its request interceptor picks the token by URL: `/system/*` → admin token; `/member/*` → member token (falling back to admin); everything else → whichever token this browser holds. The response interceptor, on a `401`, clears the relevant token and redirects — `/api/system/*` → `/admin/login`, `/api/member/*` → `/login`; **other** domain 401s are left alone (they're admin-only endpoints the member portal can't reach and are designed to degrade to empty state). **Frontend permission checks gate UI for usability only — the backend re-checks every permission and is the real authority.**

## Backend response quirks (important)

The Laravel backend returns **inconsistently nested single-element arrays**. Several service functions call an `unwrap()` helper (peels nested single-element arrays) or inline `Array.isArray(r.data) ? r.data[0] : r.data`. When adding a service call, check the actual response shape and unwrap the same way — callers expect plain objects.

For member/photo **updates**, POST with a `_method=PUT` field (Laravel method spoofing) instead of a real PUT — PHP does not populate multipart bodies on PUT/PATCH. Never manually set `Content-Type` for `FormData` bodies (the browser must set the multipart boundary).

Use `storageUrl(pathOrUrl)` from `api.js` to build image/file URLs — it re-points backend asset paths at `API_BASE` so photos load regardless of which host serves the SPA.

## Structure & conventions

- `src/App.js` is the real entry/router — `src/routes/AppRouter.jsx` is an empty legacy stub, ignore it. Public member pages sit at root paths (`/login`, `/select-registration`, `/student-registration`, `/club-registration`, `/registration-status`, `/payment-method`, and the `*-dashboard` pages). Admin lives under `/admin` (nested in `AdminLayout` behind `ProtectedRoute`): index → `AdminDashboard`, `/admin/users` guarded by `permission="view_system_users"`, `/admin/roles` guarded by `requireSuperAdmin`. `/admin/login` is unguarded. `ProtectedRoute` takes `permission` and/or `requireSuperAdmin` props.
- `src/pages/` grouped by area: `auth/` (login + all registration + payment pages), `admin/`, `coach/`, `student/`, `member/`, `independent/`; `HomePage.jsx` sits at the `pages/` root.
- `src/components/auth/` — shared auth UI: `AuthShell` (split-screen layout), `EmailStep`, `OtpStep`.
- **`src/components/common/DashboardUI.jsx` is the shared design system** — design tokens (`TOKENS`, `PAGE_BG`, `APP_FONT`), form classes (`inputClass`, `btnPrimary`, etc.), and primitives (`Icon`/`ICONS`, `Pill`, `Avatar`, `StatCard`, `EmptyState`, `Spinner`). Reuse these instead of duplicating colors/classes; the admin and member dashboards share this one source of truth.
- **Styling is Tailwind** (`tailwind.config.js`). The config overrides the `fontSize` scale (xs/sm/base bumped up for legibility) and sets Inter as the default `sans` font — keep changes within that scale rather than hardcoding pixel sizes.
- Toasts use `react-hot-toast` (single `<Toaster>` mounted in `App.js`).
- Navigation between flow steps passes data via React Router `location.state` (e.g. prefilled email, member object, `otpSent`/`notRegistered` flags) rather than a global store.
- Role/status matching from the backend is **keyword-based and tolerant** of variants (e.g. `role.includes("coach")`, `payment_status.includes("paid")`) because backend key names/casing vary. Follow this pattern rather than exact-string comparisons.
