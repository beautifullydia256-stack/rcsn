-- =============================================================================
-- Allow admins to read school_terms, student_payments, student_balances by
-- users.school_id (not only schools.admin_id). This fixes the desktop app
-- dashboard when the logged-in admin has users.school_id set but is not
-- the school's admin_id in the schools table.
-- =============================================================================

-- 1. school_terms: allow admin users to SELECT by their users.school_id
CREATE POLICY "terms admin select by school"
  ON public.school_terms
  FOR SELECT TO authenticated
  USING (
    school_id IN (
      SELECT u.school_id FROM public.users u
      WHERE u.user_id = auth.uid()
        AND u.role = 'admin'
        AND u.school_id IS NOT NULL
    )
  );

-- 2. student_payments: allow admin users to SELECT by their users.school_id
CREATE POLICY "student_payments_admin_select_by_school"
  ON public.student_payments
  FOR SELECT TO authenticated
  USING (
    school_id IN (
      SELECT u.school_id FROM public.users u
      WHERE u.user_id = auth.uid()
        AND u.role = 'admin'
        AND u.school_id IS NOT NULL
    )
  );

-- 3. student_balances: allow admin users to SELECT by their users.school_id
CREATE POLICY "student_balances_admin_select_by_school"
  ON public.student_balances
  FOR SELECT TO authenticated
  USING (
    school_id IN (
      SELECT u.school_id FROM public.users u
      WHERE u.user_id = auth.uid()
        AND u.role = 'admin'
        AND u.school_id IS NOT NULL
    )
  );
