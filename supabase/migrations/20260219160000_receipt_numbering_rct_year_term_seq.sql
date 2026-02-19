-- ============================================================================
-- Professional receipt numbering: RCT-{AcademicYear}-T{Term}-{SequenceNumber}
-- Sequence resets per term; 4-digit zero-padded; unique per term.
-- ============================================================================

-- 1. Per-term receipt sequence (sequence resets at start of each term)
CREATE TABLE IF NOT EXISTS public.receipt_sequences_per_term (
  school_id UUID NOT NULL REFERENCES public.schools(school_id) ON DELETE CASCADE,
  academic_year INTEGER NOT NULL,
  term INTEGER NOT NULL CHECK (term IN (1, 2, 3)),
  last_number INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (school_id, academic_year, term)
);

COMMENT ON TABLE public.receipt_sequences_per_term IS 'Per-school, per-term receipt sequence. Sequence resets each term. Used for RCT-YYYY-Tn-NNNN.';

ALTER TABLE public.receipt_sequences_per_term ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "receipt_sequences_per_term_school_users" ON public.receipt_sequences_per_term;
CREATE POLICY "receipt_sequences_per_term_school_users"
  ON public.receipt_sequences_per_term FOR ALL TO authenticated
  USING (school_id IN (SELECT school_id FROM public.users WHERE user_id = auth.uid()))
  WITH CHECK (school_id IN (SELECT school_id FROM public.users WHERE user_id = auth.uid()));

-- 2. Generate next receipt number: RCT-2026-T1-0003 (term from school_terms)
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
  v_year INT;
  v_term INT;
  v_next INT;
  v_term_code TEXT;
BEGIN
  -- Resolve academic year and term (1,2,3) from term_id
  SELECT st.year, st.term INTO v_year, v_term
  FROM public.school_terms st
  WHERE st.id = p_term_id AND st.school_id = p_school_id;

  IF v_year IS NULL OR v_term IS NULL THEN
    v_year := EXTRACT(YEAR FROM CURRENT_DATE)::INT;
    v_term := 1;
  END IF;

  v_term_code := 'T' || v_term;  -- T1, T2, T3

  INSERT INTO public.receipt_sequences_per_term (school_id, academic_year, term, last_number)
  VALUES (p_school_id, v_year, v_term, 1)
  ON CONFLICT (school_id, academic_year, term)
  DO UPDATE SET last_number = public.receipt_sequences_per_term.last_number + 1
  RETURNING last_number INTO v_next;

  RETURN 'RCT-' || v_year || '-' || v_term_code || '-' || LPAD(v_next::TEXT, 4, '0');
END;
$$;

COMMENT ON FUNCTION public.get_next_receipt_number(UUID, UUID) IS
  'Returns next receipt number for school and term: RCT-{year}-T{term}-{seq}. Sequence resets per term.';

GRANT EXECUTE ON FUNCTION public.get_next_receipt_number(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_receipt_number(UUID, UUID) TO service_role;
