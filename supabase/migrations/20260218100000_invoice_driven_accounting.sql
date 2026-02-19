-- ============================================================================
-- INVOICE-DRIVEN ACCOUNTING (aligned with your current schema)
-- 1. Add term_id, invoice_id, recorded_by, notes, reversed_at to student_payments
-- 2. Invoice number sequence (INV-YYYY-NNNNNN)
-- 3. Sync student_invoices.amount_paid when payments are recorded
-- 4. Update student_balances from payments (no class_id, use year/term from school_terms)
-- ============================================================================

-- 1a. Add missing columns to student_payments (nullable for existing rows)
ALTER TABLE public.student_payments
  ADD COLUMN IF NOT EXISTS term_id UUID REFERENCES public.school_terms(id) ON DELETE SET NULL;

ALTER TABLE public.student_payments
  ADD COLUMN IF NOT EXISTS recorded_by UUID REFERENCES public.users(user_id) ON DELETE SET NULL;

ALTER TABLE public.student_payments
  ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE public.student_payments
  ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMPTZ;

ALTER TABLE public.student_payments
  ADD COLUMN IF NOT EXISTS reversal_reason TEXT;

ALTER TABLE public.student_payments
  ADD COLUMN IF NOT EXISTS is_reversal BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.student_payments
  ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES public.student_invoices(invoice_id) ON DELETE SET NULL;

-- Ensure amount_paid is used (copy from amount for legacy rows)
UPDATE public.student_payments
SET amount_paid = COALESCE(amount_paid, amount, 0)
WHERE amount_paid IS NULL OR (amount_paid = 0 AND amount IS NOT NULL AND amount > 0);

CREATE INDEX IF NOT EXISTS idx_student_payments_invoice_id
  ON public.student_payments(invoice_id) WHERE invoice_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_student_payments_student_term
  ON public.student_payments(student_id, term_id) WHERE term_id IS NOT NULL;

-- 2. Invoice number sequence (per school per year)
CREATE TABLE IF NOT EXISTS public.invoice_sequences (
  school_id UUID NOT NULL REFERENCES public.schools(school_id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  last_number INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (school_id, year)
);

ALTER TABLE public.invoice_sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoice_sequences_school_users" ON public.invoice_sequences;
CREATE POLICY "invoice_sequences_school_users"
  ON public.invoice_sequences FOR ALL TO authenticated
  USING (school_id IN (SELECT school_id FROM public.users WHERE user_id = auth.uid()))
  WITH CHECK (school_id IN (SELECT school_id FROM public.users WHERE user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.get_next_invoice_number(p_school_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_year INT := EXTRACT(YEAR FROM CURRENT_DATE)::INT;
  v_next INT;
BEGIN
  INSERT INTO public.invoice_sequences (school_id, year, last_number)
  VALUES (p_school_id, v_year, 1)
  ON CONFLICT (school_id, year)
  DO UPDATE SET last_number = public.invoice_sequences.last_number + 1
  RETURNING last_number INTO v_next;
  RETURN 'INV-' || v_year || '-' || LPAD(v_next::TEXT, 6, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_next_invoice_number(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_invoice_number(UUID) TO service_role;

-- 3. Sync student_invoices when payments change (only when term_id is set)
CREATE OR REPLACE FUNCTION public.sync_invoice_amount_paid()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_student_id UUID;
  v_term_id UUID;
  v_paid NUMERIC(12,2);
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

  SELECT COALESCE(SUM(amount_paid), 0) INTO v_paid
  FROM public.student_payments
  WHERE student_id = v_student_id AND term_id = v_term_id AND reversed_at IS NULL;

  UPDATE public.student_invoices si
  SET
    amount_paid = v_paid,
    status = CASE
      WHEN (si.total_amount - v_paid) <= 0 THEN 'paid'
      WHEN v_paid > 0 THEN 'partial'
      ELSE si.status
    END,
    updated_at = NOW()
  WHERE si.student_id = v_student_id AND si.term_id = v_term_id;

  IF TG_OP = 'UPDATE' AND (OLD.student_id IS DISTINCT FROM NEW.student_id OR OLD.term_id IS DISTINCT FROM NEW.term_id) AND OLD.term_id IS NOT NULL THEN
    SELECT COALESCE(SUM(amount_paid), 0) INTO v_paid
    FROM public.student_payments
    WHERE student_id = OLD.student_id AND term_id = OLD.term_id AND reversed_at IS NULL;
    UPDATE public.student_invoices si
    SET amount_paid = v_paid,
        status = CASE WHEN (si.total_amount - v_paid) <= 0 THEN 'paid' WHEN v_paid > 0 THEN 'partial' ELSE si.status END,
        updated_at = NOW()
    WHERE si.student_id = OLD.student_id AND si.term_id = OLD.term_id;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_invoice_amount_paid ON public.student_payments;
CREATE TRIGGER trigger_sync_invoice_amount_paid
  AFTER INSERT OR UPDATE OR DELETE ON public.student_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_invoice_amount_paid();

-- 4. Update student_balances from payments (your schema: year, term, no class_id, no last_payment_date)
CREATE OR REPLACE FUNCTION public.update_student_balance()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_total_paid NUMERIC(12,2);
  v_total_fees NUMERIC(12,2);
  v_year INT;
  v_term INT;
BEGIN
  IF NEW.term_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(SUM(amount_paid), 0) INTO v_total_paid
  FROM public.student_payments
  WHERE student_id = NEW.student_id AND term_id = NEW.term_id AND reversed_at IS NULL;

  SELECT st.year, st.term INTO v_year, v_term
  FROM public.school_terms st
  WHERE st.id = NEW.term_id;

  SELECT si.total_amount INTO v_total_fees
  FROM public.student_invoices si
  WHERE si.student_id = NEW.student_id AND si.term_id = NEW.term_id
    AND si.status IN ('issued', 'partial', 'paid')
  LIMIT 1;

  IF v_total_fees IS NULL THEN
    SELECT c.total_fees INTO v_total_fees
    FROM public.classes c
    JOIN public.students s ON s.class_id = c.class_id
    WHERE s.student_id = NEW.student_id;
  END IF;
  IF v_total_fees IS NULL THEN
    SELECT s.expected_fee_amount INTO v_total_fees FROM public.students s WHERE s.student_id = NEW.student_id;
  END IF;

  INSERT INTO public.student_balances (student_id, school_id, term_id, year, term, total_fees, total_paid, updated_at)
  VALUES (NEW.student_id, NEW.school_id, NEW.term_id, COALESCE(v_year, EXTRACT(YEAR FROM CURRENT_DATE)::INT), COALESCE(v_term, 1), COALESCE(v_total_fees, 0), v_total_paid, NOW())
  ON CONFLICT (student_id, term_id)
  DO UPDATE SET
    total_paid = v_total_paid,
    total_fees = COALESCE(v_total_fees, public.student_balances.total_fees),
    updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_student_balance ON public.student_payments;
CREATE TRIGGER trigger_update_student_balance
  AFTER INSERT OR UPDATE ON public.student_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_student_balance();

COMMENT ON COLUMN public.student_payments.invoice_id IS 'Links payment to the invoice (invoice-driven accounting)';
COMMENT ON TABLE public.invoice_sequences IS 'Per-school invoice number sequence for INV-YYYY-NNNNNN';
