# Admin Dashboard Redesign: Integrating Donezo + HR Analytics for School Management

This document describes how to combine the two reference dashboards (Donezo task/project UI + HR Analytics) into the PwezaCore admin dashboard and what to add so it strongly appeals to school administrators.

---

## 1. Design Direction: Combining Both Looks

| Element | From Donezo | From HR Analytics | Result for PwezaCore Admin |
|--------|-------------|-------------------|----------------------------|
| **Overall theme** | Green accent, white cards, soft shadows | Light grey background, white widget cards | Use **light grey page background** (`#f3f4f6` / `bg-gray-100`) with **white cards** and **green as primary accent** (buttons, active states, key metrics). Keeps trust and clarity. |
| **Sidebar** | Collapsible, MENU + GENERAL, mobile app CTA at bottom | N/A (different layout) | **Keep the sidebar exactly as-is with all existing options.** Only add MENU/GENERAL labels and “Download our Mobile App” at bottom; do not remove, reorder, or rename any nav item. See § Sidebar (preserved options) below. |
| **Header** | Search (“Search task” + ⌘F), user avatar + name + email | Search + filter chips, greeting, profile | **Search bar** with shortcut hint (e.g. “Search students, fees, reports” + ⌘F). **Filter chips**: Term, Class, Academic Year (like HR’s Country/City). **Right**: greeting (“Good morning, [Name]”), notifications, messages, **profile with name + email** (Totok Michael / tmichael20@mail.com style). |
| **Page title** | “Dashboard” + subtitle + “+ Add Project” / “Import Data” | N/A | **“Dashboard”** (or “Admin Dashboard”) + subtitle e.g. “Plan, prioritize, and manage your school with ease.” **Primary CTA**: “+ Add Student” or “+ Quick action”. **Secondary**: “Import Data” (if you support CSV/bulk import). |
| **KPI cards** | 4 cards (Total / Ended / Running / Pending), “Increased from last month”, small arrow link | 5–6 KPIs with icons (Hired, Separated, Net, Retention, Turnover) | **4–6 KPI cards** in a row: **Total Students**, **Teachers**, **Attendance Today** (or %), **Fees Collected (Term)**, **Outstanding Balance**, optional **Retention / Fee Collection Rate**. Each: number, short trend (“Increased from last term”), icon, optional “View” link. **White cards**, green for positive trend. |
| **Main chart** | “Project Analytics” bar chart (week) | Multiple bar/line/donut charts | **One hero chart**: “Enrollment & Attendance Analytics” – bar chart for **last 7 days attendance** or **weekly enrollment** (like Donezo’s week bars). Keep existing ChartsAnalytics data; restyle to **white card**, green bars. |
| **Secondary charts** | Donut “Project Progress”, Team Collaboration list | Donuts (Ethnicity, Gender), bars (Age, Tenure, Bonus, Dept), line (Annual Hires), map | **School version**: **Donut** – “Enrollment by Class” or “Attendance vs Absent”; **Bar** – “Students by Class” or “Fees by Term”; **Line** – “Enrollment Over Terms”; optional **Gender** donut. All in **white cards** on grey background. |
| **Reminders / Upcoming** | “Reminders” card (e.g. “Meeting with Arc Company” + “Start Meeting”) | N/A | **Reminders** card: next **parent meeting**, **report deadline**, **exam date**, or **payment due**. One primary CTA (e.g. “View calendar” or “Start meeting”). |
| **List widget** | “Project” list with “+ New”, due dates | N/A | **“Upcoming”** or **“Tasks”**: **exam dates**, **report deadlines**, **fee due dates**. “+ New” could open “Add event” or “Add exam”. |
| **Team / People** | “Team Collaboration” – members, task, status (Completed / In Progress / Pending) | N/A | **“Staff Overview”** or **“Teacher Activity”**: list of teachers (or key staff) with “Current class” or “Status” (Teaching / Free / On leave). Status pills (green / amber / red). |
| **Time / Today** | “Time Tracker” (01:24:08) with pause/stop | N/A | Optional: **“Today’s Overview”** (periods, next class, break) or drop time tracker; keep **Recent Payments** and **Notifications** as in current dashboard. |
| **Footer** | N/A | N/A | Keep minimal footer (no AI); optional “Need help? Contact support.” |

---

## 2. Sidebar: Preserved Options (Do Not Remove)

The sidebar must **keep every existing navigation option**. No items are removed or merged. Optional additions only: section labels (MENU / GENERAL) and the “Download our Mobile App” card at the bottom.

**Full list of sidebar options to maintain (Next.js app):**

| Order | Label             | Path                               |
|-------|-------------------|------------------------------------|
| 1     | Dashboard         | `/dashboard/admin`                 |
| 2     | Students          | `/dashboard/admin/students`        |
| 3     | Teachers          | `/dashboard/admin/teachers`       |
| 4     | Parents           | `/dashboard/admin/parents`         |
| 5     | Staff             | `/dashboard/admin/accounts`        |
| 6     | Finance           | `/dashboard/admin/outstanding`     |
| 7     | Reports           | `/dashboard/admin/reports/generate`|
| 8     | Attendance        | `/dashboard/admin/attendance-records` |
| 9     | Exam Sets         | `/dashboard/admin/exam-sets`       |
| 10    | Classes           | `/dashboard/admin/settings/classes`|
| 11    | Job Vacancies     | `/dashboard/admin/jobs`            |
| 12    | System Settings   | `/dashboard/admin/settings`        |
| 13    | Notifications     | `/dashboard/admin/notifications`   |

**Bottom section (keep as-is):** Settings link, Logout button.

**SPA (`AdminLayout`):** Keep the same labels and routes (Reports may use `/dashboard/admin/reports`, Attendance `/dashboard/admin/attendance` per SPA routing). All of the above options must remain in the SPA sidebar as well.

---

## 3. Layout Structure (Final Dashboard)

```
+------------------+----------------------------------------------------------+
| SIDEBAR          | HEADER: Search (⌘F) | Term | Class | Year | 🔔 👤 Name     |
| PwezaCore        +----------------------------------------------------------+
| MENU             | Dashboard                                              |
|  Dashboard       | Plan, prioritize, and manage your school with ease.     |
|  Students        | [+ Add Student]  [Import Data]                          |
|  Teachers        +----------------------------------------------------------+
|  ...             | [KPI] [KPI] [KPI] [KPI] [KPI]  (white cards, green ↑)  |
| GENERAL          +----------------------------------------------------------+
|  Settings        | Enrollment & Attendance Analytics (bar chart, white)     |
|  Notifications   +---------------------------+------------------------------+
|  Logout          | Reminders                 | Upcoming / Due (exams, fees) |
| [Download App]   | Meeting / deadline / exam  | List + due dates             |
+------------------+---------------------------+------------------------------+
                   | Recent Payments & Notifications (existing)               |
                   +----------------------------------------------------------+
                   | Charts row: Donut (Class/Gender) | Bar (Fees/Term) | Line   |
                   +----------------------------------------------------------+
                   | Staff / Teacher overview (optional)                       |
                   +----------------------------------------------------------+
                   | Recent Reports & System Health (existing)                 |
                   +----------------------------------------------------------+
                   | Footer: © 2025 PwezaCore.                                 |
+------------------+----------------------------------------------------------+
```

---

## 4. Implementation Steps (High Level)

### Phase A: Theme and shell

1. **Background and cards**
   - In admin layout or a new dashboard wrapper: set main content area background to light grey (e.g. `bg-gray-100`).
   - Ensure all dashboard widgets use **white** card style: `bg-white`, rounded corners, soft shadow (`shadow-sm` or `shadow`). This matches HR Analytics and Donezo’s cards.

2. **Sidebar (additions only; preserve all options)**
   - **Do not remove, reorder, or rename any existing sidebar link.** Keep all 13 nav items plus Settings and Logout (see § Sidebar: Preserved Options).
   - Optionally add two section labels: **MENU** (above Dashboard through Notifications) and **GENERAL** (above Settings, Logout).
   - Optionally add a **“Download our Mobile App”** card at the very bottom (text + “Download” button). Link to App Store / Play Store or a landing page.

3. **Header (Navbar)**
   - Search: placeholder “Search students, fees, reports” and show shortcut “⌘F” (wire `Cmd+F` / `Ctrl+F` to focus search if desired).
   - Add filter chips/dropdowns: **Term**, **Class**, **Academic Year** (drive dashboard data when selected).
   - Right side: greeting (“Good morning, [Name]”), notification icon, **profile block**: avatar + **name** + **email** (like Donezo/HR). Reuse existing Supabase user data.

4. **Dashboard title and actions**
   - Title: “Dashboard” (or “Admin Dashboard”), subtitle: “Plan, prioritize, and manage your school with ease.”
   - Buttons: primary “+ Add Student” (or “+ Quick action” dropdown), secondary “Import Data” if you have bulk import.

### Phase B: KPI cards

5. **Replace or restyle `AdminKPICards`**
   - Keep metrics: **Total Students**, **Teachers**, **Attendance (today or %)**, **Fees Collected (term)**, **Outstanding Balance**. Optionally add **Retention rate** or **Fee collection rate** (like HR).
   - Style: **white card** per KPI, icon, big number, short trend text (“Increased from last term”), green for positive. Small “View” or arrow link to the relevant module (Students, Finance, etc.).

### Phase C: Charts and widgets

6. **Hero chart**
   - One main bar chart in a white card: “Enrollment & Attendance Analytics” (e.g. last 7 days or last 7 weeks). Use existing `ChartsAnalytics` data; change container to white card and bars to green.

7. **Reminders card**
   - New component: fetch next **events** (parent meetings, report deadlines, exam dates) from your DB or a simple “reminders”/events table. One main line + one CTA (“View calendar” or “Start meeting”).

8. **Upcoming / Due list**
   - New component: list of **upcoming exams**, **fee due dates**, or **report deadlines** with due date. “+ New” can open Add Exam / Add Event or stay as “View all”.

9. **Secondary charts**
   - In **white cards** on the same grey background:
     - Donut: **Enrollment by Class** or **Attendance vs Absent** (or Gender).
     - Bar: **Students by Class** or **Fees by Term**.
     - Line: **Enrollment Over Terms** (like HR “Annual Hires by Gender”).
   - Reuse/refactor existing `ChartsAnalytics` and KPICards data; only presentation and layout change.

10. **Staff / Teacher overview (optional)**
    - Similar to Donezo “Team Collaboration”: list 4–6 teachers (or staff) with current class or status. Pills: Teaching / Free / On leave. Links to Teachers page.

11. **Keep existing**
    - **Recent Payments & Notifications**, **Recent Reports & System Health**, **Quick Actions**, **Pending Expense Approvals**. Restyle to **white cards** and same spacing for consistency.

### Phase D: Polish

12. **Keyboard shortcut**
    - On dashboard, `⌘F` / `Ctrl+F`: focus global search (and optionally open a search modal if you have one).

13. **Responsive**
    - Sidebar: already collapsible; on small screens keep mobile menu. KPI row: 2x2 or scroll horizontally on mobile. Charts: stack vertically.

14. **SPA parity**
    - Apply the same layout, sidebar sections, header (search + filters + profile), KPI style, and card style to **SPA admin dashboard** (`src/pages/admin/Dashboard.tsx`) so both app and SPA match.

---

## 5. What to Add So It Attracts School Administrators

Beyond the combined look, these elements make the dashboard feel built for **school leadership**:

| Feature | Why it matters |
|--------|----------------|
| **Term and class filters at the top** | Admins think in “Term 1”, “Primary 5”, “2024”. One-click filter makes all numbers and charts context-aware. |
| **At-a-glance KPIs** | Students, teachers, attendance, fees collected, outstanding – no digging. Trend (“Up from last term”) builds trust. |
| **Attendance trend (bar chart)** | Daily or weekly attendance is the first thing many admins check. Prominent bar chart answers “How is attendance this week?” |
| **Fees collected vs outstanding** | Clear “money in” and “money we’re still owed” reduces anxiety and supports fee recovery. |
| **Reminders (meetings, deadlines, exams)** | Surfaces parent meetings, report deadlines, exam dates. Reduces missed deadlines. |
| **Upcoming exams / fee due dates** | Simple list of what’s due when; “+ New” or “View all” keeps workflow in the dashboard. |
| **Staff / teacher status** | Quick view of who is teaching, free, or absent. Useful for substitution and daily planning. |
| **Enrollment by class (donut or bar)** | Answers “How are classes balanced?” and supports timetabling and resource allocation. |
| **Enrollment over time (line)** | Shows growth or drop over terms/years – key for board reports and planning. |
| **One primary CTA** | “+ Add Student” or “+ Quick action” makes the next step obvious. |
| **Mobile app CTA in sidebar** | Encourages use on the go (attendance, quick checks) and positions the product as modern. |
| **Clean, light theme with white cards** | Feels professional and “office-ready”; green accent keeps it friendly and distinct. |
| **Search with shortcut** | Power users can jump to a student, fee, or report quickly (⌘F). |
| **Name and email in header** | Confirms who is logged in (important in shared offices) and matches the reference UIs. |

Optional but high impact:

- **Export dashboard** (e.g. “Download summary PDF”) for board or ministry.
- **Role-based view** (e.g. Bursar sees more finance, Head Teacher sees more attendance).
- **Comparison** (“This term vs last term”) on KPIs or charts.

---

## 6. File and Component Mapping

| Current | Action |
|--------|--------|
| `app/dashboard/admin/layout.tsx` | Add grey background for main area; no structural change to sidebar yet. |
| `app/dashboard/admin/components/Sidebar.tsx` | **Keep all existing nav items** (Dashboard, Students, Teachers, Parents, Staff, Finance, Reports, Attendance, Exam Sets, Classes, Job Vacancies, System Settings, Notifications; Settings + Logout at bottom). Only add MENU / GENERAL labels and “Download our Mobile App” card at bottom; do not remove or reorder any option. |
| `app/dashboard/admin/components/Navbar.tsx` | Add Term/Class/Year filters, greeting, profile name+email, search shortcut hint. |
| `app/dashboard/admin/page.tsx` | New layout order: title + CTAs → KPIs → hero chart → Reminders + Upcoming → Payments/Notifications → secondary charts → Staff overview → Reports/System Health. |
| `app/dashboard/admin/components/KPICards.tsx` | Restyle to white cards, green trend, icons; optional extra metrics (e.g. retention). |
| `app/dashboard/admin/components/ChartsAnalytics.tsx` | Split: one “hero” bar chart (attendance/enrollment); rest in white cards (donut, bar, line). |
| **New** `app/dashboard/admin/components/RemindersCard.tsx` | Reminders from events/deadlines; one CTA. |
| **New** `app/dashboard/admin/components/UpcomingDueCard.tsx` | Upcoming exams / fee due dates list. |
| **New** (optional) `app/dashboard/admin/components/StaffOverviewCard.tsx` | Teacher/staff list with status. |
| `app/dashboard/admin/components/QuickActions.tsx` | Keep; restyle to white card. |
| `app/dashboard/admin/components/RecentPaymentsNotifications.tsx` | Keep; restyle to white card. |
| `app/dashboard/admin/components/RecentReportsSystemHealth.tsx` | Keep; restyle to white card. |
| `app/dashboard/admin/components/GlassBackground.tsx` | Consider disabling or softening on dashboard so grey + white cards stand out; or keep for non-dashboard pages only. |

---

## 7. Summary

- **Look**: Light grey background + white cards + green accent; sidebar with MENU/GENERAL and “Download our Mobile App”; header with search (⌘F), Term/Class/Year filters, greeting, and profile (name + email).
- **Content**: KPI row (students, teachers, attendance, fees, outstanding, optional rate); hero bar chart (attendance/enrollment); Reminders + Upcoming widgets; secondary charts (donut, bar, line); optional Staff overview; keep Quick Actions, Recent Payments/Notifications, Reports/System Health.
- **Goal**: Dashboard that feels like a single, clean “command center” for school admins (Donezo + HR Analytics style) and surfaces the metrics and actions they care about most, without clutter or AI branding.

If you want, the next step can be implementing Phase A (theme + sidebar + header) in the codebase file-by-file.
