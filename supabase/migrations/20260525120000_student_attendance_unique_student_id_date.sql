-- student_attendance: enforce one row per learner per calendar day (required for PostgREST upsert ON CONFLICT).
-- Some production DBs were created without UNIQUE(student_id, date), which breaks upsert with on_conflict.

-- Drop exact duplicate rows (keep the oldest by created_at, then id).
DELETE FROM public.student_attendance
WHERE id IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY student_id, date
        ORDER BY created_at ASC NULLS LAST, id ASC
      ) AS rn
    FROM public.student_attendance
  ) d
  WHERE rn > 1
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'student_attendance'
      AND c.conname = 'student_attendance_student_id_date_key'
  ) THEN
    ALTER TABLE public.student_attendance
      ADD CONSTRAINT student_attendance_student_id_date_key UNIQUE (student_id, date);
  END IF;
END $$;
