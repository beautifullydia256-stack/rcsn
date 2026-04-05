-- Multiple invoices per student per term: one "main" (standard fee) plus optional
-- supplementary rows (e.g. labelled "Brought forward") all on the *current* period.
-- Payments for the term are split across invoices in order: main first, then supplementary
-- by created_at (waterfall). student_balances.total_fees = sum of active invoice totals.

ALTER TABLE public.student_invoices
  ADD COLUMN IF NOT EXISTS invoice_label TEXT,
  ADD COLUMN IF NOT EXISTS is_supplementary BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.student_invoices.invoice_label IS
  'Optional short label shown in UI (e.g. brought-forward balance). Main tuition invoice usually has NULL.';

COMMENT ON COLUMN public.student_invoices.is_supplementary IS
  'When false, this is the standard term fee invoice; at most one per (school, student, term). When true, extra charges on the same term are allowed.';

ALTER TABLE public.student_invoices
  DROP CONSTRAINT IF EXISTS student_invoices_school_id_student_id_term_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_student_invoices_main_per_term
  ON public.student_invoices (school_id, student_id, term_id)
  WHERE (is_supplementary = false);

-- ---------------------------------------------------------------------------
-- Reconcile: distribute term payment sum across invoices (waterfall); refresh student_balances.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reconcile_term_invoice_payments(p_student_id uuid, p_term_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_paid numeric(12, 2);
  v_rem numeric(12, 2);
  v_alloc numeric(12, 2);
  r record;
  v_school uuid;
  v_year int;
  v_term int;
  v_total_fees numeric(12, 2);
BEGIN
  SELECT public.total_term_payments_amount_paid(p_student_id, p_term_id) INTO v_paid;

  SELECT si.school_id INTO v_school
  FROM public.student_invoices si
  WHERE si.student_id = p_student_id AND si.term_id = p_term_id
  LIMIT 1;

  IF v_school IS NULL THEN
    DELETE FROM public.student_balances sb
    WHERE sb.student_id = p_student_id AND sb.term_id = p_term_id;
    RETURN;
  END IF;

  v_rem := v_paid;

  FOR r IN
    SELECT si.invoice_id, si.total_amount
    FROM public.student_invoices si
    WHERE si.student_id = p_student_id
      AND si.term_id = p_term_id
      AND si.status = ANY (ARRAY['issued'::text, 'partial'::text, 'paid'::text])
    ORDER BY si.is_supplementary ASC, si.created_at ASC NULLS LAST, si.invoice_id ASC
  LOOP
    v_alloc := least(r.total_amount, greatest(v_rem, 0::numeric));
    UPDATE public.student_invoices si
    SET
      amount_paid = v_alloc,
      status = CASE
        WHEN (r.total_amount - v_alloc) <= 0 THEN 'paid'::text
        WHEN v_alloc > 0 THEN 'partial'::text
        ELSE 'issued'::text
      END,
      updated_at = NOW()
    WHERE si.invoice_id = r.invoice_id;
    v_rem := v_rem - v_alloc;
  END LOOP;

  SELECT COALESCE(SUM(si.total_amount), 0)::numeric(12, 2) INTO v_total_fees
  FROM public.student_invoices si
  WHERE si.student_id = p_student_id
    AND si.term_id = p_term_id
    AND si.status = ANY (ARRAY['issued'::text, 'partial'::text, 'paid'::text]);

  SELECT st.year, st.term INTO v_year, v_term
  FROM public.school_terms st
  WHERE st.id = p_term_id;

  INSERT INTO public.student_balances (
    student_id, school_id, term_id, year, term, total_fees, total_paid, balance, updated_at
  )
  VALUES (
    p_student_id,
    v_school,
    p_term_id,
    COALESCE(v_year, EXTRACT(YEAR FROM CURRENT_DATE)::INT),
    COALESCE(v_term, 1),
    v_total_fees,
    v_paid,
    v_total_fees - v_paid,
    NOW()
  )
  ON CONFLICT (student_id, term_id)
  DO UPDATE SET
    total_fees = EXCLUDED.total_fees,
    total_paid = EXCLUDED.total_paid,
    balance = EXCLUDED.balance,
    updated_at = NOW();
END;
$$;

COMMENT ON FUNCTION public.reconcile_term_invoice_payments(uuid, uuid) IS
  'Waterfall term payments onto invoices (main first, then supplementary); upserts student_balances.';

CREATE OR REPLACE FUNCTION public.sync_invoice_amount_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
  v_term_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_student_id := OLD.student_id;
    v_term_id := OLD.term_id;
  ELSE
    v_student_id := NEW.student_id;
    v_term_id := NEW.term_id;
  END IF;

  IF v_term_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  PERFORM public.reconcile_term_invoice_payments(v_student_id, v_term_id);

  IF TG_OP = 'UPDATE' AND (OLD.student_id IS DISTINCT FROM NEW.student_id OR OLD.term_id IS DISTINCT FROM NEW.term_id) AND OLD.term_id IS NOT NULL THEN
    PERFORM public.reconcile_term_invoice_payments(OLD.student_id, OLD.term_id);
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_balance_on_invoice_activation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('issued', 'partial', 'paid') THEN
    RETURN NEW;
  END IF;

  PERFORM public.reconcile_term_invoice_payments(NEW.student_id, NEW.term_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_balance_on_invoice_activation ON public.student_invoices;
CREATE TRIGGER trigger_sync_balance_on_invoice_activation
  AFTER INSERT OR UPDATE OF status, total_amount ON public.student_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_balance_on_invoice_activation();

CREATE OR REPLACE FUNCTION public.trg_student_invoices_reconcile_after_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.term_id IS NOT NULL THEN
    PERFORM public.reconcile_term_invoice_payments(OLD.student_id, OLD.term_id);
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trigger_student_invoices_reconcile_after_delete ON public.student_invoices;
CREATE TRIGGER trigger_student_invoices_reconcile_after_delete
  AFTER DELETE ON public.student_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_student_invoices_reconcile_after_delete();

CREATE OR REPLACE FUNCTION public.update_student_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.term_id IS NULL THEN
    PERFORM public.recalc_student_term_balances_from_payments(NEW.student_id, NEW.school_id);
    RETURN NEW;
  END IF;

  PERFORM public.reconcile_term_invoice_payments(NEW.student_id, NEW.term_id);
  RETURN NEW;
END;
$$;

-- Deprecated: legacy carry-over on arbitrary past terms — use supplementary invoices on current term.
CREATE OR REPLACE FUNCTION public.apply_carryover_balance_to_term_invoice(
  p_school_id uuid,
  p_student_id uuid,
  p_term_id uuid,
  p_carryover_amount numeric,
  p_base_term_fee numeric DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION
    'apply_carryover_balance_to_term_invoice is deprecated. On Invoices & Billing use “Additional charge” on the current term (creates a labelled supplementary invoice).';
END;
$$;
