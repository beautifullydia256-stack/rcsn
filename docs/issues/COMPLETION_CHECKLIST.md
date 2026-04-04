# Issues completion checklist

Use this after testing in staging/production. Update **Status** and **Verified** as you go.

| ID | Doc | Status | Verified (date / notes) |
|----|-----|--------|-------------------------|
| 01 | [01-failed-to-send-invitation.md](./01-failed-to-send-invitation.md) | Partial | **Code:** `DesignTeacherProfile` users select uses `created_at`/`last_sign_in_at` (no `updated_at`); `DesignStudentProfile` balance query omits `last_payment_date`; `create-user-account` Node runtime, ESM `passwordPolicy`, `authUserId` guard, rollback on `users` upsert fail. **You verify:** invites in prod. |
| 02 | [02-failed-to-add-parent.md](./02-failed-to-add-parent.md) | **Done** | **2026-04-04:** Vite `ensureParentLink` sends Bearer; Next/Vercel `ensure-parent-link` accepts cookie or Bearer; add-parent flow verified. |
| 03 | [03-dashboard-vs-outstanding-term-invoice-mismatch.md](./03-dashboard-vs-outstanding-term-invoice-mismatch.md) | Partial | **Code:** `src/lib/adminFinanceTerm.ts` — shared current term + `student_balances` aggregation; Next `Kpis.tsx` uses it; **Outstanding** lists (Next `app/dashboard/admin/outstanding/page.tsx`, SPA `OutstandingPage`, `DesignOutstandingPage`) use the same ledger as KPIs (term-scoped when a current term exists). **You verify:** totals match after migration `20260403120000_*` applied. |
| 04 | [04-user-management-ui-ux-modernization.md](./04-user-management-ui-ux-modernization.md) | Partial | **Code:** `InviteFromRosterPage` — loading state before “No school linked”; persist `school_id` into auth store when loaded from DB. Full redesign still open. |
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

Last updated: 2026-04-04 (Issue 02 add-parent signed off; NEXT Issue 03).
