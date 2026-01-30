-- Get the exact definition of set_class_subject_defaults_and_linking
SELECT pg_get_functiondef(p.oid) 
FROM pg_proc p 
JOIN pg_namespace n ON p.pronamespace = n.oid 
WHERE n.nspname = 'public' 
AND p.proname = 'set_class_subject_defaults_and_linking';




