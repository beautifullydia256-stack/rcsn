-- Globally distinct human-readable invoice numbers (aligned with get_next_receipt_number):
-- INV-{school_code}-{year}-{6-digit seq}  e.g. INV-KLA-2026-000015
-- Sequence table stays per (school_id, year); prefixes differ by school so two schools never share the same string.
-- Rows created before this migration keep their old format (e.g. INV-2026-000004).

CREATE OR REPLACE FUNCTION public.get_next_invoice_number(p_school_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school_code text;
  v_year int := EXTRACT(YEAR FROM CURRENT_DATE)::INT;
  v_next int;
BEGIN
  SELECT upper(trim(s.school_code)) INTO v_school_code
  FROM public.schools s
  WHERE s.school_id = p_school_id;

  IF v_school_code IS NULL OR v_school_code = '' THEN
    v_school_code := upper(substring(replace(p_school_id::text, '-', '') FROM 1 FOR 4));
  END IF;

  INSERT INTO public.invoice_sequences (school_id, year, last_number)
  VALUES (p_school_id, v_year, 1)
  ON CONFLICT (school_id, year)
  DO UPDATE SET last_number = public.invoice_sequences.last_number + 1
  RETURNING last_number INTO v_next;

  RETURN 'INV-' || v_school_code || '-' || v_year || '-' || lpad(v_next::text, 6, '0');
END;
$$;

COMMENT ON FUNCTION public.get_next_invoice_number(uuid) IS
  'INV-{school_code}-{year}-{seq}; unique across schools when each school has a distinct school_code (fallback: first 4 hex chars of school_id).';

GRANT EXECUTE ON FUNCTION public.get_next_invoice_number(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_invoice_number(uuid) TO service_role;
