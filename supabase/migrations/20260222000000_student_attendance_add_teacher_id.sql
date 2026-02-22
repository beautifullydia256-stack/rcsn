-- Ensure student_attendance has teacher_id (schema cache error: column missing).
-- Some setups created the table without this column; add it if missing.
ALTER TABLE public.student_attendance
ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES public.teachers(teacher_id) ON DELETE SET NULL;

-- Optional: make it NOT NULL for new rows only (existing rows keep NULL).
-- Uncomment below only after backfilling or if the table is empty:
-- ALTER TABLE public.student_attendance ALTER COLUMN teacher_id SET NOT NULL;

COMMENT ON COLUMN public.student_attendance.teacher_id IS 'Teacher who recorded this attendance (optional for legacy rows).';
