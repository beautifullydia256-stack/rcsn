-- ============================================================================
-- PWEZACORE ACCOUNTANT ERP - Phase 0: Receipt numbers, invoices, discounts,
-- reversals, audit_log, period_locks, performance indexes
-- ============================================================================

-- 1. RECEIPT NUMBER on student_payments + sequence per school
ALTER TABLE public.student_payments
  ADD COLUMN IF NOT EXISTS receipt_number TEXT;

CREATE INDEX IF NOT EXISTS idx_student_payments_receipt_number
  ON public.student_payments(school_id, receipt_number)
  WHERE receipt_number IS NOT NULL;

-- Sequence table for receipt numbers (per school per year)
CREATE TABLE IF NOT EXISTS public.receipt_sequences (
  school_id UUID NOT NULL REFERENCES public.schools(school_id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  last_number INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (school_id, year)
);

ALTER TABLE public.receipt_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "receipt_sequences_school_users"
  ON public.receipt_sequences FOR ALL TO authenticated
  USING (school_id IN (SELECT school_id FROM public.users WHERE user_id = auth.uid()))
  WITH CHECK (school_id IN (SELECT school_id FROM public.users WHERE user_id = auth.uid()));

-- Function: get next receipt number for a school (format REC-YYYY-NNNNNN)
CREATE OR REPLACE FUNCTION public.get_next_receipt_number(p_school_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_year INT := EXTRACT(YEAR FROM CURRENT_DATE)::INT;
  v_next INT;
BEGIN
  INSERT INTO receipt_sequences (school_id, year, last_number)
  VALUES (p_school_id, v_year, 1)
  ON CONFLICT (school_id, year)
  DO UPDATE SET last_number = receipt_sequences.last_number + 1
  RETURNING last_number INTO v_next;
  RETURN 'REC-' || v_year || '-' || LPAD(v_next::TEXT, 6, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_next_receipt_number(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_receipt_number(UUID) TO service_role;

-- 2. Expand payment_method check to include pos, online
ALTER TABLE public.student_payments
  DROP CONSTRAINT IF EXISTS student_payments_payment_method_check;

ALTER TABLE public.student_payments
  ADD CONSTRAINT student_payments_payment_method_check
  CHECK (payment_method IS NULL OR payment_method IN (
    'cash', 'bank', 'mobile_money', 'cheque', 'pos', 'online', 'other'
  ));

-- 3. REVERSAL fields on student_payments
ALTER TABLE public.student_payments
  ADD COLUMN IF NOT EXISTS reversed_by UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reversal_reason TEXT,
  ADD COLUMN IF NOT EXISTS is_reversal BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_student_payments_reversed
  ON public.student_payments(school_id, reversed_at) WHERE reversed_at IS NOT NULL;

-- 4. STUDENT_INVOICES (per student per term)
CREATE TABLE IF NOT EXISTS public.student_invoices (
  invoice_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(school_id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(student_id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES public.school_terms(id) ON DELETE CASCADE,
  invoice_number TEXT,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance NUMERIC(12,2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'partial', 'paid', 'cancelled')),
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
  UNIQUE(school_id, student_id, term_id)
);

CREATE INDEX IF NOT EXISTS idx_student_invoices_school_term ON public.student_invoices(school_id, term_id);
CREATE INDEX IF NOT EXISTS idx_student_invoices_student ON public.student_invoices(student_id);

ALTER TABLE public.student_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student_invoices_school_users"
  ON public.student_invoices FOR ALL TO authenticated
  USING (school_id IN (SELECT school_id FROM public.users WHERE user_id = auth.uid()))
  WITH CHECK (school_id IN (SELECT school_id FROM public.users WHERE user_id = auth.uid()));

-- 5. STUDENT_DISCOUNTS (waivers, bursaries, scholarship)
CREATE TABLE IF NOT EXISTS public.student_discounts (
  discount_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(school_id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(student_id) ON DELETE CASCADE,
  term_id UUID REFERENCES public.school_terms(id) ON DELETE SET NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('waiver', 'bursary', 'scholarship', 'sibling', 'other')),
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  percent NUMERIC(5,2),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_student_discounts_school ON public.student_discounts(school_id);
CREATE INDEX IF NOT EXISTS idx_student_discounts_student_term ON public.student_discounts(student_id, term_id);

ALTER TABLE public.student_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student_discounts_school_users"
  ON public.student_discounts FOR ALL TO authenticated
  USING (school_id IN (SELECT school_id FROM public.users WHERE user_id = auth.uid()))
  WITH CHECK (school_id IN (SELECT school_id FROM public.users WHERE user_id = auth.uid()));

-- 6. AUDIT_LOG (who did what, when)
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(school_id) ON DELETE CASCADE,
  entity TEXT NOT NULL,
  entity_id TEXT,
  action TEXT NOT NULL,
  user_id UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_school_created ON public.audit_log(school_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.audit_log(entity, entity_id);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_school_users"
  ON public.audit_log FOR ALL TO authenticated
  USING (school_id IN (SELECT school_id FROM public.users WHERE user_id = auth.uid()))
  WITH CHECK (school_id IN (SELECT school_id FROM public.users WHERE user_id = auth.uid()));

-- 7. PERIOD_LOCKS (lock past term/month from edits)
CREATE TABLE IF NOT EXISTS public.period_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(school_id) ON DELETE CASCADE,
  term_id UUID REFERENCES public.school_terms(id) ON DELETE CASCADE,
  period_end DATE NOT NULL,
  locked_at TIMESTAMPTZ DEFAULT NOW(),
  locked_by UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
  UNIQUE(school_id, term_id)
);

CREATE INDEX IF NOT EXISTS idx_period_locks_school ON public.period_locks(school_id);

ALTER TABLE public.period_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "period_locks_school_users"
  ON public.period_locks FOR ALL TO authenticated
  USING (school_id IN (SELECT school_id FROM public.users WHERE user_id = auth.uid()))
  WITH CHECK (school_id IN (SELECT school_id FROM public.users WHERE user_id = auth.uid()));

-- 8. PERFORMANCE: indexes for dashboard KPIs
CREATE INDEX IF NOT EXISTS idx_student_payments_school_date
  ON public.student_payments(school_id, payment_date DESC);

CREATE INDEX IF NOT EXISTS idx_student_balances_school_term
  ON public.student_balances(school_id, term_id);

CREATE INDEX IF NOT EXISTS idx_school_expenses_school_term_date
  ON public.school_expenses(school_id, term_id, expense_date DESC);

COMMENT ON TABLE public.receipt_sequences IS 'Per-school receipt number sequence per year for REC-YYYY-NNNNNN';
COMMENT ON TABLE public.student_invoices IS 'Per-student per-term invoices for billing module';
COMMENT ON TABLE public.student_discounts IS 'Discounts, waivers, bursaries, scholarships';
COMMENT ON TABLE public.audit_log IS 'Audit trail for financial actions';
COMMENT ON TABLE public.period_locks IS 'Locked financial periods to prevent edits';
