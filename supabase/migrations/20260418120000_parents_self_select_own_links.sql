-- Allow each authenticated parent to read their own guardian–student rows in public.parents.
-- Without this, policies that use subqueries like
--   student_id IN (SELECT student_id FROM parents WHERE parent_id = auth.uid())
-- evaluate as empty under the parent's JWT, so generated_reports / report_snapshots
-- appear empty even when rows exist.

DROP POLICY IF EXISTS "parents_self_select_own_links" ON public.parents;

CREATE POLICY "parents_self_select_own_links"
  ON public.parents
  FOR SELECT
  TO authenticated
  USING (
    parent_id = (SELECT auth.uid())
    OR (
      school_id IS NOT NULL
      AND email IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.user_id = (SELECT auth.uid())
          AND u.school_id IS NOT NULL
          AND u.school_id = parents.school_id
          AND u.email IS NOT NULL
          AND lower(trim(both from u.email)) = lower(trim(both from parents.email))
      )
    )
  );
