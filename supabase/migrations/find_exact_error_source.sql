-- Find the exact function causing the ambiguous class_name error
-- Check all functions that have a parameter or variable named class_name
-- AND also query tables with class_name column

SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_functiondef(p.oid) as full_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND (
    -- Function has parameter named class_name
    pg_get_function_arguments(p.oid) LIKE '%class_name%'
    OR
    -- Function definition mentions class_name as a variable
    (pg_get_functiondef(p.oid) LIKE '%class_name%' 
     AND pg_get_functiondef(p.oid) LIKE '%DECLARE%'
     AND pg_get_functiondef(p.oid) LIKE '%class_name%TEXT%')
)
AND (
    -- And it queries tables with class_name column
    pg_get_functiondef(p.oid) LIKE '%class_subjects%'
    OR pg_get_functiondef(p.oid) LIKE '%classes%'
    OR pg_get_functiondef(p.oid) LIKE '%exam_results%'
    OR pg_get_functiondef(p.oid) LIKE '%teacher_class_subjects%'
)
ORDER BY p.proname;




