-- Index foreign keys for better performance (fixes unindexed_foreign_keys linter).
-- No tables or data changed; indexes only. IF NOT EXISTS avoids errors if index exists.

-- class_teachers
CREATE INDEX IF NOT EXISTS idx_class_teachers_teacher_id ON public.class_teachers(teacher_id);

-- class_template_settings
CREATE INDEX IF NOT EXISTS idx_class_template_settings_class_teacher_id ON public.class_template_settings(class_teacher_id);
CREATE INDEX IF NOT EXISTS idx_class_template_settings_template_id ON public.class_template_settings(template_id);

-- discipline_records
CREATE INDEX IF NOT EXISTS idx_discipline_records_recorded_by ON public.discipline_records(recorded_by);

-- generated_reports
CREATE INDEX IF NOT EXISTS idx_generated_reports_generated_by ON public.generated_reports(generated_by);

-- grades
CREATE INDEX IF NOT EXISTS idx_grades_student_id ON public.grades(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_teacher_id ON public.grades(teacher_id);

-- jobs
CREATE INDEX IF NOT EXISTS idx_jobs_school_id ON public.jobs(school_id);

-- library_book_copies
CREATE INDEX IF NOT EXISTS idx_library_book_copies_book_id ON public.library_book_copies(book_id);

-- old_students
CREATE INDEX IF NOT EXISTS idx_old_students_school_id ON public.old_students(school_id);

-- parents
CREATE INDEX IF NOT EXISTS idx_parents_student_id ON public.parents(student_id);

-- payments
CREATE INDEX IF NOT EXISTS idx_payments_school_id ON public.payments(school_id);
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON public.payments(student_id);

-- processed_primary_exam_results
CREATE INDEX IF NOT EXISTS idx_processed_primary_exam_results_processed_by ON public.processed_primary_exam_results(processed_by);

-- receipts
CREATE INDEX IF NOT EXISTS idx_receipts_payment_id ON public.receipts(payment_id);
CREATE INDEX IF NOT EXISTS idx_receipts_student_id ON public.receipts(student_id);

-- report_snapshots
CREATE INDEX IF NOT EXISTS idx_report_snapshots_created_by ON public.report_snapshots(created_by);
CREATE INDEX IF NOT EXISTS idx_report_snapshots_exam_set_id ON public.report_snapshots(exam_set_id);
CREATE INDEX IF NOT EXISTS idx_report_snapshots_template_id ON public.report_snapshots(template_id);

-- report_templates
CREATE INDEX IF NOT EXISTS idx_report_templates_school_id ON public.report_templates(school_id);

-- reports
CREATE INDEX IF NOT EXISTS idx_reports_student_id ON public.reports(student_id);

-- school_events
CREATE INDEX IF NOT EXISTS idx_school_events_created_by ON public.school_events(created_by);

-- school_expenses
CREATE INDEX IF NOT EXISTS idx_school_expenses_recorded_by ON public.school_expenses(recorded_by);

-- student_balances
CREATE INDEX IF NOT EXISTS idx_student_balances_term_id ON public.student_balances(term_id);

-- student_fees
CREATE INDEX IF NOT EXISTS idx_student_fees_term_id ON public.student_fees(term_id);

-- students
CREATE INDEX IF NOT EXISTS idx_students_school_id ON public.students(school_id);

-- teacher_comment_rules
CREATE INDEX IF NOT EXISTS idx_teacher_comment_rules_school_id ON public.teacher_comment_rules(school_id);

-- timetable_periods
CREATE INDEX IF NOT EXISTS idx_timetable_periods_school_id ON public.timetable_periods(school_id);
CREATE INDEX IF NOT EXISTS idx_timetable_periods_teacher_id ON public.timetable_periods(teacher_id);

-- users
CREATE INDEX IF NOT EXISTS idx_users_student_id ON public.users(student_id);
CREATE INDEX IF NOT EXISTS idx_users_school_id ON public.users(school_id);
