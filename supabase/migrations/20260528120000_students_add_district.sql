-- Align with DesignStudentProfile / extended student fields (mirror teachers.district).

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS district TEXT;

COMMENT ON COLUMN public.students.district IS
  'District or locality (optional); profile UI may mirror the same value into city.';
