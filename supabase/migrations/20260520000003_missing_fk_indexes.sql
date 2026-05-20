-- Add covering indexes for all foreign key columns that were missing one.
-- Without these, every JOIN and ON DELETE CASCADE on these columns did a full table scan.
-- APPLIED TO LIVE DB: 2026-05-20

-- ── Audit / activity logs ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id                        ON public.audit_log (user_id);
CREATE INDEX IF NOT EXISTS idx_login_activities_user_id                 ON public.login_activities (user_id);

-- ── Financial ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_balance_brought_forward_school_id        ON public.balance_brought_forward (school_id);
CREATE INDEX IF NOT EXISTS idx_expense_subcategories_main_category_code ON public.expense_subcategories (main_category_code);
CREATE INDEX IF NOT EXISTS idx_student_discounts_created_by             ON public.student_discounts (created_by);
CREATE INDEX IF NOT EXISTS idx_student_discounts_term_id                ON public.student_discounts (term_id);
CREATE INDEX IF NOT EXISTS idx_student_invoices_created_by              ON public.student_invoices (created_by);
CREATE INDEX IF NOT EXISTS idx_student_invoices_term_id                 ON public.student_invoices (term_id);
CREATE INDEX IF NOT EXISTS idx_student_ledger_term_id                   ON public.student_ledger (term_id);
CREATE INDEX IF NOT EXISTS idx_student_payments_recorded_by             ON public.student_payments (recorded_by);
CREATE INDEX IF NOT EXISTS idx_student_payments_reversed_by             ON public.student_payments (reversed_by);
CREATE INDEX IF NOT EXISTS idx_student_payments_term_id                 ON public.student_payments (term_id);
CREATE INDEX IF NOT EXISTS idx_schoolpay_ingested_events_payment_id     ON public.schoolpay_ingested_events (student_payment_id);
CREATE INDEX IF NOT EXISTS idx_writeoff_log_approved_by                 ON public.writeoff_log (approved_by);
CREATE INDEX IF NOT EXISTS idx_pdf_render_sessions_school_id            ON public.pdf_render_sessions (school_id);

-- ── HR module ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_hr_leave_balances_leave_type_id          ON public.hr_leave_balances (leave_type_id);
CREATE INDEX IF NOT EXISTS idx_hr_leave_requests_leave_type_id          ON public.hr_leave_requests (leave_type_id);
CREATE INDEX IF NOT EXISTS idx_hr_leave_requests_requested_by           ON public.hr_leave_requests (requested_by_user_id);
CREATE INDEX IF NOT EXISTS idx_hr_leave_requests_reviewed_by            ON public.hr_leave_requests (reviewed_by_user_id);
CREATE INDEX IF NOT EXISTS idx_hr_onboarding_run_tasks_run_id           ON public.hr_onboarding_run_tasks (run_id);
CREATE INDEX IF NOT EXISTS idx_hr_onboarding_runs_job_application_id    ON public.hr_onboarding_runs (job_application_id);
CREATE INDEX IF NOT EXISTS idx_hr_onboarding_runs_template_id           ON public.hr_onboarding_runs (template_id);
CREATE INDEX IF NOT EXISTS idx_hr_onboarding_template_tasks_template_id ON public.hr_onboarding_template_tasks (template_id);
CREATE INDEX IF NOT EXISTS idx_hr_onboarding_templates_school_id        ON public.hr_onboarding_templates (school_id);
CREATE INDEX IF NOT EXISTS idx_hr_review_cycles_school_id               ON public.hr_review_cycles (school_id);
CREATE INDEX IF NOT EXISTS idx_hr_staff_goals_cycle_id                  ON public.hr_staff_goals (cycle_id);
CREATE INDEX IF NOT EXISTS idx_hr_staff_reviews_reviewer_user_id        ON public.hr_staff_reviews (reviewer_user_id);
CREATE INDEX IF NOT EXISTS idx_hr_staff_reviews_school_id               ON public.hr_staff_reviews (school_id);
CREATE INDEX IF NOT EXISTS idx_teacher_documents_uploaded_by            ON public.teacher_documents (uploaded_by);

-- ── Students ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_student_attendance_teacher_id            ON public.student_attendance (teacher_id);
CREATE INDEX IF NOT EXISTS idx_student_import_batches_created_by        ON public.student_import_batches (created_by);
CREATE INDEX IF NOT EXISTS idx_student_olevel_subjects_school_id        ON public.student_olevel_subjects (school_id);

-- ── Reports ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_published_class_bundles_class_id         ON public.published_class_report_bundles (class_id);
CREATE INDEX IF NOT EXISTS idx_published_class_bundles_exam_set_id      ON public.published_class_report_bundles (exam_set_id);
CREATE INDEX IF NOT EXISTS idx_published_class_bundles_published_by     ON public.published_class_report_bundles (published_by);
CREATE INDEX IF NOT EXISTS idx_published_student_reports_class_id       ON public.published_student_reports (class_id);
CREATE INDEX IF NOT EXISTS idx_published_student_reports_exam_set_id    ON public.published_student_reports (exam_set_id);
CREATE INDEX IF NOT EXISTS idx_published_student_reports_published_by   ON public.published_student_reports (published_by);

-- ── Chat ──────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_school_chat_messages_school_id           ON public.school_chat_messages (school_id);
CREATE INDEX IF NOT EXISTS idx_school_chat_messages_sender_id           ON public.school_chat_messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_school_chat_participants_school_id       ON public.school_chat_participants (school_id);

-- ── Access control / sessions ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id                    ON public.user_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_user_school_permissions_granted_by       ON public.user_school_permissions (granted_by);

-- ── Admin / referrals ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_referral_codes_affiliate_id              ON public.referral_codes (affiliate_id);
CREATE INDEX IF NOT EXISTS idx_school_requests_reviewed_by              ON public.school_requests (reviewed_by);
CREATE INDEX IF NOT EXISTS idx_period_locks_locked_by                   ON public.period_locks (locked_by);
CREATE INDEX IF NOT EXISTS idx_period_locks_term_id                     ON public.period_locks (term_id);

-- NOTE: 10 "unused index" warnings were NOT acted on.
-- Reason: the system has not had real school traffic yet — usage stats are empty,
-- not meaningless. Revisit after 4-6 weeks of live use.
-- EXCEPTION: unique_active_subscription_per_school must NEVER be dropped —
-- it enforces the one-active-subscription-per-school business rule.
