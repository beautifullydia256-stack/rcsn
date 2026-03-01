-- =============================================================================
-- Run this in Supabase Dashboard → SQL Editor (one block at a time or all)
-- Copy the results and share them so we can pinpoint the 500 / FUNCTION_INVOCATION_FAILED
-- =============================================================================

-- 1) Check if insert_user_with_school exists and its signature
SELECT 
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid) AS returns
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' 
  AND p.proname = 'insert_user_with_school';

-- 2) All triggers on public.users (these run on INSERT/UPDATE and can cause 500)
SELECT 
  t.tgname AS trigger_name,
  CASE t.tgtype::integer & 2 WHEN 2 THEN 'BEFORE' ELSE 'AFTER' END AS timing,
  CASE t.tgtype::integer & 28
    WHEN 4 THEN 'INSERT'
    WHEN 8 THEN 'DELETE'
    WHEN 16 THEN 'UPDATE'
  END AS event,
  p.proname AS function_name
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE c.relname = 'users' 
  AND n.nspname = 'public'
  AND NOT t.tgisinternal;

-- 3) public.users columns: names, types, nullable (NOT NULL columns must be provided)
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY ordinal_position;

-- 4) Check constraints on public.users (e.g. role check, unique email)
SELECT 
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.check_constraints cc 
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public' 
  AND tc.table_name = 'users';

-- 5) Test: try a direct INSERT (will use a dummy UUID – run only if you want to see the exact DB error)
-- Uncomment and run separately to see what error Supabase returns:
/*
INSERT INTO public.users (
  user_id,
  email,
  name,
  role,
  school_id
) VALUES (
  gen_random_uuid(),
  'test-create-staff-' || floor(random()*10000)::text || '@test.sch',
  'Test User',
  'teacher',
  (SELECT school_id FROM public.schools LIMIT 1)
);
-- Then delete the test row:
-- DELETE FROM public.users WHERE email LIKE 'test-create-staff-%@test.sch';
*/
