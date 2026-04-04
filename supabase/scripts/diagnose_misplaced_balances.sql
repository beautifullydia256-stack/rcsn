-- ============================================================================
-- READ diagnostics: “Current term” vs balances on future (unstarted) terms
-- Run in Supabase SQL Editor after migrations (needs resolve_current_school_term_id).
--
-- Quick: find Mulungi High School id
--   SELECT school_id, name FROM public.schools WHERE name ILIKE '%Mulungi%';
-- ============================================================================

-- A) Per school: calendar current term vs all terms (see dates)
SELECT
  s.school_id,
  s.name AS school_name,
  st.id AS term_id,
  st.year,
  st.term,
  st.start_date,
  st.end_date,
  CASE
    WHEN st.id = public.resolve_current_school_term_id(s.school_id, CURRENT_DATE) THEN 'CURRENT'
    WHEN st.start_date IS NOT NULL AND st.start_date > CURRENT_DATE THEN 'FUTURE'
    WHEN st.end_date IS NOT NULL AND st.end_date < CURRENT_DATE THEN 'PAST'
    ELSE 'OTHER'
  END AS term_bucket
FROM public.schools s
JOIN public.school_terms st ON st.school_id = s.school_id
ORDER BY s.name, st.year, st.term;

-- B) Rows that this repair moves: positive activity on a FUTURE term
SELECT
  s.name AS school_name,
  sb.student_id,
  stu.name AS student_name,
  st.year,
  st.term,
  st.start_date,
  COALESCE(sb.total_fees, 0) AS total_fees,
  COALESCE(sb.total_paid, 0) AS total_paid,
  COALESCE(sb.balance, sb.total_fees - sb.total_paid, 0) AS balance
FROM public.student_balances sb
JOIN public.school_terms st ON st.id = sb.term_id
JOIN public.schools s ON s.school_id = sb.school_id
LEFT JOIN public.students stu ON stu.student_id = sb.student_id
WHERE st.start_date IS NOT NULL
  AND st.start_date > CURRENT_DATE
  AND (
    COALESCE(sb.total_fees, 0) > 0
    OR COALESCE(sb.total_paid, 0) > 0
    OR COALESCE(sb.balance, 0) > 0
  )
ORDER BY s.name, st.year, st.term, stu.name;

-- C) KPI sanity: outstanding on CURRENT term vs sum on future terms (one row per school)
SELECT
  s.school_id,
  s.name,
  public.resolve_current_school_term_id(s.school_id, CURRENT_DATE) AS current_term_id,
  COALESCE((
    SELECT SUM(GREATEST(COALESCE(sb.balance, sb.total_fees - sb.total_paid, 0), 0))
    FROM public.student_balances sb
    WHERE sb.school_id = s.school_id
      AND sb.term_id = public.resolve_current_school_term_id(s.school_id, CURRENT_DATE)
  ), 0) AS outstanding_on_current_term,
  COALESCE((
    SELECT SUM(GREATEST(COALESCE(sb.balance, sb.total_fees - sb.total_paid, 0), 0))
    FROM public.student_balances sb
    JOIN public.school_terms st ON st.id = sb.term_id
    WHERE sb.school_id = s.school_id
      AND st.start_date IS NOT NULL
      AND st.start_date > CURRENT_DATE
  ), 0) AS outstanding_on_future_terms
FROM public.schools s
ORDER BY s.name;

-- ============================================================================
-- FIX (run only after reviewing A–C). All schools:
--   SELECT * FROM public.repair_misplaced_opening_balances_to_current_term(NULL);
-- One school (paste UUID from query A):
--   SELECT * FROM public.repair_misplaced_opening_balances_to_current_term('<school_id>'::uuid);
-- ============================================================================
