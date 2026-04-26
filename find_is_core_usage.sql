-- Find which functions reference the non-existent is_core column
SELECT 
  p.proname as function_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND pg_get_functiondef(p.oid) ILIKE '%is_core%';