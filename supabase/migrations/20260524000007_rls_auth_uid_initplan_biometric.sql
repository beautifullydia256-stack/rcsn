-- Fix RLS performance warning: auth_rls_initplan on biometric_device_users.
-- auth.uid() called bare gets re-evaluated for every row scanned.
-- Wrapping it in (SELECT auth.uid()) forces a single evaluation per query,
-- which is critical at scale (500k+ concurrent users).

DROP POLICY IF EXISTS biometric_device_users_school ON public.biometric_device_users;

CREATE POLICY biometric_device_users_school ON public.biometric_device_users
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id       = (SELECT auth.uid())
        AND profiles.school_id = biometric_device_users.school_id
        AND profiles.role      = ANY (ARRAY['admin'::text, 'owner'::text, 'secretary'::text])
    )
  );
