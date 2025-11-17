-- Fix salary column issue in teachers table
-- This ensures the salary column exists and is properly recognized

-- Add salary column if it doesn't exist
ALTER TABLE public.teachers 
ADD COLUMN IF NOT EXISTS salary NUMERIC;

-- Verify the column exists
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'teachers' 
AND table_schema = 'public'
AND column_name = 'salary';
