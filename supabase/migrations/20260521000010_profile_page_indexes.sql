-- Indexes for student, teacher, and parent profile pages.
-- Applied live on 2026-05-21.
--
-- Root cause of slow profiles: every query on the profile page performs a
-- sequential scan. On a school with 500+ students the tables have no index on
-- (school_id, student_id), so Postgres reads every row to find one student.
-- These indexes convert each scan into a fast index seek.
--
-- Naming: idx_<table>_<columns>

-- ─── parents ─────────────────────────────────────────────────────────────────
-- Used by student profile (by student_id) AND parent profile sibling lookup (by parent_id).
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_parents_school_student
  ON public.parents (school_id, student_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_parents_school_parent
  ON public.parents (school_id, parent_id);

-- ─── student_photos ───────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_photos_school_student_primary
  ON public.student_photos (school_id, student_id)
  WHERE is_primary = true;

-- ─── student_attendance ───────────────────────────────────────────────────────
-- Two queries: today's attendance (with attendance_date) + full history (without).
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_attendance_school_student_date
  ON public.student_attendance (school_id, student_id, attendance_date);

-- ─── exam_results ─────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exam_results_school_student
  ON public.exam_results (school_id, student_id);

-- ─── class_subjects ───────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_class_subjects_school_class
  ON public.class_subjects (school_id, class_name);

-- ─── student_olevel_subjects ──────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_olevel_subjects_school_student
  ON public.student_olevel_subjects (school_id, student_id);

-- ─── student_alevel_subjects ──────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_alevel_subjects_school_student
  ON public.student_alevel_subjects (school_id, student_id);

-- ─── student_invoices ─────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_invoices_school_student
  ON public.student_invoices (school_id, student_id);

-- ─── student_payments ─────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_payments_school_student
  ON public.student_payments (school_id, student_id);

-- ─── class_teachers ───────────────────────────────────────────────────────────
-- Student profile: lookup by class_name. Teacher profile: lookup by teacher_id.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_class_teachers_school_class
  ON public.class_teachers (school_id, class_name);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_class_teachers_school_teacher
  ON public.class_teachers (school_id, teacher_id);

-- ─── teachers ─────────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teachers_school_id
  ON public.teachers (school_id);

-- ─── discipline_records ───────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_discipline_records_student_type
  ON public.discipline_records (student_id, action_type);

-- ─── teacher_class_subjects ───────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teacher_class_subjects_school_teacher
  ON public.teacher_class_subjects (school_id, teacher_id);

-- ─── student_balances (supplement existing composite index) ───────────────────
-- Existing idx_student_balances_school_student covers (school_id, student_id).
-- This partial index speeds up the "owing students" query on parent profile.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_balances_student_school
  ON public.student_balances (student_id, school_id);
