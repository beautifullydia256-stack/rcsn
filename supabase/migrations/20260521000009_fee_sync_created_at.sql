-- Add created_at to get_students_with_balances so the fee-sync page
-- can filter students by enrolment date (today / this week / this month).
-- Applied live on 2026-05-21.

CREATE OR REPLACE FUNCTION public.get_students_with_balances(p_school_id uuid)
RETURNS TABLE(
  student_id       uuid,
  name             text,
  current_class    text,
  boarding_type    text,
  admission_number text,
  total_billed     numeric,
  total_paid       numeric,
  balance          numeric,
  created_at       timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    s.student_id,
    COALESCE(s.name, '')                     AS name,
    COALESCE(s.current_class, '')            AS current_class,
    COALESCE(s.boarding_type, 'Day Scholar') AS boarding_type,
    COALESCE(s.admission_number, '')         AS admission_number,
    COALESCE(SUM(sb.total_fees), 0)::numeric AS total_billed,
    COALESCE(SUM(sb.total_paid), 0)::numeric AS total_paid,
    COALESCE(SUM(GREATEST(sb.balance, 0)), 0)::numeric AS balance,
    s.created_at
  FROM public.students s
  JOIN public.student_balances sb
    ON sb.student_id = s.student_id
   AND sb.school_id  = p_school_id
   AND sb.total_fees > 0
  WHERE s.school_id = p_school_id
    AND s.status = 'active'
  GROUP BY s.student_id, s.name, s.current_class, s.boarding_type, s.admission_number, s.created_at
  ORDER BY s.name;
$$;

GRANT EXECUTE ON FUNCTION public.get_students_with_balances(uuid) TO authenticated;
