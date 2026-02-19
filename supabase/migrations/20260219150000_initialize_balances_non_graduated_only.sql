-- ============================================================================
-- Include all non-graduated students when initializing balances for a term
-- ============================================================================
-- Before: only status = 'active' got a balance row → promoted/inactive students
--        never got a balance for the new term, so they didn't show on Outstanding.
-- After:  all students with status IS DISTINCT FROM 'graduated' get a balance
--        for the term (so promoted students show on Outstanding for current term).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.initialize_student_balances_for_term(
    p_school_id UUID,
    p_term_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_year INTEGER;
    v_term INTEGER;
BEGIN
    SELECT st.year, st.term INTO v_year, v_term
    FROM public.school_terms st
    WHERE st.id = p_term_id;

    IF v_year IS NULL OR v_term IS NULL THEN
        RAISE EXCEPTION 'Term with id % does not exist', p_term_id;
    END IF;

    -- All non-graduated students (active, inactive, promoted) get a balance for this term
    INSERT INTO public.student_balances (
        student_id,
        school_id,
        term_id,
        year,
        term,
        total_fees,
        total_paid
    )
    SELECT
        s.student_id,
        s.school_id,
        p_term_id,
        v_year,
        v_term,
        COALESCE(s.expected_fee_amount, 0),
        0
    FROM public.students s
    WHERE s.school_id = p_school_id
      AND (s.status IS NULL OR s.status IS DISTINCT FROM 'graduated')
      AND NOT EXISTS (
          SELECT 1 FROM public.student_balances sb
          WHERE sb.student_id = s.student_id
            AND sb.term_id = p_term_id
      )
    ON CONFLICT (student_id, term_id) DO NOTHING;
END;
$$;

COMMENT ON FUNCTION public.initialize_student_balances_for_term(UUID, UUID) IS
  'Initializes student_balances for a term for all non-graduated students. Call for current term after rollover to backfill promoted students (e.g. SELECT initialize_student_balances_for_term(school_id, term_id)).';
