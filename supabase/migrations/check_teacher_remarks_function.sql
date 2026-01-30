-- Check the setup_default_teacher_remarks_for_school function definition
SELECT pg_get_functiondef(p.oid) 
FROM pg_proc p 
JOIN pg_namespace n ON p.pronamespace = n.oid 
WHERE n.nspname = 'public' 
AND p.proname = 'setup_default_teacher_remarks_for_school';




