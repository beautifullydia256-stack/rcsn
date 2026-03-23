-- 1) Default stable receipt path on insert (no client UPDATE needed; accountants lack broad UPDATE on school_expenses)
CREATE OR REPLACE FUNCTION public.school_expenses_set_default_receipt_path()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.receipt_attachment IS NULL OR BTRIM(COALESCE(NEW.receipt_attachment, '')) = '' THEN
    NEW.receipt_attachment := '/dashboard/expense-receipt/' || NEW.expense_id::text;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_school_expenses_default_receipt_path ON public.school_expenses;
CREATE TRIGGER trg_school_expenses_default_receipt_path
  BEFORE INSERT ON public.school_expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.school_expenses_set_default_receipt_path();

COMMENT ON FUNCTION public.school_expenses_set_default_receipt_path() IS
  'Sets receipt_attachment to a stable app path so the voucher can be opened without a follow-up UPDATE.';

-- Normalize existing rows (legacy full URLs or empty)
UPDATE public.school_expenses
SET receipt_attachment = '/dashboard/expense-receipt/' || expense_id::text
WHERE receipt_attachment IS NULL
   OR BTRIM(COALESCE(receipt_attachment, '')) = ''
   OR receipt_attachment LIKE '%/dashboard/accountant/expenses/receipt/%';

-- 2) Teachers can read salary expense rows where they are the linked teacher (for voucher + dashboard)
DROP POLICY IF EXISTS "school_expenses_teacher_own_salary_select" ON public.school_expenses;
CREATE POLICY "school_expenses_teacher_own_salary_select"
  ON public.school_expenses
  FOR SELECT
  TO authenticated
  USING (
    school_id = public.current_user_school_id()
    AND linked_teacher_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.teachers t
      INNER JOIN public.users u ON u.user_id = auth.uid()
      WHERE t.teacher_id = school_expenses.linked_teacher_id
        AND t.school_id = school_expenses.school_id
        AND LOWER(TRIM(COALESCE(t.email, ''))) = LOWER(TRIM(COALESCE(u.email, '')))
    )
  );
