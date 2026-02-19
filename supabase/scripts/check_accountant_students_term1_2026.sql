-- Run this in Supabase SQL Editor to verify students visible for billing (e.g. Term 1 2026).
-- Same logic as Billing page: non-graduated students for a school that has an accountant and Term 1 2026.

-- 1) Pick a school that has an accountant and has Term 1 2026
WITH school_with_accountant AS (
  SELECT u.school_id
  FROM public.users u
  WHERE u.role = 'accountant'
    AND u.school_id IS NOT NULL
  LIMIT 1
),
term1_2026 AS (
  SELECT id AS term_id
  FROM public.school_terms
  WHERE school_id = (SELECT school_id FROM school_with_accountant)
    AND term = 1
    AND year = 2026
  LIMIT 1
)
-- 2) Students that Billing would show (non-graduated for that school)
SELECT
  s.student_id,
  s.name,
  s.current_class,
  s.status,
  (SELECT term_id FROM term1_2026) AS term_1_2026_id
FROM public.students s
WHERE s.school_id = (SELECT school_id FROM school_with_accountant)
  AND s.status IS DISTINCT FROM 'graduated'
ORDER BY s.name;

-- Optional: row count
-- SELECT COUNT(*) AS student_count
-- FROM public.students s
-- WHERE s.school_id = (SELECT school_id FROM public.users WHERE role = 'accountant' AND school_id IS NOT NULL LIMIT 1)
--   AND s.status IS DISTINCT FROM 'graduated';
