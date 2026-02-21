-- exam_sets: ensure school-scoped users can SELECT and admins can INSERT/UPDATE/DELETE.
-- Fixes "toggle to Active still shows Inactive" when RLS blocked UPDATE (0 rows, no error).
DROP POLICY IF EXISTS "optimized_authenticated_access" ON public.exam_sets;
DROP POLICY IF EXISTS "exam_sets_authenticated_access" ON public.exam_sets;
DROP POLICY IF EXISTS "exam_sets_allow_all" ON public.exam_sets;

CREATE POLICY "exam_sets_school_access"
ON public.exam_sets
FOR ALL TO authenticated
USING (
  school_id IN (
    SELECT school_id FROM public.users WHERE user_id = (SELECT auth.uid()) AND school_id IS NOT NULL
  )
  OR school_id IN (SELECT school_id FROM public.schools WHERE admin_id = (SELECT auth.uid()))
)
WITH CHECK (
  school_id IN (
    SELECT school_id FROM public.users WHERE user_id = (SELECT auth.uid()) AND school_id IS NOT NULL
  )
  OR school_id IN (SELECT school_id FROM public.schools WHERE admin_id = (SELECT auth.uid()))
);

COMMENT ON POLICY "exam_sets_school_access" ON public.exam_sets IS
  'Users can manage exam_sets for their school (users.school_id or schools.admin_id).';
