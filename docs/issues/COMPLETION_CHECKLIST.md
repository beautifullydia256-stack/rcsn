# Issues completion checklist

Use this after testing in staging/production. Update **Status** and **Verified** as you go.

| ID | Doc | Status | Verified (date / notes) |
|----|-----|--------|-------------------------|
| 01 | [01-failed-to-send-invitation.md](./01-failed-to-send-invitation.md) | Partial | **Code:** `DesignTeacherProfile` users select uses `created_at`/`last_sign_in_at` (no `updated_at`); `DesignStudentProfile` balance query omits `last_payment_date`; `create-user-account` Node runtime, ESM `passwordPolicy`, `authUserId` guard, rollback on `users` upsert fail. **You verify:** invites in prod. |
| 02 | [02-failed-to-add-parent.md](./02-failed-to-add-parent.md) | **Done** | **2026-04-04:** Vite `ensureParentLink` sends Bearer; Next/Vercel `ensure-parent-link` accepts cookie or Bearer; add-parent flow verified. |
| 03 | [03-dashboard-vs-outstanding-term-invoice-mismatch.md](./03-dashboard-vs-outstanding-term-invoice-mismatch.md) | **Done** | **2026-04-05:** Dashboard KPIs and outstanding views aligned (shared term + `student_balances` ledger; migration `20260403120000_*` applied). |
| 04 | [04-user-management-ui-ux-modernization.md](./04-user-management-ui-ux-modernization.md) | **Done** | **2026-04-05:** User management cluster + staff roster UX; non-teaching staff profiles use teacher-profile shell (Geist / Instrument Serif, desktop max-width, documents/KYC, photos). Invite/school context patterns aligned. |
| 05 | [05-assign-class-teacher-visibility-and-rules.md](./05-assign-class-teacher-visibility-and-rules.md) | **Done** | **2026-04-06:** Class teacher flow on teacher profile verified: dedicated card, occupancy hints, assign/block rules, subject teaching split; profile data loads parallelized. |
| 06 | [06-financial-analytics-redesign-and-pdf-export.md](./06-financial-analytics-redesign-and-pdf-export.md) | **Done** | **2026-04-06:** Dashboard + PDF letterhead + Excel; ledger KPIs (outstanding + fees on record); PDF **ASCII-safe** text for standard fonts (Edge). **You verify:** logo CORS; exports in production. |
| 07 | [07-record-payment-modal-loop-accountant-outstanding.md](./07-record-payment-modal-loop-accountant-outstanding.md) | **Done** | **2026-04-06:** Record Payment from accountant Outstanding stays closed after dismiss; `openRecordPayment` in place; `payments?student=` cleared on close; PaymentsPage URL auto-open ref-guard. Verified in production. |
| 08 | [08-notification-center-rebuild.md](./08-notification-center-rebuild.md) | **Done** | **2026-04-08:** Admin notification hub: inbox on `user_in_app_notifications` (unread/read, mark read, filters, desktop layout); **Broadcast** tools; student-registry header pattern; dashboard inbox preview. Apply `20260403150000_in_app_notifications.sql` in prod if not already; extend event sources over time. |
| 09 | [09-system-settings-ui-visibility-responsive.md](./09-system-settings-ui-visibility-responsive.md) | Partial | **Code (2026-04-05):** Admin `.pw-main` defines `--ac-*` tokens + dark `select` + glass button overrides so `ac-text-*` / `ac-input` / `ac-glass-card` work without `accountant-glass`. All System Settings routes/tabs restyled for dark contrast (`pw`/`ac` tokens, tables, alerts). Responsive: scrollable tab row, `min-h-[44px]` targets, stacked toolbars on small screens. **You verify:** saves/load unchanged; smoke-test every settings sub-page on mobile. |
| 10 | [10-headed-paper-vs-identity-cards-sidebar-and-pdf.md](./10-headed-paper-vs-identity-cards-sidebar-and-pdf.md) | Partial | **Code (2026-04-06):** Vite admin registers `headed-paper` route + `HeadedPaperPage` (iframe preview, `/api/headed-paper/generate-pdf`, school data via Supabase; HTML escape for injected fields). Sidebar label **Identity cards**; identity page title aligned. Next admin Quick Actions → `/dashboard/admin/headed-paper`. **You verify:** SPA and Next headed paper + PDF download in production. |
| 11 | [11-timetable-pdf-download-uganda.md](./11-timetable-pdf-download-uganda.md) | **Done** | **2026-04-06:** Timetable Designer PDF — whole school (one landscape page per class with periods) or single class; jsPDF + ASCII-safe text (`timetablePdf.ts`); Vite `SettingsTimetable` + Next `TimetableDesigner`. Teacher timetable remains browser print. Stakeholder verified multi-page whole-school export. |
| 12 | [12-report-lower-upper-section-preview-pdf-parity.md](./12-report-lower-upper-section-preview-pdf-parity.md) | Partial | Preview wrapped in white/light context; PDF parity (comments, boundaries, school contact) needs `reportGenerator` audit. |
| 13 | [13-attendance-reports-na-and-ui-counts.md](./13-attendance-reports-na-and-ui-counts.md) | Partial | Snapshot transformer passes attendance object + computed days when data exists; app-wide “300/1000” KPIs not done. |
| 14 | [14-global-dark-mode-text-and-dropdown-contrast.md](./14-global-dark-mode-text-and-dropdown-contrast.md) | Partial | Accountant shell: brighter `--pw-t*` tokens; dark `<select>` styling — extend to admin Next as needed. |
| 15 | [15-nursery-reports-testing-deferred.md](./15-nursery-reports-testing-deferred.md) | Deferred | Test after report fixes. |

**Migrations to apply (order):**

1. `20260403120000_student_balance_current_term_and_users_last_sign_in.sql`
2. `20260403150000_in_app_notifications.sql`

Last updated: 2026-04-06 (Issue **11** timetable PDF signed off; **NEXT** checklist focus: **12**).
