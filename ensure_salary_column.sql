-- Ensure salary column exists in teachers table
ALTER TABLE public.teachers 
ADD COLUMN IF NOT EXISTS salary NUMERIC;

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'teachers' 
AND table_schema = 'public'
AND column_name = 'salary';
