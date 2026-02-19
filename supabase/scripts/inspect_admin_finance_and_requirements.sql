-- ============================================================================
-- Run in Supabase SQL Editor and paste the results back.
-- This inspects: Financial Settings (school_fee_structure), School Requirements,
-- get_fee_structure_status, classes, and how they relate.
-- ============================================================================

-- 1. school_fee_structure: columns and row count
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'school_fee_structure'
ORDER BY ordinal_position;

-- 2. school_fee_structure: unique constraint (for upsert onConflict)
SELECT tc.constraint_name, kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
WHERE tc.table_schema = 'public' AND tc.table_name = 'school_fee_structure'
  AND tc.constraint_type IN ('UNIQUE', 'PRIMARY KEY')
ORDER BY tc.constraint_name, kcu.ordinal_position;

-- 3. school_requirements: does table exist? columns if yes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'school_requirements'
ORDER BY ordinal_position;

-- 4. If school_requirements exists: primary key / unique
SELECT tc.constraint_name, tc.constraint_type, kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
WHERE tc.table_schema = 'public' AND tc.table_name = 'school_requirements'
ORDER BY tc.constraint_type, kcu.ordinal_position;

-- 5. classes: columns (for get_fee_structure_status join)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'classes'
ORDER BY ordinal_position;

-- 6. Sample: school_fee_structure (one school, first 15 rows)
SELECT id, school_id, class_name, tuition_amount, boarding_tuition_amount, boarding_accommodation_fee, boarding_meals_fee, created_at
FROM public.school_fee_structure
ORDER BY school_id, class_name
LIMIT 15;

-- 7. Sample: school_requirements (run only if query 3 returned rows)
SELECT * FROM public.school_requirements LIMIT 5;

-- 8. Check if get_fee_structure_status exists and run for first school
SELECT proname, proargnames FROM pg_proc WHERE proname = 'get_fee_structure_status';

-- 9. RPC result for first school (replace with your school_id if you prefer)
SELECT public.get_fee_structure_status((SELECT school_id FROM public.schools LIMIT 1)) AS fee_status;

-- 10. student_balances: columns (for sync API compatibility)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'student_balances'
ORDER BY ordinal_position;
