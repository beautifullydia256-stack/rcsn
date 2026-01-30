-- Check if any trigger function has a variable named class_name (not p_class_name)
-- that conflicts with a table column

SELECT 
    t.tgname as trigger_name,
    c.relname as table_name,
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
AND c.relname IN ('class_subjects', 'classes', 'schools')
AND NOT t.tgisinternal
AND (
    pg_get_functiondef(p.oid) LIKE '%DECLARE%'
    AND pg_get_functiondef(p.oid) LIKE '%class_name%TEXT%'
    AND pg_get_functiondef(p.oid) NOT LIKE '%p_class_name%'
    AND pg_get_functiondef(p.oid) NOT LIKE '%v_class_name%'
);




