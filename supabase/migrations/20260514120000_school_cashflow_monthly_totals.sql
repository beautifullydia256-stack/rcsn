-- Fast all-time monthly cashflow for accountant dashboard (GROUP BY in Postgres, not client-side scans).

CREATE OR REPLACE FUNCTION public.school_cashflow_monthly_totals(p_school_id uuid)
RETURNS TABLE (
  yr integer,
  mo integer,
  fee_receipts numeric,
  expenses numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'school_cashflow_monthly_totals: authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.user_id = auth.uid() AND u.school_id = p_school_id
  ) THEN
    RAISE EXCEPTION 'school_cashflow_monthly_totals: not authorized for this school';
  END IF;

  RETURN QUERY
  WITH pay AS (
    SELECT
      EXTRACT(YEAR FROM sp.payment_date::date)::integer AS y,
      EXTRACT(MONTH FROM sp.payment_date::date)::integer AS m,
      COALESCE(SUM(sp.amount_paid), 0)::numeric(14, 2) AS fr
    FROM public.student_payments sp
    WHERE sp.school_id = p_school_id
      AND sp.reversed_at IS NULL
      AND sp.payment_date IS NOT NULL
    GROUP BY 1, 2
  ),
  exp AS (
    SELECT
      EXTRACT(YEAR FROM se.expense_date::date)::integer AS y,
      EXTRACT(MONTH FROM se.expense_date::date)::integer AS m,
      COALESCE(SUM(se.amount), 0)::numeric(14, 2) AS ex
    FROM public.school_expenses se
    WHERE se.school_id = p_school_id
      AND lower(se.status) IN ('approved', 'paid')
      AND se.expense_date IS NOT NULL
    GROUP BY 1, 2
  ),
  dims AS (
    SELECT pay.y, pay.m FROM pay
    UNION
    SELECT exp.y, exp.m FROM exp
  )
  SELECT
    d.y AS yr,
    d.m AS mo,
    COALESCE(p.fr, 0)::numeric(14, 2) AS fee_receipts,
    COALESCE(e.ex, 0)::numeric(14, 2) AS expenses
  FROM dims d
  LEFT JOIN pay p ON p.y = d.y AND p.m = d.m
  LEFT JOIN exp e ON e.y = d.y AND e.m = d.m
  ORDER BY d.y, d.m;
END;
$$;

COMMENT ON FUNCTION public.school_cashflow_monthly_totals(uuid) IS
  'Monthly fee receipts (non-reversed student_payments) and approved/paid school_expenses for a school, all history.';

REVOKE ALL ON FUNCTION public.school_cashflow_monthly_totals(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.school_cashflow_monthly_totals(uuid) TO authenticated;

CREATE INDEX IF NOT EXISTS idx_student_payments_school_date_active
  ON public.student_payments (school_id, payment_date)
  WHERE reversed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_school_expenses_school_date
  ON public.school_expenses (school_id, expense_date);
