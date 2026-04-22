# PwezaCore — Updated setup guide

This document is the **current** end-to-end setup for developers and operators. It reflects the repo as of the **student discipline management** work (timeline, suspension with manual lift, deactivation, soft delete, sidebar filters, parent directory filters) and the migration  
[`supabase/migrations/20260630360000_student_discipline_management.sql`](../supabase/migrations/20260630360000_student_discipline_management.sql).

For environment variable templates, see [`ENV_SETUP_INSTRUCTIONS.md`](ENV_SETUP_INSTRUCTIONS.md) (use **your own** keys; never commit real secrets).  
For the Windows desktop installer workflow, see [`DESKTOP_SETUP.md`](DESKTOP_SETUP.md) (artifact name pattern: **PwezaCore Setup &lt;version&gt;.exe**).

---

## 1. Prerequisites

- **Node.js** 18+
- **npm** (repo standard)
- **Git**
- **Supabase** project (hosted or local)
- Optional: **Supabase CLI** for migrations (`npm run supabase` or global `supabase`)

---

## 2. Clone and install

```bash
git clone <your-repo-url>
cd pwezacore
npm install
```

---

## 3. Environment variables

Create **`.env.local`** in the repo root (and/or `.env` for Vite, depending on what you run). Minimum for Supabase in the browser:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key |

The **Vite** app often uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` — align these with the same project.

Server-only (API routes, scripts, Edge-adjacent server code):

| Variable | Purpose |
|----------|---------|
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (never expose to the client) |

Do **not** commit `.env.local` or any file containing live keys. Rotate keys if they were ever exposed.

Optional integrations (see root [`README.md`](../README.md) and [`ENV_SETUP_INSTRUCTIONS.md`](ENV_SETUP_INSTRUCTIONS.md)): SchoolPay, Africa’s Talking, Resend, Grok/AI, Turnstile, etc.

---

## 4. Database (Supabase)

### 4.1 Apply migrations

Schema is driven by SQL files under [`supabase/migrations/`](../supabase/migrations/). Apply them in order on your database:

- **Hosted project:** use Supabase CLI (`supabase db push` / linked project) or run migration SQL in the Dashboard SQL editor — following your team’s process.
- **Local:** `supabase db reset` affects **local** Docker Postgres only; do **not** reset a remote/production database unless you explicitly intend to wipe data.

**Important:** The discipline feature requires migration **`20260630360000_student_discipline_management.sql`**, which adds:

- `discipline_records` (and compatibility with existing parent/head-teacher reads)
- Student columns: `deleted_at`, `discipline_deactivated_at`, `suspension_open`, suspension period mirrors
- RPCs: `admin_add_discipline_action`, `owner_restore_soft_deleted_student`, `admin_list_students_discipline_filtered`, `current_user_can_manage_discipline`
- RLS on `discipline_records` (select for school users and linked parents)
- Permission key: `discipline.manage` on `user_school_permissions`

If an old environment already had a differently shaped `discipline_records` table, reconcile columns manually once before or after this migration.

### 4.2 PostgREST / API

After schema changes, ensure the Supabase API has picked up new functions (redeploy or reload as your host requires).

---

## 5. Run the apps

| Command | What it does |
|---------|----------------|
| `npm run dev` | **Vite** dev server (primary web app for many flows; default port **3000** per repo scripts) |
| `npm run dev:next` | **Next.js** App Router (`app/`) on port **3001** — admin discipline UI under `/dashboard/admin/*` |
| `npm run desktop` | Electron + Vite (see [`DESKTOP_SETUP.md`](DESKTOP_SETUP.md)) |

Open the URL your command prints (e.g. `http://localhost:3000` or `http://localhost:3001` for Next).

---

## 6. Discipline & navigation (quick reference)

After migrations are applied:

- **Admin (Next.js):** **Students** and **Parents** in the sidebar are **expandable** with filters (`?discipline=…`, `?filter=…`).
- **Student profile:** **Discipline** section (timeline, add action, owner-only **restore** when archived).
- **Roles:** `admin`, `owner`, and `head_teacher` can manage discipline; delegated users need `discipline.manage` on `user_school_permissions`.
- **Owner only:** `owner_restore_soft_deleted_student` for restoring soft-deleted students.
- **Student portal:** [`src/lib/studentProfileValidator.ts`](../src/lib/studentProfileValidator.ts) denies access when archived, deactivated, or suspended (`suspension_open`).
- **Parent portal:** discipline tab shows notes, action type, and suspension dates where present.

---

## 7. Verification checklist

1. `npm install` completes without errors.
2. `.env.local` (or Vite `.env`) has valid Supabase URL + anon key; service role where server APIs need it.
3. All migrations applied; no errors on `discipline_records` / new RPCs.
4. Sign in as admin → **Students** → open a student → **Discipline** loads; `current_user_can_manage_discipline` returns true for that user.
5. Optional: parent account sees child’s discipline rows (RLS).

---

## 8. Related documentation

- [`README.md`](../README.md) — features, stack, high-level install
- [`ENV_SETUP_INSTRUCTIONS.md`](ENV_SETUP_INSTRUCTIONS.md) — env template (sanitize before sharing)
- [`DESKTOP_SETUP.md`](DESKTOP_SETUP.md) — Electron / **PwezaCore Setup** installer
- [`docs/SCHOOL_FEATURES_SETUP.md`](SCHOOL_FEATURES_SETUP.md) — school-scoped features
- [`supabase/STORAGE_SETUP.md`](../supabase/STORAGE_SETUP.md) — storage buckets

---

## 9. Windows installer name (Electron)

This is **only** the desktop app installer, not the database (database = Supabase migrations above).

| Item | Value |
|------|--------|
| Version in repo | **`0.1.10`** in [`package.json`](../package.json) `"version"` |
| NSIS output (current) | **`release/PwezaCore Setup 0.1.10.exe`** |
| How the name is formed | `build.nsis.artifactName` = **`${productName} Setup ${version}.${ext}`** → **PwezaCore** + **0.1.10** + **.exe** |

After you change `"version"` in `package.json` and run `npm run pack:win`, the new installer will be **PwezaCore Setup &lt;new-version&gt;.exe**. There is no separate “hidden” version for the setup file.
