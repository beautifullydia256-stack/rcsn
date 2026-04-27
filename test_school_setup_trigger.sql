-- Test if the school setup trigger is working properly
-- First, let's check if the trigger exists and is enabled
SELECT 
  t.tgname as trigger_name,
  t.tgenabled as enabled,
  p.proname as function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'schools' 
  AND t.tgname = 'trigger_setup_new_school_defaults';

-- Check if there are any subjects for a specific school
-- Replace 'SCHOOL_ID_HERE' with the actual school ID that was just created
-- SELECT school_id, name FROM subjects WHERE school_id = 'SCHOOL_ID_HERE';

-- Check if there are any classes for a specific school  
-- SELECT school_id, class_name FROM classes WHERE school_id = 'SCHOOL_ID_HERE';