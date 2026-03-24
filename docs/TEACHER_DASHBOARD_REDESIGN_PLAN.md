# Teacher dashboard redesign — plan (living document)

## School-type scope (required)

**All changes described here apply only to Nursery/Primary schools** (`schools.type === 'Nursery/Primary'` in Supabase, same convention as elsewhere in the app).

- **Nursery/Primary:** Receive the redesigned teacher shell (admin/accountant-aligned dark layout, hidden scrollbars, forced dark mode, live KPIs, updated `DesignTeacherDashboard`, etc.).
- **Secondary:** **Must not** show this new UI. Secondary teachers keep the **existing** teacher experience (current layout, theme behavior, and dashboard components) until a separate Secondary-specific design is specified.

Implementation note: load `schools.type` for the logged-in user’s `school_id` (e.g. in `TeacherLayout` or a small `useSchoolType()` hook) and branch:

- `Nursery/Primary` → new shell + `DesignTeacherDashboard` (and related work).
- `Secondary` → render the legacy path (e.g. existing `Dashboard.tsx` or current `TeacherLayout` body without the PW shell / without swapping to the new HTML dashboard).

Do not gate only individual widgets; **gate the whole teacher-dashboard redesign** so Secondary never sees partial new styling.

---

## Stack (canonical)

Active maintenance targets **[src/pages/teacher/](src/pages/teacher/)** (Vite). Next.js `app/dashboard/teacher/` is a duplicate; deprecate or remove after deploy verification (see consolidation todos).

---

## Other plan items (summary)

- Force dark on Nursery/Primary teacher routes; remove theme toggle there; fix `useDesignDashboardThemeSync` so injected HTML does not flip to light.
- Align shell with accountant/admin (`pw-layout` pattern + hidden scrollbars).
- Live data: refetch intervals, assignments count where schema allows, timetable + activity from Supabase.
- Teacher name display: uppercase for Nursery/Primary shell.

---

## Todos (tracking)

1. Confirm production entry (Vite vs Next); document canonical teacher URL.
2. Deprecate or remove `app/dashboard/teacher` duplicate after deploy check.
3. **Fetch `schools.type`; implement Nursery/Primary vs Secondary branching for teacher shell + dashboard.**
4. Nursery/Primary only: TeacherLayout force dark, remove toggle, PW shell + hidden scrollbars.
5. Nursery/Primary only: `DesignTeacherDashboard` dark-only sync, uppercase name, refetch + KPIs/schedule/activity.
6. Smoke-test: Nursery/Primary teacher with assignments; Secondary teacher unchanged.
