-- Generate sequential expense reference numbers.
-- Format: CAT/YYYYMM/NNN  e.g. SAL/202605/001, EXP/202605/002
-- Applied live on 2026-05-21.
--
-- Function was missing from the database; RecordExpenseModal called it via RPC
-- but it never existed, causing reference_number to always be null.

CREATE OR REPLACE FUNCTION public.generate_expense_reference(
  p_school_id    uuid,
  p_expense_date text,
  p_category_name text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_year  text;
  v_month text;
  v_seq   int;
  v_cat   text;
BEGIN
  v_year  := substr(p_expense_date, 1, 4);
  v_month := substr(p_expense_date, 6, 2);

  SELECT COALESCE(COUNT(*), 0) + 1 INTO v_seq
  FROM public.school_expenses
  WHERE school_id = p_school_id
    AND to_char(expense_date, 'YYYY-MM') = v_year || '-' || v_month;

  IF p_category_name IS NOT NULL AND trim(p_category_name) <> '' THEN
    v_cat := upper(substr(regexp_replace(trim(p_category_name), '[^a-zA-Z]', '', 'g'), 1, 3));
    IF length(v_cat) = 0 THEN v_cat := 'EXP'; END IF;
  ELSE
    v_cat := 'EXP';
  END IF;

  RETURN v_cat || '/' || v_year || v_month || '/' || lpad(v_seq::text, 3, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_expense_reference(uuid, text, text) TO authenticated;
