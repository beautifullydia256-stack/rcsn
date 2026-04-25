-- Check the structure of student_photos table

-- Step 1: Check what columns exist in student_photos table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'student_photos' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 2: Check sample data to see what's in the table
SELECT *
FROM student_photos
LIMIT 5;