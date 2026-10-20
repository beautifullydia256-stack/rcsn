-- ====================================================================
-- Migration: 20261020000002_grant_ict_institutional_emails.sql
-- Description: Grant ICT Department full view, compose, and management
--              permissions on institutional_emails table.
-- ====================================================================

-- Update SELECT policy
DROP POLICY IF EXISTS "Admins can view institutional emails" ON public.institutional_emails;
DROP POLICY IF EXISTS "Staff and ICT can view institutional emails" ON public.institutional_emails;
CREATE POLICY "Staff and ICT can view institutional emails" ON public.institutional_emails
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
        AND users.role IN ('admin', 'head_teacher', 'dos', 'principal', 'developer', 'accountant', 'secretary', 'ict', 'owner', 'super_admin')
    )
  );

-- Update INSERT policy
DROP POLICY IF EXISTS "Admins and ICT can insert institutional emails" ON public.institutional_emails;
CREATE POLICY "Admins and ICT can insert institutional emails" ON public.institutional_emails
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
        AND users.role IN ('admin', 'head_teacher', 'dos', 'principal', 'developer', 'accountant', 'secretary', 'ict', 'owner', 'super_admin')
    )
  );

-- Update UPDATE policy
DROP POLICY IF EXISTS "Admins can update institutional emails" ON public.institutional_emails;
DROP POLICY IF EXISTS "Staff and ICT can update institutional emails" ON public.institutional_emails;
CREATE POLICY "Staff and ICT can update institutional emails" ON public.institutional_emails
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
        AND users.role IN ('admin', 'head_teacher', 'dos', 'principal', 'developer', 'accountant', 'secretary', 'ict', 'owner', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
        AND users.role IN ('admin', 'head_teacher', 'dos', 'principal', 'developer', 'accountant', 'secretary', 'ict', 'owner', 'super_admin')
    )
  );

-- Update DELETE policy
DROP POLICY IF EXISTS "Admins can delete institutional emails" ON public.institutional_emails;
DROP POLICY IF EXISTS "Staff and ICT can delete institutional emails" ON public.institutional_emails;
CREATE POLICY "Staff and ICT can delete institutional emails" ON public.institutional_emails
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
        AND users.role IN ('admin', 'head_teacher', 'dos', 'principal', 'developer', 'accountant', 'secretary', 'ict', 'owner', 'super_admin')
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.institutional_emails TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
