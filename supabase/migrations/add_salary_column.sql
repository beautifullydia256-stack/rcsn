-- Add salary column to teachers table
ALTER TABLE teachers
  ADD COLUMN IF NOT EXISTS salary NUMERIC;
