# SFMIS Frontend

React 19 single-page app for the **Sports Federation Member Information System (SFMIS)**. It is the client for a separate Laravel API (`SFMIS-Backend`) and talks to it over HTTP only — the two share no code.

The app serves two audiences from one bundle:

- **Public member portal** — passwordless email-OTP login, member/club registration, payment, and the member / coach / student / independent dashboards.
- **Back-office admin** — password login with role-based access control (RBAC) for managing system users, roles, and permissions, under `/admin/*`.

Built with Create React App, React Router 7, axios, Tailwind CSS, and react-hot-toast.

## Prerequisites

- Node.js 18+ and npm
- A running instance of the `SFMIS-Backend` Laravel API (defaults to `http://localhost:8000`)

## Setup

```bash
npm install
```

The backend origin is configured via a single environment variable, `REACT_APP_API_URL`. It defaults to `http://localhost:8000`, so no `.env` is needed for the standard local setup. To point at a different backend, create a `.env` in this directory:

```
REACT_APP_API_URL=http://your-backend-host:8000
```

The backend must serve uploaded files and have CORS `supports_credentials=true` (the OTP step relies on the Laravel session cookie).

## Available scripts

Run from this (`frontend/`) directory:

| Command | Description |
| --- | --- |
| `npm start` | Dev server at http://localhost:3000 (hot reload; ESLint runs in-console) |
| `npm run build` | Production build to `build/` |
| `npm test` | Jest + React Testing Library in interactive watch mode |
| `npm test -- --watchAll=false src/App.test.js` | Run a single test file once (non-watch) |

There is no separate lint step — ESLint (`react-app`, `react-app/jest`) runs as part of `start`/`build`.

## Project structure

```
src/
  App.js                     Real entry/router (routes/AppRouter.jsx is an unused stub)
  services/                  Data layer (axios); one module per backend area
    api.js                   Shared axios instance, token handling, storageUrl()
    authService.js           Member OTP: send/verify OTP, register, me, logout
    memberService.js         Member record, payments, payment simulation
    coachService.js          Coach: club verification, club members, facilities
    systemAuthService.js     Admin login/me/logout
    systemUserService.js     System-user CRUD (RBAC)
    systemRoleService.js     Role & permission management
  context/AuthContext.jsx    Admin auth state; useAuth() exposes can(), isSuperAdmin
  components/
    auth/                    AuthShell, EmailStep, OtpStep
    common/DashboardUI.jsx   Shared design system (tokens, form classes, primitives)
  pages/
    auth/                    Login, registration flows, payment
    admin/                   AdminLogin, AdminLayout, AdminDashboard, SystemUsers, Roles
    coach/ student/ member/ independent/   Role dashboards
    HomePage.jsx
```

## Authentication (two separate flows)

The app uses **two distinct Sanctum bearer tokens** with different audiences — a member token cannot reach admin routes and vice-versa. Both are kept in `sessionStorage` (survive an in-tab refresh, but never auto-authenticate across browser sessions):

- **Member** (`sfmis_member_token`) — issued by `/verify-otp` for an existing member. No `AuthContext`; public routes at root paths.
- **Admin** (`sfmis_admin_token`) — issued by `/api/system/login`. Gated by `AuthProvider` + `ProtectedRoute`; routes under `/admin/*` hitting `/api/system/*`. `useAuth().can(permission)` gates UI (the backend is the real authority).

The shared axios instance (`src/services/api.js`) selects the token by request URL and, on a `401`, clears the relevant token and redirects to the matching login page.

## Further reading

`CLAUDE.md` in this directory is the authoritative developer guide — it documents the auth flows in depth, the backend response quirks (the `unwrap()` helper, `_method=PUT` for multipart updates, `storageUrl()`), the `DashboardUI` design system, and the current backend-alignment gaps. Read it before making non-trivial changes.
