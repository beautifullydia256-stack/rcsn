-- ============================================================================
-- READ-ONLY: Verify schema for Record Payment (run in Supabase SQL Editor)
-- Does NOT change any data. Run this first before applying any fix.
-- ============================================================================

-- 1. Columns on public.students (check if class_id or only current_class exists)
SELECT '1. public.students columns' AS section;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'students'
ORDER BY ordinal_position;

-- 2. Columns on public.student_payments (what the frontend must send)
SELECT '2. public.student_payments columns' AS section;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'student_payments'
ORDER BY ordinal_position;

-- 3. Columns on public.student_balances (what the trigger updates)
SELECT '3. public.student_balances columns' AS section;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'student_balances'
ORDER BY ordinal_position;

-- 4. Current definition of update_student_balance() trigger function
--    (if it uses s.class_id but students has no class_id → that causes the error)
SELECT '4. update_student_balance function source' AS section;
SELECT pg_get_functiondef(oid) AS function_definition
FROM pg_proc
WHERE proname = 'update_student_balance';
