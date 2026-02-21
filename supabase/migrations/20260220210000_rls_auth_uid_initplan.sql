-- Fix linter: Auth RLS Initialization Plan — wrap auth.uid() in (SELECT auth.uid())
-- so it is evaluated once per query instead of per row.

-- 1. invoice_sequences
DROP POLICY IF EXISTS "invoice_sequences_school_users" ON public.invoice_sequences;
CREATE POLICY "invoice_sequences_school_users"
  ON public.invoice_sequences FOR ALL TO authenticated
  USING (school_id IN (SELECT school_id FROM public.users WHERE user_id = (SELECT auth.uid())))
  WITH CHECK (school_id IN (SELECT school_id FROM public.users WHERE user_id = (SELECT auth.uid())));

-- 2. balance_brought_forward
DROP POLICY IF EXISTS "bbf_school_users" ON public.balance_brought_forward;
CREATE POLICY "bbf_school_users"
  ON public.balance_brought_forward FOR ALL TO authenticated
  USING (school_id IN (SELECT school_id FROM public.users WHERE user_id = (SELECT auth.uid())))
  WITH CHECK (school_id IN (SELECT school_id FROM public.users WHERE user_id = (SELECT auth.uid())));

-- 3. global_terms (global_terms_manage)
DROP POLICY IF EXISTS "global_terms_manage" ON public.global_terms;
CREATE POLICY "global_terms_manage"
  ON public.global_terms FOR ALL TO authenticated
  USING ((SELECT role FROM public.users WHERE user_id = (SELECT auth.uid())) = 'owner')
  WITH CHECK ((SELECT role FROM public.users WHERE user_id = (SELECT auth.uid())) = 'owner');

-- 4. receipt_sequences_per_term
DROP POLICY IF EXISTS "receipt_sequences_per_term_school_users" ON public.receipt_sequences_per_term;
CREATE POLICY "receipt_sequences_per_term_school_users"
  ON public.receipt_sequences_per_term FOR ALL TO authenticated
  USING (school_id IN (SELECT school_id FROM public.users WHERE user_id = (SELECT auth.uid())))
  WITH CHECK (school_id IN (SELECT school_id FROM public.users WHERE user_id = (SELECT auth.uid())));

-- 5. receipt_sequences
DROP POLICY IF EXISTS "receipt_sequences_school_users" ON public.receipt_sequences;
CREATE POLICY "receipt_sequences_school_users"
  ON public.receipt_sequences FOR ALL TO authenticated
  USING (school_id IN (SELECT school_id FROM public.users WHERE user_id = (SELECT auth.uid())))
  WITH CHECK (school_id IN (SELECT school_id FROM public.users WHERE user_id = (SELECT auth.uid())));

-- 6. student_ledger
DROP POLICY IF EXISTS "student_ledger_school_users" ON public.student_ledger;
CREATE POLICY "student_ledger_school_users"
  ON public.student_ledger FOR ALL TO authenticated
  USING (school_id IN (SELECT school_id FROM public.users WHERE user_id = (SELECT auth.uid())))
  WITH CHECK (school_id IN (SELECT school_id FROM public.users WHERE user_id = (SELECT auth.uid())));

-- 7. student_invoices
DROP POLICY IF EXISTS "student_invoices_school_users" ON public.student_invoices;
CREATE POLICY "student_invoices_school_users"
  ON public.student_invoices FOR ALL TO authenticated
  USING (school_id IN (SELECT school_id FROM public.users WHERE user_id = (SELECT auth.uid())))
  WITH CHECK (school_id IN (SELECT school_id FROM public.users WHERE user_id = (SELECT auth.uid())));

-- 8. receivable_status
DROP POLICY IF EXISTS "receivable_status_school_users" ON public.receivable_status;
CREATE POLICY "receivable_status_school_users"
  ON public.receivable_status FOR ALL TO authenticated
  USING (school_id IN (SELECT school_id FROM public.users WHERE user_id = (SELECT auth.uid())))
  WITH CHECK (school_id IN (SELECT school_id FROM public.users WHERE user_id = (SELECT auth.uid())));

-- 9. student_discounts
DROP POLICY IF EXISTS "student_discounts_school_users" ON public.student_discounts;
CREATE POLICY "student_discounts_school_users"
  ON public.student_discounts FOR ALL TO authenticated
  USING (school_id IN (SELECT school_id FROM public.users WHERE user_id = (SELECT auth.uid())))
  WITH CHECK (school_id IN (SELECT school_id FROM public.users WHERE user_id = (SELECT auth.uid())));

-- 10. audit_log
DROP POLICY IF EXISTS "audit_log_school_users" ON public.audit_log;
CREATE POLICY "audit_log_school_users"
  ON public.audit_log FOR ALL TO authenticated
  USING (school_id IN (SELECT school_id FROM public.users WHERE user_id = (SELECT auth.uid())))
  WITH CHECK (school_id IN (SELECT school_id FROM public.users WHERE user_id = (SELECT auth.uid())));

-- 11. writeoff_log
DROP POLICY IF EXISTS "writeoff_log_via_invoice_school" ON public.writeoff_log;
CREATE POLICY "writeoff_log_via_invoice_school"
  ON public.writeoff_log FOR ALL TO authenticated
  USING (
    invoice_id IN (
      SELECT si.invoice_id FROM public.student_invoices si
      WHERE si.school_id IN (SELECT school_id FROM public.users WHERE user_id = (SELECT auth.uid()))
    )
  )
  WITH CHECK (
    invoice_id IN (
      SELECT si.invoice_id FROM public.student_invoices si
      WHERE si.school_id IN (SELECT school_id FROM public.users WHERE user_id = (SELECT auth.uid()))
    )
  );

-- 12. period_locks
DROP POLICY IF EXISTS "period_locks_school_users" ON public.period_locks;
CREATE POLICY "period_locks_school_users"
  ON public.period_locks FOR ALL TO authenticated
  USING (school_id IN (SELECT school_id FROM public.users WHERE user_id = (SELECT auth.uid())))
  WITH CHECK (school_id IN (SELECT school_id FROM public.users WHERE user_id = (SELECT auth.uid())));

-- 13. teachers (teachers_read_own_row)
DROP POLICY IF EXISTS "teachers_read_own_row" ON public.teachers;
CREATE POLICY "teachers_read_own_row" ON public.teachers
  FOR SELECT TO authenticated
  USING (
    (SELECT role FROM public.users WHERE user_id = (SELECT auth.uid()) LIMIT 1) = 'teacher'
    AND school_id = (SELECT school_id FROM public.users WHERE user_id = (SELECT auth.uid()) LIMIT 1)
    AND LOWER(TRIM(email)) = LOWER(TRIM((SELECT email FROM public.users WHERE user_id = (SELECT auth.uid()) LIMIT 1)))
  );
COMMENT ON POLICY "teachers_read_own_row" ON public.teachers IS
  'Let teacher users read their own teachers row so dashboard and teacher_class_subjects RLS work.';
