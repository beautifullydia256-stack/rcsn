-- Fix employment_date error by removing problematic triggers and functions

-- 1. Drop any triggers that might be causing the employment_date error
DROP TRIGGER IF EXISTS set_teacher_defaults_and_linking ON teachers;
DROP TRIGGER IF EXISTS update_teachers_updated_at ON teachers;
DROP TRIGGER IF EXISTS teachers_employment_date_trigger ON teachers;
DROP TRIGGER IF EXISTS auto_generate_employee_id ON teachers;

-- 2. Drop any functions that might reference employment_date
DROP FUNCTION IF EXISTS set_teacher_defaults_and_linking() CASCADE;
DROP FUNCTION IF EXISTS update_teachers_updated_at() CASCADE;

-- 3. Check for any remaining functions that reference employment_date
-- (This is just for reference - you can run this to see what exists)
SELECT 
    routine_name, 
    routine_definition 
FROM information_schema.routines 
WHERE routine_definition ILIKE '%employment_date%';

-- 4. Recreate the employee ID trigger (this will be done in the main script)
-- The auto_generate_employee_id trigger will be recreated in the main employee ID system
