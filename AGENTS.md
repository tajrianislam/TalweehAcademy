# Talweeh Academy — Agent Guide

Onboarding doc for AI agents and contributors working in this repository.

## Project summary

Talweeh Academy is being rebuilt as a custom web app:

- **Frontend:** React 18 + Vite in [`new_talweeh/`](new_talweeh/)
- **Backend:** Express + MySQL in [`new_talweeh/server/`](new_talweeh/server/)
- **Workspace root:** also contains [`.cursor/mcp.json`](.cursor/mcp.json) (Context7 + MySQL MCP) and [`.cursor/rules/`](.cursor/rules/) (Cursor rules)

The live WordPress site is the legacy system; this repo is the new application.

## Architecture

```
Browser (Vite dev server)
    │  /api/* proxied to localhost:3001
    ▼
Express API (server/index.js)
    │
    ▼
MySQL (courses, lessons, auth_users, enrollments, …)
```

- **Auth:** JWT stored in an `httpOnly` cookie. Client state via [`AuthContext`](new_talweeh/src/context/AuthContext.jsx).
- **Course access:** a row in `enrollments` links `auth_users` ↔ `courses`. Admins bypass enrollment checks.
- **Content model:** `courses` → `lessons` → optional `quizzes`. Progress in `lesson_progress`; quiz results in `quiz_attempts`.
- **Free lessons:** `lessons.is_free` allows access without enrollment; paid content requires enrollment.

## Local development

Run **both** services for full-stack work:

| Service  | Command (from `new_talweeh/`) | URL |
|----------|-------------------------------|-----|
| API      | `npm run server`              | http://localhost:3001 |
| Frontend | `npm run dev`                 | http://localhost:5173 (or **5174** if 5173 is in use) |

First-time setup:

```bash
cd new_talweeh
npm install
npm run install:server
cp server/.env.example server/.env   # then fill in values
```

**Important:**

- Backend changes require a **server restart** (no HMR on the API).
- Frontend changes hot-reload via Vite HMR.
- Vite proxies `/api` to port 3001 ([`vite.config.js`](new_talweeh/vite.config.js)).
- Remote images/fonts load from `talweehacademy.com` — internet required for full styling locally.

## Key directories

| Path | Purpose |
|------|---------|
| `new_talweeh/src/pages/` | Route-level pages (`lesson.jsx`, `admin.jsx`, `courses.jsx`, …) |
| `new_talweeh/src/components/` | Reusable UI (`AuthModal`, `Quiz`, `YouTubePlayer`, …) |
| `new_talweeh/src/context/AuthContext.jsx` | Auth state, login/register, password reset helpers |
| `new_talweeh/src/App.jsx` | React Router route definitions |
| `new_talweeh/src/App.css` | Most styles (feature-prefixed class names) |
| `new_talweeh/server/index.js` | All API routes + DB schema migrations on startup |
| `new_talweeh/server/email.js` | Resend password-reset emails |
| `new_talweeh/server/.env.example` | Required environment variables |
| `new_talweeh/mockups/` | Static HTML design explorations (not wired to the app) |

## Common tasks

### Add an API route

1. Edit [`new_talweeh/server/index.js`](new_talweeh/server/index.js).
2. Protect with `requireAuth` or `requireAdmin` as appropriate.
3. Restart the server.

### Add a database table or column

1. Add an `ensure*Schema()` function using existing helpers: `tableExists`, `ensureIndex`, `ensureForeignKey`, `ensureColumn`.
2. Call it from `startServer()`.
3. Do not run unguarded one-off `ALTER TABLE` without idempotent checks.

### Add a frontend page

1. Create a page component in `new_talweeh/src/pages/`.
2. Register the route in [`App.jsx`](new_talweeh/src/App.jsx).
3. Reuse `PageHeader` / `PageFooter` from [`_shared.jsx`](new_talweeh/src/pages/_shared.jsx) where applicable.

### Grant a student course access

- **Admin API:** `POST /api/enrollments` with `{ user_email, course_id }` (admin session required).
- **Direct DB:** insert into `enrollments (user_id, course_id)`.
- Prerequisite: the student must exist in `auth_users` (matched by email).

## Agent behavior defaults

- **Minimize scope** — focused diffs only; no drive-by refactors.
- **Only commit when explicitly asked** by the user.
- **Do not edit plan files** (`.cursor/plans/`) unless requested.
- **Ask mode** for exploration and questions; **Agent mode** for implementation.
- Close unrelated open files; start a fresh chat when switching features (reduces token usage).
- **Model selection:** Composer for small edits; Sonnet for most coding; Opus / GPT 5.5 only for hard problems.
- Prefer `@file` or `@symbol` mentions over broad `@codebase` searches.

## MCP tools

| Server | Use for |
|--------|---------|
| **context7** | External library docs (React, Express, MySQL, Resend, …) — see [context7-docs.mdc](.cursor/rules/context7-docs.mdc) |
| **mysql** | Query the local Talweeh MySQL database via [`.cursor/scripts/mysql-mcp.js`](.cursor/scripts/mysql-mcp.js) |

## Security reminders

- Never commit `server/.env` or API keys.
- Password reset tokens: store SHA-256 hash only; never log raw tokens.
- Forgot-password endpoint always returns a generic message (no account enumeration).

## Related docs

- App README: [`new_talweeh/README.md`](new_talweeh/README.md)
- Cursor rules: [`.cursor/rules/`](.cursor/rules/)
