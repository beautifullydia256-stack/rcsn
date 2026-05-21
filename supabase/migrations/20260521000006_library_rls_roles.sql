-- Scope library write policies to librarian/admin/owner roles
-- Applied live on 2026-05-21.
--
-- Previous policies used USING (true) / WITH CHECK (true) for INSERT, UPDATE,
-- DELETE — any authenticated user could modify library content.
-- Scoped to roles that actually manage the library.

DROP POLICY IF EXISTS library_insert ON public.library;
DROP POLICY IF EXISTS library_update ON public.library;
DROP POLICY IF EXISTS library_delete ON public.library;

CREATE POLICY library_insert
ON public.library FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE user_id = (SELECT auth.uid())
      AND role IN ('librarian', 'admin', 'owner')
  )
);

CREATE POLICY library_update
ON public.library FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE user_id = (SELECT auth.uid())
      AND role IN ('librarian', 'admin', 'owner')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE user_id = (SELECT auth.uid())
      AND role IN ('librarian', 'admin', 'owner')
  )
);

CREATE POLICY library_delete
ON public.library FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE user_id = (SELECT auth.uid())
      AND role IN ('librarian', 'admin', 'owner')
  )
);
