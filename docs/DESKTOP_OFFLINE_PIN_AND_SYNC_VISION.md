# Desktop app: offline cache, PIN unlock, and sync (product vision)

**Status:** Vision / requirements capture — **not implemented** by this document. Use it to align future work; implementation will be broken into phases when you are ready.

**Scope:** Primarily the **Electron desktop** school deployment. The web app (Vercel) may share some patterns (e.g. TanStack Query refetch) but offline storage and PIN are **desktop-first** concerns unless decided otherwise.

---

## Background

- PwezaCore uses **Supabase** for auth, data, and RLS. The live system is **online-first**.
- The desktop build already uses **persistent Supabase session storage** so users are not forced to sign in on every cold start, subject to token expiry and logout.
- You want a **richer experience** when the network is unreliable: still open the app, see **cached** school data, and **sync** when connectivity returns—without always feeling like a “web page reload.”

---

## Aims (what you want)

### 1. Offline-aware experience

- When the app **cannot reach Supabase**, it should still **open** and show **cached data** where possible (students, classes, numbers, last-loaded report preview data, etc.).
- Cached content should be clearly **stale** / **offline** where needed (e.g. “Last updated …” or banner) so users trust what they see.

### 2. Reconnect and refresh without “restarting everything”

- When the device **comes back online**, the app should **sync and update** dashboards and figures **in place** (React Query refetch, invalidation)—**not** require a full application restart or constant full page reloads for normal use.

### 3. Fewer full logins

- Users should **not** be asked for email/password on every visit if they **did not log out** and the session is still valid.
- You also want an optional **lighter step** on open: a **PIN** (or similar) to unlock the app when a session already exists—so opening the app feels fast and local, not like a full web login each time.

### 4. PIN as an “open” gesture (not replacing Supabase)

- PIN unlock is an **extra local gate** for convenience when a valid session is stored; it does **not** replace Supabase authentication for server operations when online.
- Policy details (length, lockout, forgot-PIN → full login) can be decided at implementation time.

### 5. Reports when offline (where data exists)

- If the **data needed to build a report** is present in the **local cache** (from a previous online session), users should be able to **generate report cards / PDFs** (e.g. secondary HTML → local Puppeteer) **without** calling Vercel—aligned with work already done for desktop PDF generation.
- Anything **not** cached cannot be invented offline; scope is **last-synced snapshots**.

### 6. Mandatory online period (“sync window”)

- You suggested requiring **internet at least every 14 days** (configurable) so the app can **validate / sync** and avoid indefinite offline drift.
- If that window is exceeded, the app might **require connectivity** before full use, then **pull updates** and reconcile.

### 7. Writes while offline (future)

- Longer term: **queue** changes made offline (marks, fees, etc.) and **replay** them when online, with clear **conflict** rules. This is the **hardest** part and is **out of scope** until read-only offline and sync UX are defined.

---

## Principles to preserve

- **Supabase remains the system of record** when online; local cache is a **replica** for resilience and speed.
- **Security and privacy:** student and school data on disk must match your **school / legal** expectations; PIN strength and device access are part of risk management.
- **Parity:** Online behavior should remain authoritative; offline is **degraded / cached** unless sync completes.

---

## Related docs in this repo

- `docs/NATIVE_APP_FEATURES.md` — existing PWA / offline notes (may overlap in spirit; desktop vision above is the newer product direction).
- `docs/DESKTOP_LOCAL_DB.md` / `docs/LOCAL_DATABASE_SCHEMA_AND_SYNC.md` — if present, may inform technical design when you implement.

---

## Next steps (when you say go)

1. Freeze **v1 scope** (e.g. read-only offline + banner + reconnect refetch + optional PIN; **no** offline writes).
2. Agree **cache surface area** (which queries / entities).
3. Agree **14-day rule** UX (block vs read-only vs warnings).
4. Then implement in small, testable slices.

---

*Document created from product discussion; revise dates and decisions as the roadmap firms up.*
