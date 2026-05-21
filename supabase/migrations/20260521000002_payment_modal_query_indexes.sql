-- Indexes for RecordPaymentModal performance
-- Applied live via API on 2026-05-21; this file documents them for git history.
--
-- Root cause of "students not loading" and "Loading balances... for 2 minutes":
--   1. No (school_id, status, name) index → ORDER BY name caused a full in-memory sort
--      for every modal open, growing worse as student count grows.
--   2. No (school_id, balance) index → "who owes?" scan read every balance row per school.
--   3. resolveCurrentSchoolTerm ran sequentially after Promise.all → if user picked a
--      student before it resolved, the balance effect fired twice (double "Loading balances…").

-- Fix 1: fast ordered active-student lookup (covers WHERE status='active' ORDER BY name)
CREATE INDEX IF NOT EXISTS idx_students_school_status_name
  ON students(school_id, status, name)
  WHERE status = 'active';

-- Fix 2: fast "who owes money?" scan used on modal open
CREATE INDEX IF NOT EXISTS idx_student_balances_school_owing
  ON student_balances(school_id, student_id)
  WHERE balance > 0;

-- Fix 3: fast per-school per-student balance lookup (used when a student is selected)
CREATE INDEX IF NOT EXISTS idx_student_balances_school_student
  ON student_balances(school_id, student_id);
