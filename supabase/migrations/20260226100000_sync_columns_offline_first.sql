-- =============================================================================
-- Sync columns for offline-first delta sync (MASTER_ARCHITECTURE_DIRECTIVE).
-- Adds updated_at (if missing), deleted_at, version, device_id to synced tables.
-- See docs/LOCAL_DATABASE_SCHEMA_AND_SYNC.md and docs/SYNC_API.md.
-- =============================================================================

-- Helper: add column only if it does not exist (PG 9.5+)
DO $$
DECLARE
  r RECORD;
  tbl text;
  cols text[] := ARRAY['deleted_at', 'version', 'device_id'];
  col_defs text[] := ARRAY[
    'timestamptz',
    'integer NOT NULL DEFAULT 1',
    'text'
  ];
  i int;
  c text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'global_terms', 'nursery_auto_comments', 'schools', 'school_terms', 'classes',
    'subjects', 'class_subjects', 'users', 'teachers', 'students', 'parents',
    'class_teachers', 'teacher_class_subjects', 'exam_sets', 'grading_scale',
    'headteacher_comments_settings', 'class_teacher_comments_settings', 'teacher_remarks_settings',
    'report_templates', 'class_template_settings', 'report_title_settings', 'school_report_customizations',
    'fee_structures', 'school_fee_structure', 'school_requirements', 'expense_categories',
    'admission_sequences', 'student_invoices', 'student_fees', 'student_balances',
    'balance_brought_forward', 'student_payments', 'receipts', 'receivable_status',
    'student_discounts', 'student_ledger', 'student_requirements', 'student_photos',
    'exam_results', 'processed_primary_exam_results', 'processed_secondary_exam_results',
    'report_comments', 'report_snapshots', 'report_snapshot_data', 'generated_reports',
    'student_attendance', 'attendance', 'teacher_attendance_logs', 'school_expenses',
    'period_locks', 'term_closures', 'school_events', 'notifications', 'notification_templates',
    'notification_logs', 'assignments', 'assignment_submissions', 'discipline_records',
    'timetables', 'timetable_periods', 'jobs', 'reports', 'rollover_status', 'termly_projects',
    'writeoff_log', 'audit_log', 'logs', 'library_books', 'library_book_copies',
    'library_borrows', 'library_fines', 'library_reservations'
  ])
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
      FOR i IN 1..array_length(cols, 1) LOOP
        c := cols[i];
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = tbl AND column_name = c
        ) THEN
          EXECUTE format('ALTER TABLE public.%I ADD COLUMN %I %s', tbl, c, col_defs[i]);
        END IF;
      END LOOP;
      -- Ensure updated_at exists
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'updated_at'
      ) THEN
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN updated_at timestamptz DEFAULT now()', tbl);
      END IF;
    END IF;
  END LOOP;
END $$;

-- Ensure created_at has default on key tables that might lack it (no-op if already set)
-- Optional: add triggers to auto-set updated_at on UPDATE for synced tables.
-- For brevity we rely on app/sync layer to set updated_at; optionally add:
-- CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
-- Then per table: CREATE TRIGGER ... BEFORE UPDATE ON table_name FOR EACH ROW EXECUTE FUNCTION set_updated_at();
