# Issues completion checklist

Use this after testing in staging/production. Update **Status** and **Verified** as you go.

| ID | Doc | Status | Verified (date / notes) |
|----|-----|--------|-------------------------|
| 01 | [01-failed-to-send-invitation.md](./01-failed-to-send-invitation.md) | Partial | API `maxDuration`; store school on invite; DB `last_sign_in_at` migration — retest invites. |
| 02 | [02-failed-to-add-parent.md](./02-failed-to-add-parent.md) | Partial | ensure-parent-link JSON guard — retest add parent. |
| 03 | [03-dashboard-vs-outstanding-term-invoice-mismatch.md](./03-dashboard-vs-outstanding-term-invoice-mismatch.md) | Partial | New migration: `auto_initialize_student_balance` uses calendar term; admin KPI uses `student_balances` + `term_id` — **run migration** then retest new student + dashboard. |
| 04 | [04-user-management-ui-ux-modernization.md](./04-user-management-ui-ux-modernization.md) | Not started | Full redesign not implemented. |
| 05 | [05-assign-class-teacher-visibility-and-rules.md](./05-assign-class-teacher-visibility-and-rules.md) | Partial | Teacher profile: removed bogus term-3 filter; multi-class badges; API blocks second class teacher. |
| 06 | [06-financial-analytics-redesign-and-pdf-export.md](./06-financial-analytics-redesign-and-pdf-export.md) | Partial | Toolbar: Print / Save PDF hint; full redesign + chart PDF not done. |
| 07 | [07-record-payment-modal-loop-accountant-outstanding.md](./07-record-payment-modal-loop-accountant-outstanding.md) | Partial | `useCallback` for record payment in `AccountantLayout` — retest SPA outstanding → payments flow. |
| 08 | [08-notification-center-rebuild.md](./08-notification-center-rebuild.md) | Partial | New table + trigger (new student); admin Next notifications page simplified — **run migration**; extend event sources as needed. |
| 09 | [09-system-settings-ui-visibility-responsive.md](./09-system-settings-ui-visibility-responsive.md) | Not started | |
| 10 | [10-headed-paper-vs-identity-cards-sidebar-and-pdf.md](./10-headed-paper-vs-identity-cards-sidebar-and-pdf.md) | Partial | Admin sidebar + `/dashboard/admin/headed-paper`; Next identity list + detail; SPA headed paper link fixed. |
| 11 | [11-timetable-pdf-download-uganda.md](./11-timetable-pdf-download-uganda.md) | Partial | Teacher timetable: Print/Save PDF; school-wide export not built. |
| 12 | [12-report-lower-upper-section-preview-pdf-parity.md](./12-report-lower-upper-section-preview-pdf-parity.md) | Partial | Preview wrapped in white/light context; PDF parity (comments, boundaries, school contact) needs `reportGenerator` audit. |
| 13 | [13-attendance-reports-na-and-ui-counts.md](./13-attendance-reports-na-and-ui-counts.md) | Partial | Snapshot transformer passes attendance object + computed days when data exists; app-wide “300/1000” KPIs not done. |
| 14 | [14-global-dark-mode-text-and-dropdown-contrast.md](./14-global-dark-mode-text-and-dropdown-contrast.md) | Partial | Accountant shell: brighter `--pw-t*` tokens; dark `<select>` styling — extend to admin Next as needed. |
| 15 | [15-nursery-reports-testing-deferred.md](./15-nursery-reports-testing-deferred.md) | Deferred | Test after report fixes. |

**Migrations to apply (order):**

1. `20260403120000_student_balance_current_term_and_users_last_sign_in.sql`
2. `20260403150000_in_app_notifications.sql`

Last updated: 2026-04-03 (implementation pass).
