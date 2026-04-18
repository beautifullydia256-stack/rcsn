-- Teacher exam-set picker: return only rows that are active for input AND match the
-- resolved calendar term for p_today (same engine as finance / exam entry guard).
-- Stops stale front-end bundles from listing past-term sets.

CREATE OR REPLACE FUNCTION public.exam_sets_open_for_teacher_entry(
  p_school_id uuid,
  p_today date DEFAULT CURRENT_DATE
)
RETURNS SETOF public.exam_sets
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT es.*
  FROM public.exam_sets es
  WHERE es.school_id = p_school_id
    AND EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.user_id = (SELECT auth.uid())
        AND u.school_id IS NOT NULL
        AND u.school_id = p_school_id
    )
    AND COALESCE(es.is_active, false)
    AND COALESCE(es.active_for_input, false)
    AND EXISTS (
      SELECT 1
      FROM public.school_terms st
      WHERE st.id = public.resolve_current_school_term_id(p_school_id, p_today)
        AND st.school_id = p_school_id
        AND st.year IS NOT DISTINCT FROM es.year
        AND st.term IS NOT DISTINCT FROM es.term
    );
$$;

COMMENT ON FUNCTION public.exam_sets_open_for_teacher_entry(uuid, date) IS
  'Authenticated user''s school only: exam sets open for entry whose (year, term) matches resolve_current_school_term_id for p_today.';

GRANT EXECUTE ON FUNCTION public.exam_sets_open_for_teacher_entry(uuid, date) TO authenticated;

SELECT pg_notify('pgrst', 'reload schema');
