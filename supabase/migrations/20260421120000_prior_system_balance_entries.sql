-- Prior-system (external) outstanding balance: append-only ledger per student/school.
-- Not tied to school_terms; complements term-based student_invoices / student_balances.

CREATE TABLE IF NOT EXISTS public.prior_system_balance_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(school_id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(student_id) ON DELETE CASCADE,
  amount_outstanding NUMERIC(12, 2) NOT NULL CHECK (amount_outstanding > 0),
  source_note TEXT,
  entered_by_user_id UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prior_system_balance_school_student
  ON public.prior_system_balance_entries(school_id, student_id);

CREATE INDEX IF NOT EXISTS idx_prior_system_balance_student
  ON public.prior_system_balance_entries(student_id);

ALTER TABLE public.prior_system_balance_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prior_system_balance_entries_school_users"
  ON public.prior_system_balance_entries;
CREATE POLICY "prior_system_balance_entries_school_users"
  ON public.prior_system_balance_entries FOR ALL TO authenticated
  USING (school_id IN (SELECT u.school_id FROM public.users u WHERE u.user_id = (SELECT auth.uid())))
  WITH CHECK (school_id IN (SELECT u.school_id FROM public.users u WHERE u.user_id = (SELECT auth.uid())));
