-- Final fix for salary column in teachers table
-- Run this in Supabase SQL Editor

-- Ensure salary column exists
ALTER TABLE public.teachers 
ADD COLUMN IF NOT EXISTS salary NUMERIC;

-- Create index for better performance if needed
CREATE INDEX IF NOT EXISTS idx_teachers_salary ON public.teachers(salary) WHERE salary IS NOT NULL;

-- Verify the column was added successfully
SELECT 
  'salary' as column_name,
  'NUMERIC' as data_type,
  'YES' as is_nullable
FROM information_schema.columns 
WHERE table_name = 'teachers' 
AND table_schema = 'public'
AND column_name = 'salary';
