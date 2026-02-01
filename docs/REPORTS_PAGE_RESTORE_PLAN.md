# What we're bringing back: Reports page (look and flow like before)

## What you see today (current SPA)

- Clicking **Reports** in the sidebar goes straight to **Report Snapshots**: a list of snapshots and a **Create Snapshot** button.
- There is no hub with three options; the snapshot concept is the main entry point.

## How it looked before (old app at 2f00b44)

- **Reports** opened a **Reports Management** hub with:
  1. **Header:** "Reports Management" + subtitle "Generate and manage student academic reports" + **Back to Dashboard**
  2. **Three cards:**
     - **Generate Reports** – "Create student academic reports for exams and terms" → went to the generate flow (select exam set, then generate).
     - **Report Records** – "View and manage historical report records" → went to a table: Date, Student, Template, File (and filters).
     - **Report Templates** – "Configure report templates and settings" → went to Settings (report templates tab).
  3. **Report Statistics** – e.g. Reports Generated Today, Total Reports This Term, Pending Reports (could be 0 or real counts).

- The **sidebar** linked "Reports" to the generate page; the hub was reachable from the reports section (e.g. going to `/dashboard/admin/reports`).

## What we will bring back (no layout change, Supabase kept)

1. **Reports hub as the first thing you see**
   - When you click **Reports** in the sidebar, you go to **Reports Management** (the hub), not the snapshot list.
   - Same layout as before: header, Back to Dashboard, **three cards** (Generate Reports, Report Records, Report Templates), and Report Statistics.
   - Styling will match the rest of the SPA (glass/theme) but the structure and wording will match the old page.

2. **Generate Reports (no “snapshot” wording)**
   - Clicking **Generate Reports** takes you to a page where you:
     - **Select an exam set** (e.g. Term 1 2025) from a dropdown.
     - Click **Generate Reports**.
   - Under the hood we still use the Supabase report system: we create a snapshot for that exam set, lock it, then take you to the step where you choose template/classes and run generation (same as current “bulk” step). You will **not** see the words “Create snapshot” or “Lock”; those happen automatically when you click Generate Reports.

3. **Report Records**
   - Clicking **Report Records** takes you to the same kind of page as before: a table with Date, Student, Template, File (link to open/download), and filters (e.g. by template name, year).
   - Data will come from the **generated_reports** table (and related tables for student name, template name) so it works with the new Supabase setup. If your project still has an old `reports` table, we can use that instead; otherwise we use **generated_reports**.

4. **Report Templates**
   - Clicking **Report Templates** takes you to **Settings** (same as before). We’ll link to `/dashboard/admin/settings`. If you later add a “Reports” tab on Settings, we can point this card to that tab.

5. **What we are not removing**
   - We are **not** removing or changing the Supabase report logic (snapshots, lock, bulk generation, generated_reports). We are only changing **what the user sees and clicks**:
     - First: hub with three options (like before).
     - Then: “Generate Reports” = select exam set + one button; snapshot + lock happen behind the scenes.
   - The snapshot list page will still exist at `/dashboard/admin/reports/snapshots` for admins who need it (e.g. to see or manage snapshots). It will no longer be the main Reports landing; the hub will.

6. **What we are removing or simplifying**
   - **From the main flow:** The snapshot list and “Create a snapshot” as the **first** thing you see when you click Reports. That is replaced by the hub and the “Generate Reports” flow above.
   - **Wording:** No “Create a snapshot” or “Lock” in the main user path; only “Generate Reports” and “Report Records” / “Report Templates” as before.

## Summary

- **Bring back:** Reports hub (three cards + stats), Generate Reports flow (select exam set → one “Generate Reports” action), Report Records table, Report Templates → Settings link. Same layout and flow as the old app.
- **Keep:** All Supabase report behaviour (snapshots, lock, bulk, generated_reports); we only hide snapshot/lock from the main UI and do them automatically when the user clicks Generate Reports.
- **Remove from main flow:** Snapshot list as the first screen and “Create a snapshot” as the primary action; those stay available under the hood and optionally at `/dashboard/admin/reports/snapshots` for power users.
