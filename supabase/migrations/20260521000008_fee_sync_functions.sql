-- Fix StudentFeeSyncPage errors.
-- Applied live on 2026-05-21.
--
-- 1. resolve_current_school_term_id was revoked from authenticated in
--    20260427080519. The admin fee-sync page needs it — grant it back.
--
-- 2. get_students_with_balances did not exist. Created here.

-- ─── 1. Re-grant resolve_current_school_term_id to authenticated ─────────────
GRANT EXECUTE ON FUNCTION public.resolve_current_school_term_id(uuid, date) TO authenticated;

-- ─── 2. get_students_with_balances ───────────────────────────────────────────
-- Returns active students who have at least one balance row with total_fees > 0,
-- with their aggregated totals across all terms.
CREATE OR REPLACE FUNCTION public.get_students_with_balances(p_school_id uuid)
RETURNS TABLE(
  student_id      uuid,
  name            text,
  current_class   text,
  boarding_type   text,
  admission_number text,
  total_billed    numeric,
  total_paid      numeric,
  balance         numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    s.student_id,
    COALESCE(s.name, '')             AS name,
    COALESCE(s.current_class, '')    AS current_class,
    COALESCE(s.boarding_type, 'Day Scholar') AS boarding_type,
    COALESCE(s.admission_number, '') AS admission_number,
    COALESCE(SUM(sb.total_fees), 0)::numeric AS total_billed,
    COALESCE(SUM(sb.total_paid), 0)::numeric AS total_paid,
    COALESCE(SUM(GREATEST(sb.balance, 0)), 0)::numeric AS balance
  FROM public.students s
  JOIN public.student_balances sb
    ON sb.student_id = s.student_id
   AND sb.school_id  = p_school_id
   AND sb.total_fees > 0
  WHERE s.school_id = p_school_id
    AND s.status = 'active'
  GROUP BY s.student_id, s.name, s.current_class, s.boarding_type, s.admission_number
  ORDER BY s.name;
$$;

GRANT EXECUTE ON FUNCTION public.get_students_with_balances(uuid) TO authenticated;
