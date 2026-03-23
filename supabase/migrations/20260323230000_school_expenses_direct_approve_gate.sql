-- Allow delegated users to insert school_expenses as approved; everyone else inserts pending.
-- Admins/owners may always insert as approved. Enforced on INSERT so clients cannot bypass.

ALTER TABLE public.user_school_permissions
  DROP CONSTRAINT IF EXISTS user_school_permissions_key_check;

ALTER TABLE public.user_school_permissions
  ADD CONSTRAINT user_school_permissions_key_check CHECK (
    permission_key IN (
      'students.manage',
      'accounting.full',
      'accounting.expenses_direct_approve'
    )
  );

CREATE OR REPLACE FUNCTION public.current_user_can_school_expense_direct_approve(p_school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.user_id = (SELECT auth.uid())
        AND u.school_id = p_school_id
        AND u.role IN ('admin', 'owner')
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_school_permissions p
      WHERE p.user_id = (SELECT auth.uid())
        AND p.school_id = p_school_id
        AND p.permission_key = 'accounting.expenses_direct_approve'
    );
$$;

COMMENT ON FUNCTION public.current_user_can_school_expense_direct_approve(uuid) IS
  'True if the current user may insert an expense already approved (admin/owner, or delegated accounting.expenses_direct_approve).';

CREATE OR REPLACE FUNCTION public.school_expenses_enforce_approval_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('approved', 'paid') THEN
    IF NOT public.current_user_can_school_expense_direct_approve(NEW.school_id) THEN
      NEW.status := 'pending';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_school_expenses_enforce_approval_insert ON public.school_expenses;
CREATE TRIGGER trg_school_expenses_enforce_approval_insert
  BEFORE INSERT ON public.school_expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.school_expenses_enforce_approval_insert();

COMMENT ON FUNCTION public.school_expenses_enforce_approval_insert() IS
  'Downgrades approved/paid inserts to pending unless the user is allowed to direct-approve.';
