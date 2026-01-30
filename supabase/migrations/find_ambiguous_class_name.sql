-- Find all functions, views, and triggers that might have ambiguous class_name references
-- Check for queries that join tables with class_name without qualifying the column

-- 1. Check all views that reference class_name
SELECT 
    'VIEW' as object_type,
    schemaname,
    viewname as object_name,
    definition
FROM pg_views
WHERE schemaname = 'public'
AND definition LIKE '%class_name%'
AND (definition LIKE '%JOIN%' OR definition LIKE '%join%')
ORDER BY viewname;

-- 2. Check all functions that might have ambiguous class_name
SELECT 
    'FUNCTION' as object_type,
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND pg_get_functiondef(p.oid) LIKE '%class_name%'
AND (pg_get_functiondef(p.oid) LIKE '%JOIN%' OR pg_get_functiondef(p.oid) LIKE '%join%')
ORDER BY p.proname;




