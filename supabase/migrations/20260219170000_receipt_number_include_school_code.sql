-- ============================================================================
-- Make receipt numbers globally unique: include school code so no two schools
-- can have the same number (e.g. RCT-KLA-2026-T1-0003 vs RCT-RAK-2026-T1-0003).
-- Format: RCT-{SchoolCode}-{Year}-T{Term}-{Seq}
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_next_receipt_number(
  p_school_id UUID,
  p_term_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school_code TEXT;
  v_year INT;
  v_term INT;
  v_next INT;
  v_term_code TEXT;
BEGIN
  -- School code for global uniqueness (e.g. KLA, RAK); fallback to short UUID prefix if null
  SELECT UPPER(TRIM(s.school_code)) INTO v_school_code
  FROM public.schools s
  WHERE s.school_id = p_school_id;

  IF v_school_code IS NULL OR v_school_code = '' THEN
    v_school_code := UPPER(SUBSTRING(REPLACE(p_school_id::TEXT, '-', '') FROM 1 FOR 4));
  END IF;

  -- Resolve academic year and term (1,2,3) from term_id
  SELECT st.year, st.term INTO v_year, v_term
  FROM public.school_terms st
  WHERE st.id = p_term_id AND st.school_id = p_school_id;

  IF v_year IS NULL OR v_term IS NULL THEN
    v_year := EXTRACT(YEAR FROM CURRENT_DATE)::INT;
    v_term := 1;
  END IF;

  v_term_code := 'T' || v_term;

  INSERT INTO public.receipt_sequences_per_term (school_id, academic_year, term, last_number)
  VALUES (p_school_id, v_year, v_term, 1)
  ON CONFLICT (school_id, academic_year, term)
  DO UPDATE SET last_number = public.receipt_sequences_per_term.last_number + 1
  RETURNING last_number INTO v_next;

  -- RCT-{SchoolCode}-{Year}-T{Term}-{Seq} → globally unique
  RETURN 'RCT-' || v_school_code || '-' || v_year || '-' || v_term_code || '-' || LPAD(v_next::TEXT, 4, '0');
END;
$$;

COMMENT ON FUNCTION public.get_next_receipt_number(UUID, UUID) IS
  'Returns next receipt number: RCT-{school_code}-{year}-T{term}-{seq}. Unique across all schools.';
