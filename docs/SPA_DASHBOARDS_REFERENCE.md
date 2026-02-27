# SPA Dashboards Reference

This document is the single reference for replicating the web SPA dashboards in the desktop app (Compose). It locates each dashboard in the repo and describes its structure and layout (sidebar, header, footer, main content).

**Source of truth:** All information is taken from the **React SPA** under `src/`. Routing is defined in `src/App.tsx`. Route base for role dashboards is `/dashboard/<role>/...`.

---

## Shared layout shell (Admin, Teacher, Accountant)

Admin, Teacher, and Accountant dashboards use the same chrome:

- **Wrapper:** Full-screen flex layout. Theme via `data-theme="light"` or `data-theme="dark"`. Class `accountant-glass` (or equivalent) for glassmorphism; background from CSS variable `--ac-page-bg`. See `src/styles/accountant-glass.css`.

- **Sidebar:** Fixed width `w-56` (224px). Glass style: `ac-glass-sidebar` (frosted panel, blur, thin border). Structure:
  - Logo row: icon + "PwezaCore" (+ optional collapse button).
  - "MENU" label (uppercase, muted; `ac-text-muted`, 11px).
  - Nav: list of items (flat or expandable). Active state: `ac-sidebar-nav-item-active`. Then Logout at bottom (no nested section).

- **Header:** `ac-glass-header`. Typical contents: search field, theme toggle (sun/moon), messages icon, notifications icon, user (name + avatar). Border bottom.

- **Main:** Scrollable content area with `<Outlet />` (and optional Suspense). Transparent background so page background shows.

- **Footer:** `ac-glass-footer`. Copyright, links (Privacy Policy, Terms and conditions, Contact), social icons (f, X, in). Used in Accountant (and can be reused for others).

**Shared CSS:** `src/styles/accountant-glass.css` — glass panels (`.ac-glass-card`, `.ac-glass-sidebar`, `.ac-glass-header`, `.ac-glass-footer`), nav item styles (`.ac-sidebar-nav-item`, `.ac-sidebar-nav-item-active`), theme variables (`--ac-page-bg`, `--ac-text-primary`, etc.).

---

## Admin dashboard

| Item | Location |
|------|----------|
| Layout | `src/components/layout/AdminLayout.tsx` |
| Entry / routes | `src/App.tsx` under `path="admin"` |

### Routes (path segment under `/dashboard/admin/`)

| Path | Description |
|------|-------------|
| (index) | Dashboard |
| students | Students list |
| students/add | Add student |
| teachers | Teachers list |
| parents | Parents list |
| accounts | All users (User Management) |
| accounts/add | Create Staff |
| staff | Staff |
| outstanding | Finance |
| reports | Reports overview |
| reports/generate | Generate reports |
| report-records | Report records |
| reports/bulk | Bulk generator |
| reports/viewer | Report viewer |
| attendance | Attendance records |
| exam-sets | Exam sets |
| identity | Identity (ID cards) |
| identity/:id | Student ID card detail |
| settings | System settings |
| settings/classes | Classes |
| settings/classes/:className | Class detail |
| settings/location | Location settings |
| jobs | Job vacancies |
| notifications | Notifications |

### Sidebar order (exact)

1. **MENU** (label)
2. Dashboard
3. Students
4. Teachers
5. Parents
6. **User Management** (expandable)
   - All users → `accounts`
   - Create Staff → `accounts/add`
7. Staff
8. Finance → `outstanding`
9. **Reports** (expandable)
   - Overview → `reports`
   - Generate Reports → `reports/generate`
   - Report Records → `report-records`
   - Report Templates → `settings`
10. Attendance
11. Exam Sets
12. Identity
13. Classes → `settings/classes`
14. Job Vacancies
15. System Settings → `settings`
16. Notifications
17. Logout (button)

### Header

Search (students/teachers/reports), theme toggle, profile dropdown. Optional: mobile "Download our Mobile App" card in sidebar when device is mobile.

### Main content (default screen)

Admin Dashboard page: summary cards and quick links (e.g. students, teachers, finance, reports). Exact content in `src/pages/admin/Dashboard.tsx`.

---

## Teacher dashboard

| Item | Location |
|------|----------|
| Layout | `src/pages/teacher/TeacherLayout.tsx` |
| Entry / routes | `src/App.tsx` under `path="teacher"` |

### Routes (path segment under `/dashboard/teacher/`)

| Path | Description |
|------|-------------|
| (index) | Teacher dashboard |
| students | My Students |
| classes | My Classes |
| exam-results | Exam results (list/landing) |
| exam-results/class/:classEncoded | Exam results by class |
| exam-results/class/:classEncoded/subject/:subjectEncoded | Exam results by class and subject |
| attendance | Attendance |
| timetable | Timetable |
| grading-system | Grading system |
| ai-planner | AI Lesson Planner |
| assignments | Assignments |
| resources | Resources |
| messages | Messages |
| notifications | Notifications |
| settings | Settings |

### Sidebar order (exact)

1. **MENU** (label)
2. Dashboard
3. My Classes
4. My Students
5. **Exam Results** (expandable)
   - Per class (dynamic list from `classesWithSubjects`)
   - Under each class: per-subject links → `exam-results/class/<class>/subject/<subject>`
   - If no classes: "No classes assigned"
6. Attendance
7. Timetable
8. Grading System
9. AI Lesson Planner
10. Assignments
11. Resources
12. Messages
13. Notifications
14. Settings
15. (divider) then Logout (button)

### Header

Search placeholder: "Search students, classes...". Theme toggle, messages, notifications, user (name + avatar).

### Main content (default screen)

Teacher Dashboard: title "Teacher Dashboard", subtitle "Manage your classes and students"; two stat cards (My Classes count, My Students count); action buttons (Exam Results, Attendance, Timetable, Settings). See `src/pages/teacher/Dashboard.tsx`.

---

## Accountant dashboard

| Item | Location |
|------|----------|
| Layout | `src/pages/accountant/AccountantLayout.tsx` |
| Default screen | `src/pages/accountant/FinancialOverview.tsx` (used by `Dashboard.tsx`) |
| Entry / routes | `src/App.tsx` under `path="accountant"` |

### Routes (path segment under `/dashboard/accountant/`)

| Path | Description |
|------|-------------|
| (index) | Dashboard (Financial Overview) |
| fee-structure | Fee structure |
| billing | Invoices & Billing |
| payments | Payments |
| receipts | Receipts |
| outstanding | Outstanding fees |
| expenses | Expenses |
| bank | Bank & Cash |
| reports | Reports |
| adjustments | Adjustments |

### Sidebar order (exact)

1. **MENU** (label)
2. Dashboard
3. Fee Structure
4. Invoices & Billing
5. Payments
6. Receipts
7. Outstanding Fees
8. Expenses
9. Bank & Cash
10. Reports
11. Adjustments
12. Logout (button)

### Header

Search placeholder: "Search students, receipts, invoices...". Theme toggle, MessageCircle icon, Bell icon, user name + emerald avatar.

### Footer

Copyright © &lt;year&gt; PwezaCore. Links: Privacy Policy, Terms and conditions, Contact. Social: f, X, in.

### Main content (default screen — Financial Overview)

- **Title:** "Financial Overview" + term label (e.g. "Term 1, 2026").
- **Four action buttons:** Record payment, Generate invoice, Record expense, Send reminder.
- **KEY FIGURES:** Four cards — Total fees expected (this term), Total fees collected (this term), Outstanding balances (Balance due), Today's collections (Payments today).
- **Row (desktop):**
  - **Cashflow** (left): Bar chart "This year", total balance, legend Cash In / Expense.
  - **Statistic** (right): Total expected (all terms), Total overall balance (all terms), donut chart by term.
- **Recent Transactions:** Full-width table below Cashflow/Statistic.

---

## Student dashboard

| Item | Location |
|------|----------|
| Layout | `src/components/layout/StudentLayout.tsx` (just `<Outlet />`; no sidebar/header/footer) |
| Entry / routes | `src/App.tsx` under `path="student"` |

### Routes (path segment under `/dashboard/student/`)

| Path | Description |
|------|-------------|
| (index) | Student dashboard |
| fees | My Fees |

No sidebar, header, or footer in SPA. Desktop app may add its own shell or reuse a generic one.

---

## Other role dashboards (single-page, no layout)

| Role | Path | File | Description |
|------|------|------|-------------|
| Parent | `/dashboard/parent` | `src/pages/parent/Dashboard.tsx` | Single page: title "Parent Dashboard", one GlassPanel with "My Children" card. |
| Librarian | `/dashboard/librarian` | `src/pages/librarian/Dashboard.tsx` | Single page: title "Librarian Dashboard", one GlassPanel "Library" (books and loans). |
| Head Teacher | `/dashboard/head-teacher` | `src/pages/head-teacher/Dashboard.tsx` | Single page: title "Head Teacher Dashboard", one GlassPanel "Overview". |
| Owner | `/dashboard/owner` | `src/pages/owner/Dashboard.tsx` | Single page: title "Owner Dashboard", one GlassPanel "School" (ownership and billing). |

---

## Desktop replication checklist

- **Admin:** Use the sidebar order and routes above; implement expandable User Management and Reports; wire all admin routes to matching desktop screens.
- **Teacher:** Use the sidebar order and routes above; implement expandable Exam Results (per class → per subject); wire all teacher routes.
- **Accountant:** Use the sidebar order and routes above; implement Financial Overview with KEY FIGURES, Cashflow, Statistic, Recent Transactions; wire fee-structure, billing, payments, receipts, outstanding, expenses, bank, reports, adjustments.
- **Student:** Two routes (index, fees); desktop may add a minimal shell.
- **Parent / Librarian / Head Teacher / Owner:** Single-page dashboards; desktop can show the same title + one card/section per role.
