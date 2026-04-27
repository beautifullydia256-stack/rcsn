-- SECURITY VERIFICATION QUERIES
-- Run these queries after executing the security fix to verify the changes

-- =============================================================================
-- 1. Check for remaining SECURITY DEFINER functions accessible to anon
-- =============================================================================
SELECT 
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    CASE WHEN has_function_privilege('anon', p.oid, 'EXECUTE') 
         THEN 'ACCESSIBLE' 
         ELSE 'RESTRICTED' 
    END as anon_access
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prosecdef = true  -- SECURITY DEFINER functions only
  AND has_function_privilege('anon', p.oid, 'EXECUTE')
ORDER BY p.proname;

-- =============================================================================
-- 2. Check for SECURITY DEFINER functions accessible to authenticated
-- =============================================================================
SELECT 
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    CASE WHEN has_function_privilege('authenticated', p.oid, 'EXECUTE') 
         THEN 'ACCESSIBLE' 
         ELSE 'RESTRICTED' 
    END as authenticated_access
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prosecdef = true  -- SECURITY DEFINER functions only
  AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
ORDER BY p.proname;

-- =============================================================================
-- 3. Summary of all SECURITY DEFINER functions and their access
-- =============================================================================
SELECT 
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    CASE WHEN has_function_privilege('anon', p.oid, 'EXECUTE') 
         THEN 'YES' 
         ELSE 'NO' 
    END as anon_can_execute,
    CASE WHEN has_function_privilege('authenticated', p.oid, 'EXECUTE') 
         THEN 'YES' 
         ELSE 'NO' 
    END as authenticated_can_execute,
    array_to_string(
        ARRAY(
            SELECT r.rolname 
            FROM pg_authid r 
            WHERE has_function_privilege(r.rolname, p.oid, 'EXECUTE')
            AND r.rolname NOT IN ('postgres', 'anon', 'authenticated')
        ), 
        ', '
    ) as other_roles_with_access
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prosecdef = true  -- SECURITY DEFINER functions only
ORDER BY p.proname;

-- =============================================================================
-- 4. Count of functions by access level
-- =============================================================================
SELECT 
    'Total SECURITY DEFINER functions' as category,
    COUNT(*) as count
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.prosecdef = true

UNION ALL

SELECT 
    'Accessible to anon' as category,
    COUNT(*) as count
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.prosecdef = true
  AND has_function_privilege('anon', p.oid, 'EXECUTE')

UNION ALL

SELECT 
    'Accessible to authenticated' as category,
    COUNT(*) as count
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.prosecdef = true
  AND has_function_privilege('authenticated', p.oid, 'EXECUTE');

-- =============================================================================
-- 5. Check specific high-risk functions (should all be RESTRICTED)
-- =============================================================================
SELECT 
    function_name,
    CASE WHEN has_function_privilege('anon', function_name, 'EXECUTE') 
         THEN '⚠️  VULNERABLE' 
         ELSE '✅ SECURE' 
    END as anon_status,
    CASE WHEN has_function_privilege('authenticated', function_name, 'EXECUTE') 
         THEN '⚠️  ACCESSIBLE' 
         ELSE '✅ RESTRICTED' 
    END as authenticated_status
FROM (VALUES 
    ('public.get_owner_dashboard_metrics()'),
    ('public.get_audit_logs(integer,integer,uuid,text,text,timestamp with time zone,timestamp with time zone)'),
    ('public.admin_add_discipline_action(uuid,text,text,date,date)'),
    ('public.find_parents_by_phone_last9(text)'),
    ('public.register_school_admin_final(uuid,text,text,text,text,text,text)'),
    ('public.get_database_size()'),
    ('public.is_current_user_owner()')
) AS t(function_name);

-- =============================================================================
-- 6. Expected Results After Fix
-- =============================================================================
/*
EXPECTED RESULTS:

Query 1 (anon access): Should return 0 rows or only safe functions
Query 2 (authenticated access): Should return only functions that authenticated users legitimately need
Query 4 (counts): 
  - Total SECURITY DEFINER functions: ~80+
  - Accessible to anon: 0 (or very few safe ones)
  - Accessible to authenticated: Only necessary functions

Query 5 (high-risk functions): All should show "✅ SECURE" for anon and "✅ RESTRICTED" for authenticated

If any queries show unexpected results, review the security fix implementation.
*/