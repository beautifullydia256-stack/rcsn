-- ============================================================================
-- PWEZACORE — UNPAID BALANCES / FINANCIAL CONTINUITY (Phase 1)
-- Implements: student_ledger, receivable_status, writeoff_log, status updates
-- DO NOT delete, edit, or regenerate historical invoices.
-- ============================================================================

-- 1. student_ledger — lifetime financial movements per student
CREATE TABLE IF NOT EXISTS public.student_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(student_id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(school_id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('invoice', 'payment', 'carry_forward', 'writeoff')),
  reference_id UUID, -- invoice_id, payment_id, or NULL for carry_forward
  debit NUMERIC(12,2) NOT NULL DEFAULT 0,
  credit NUMERIC(12,2) NOT NULL DEFAULT 0,
  running_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  term_id UUID REFERENCES public.school_terms(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_ledger_student ON public.student_ledger(student_id);
CREATE INDEX IF NOT EXISTS idx_student_ledger_school ON public.student_ledger(school_id);
CREATE INDEX IF NOT EXISTS idx_student_ledger_created ON public.student_ledger(created_at);

ALTER TABLE public.student_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student_ledger_school_users"
  ON public.student_ledger FOR ALL TO authenticated
  USING (school_id IN (SELECT school_id FROM public.users WHERE user_id = auth.uid()))
  WITH CHECK (school_id IN (SELECT school_id FROM public.users WHERE user_id = auth.uid()));

-- 2. receivable_status — snapshot of total outstanding per student (can be materialized/computed)
CREATE TABLE IF NOT EXISTS public.receivable_status (
  student_id UUID NOT NULL REFERENCES public.students(student_id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(school_id) ON DELETE CASCADE,
  total_outstanding NUMERIC(12,2) NOT NULL DEFAULT 0,
  aging_bucket TEXT, -- '30', '60', '90+'
  is_inactive_debtor BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (student_id)
);

CREATE INDEX IF NOT EXISTS idx_receivable_status_school ON public.receivable_status(school_id);
CREATE INDEX IF NOT EXISTS idx_receivable_status_outstanding ON public.receivable_status(total_outstanding) WHERE total_outstanding > 0;

ALTER TABLE public.receivable_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "receivable_status_school_users"
  ON public.receivable_status FOR ALL TO authenticated
  USING (school_id IN (SELECT school_id FROM public.users WHERE user_id = auth.uid()))
  WITH CHECK (school_id IN (SELECT school_id FROM public.users WHERE user_id = auth.uid()));

-- 3. writeoff_log — permanent audit trail for debt forgiveness
CREATE TABLE IF NOT EXISTS public.writeoff_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.student_invoices(invoice_id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  approved_by UUID NOT NULL REFERENCES public.users(user_id) ON DELETE RESTRICT,
  reason TEXT NOT NULL,
  approved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_writeoff_log_invoice ON public.writeoff_log(invoice_id);
CREATE INDEX IF NOT EXISTS idx_writeoff_log_approved ON public.writeoff_log(approved_at);

ALTER TABLE public.writeoff_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "writeoff_log_via_invoice_school"
  ON public.writeoff_log FOR ALL TO authenticated
  USING (
    invoice_id IN (
      SELECT si.invoice_id FROM public.student_invoices si
      WHERE si.school_id IN (SELECT school_id FROM public.users WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    invoice_id IN (
      SELECT si.invoice_id FROM public.student_invoices si
      WHERE si.school_id IN (SELECT school_id FROM public.users WHERE user_id = auth.uid())
    )
  );

-- 4. Expand student_invoices status to include written_off, unpaid
ALTER TABLE public.student_invoices
  DROP CONSTRAINT IF EXISTS student_invoices_status_check;

ALTER TABLE public.student_invoices
  ADD CONSTRAINT student_invoices_status_check
  CHECK (status IN ('draft', 'issued', 'partial', 'paid', 'cancelled', 'unpaid', 'written_off'));

-- 5. Add columns to students for inactive debtor tracking
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS inactive_with_balance BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.students.inactive_with_balance IS 'Student withdrawn/inactive but has outstanding fees (debtor)';

-- 6. Add term closed / locked flag to school_terms (for term closing)
ALTER TABLE public.school_terms
  ADD COLUMN IF NOT EXISTS is_closed BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.school_terms.is_closed IS 'When true, invoices for this term are locked from editing';

-- 7. Add reference_invoice_ids for Balance Brought Forward (BBF)
CREATE TABLE IF NOT EXISTS public.balance_brought_forward (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(student_id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(school_id) ON DELETE CASCADE,
  to_term_id UUID NOT NULL REFERENCES public.school_terms(id) ON DELETE CASCADE,
  amount_outstanding NUMERIC(12,2) NOT NULL,
  reference_invoice_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bbf_student ON public.balance_brought_forward(student_id);
CREATE INDEX IF NOT EXISTS idx_bbf_to_term ON public.balance_brought_forward(to_term_id);

ALTER TABLE public.balance_brought_forward ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bbf_school_users"
  ON public.balance_brought_forward FOR ALL TO authenticated
  USING (school_id IN (SELECT school_id FROM public.users WHERE user_id = auth.uid()))
  WITH CHECK (school_id IN (SELECT school_id FROM public.users WHERE user_id = auth.uid()));

COMMENT ON TABLE public.student_ledger IS 'Lifetime financial movements; never delete historical records';
COMMENT ON TABLE public.writeoff_log IS 'Irreversible debt forgiveness audit trail';
