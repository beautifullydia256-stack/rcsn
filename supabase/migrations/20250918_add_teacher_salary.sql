-- Add salary column to teachers
ALTER TABLE teachers
  ADD COLUMN IF NOT EXISTS salary NUMERIC;

-- Optional index if you plan to query by salary ranges
-- CREATE INDEX IF NOT EXISTS idx_teachers_salary ON teachers(salary);


