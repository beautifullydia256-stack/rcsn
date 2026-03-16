## Pwezacore Pre‑Launch Test Checklist (Schools)

This checklist covers the critical flows to verify before selling Pwezacore to schools. Treat each item as “tested and documented” (with screenshots or notes) before go‑live.

---

### 1. Environment, Auth & Roles

- [x] **Environments configured**: Supabase project, service role keys, URL, JWT settings, storage buckets, and RPCs are correctly configured for production (no dev keys or test databases).
- [ ] **Web auth flows**:
  - [x] Admin login and logout work and redirect correctly.
  - [x] Registration flow works (creates correct role and school linkage).
  - [ ] Password reset flow works end‑to‑end (email link → new password → login).
  - [ ] Role‑specific logins (teacher, student, parent, accountant, librarian, head‑teacher, owner) go to the correct dashboards where applicable.
- [ ] **Role‑based dashboards**: Each role lands on the correct dashboard (`/dashboard/admin`, `/dashboard/teacher`, `/dashboard/student`, `/dashboard/parent`, `/dashboard/accountant`, `/dashboard/librarian`, `/dashboard/head-teacher`, `/dashboard/owner`) and cannot access unauthorized sections.
- [ ] **Session handling**: Expired sessions are handled cleanly (redirect to login, no infinite loaders, no cryptic errors).
- [x] **Multi‑school separation**: Users from one school cannot see, query, or generate reports/notifications for another school (Supabase `school_id` scoping).

---

### 2. Core Data: Students, Teachers, Parents, Classes

- [ ] **Student lifecycle**:
  - [ ] Add, edit, and archive/withdraw students from the admin UI.
  - [ ] Assign students to classes/streams and confirm they appear correctly on admin and teacher views.
  - [ ] Student login (where enabled) shows the correct profile, class, and fee information.
- [ ] **Teacher lifecycle**:
  - [ ] Create teacher records, edit profiles, deactivate teachers.
  - [ ] Create teacher login accounts via the admin UI and confirm teacher can sign in and see assigned classes only.
  - [ ] Update teacher assignments (classes/subjects) and verify timetables, attendance, and result entry follow the new assignments.
- [ ] **Parent lifecycle**:
  - [ ] Add parent and link to one or more students (including ensure‑link flows).
  - [ ] Parent portal shows the right students, attendance summaries, results, and fees.
- [ ] **Class & structure configuration**:
  - [ ] Create/edit classes, streams, subjects, and exam sets in settings.
  - [ ] Confirm changes propagate to teacher dashboards, result entry pages, and reports.

---

### 3. Exams, Grading & Result Entry

- [ ] **Exam sets & terms**:
  - [ ] Create exam sets/terms (e.g. Mid‑Term, End‑Term) and map them to classes and subjects.
  - [ ] Verify they appear correctly in all result entry and reporting screens.
- [ ] **Result entry (teacher side)**:
  - [ ] Teachers can enter marks per class, per subject, for a chosen exam set.
  - [ ] Validation works (no marks > maximum, numeric checks, required fields).
  - [ ] Saved marks are immediately visible on admin and teacher result views.
- [ ] **Grading logic**:
  - [ ] Check grade boundaries, aggregates, and positions for a representative sample of students (top, middle, struggling).
  - [ ] Cross‑verify that the same student’s grades/aggregates are identical across teacher portal, admin portal, Android app, desktop app, and generated PDFs.
  - [ ] Verify remarks/comments (teacher, class teacher, head teacher) appear correctly and can be updated before finalizing.

---

### 4. Reports & PDFs (End‑to‑End)

- [ ] **Snapshot creation**:
  - [ ] From the admin UI, generate report snapshots for a term/exam set (per class and for the whole school).
  - [ ] Confirm `report_snapshot` and `report_snapshot_data` reflect the correct marks, aggregates, positions, fee balances, attendance summaries, and comments.
- [ ] **Final report generation**:
  - [ ] Use the bulk generator to create final reports for:
    - [ ] A single class.
    - [ ] The entire school.
  - [ ] Confirm `generated_reports` are created and linked to the right snapshot, with no duplicates or missing students.
- [ ] **PDF generation and preview**:
  - [ ] Generate PDFs via the web app for:
    - [ ] Single student.
    - [ ] Entire class.
    - [ ] Multiple classes / the whole school.
  - [ ] Check layout, fonts, student details, term/year, class, subjects, marks, aggregates, positions, attendance, and fee details.
  - [ ] Open PDFs on different devices (laptop, phone) and confirm they print correctly (A4, no content cut off).
- [ ] **Consistency across platforms**:
  - [ ] Desktop app: sync snapshots from Supabase, generate PDFs locally, and confirm PDFs match the web versions for the same snapshot.
  - [ ] Android app: view generated reports and confirm data matches web/desktop for the same student and exam set.

---

### 5. Fees & Finance (Accountant + Student/Parent Views)

- [ ] **Fee structure & billing**:
  - [ ] Configure fee structures for different classes/programs.
  - [ ] Generate bills for all students in a class and for specific students.
  - [ ] Confirm students inherit the correct fee structure (e.g. boarding vs day, optional extras).
- [ ] **Payments & receipts**:
  - [ ] Record cash/bank payments, partial payments, and historical payments.
  - [ ] Generate receipts and verify:
    - [ ] Receipt numbers are unique and sequential where expected.
    - [ ] Student balances update correctly after each payment.
  - [ ] Export or print finance reports and verify totals.
- [ ] **Outstanding balances & adjustments**:
  - [ ] Verify outstanding balance pages (admin, accountant, student, parent) show the same remaining balance.
  - [ ] Apply discounts/adjustments (waivers, penalties) and confirm all views and reports reflect the new figures.
- [ ] **Integration with reports**:
  - [ ] Check that report cards show accurate fee balances and payment status for each student at the time of snapshot.

---

### 6. Attendance (Teacher, Admin, Parent/Student)

- [ ] **Daily marking**:
  - [ ] Teachers can mark attendance per class, per day and correct mistakes (edit or override).
  - [ ] Prevent obvious double entries and handle late additions cleanly.
- [ ] **Admin overview**:
  - [ ] Admin attendance pages show daily/weekly summaries and match what teachers entered.
  - [ ] Filters (by class, date range, status) work as expected.
- [ ] **Parent & student views**:
  - [ ] Parents and students can see accurate attendance summaries.
  - [ ] Random sample: pick a student and manually compare a week’s attendance between teacher logs, admin view, and parent/student portal.
- [ ] **Integration with AI & reports**:
  - [ ] Confirm attendance percentages on report cards match raw attendance records.
  - [ ] Check that AI teacher insights use realistic attendance data and don’t break when attendance is missing or partial.

---

### 7. Notifications (Email, SMS, WhatsApp, In‑App)

- [ ] **Notification creation (admin)**:
  - [ ] Create different types of notifications: general announcements, fee reminders, exam result notifications, library overdue reminders.
  - [ ] Target by class, role, or individual students/parents where supported.
- [ ] **Notification logs & worker**:
  - [ ] Verify that each notification queues entries in `notification_logs` with correct type (email/SMS/WhatsApp) and audience.
  - [ ] Run the notification send worker endpoint and confirm:
    - [ ] Logs migrate from `pending` → `sent` or `failed`.
    - [ ] Errors are captured but do not stop other notifications from sending.
- [ ] **Delivery (once providers are wired)**:
  - [ ] For each provider (email, SMS, WhatsApp), send test messages:
    - [ ] To a sample of phone numbers/emails.
    - [ ] To international numbers where relevant.
  - [ ] Confirm rate limiting and provider errors are handled gracefully with retries or clear error reporting.
- [ ] **UI stats & visibility**:
  - [ ] Admin notification dashboards show accurate counts of pending/sent/failed by type and category.
  - [ ] Users see notification history in their dashboards where implemented.

---

### 8. Library & Overdue Fines

- [ ] **Catalog & copies**:
  - [ ] Add books and copies, lend them to students/teachers, and return them.
  - [ ] Prevent lending unavailable copies or marking the same copy as loaned twice.
- [ ] **Overdue detection**:
  - [ ] Simulate overdue items (or adjust dates) and confirm they appear on librarian dashboards.
  - [ ] Run the `post_overdue_fines` RPC from the librarian UI and confirm fines are created for the correct users.
- [ ] **Integration with finance**:
  - [ ] Check overdue fines appear in fee/outstanding balances where integrated.
  - [ ] Ensure clearing fines (payment or adjustment) updates both library and finance views.

---

### 9. AI Features (Teacher Insights & Planner)

- [ ] **Teacher AI insights**:
  - [ ] With realistic sample data (marks + attendance), call the teacher dashboard AI insights and review outputs for:
    - [ ] Accuracy (which students are flagged as struggling or improving).
    - [ ] Clarity and safe language (no hallucinated data).
  - [ ] Test behavior when:
    - [ ] There is very little data.
    - [ ] OpenAI or the API key is missing/invalid.
  - [ ] Confirm the dashboard still works and shows a clear message when insights are unavailable.
- [ ] **AI planner**:
  - [ ] Create lesson plans with different prompts and check:
    - [ ] Plans are structured and usable by real teachers.
    - [ ] There is no unsafe or inappropriate content.
  - [ ] Validate that plans can be revised/saved where implemented.

---

### 10. Multi‑Platform Consistency (Web, Desktop, Android)

- [ ] **Authentication & navigation**:
  - [ ] Web, desktop, and Android all handle login/logout and invalid sessions correctly.
  - [ ] Navigation flows (home → dashboard → reports/fees/settings) are intuitive and consistent.
- [ ] **Data consistency**:
  - [ ] Pick a sample of students, classes, and terms:
    - [ ] Compare marks, aggregates, positions, attendance, and balances across all platforms.
    - [ ] Confirm that after synchronization, no platform shows stale or conflicting data.
- [ ] **Offline behavior (desktop & Android)**:
  - [ ] Use the apps offline:
    - [ ] Confirm cached data is visible and clearly labeled as offline.
    - [ ] Check that sync resumes correctly once back online, without duplicating records or losing changes.

---

### 11. Performance, Load & Reliability

- [ ] **Typical school size**:
  - [ ] Seed data approximating a real school (e.g. 1,000–2,000 students, multiple streams per class, several terms of history).
  - [ ] Measure load times for key pages (dashboards, results, fees, notifications) and ensure they are acceptable on average hardware and internet.
- [ ] **Bulk operations**:
  - [ ] Bulk generating reports for a whole school.
  - [ ] Bulk fee calculations/billing for all students.
  - [ ] Check that these operations complete without timeouts and show progress or status to the user.
- [ ] **Error handling**:
  - [ ] Simulate partial failures (e.g. RPC failure, network drop during PDF generation, notification provider error) and confirm:
    - [ ] Clear error messages.
    - [ ] No corrupted data (e.g. half‑created snapshots or mismatched balances).

---

### 12. Security, Privacy & Compliance

- [ ] **Access control**:
  - [ ] Confirm that each role can only access the data it should (e.g. teachers cannot see other schools, students cannot see other students’ marks, parents only see their children).
  - [ ] Attempt to bypass UI using direct URLs or API calls and verify Supabase RLS and API checks block unauthorized access.
- [ ] **Sensitive data protection**:
  - [ ] Production database does not contain test/demo users with weak passwords.
  - [ ] Logs do not expose passwords, tokens, or sensitive personal information.
  - [ ] Public/marketing sites do not leak internal admin links or debug information.
- [ ] **Data export & right to access**:
  - [ ] Verify that an authorized admin can export key data (students, marks, fees) on request.
  - [ ] Ensure there is a clear process to deactivate users and anonymize/delete data if required by regulations in your target market.

---

### 13. Backups, Migrations & Operational Runbook

- [ ] **Supabase migrations**:
  - [ ] Confirm all migrations (including recent ones like notification and report changes) have been applied cleanly to production.
  - [ ] Run a migration on a staging environment that mirrors production to ensure no breaking schema changes.
- [ ] **Backups & restore**:
  - [ ] Verify automated backups are enabled and configured with sufficient retention.
  - [ ] Perform at least one full restore test to a staging environment and confirm the app runs correctly on restored data.
- [ ] **Operational runbook**:
  - [ ] Document how to:
    - [ ] Deploy web, desktop, and Android updates.
    - [ ] Rotate API keys and Supabase service role keys.
    - [ ] Monitor critical tables (students, exam_results, report_snapshots, notification_logs) for anomalies.

---

### 14. Onboarding & School‑Specific Setup

- [ ] **New school onboarding**:
  - [ ] From zero, configure a new school:
    - [ ] Create school record, classes, streams, subjects, fee structures, staff, and sample students.
  - [ ] Time this process and refine steps so a trained staff member can do it without developer help.
- [ ] **Training & documentation**:
  - [ ] Prepare quick‑start guides or short videos for admins, teachers, accountants, and parents/students.
  - [ ] Confirm that app labels, tooltips, and flows are clear enough that new users can complete key tasks without confusion.

---

Use this checklist as a living document: tick off each item, record which environment and date you tested, and note any issues discovered and fixed. Once everything here is green, you’ll be in a strong position to confidently start selling Pwezacore to schools.
