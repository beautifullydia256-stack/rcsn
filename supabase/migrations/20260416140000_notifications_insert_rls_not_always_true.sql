-- Linter rls_policy_always_true: INSERT must not use WITH CHECK (true) for authenticated.
-- Aligns with merged behavior: own-row inserts OR school-scoped OR legacy null school_id.

DROP POLICY IF EXISTS "notifications_insert_authenticated" ON public.notifications;

CREATE POLICY "notifications_insert_authenticated" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    school_id IS NULL
    OR school_id IN (
      SELECT u.school_id FROM public.users u
      WHERE u.user_id = (select auth.uid()) AND u.school_id IS NOT NULL
    )
  );
