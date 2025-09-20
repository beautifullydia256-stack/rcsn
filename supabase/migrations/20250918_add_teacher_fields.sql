-- Extend teachers table to support full teacher profile
-- Run this in Supabase SQL editor or via migrations

-- Sequence for employee IDs
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'teacher_emp_seq') THEN
    CREATE SEQUENCE teacher_emp_seq START 1;
  END IF;
END$$;

ALTER TABLE teachers
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('Male','Female','Other')),
  ADD COLUMN IF NOT EXISTS dob DATE,
  ADD COLUMN IF NOT EXISTS national_id TEXT,
  ADD COLUMN IF NOT EXISTS employee_id TEXT UNIQUE DEFAULT (
    'EMP-' || to_char(NOW(), 'YYYYMMDD') || '-' || lpad(nextval('teacher_emp_seq')::text, 4, '0')
  ),
  ADD COLUMN IF NOT EXISTS date_of_hire DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS subjects TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS classes TEXT[] DEFAULT '{}';

-- Helpful index
CREATE INDEX IF NOT EXISTS idx_teachers_employee_id ON teachers(employee_id);


