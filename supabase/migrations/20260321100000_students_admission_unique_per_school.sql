-- Admission numbers must be unique per school, not globally.
-- The old index on lower(admission_number) alone caused 409 Conflict when two
-- schools generated the same admission string (multi-tenant collision).

DROP INDEX IF EXISTS public.students_admission_number_key;

CREATE UNIQUE INDEX IF NOT EXISTS students_school_admission_number_key
  ON public.students (school_id, lower(trim(admission_number)))
  WHERE admission_number IS NOT NULL AND trim(admission_number) <> '';

COMMENT ON INDEX public.students_school_admission_number_key IS
  'Unique admission number within each school (case-insensitive).';
