-- Compact receipt numbers (Option B): {school_code}{YYYYMMDD}{term * 10000 + seq}
-- Example: RIP2026040410001 = school RIP, date 2026-04-04, term 1, sequence 1 → 1*10000+1 = 10001
-- No RCT-, no dashes, no literal T. Sequence still advances via receipt_sequences_per_term per (school, year, term).

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
  v_date_part TEXT;
  v_suffix INT;
BEGIN
  SELECT UPPER(TRIM(s.school_code)) INTO v_school_code
  FROM public.schools s
  WHERE s.school_id = p_school_id;

  IF v_school_code IS NULL OR v_school_code = '' THEN
    v_school_code := UPPER(SUBSTRING(REPLACE(p_school_id::TEXT, '-', '') FROM 1 FOR 4));
  END IF;

  v_date_part := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');

  SELECT st.year, st.term INTO v_year, v_term
  FROM public.school_terms st
  WHERE st.id = p_term_id AND st.school_id = p_school_id;

  IF v_year IS NULL OR v_term IS NULL THEN
    v_year := EXTRACT(YEAR FROM CURRENT_DATE)::INT;
    v_term := 1;
  END IF;

  INSERT INTO public.receipt_sequences_per_term (school_id, academic_year, term, last_number)
  VALUES (p_school_id, v_year, v_term, 1)
  ON CONFLICT (school_id, academic_year, term)
  DO UPDATE SET last_number = public.receipt_sequences_per_term.last_number + 1
  RETURNING last_number INTO v_next;

  IF v_next > 9999 THEN
    RAISE EXCEPTION 'Receipt sequence for this school term exceeded 9999';
  END IF;

  v_suffix := v_term * 10000 + v_next;

  RETURN v_school_code || v_date_part || v_suffix::TEXT;
END;
$$;

COMMENT ON FUNCTION public.get_next_receipt_number(UUID, UUID) IS
  'Next receipt: {school_code}{YYYYMMDD}{term*10000+seq}, e.g. RIP2026040410001 (term 1 seq 1). Seq 1..9999 per term.';
