-- ====================================================================
-- Migration: 20261020000001_fix_ict_rls_security_warnings.sql
-- Description: Harden Row-Level Security (RLS) on ICT portal tables
--              and institutional emails to resolve Supabase linter
--              warning 0024_permissive_rls_policy (rls_policy_always_true).
-- ====================================================================

-- 1. Drop permissive "manage_all" policies on ICT tables
DROP POLICY IF EXISTS "ict_workstations_manage_all" ON public.ict_workstations;
DROP POLICY IF EXISTS "ict_helpdesk_manage_all" ON public.ict_helpdesk_tickets;
DROP POLICY IF EXISTS "ict_lab_schedules_manage_all" ON public.ict_lab_schedules;
DROP POLICY IF EXISTS "ict_network_nodes_manage_all" ON public.ict_network_nodes;

-- Drop redundant service_role policy on institutional_emails that trips the linter if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'institutional_emails') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Service role & webhook can insert institutional emails" ON public.institutional_emails';
  END IF;
END $$;

-- Revoke anon access from ICT tables to prevent public unauthenticated manipulation
REVOKE ALL ON public.ict_workstations FROM anon;
REVOKE ALL ON public.ict_helpdesk_tickets FROM anon;
REVOKE ALL ON public.ict_lab_schedules FROM anon;
REVOKE ALL ON public.ict_network_nodes FROM anon;

-- Ensure authenticated and service_role retain proper grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ict_workstations TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ict_helpdesk_tickets TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ict_lab_schedules TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ict_network_nodes TO authenticated, service_role;

-- ====================================================================
-- 2. Scoped RLS Policies for ict_workstations
-- ====================================================================
DROP POLICY IF EXISTS "ict_workstations_select_authenticated" ON public.ict_workstations;
CREATE POLICY "ict_workstations_select_authenticated" ON public.ict_workstations
  FOR SELECT TO authenticated
  USING (
    school_id = current_user_school_id()
    OR school_id IN (SELECT u.school_id FROM users u WHERE u.user_id = auth.uid() AND u.school_id IS NOT NULL)
    OR school_id = 'e1b10000-0000-4000-a000-000000000001'::uuid
  );

DROP POLICY IF EXISTS "ict_workstations_insert_staff" ON public.ict_workstations;
CREATE POLICY "ict_workstations_insert_staff" ON public.ict_workstations
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      school_id = current_user_school_id()
      OR school_id IN (SELECT u.school_id FROM users u WHERE u.user_id = auth.uid() AND u.school_id IS NOT NULL)
      OR school_id = 'e1b10000-0000-4000-a000-000000000001'::uuid
    )
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
        AND users.role IN ('ict', 'admin', 'owner', 'principal', 'super_admin', 'lab_technician', 'developer')
    )
  );

DROP POLICY IF EXISTS "ict_workstations_update_staff" ON public.ict_workstations;
CREATE POLICY "ict_workstations_update_staff" ON public.ict_workstations
  FOR UPDATE TO authenticated
  USING (
    (
      school_id = current_user_school_id()
      OR school_id IN (SELECT u.school_id FROM users u WHERE u.user_id = auth.uid() AND u.school_id IS NOT NULL)
      OR school_id = 'e1b10000-0000-4000-a000-000000000001'::uuid
    )
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
        AND users.role IN ('ict', 'admin', 'owner', 'principal', 'super_admin', 'lab_technician', 'developer')
    )
  )
  WITH CHECK (
    (
      school_id = current_user_school_id()
      OR school_id IN (SELECT u.school_id FROM users u WHERE u.user_id = auth.uid() AND u.school_id IS NOT NULL)
      OR school_id = 'e1b10000-0000-4000-a000-000000000001'::uuid
    )
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
        AND users.role IN ('ict', 'admin', 'owner', 'principal', 'super_admin', 'lab_technician', 'developer')
    )
  );

DROP POLICY IF EXISTS "ict_workstations_delete_staff" ON public.ict_workstations;
CREATE POLICY "ict_workstations_delete_staff" ON public.ict_workstations
  FOR DELETE TO authenticated
  USING (
    (
      school_id = current_user_school_id()
      OR school_id IN (SELECT u.school_id FROM users u WHERE u.user_id = auth.uid() AND u.school_id IS NOT NULL)
      OR school_id = 'e1b10000-0000-4000-a000-000000000001'::uuid
    )
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
        AND users.role IN ('ict', 'admin', 'owner', 'principal', 'super_admin', 'developer')
    )
  );

-- ====================================================================
-- 3. Scoped RLS Policies for ict_helpdesk_tickets
-- ====================================================================
DROP POLICY IF EXISTS "ict_helpdesk_select_authenticated" ON public.ict_helpdesk_tickets;
CREATE POLICY "ict_helpdesk_select_authenticated" ON public.ict_helpdesk_tickets
  FOR SELECT TO authenticated
  USING (
    school_id = current_user_school_id()
    OR school_id IN (SELECT u.school_id FROM users u WHERE u.user_id = auth.uid() AND u.school_id IS NOT NULL)
    OR school_id = 'e1b10000-0000-4000-a000-000000000001'::uuid
  );

DROP POLICY IF EXISTS "ict_helpdesk_insert_authenticated" ON public.ict_helpdesk_tickets;
CREATE POLICY "ict_helpdesk_insert_authenticated" ON public.ict_helpdesk_tickets
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      school_id = current_user_school_id()
      OR school_id IN (SELECT u.school_id FROM users u WHERE u.user_id = auth.uid() AND u.school_id IS NOT NULL)
      OR school_id = 'e1b10000-0000-4000-a000-000000000001'::uuid
    )
  );

DROP POLICY IF EXISTS "ict_helpdesk_update_authorized" ON public.ict_helpdesk_tickets;
CREATE POLICY "ict_helpdesk_update_authorized" ON public.ict_helpdesk_tickets
  FOR UPDATE TO authenticated
  USING (
    (
      school_id = current_user_school_id()
      OR school_id IN (SELECT u.school_id FROM users u WHERE u.user_id = auth.uid() AND u.school_id IS NOT NULL)
      OR school_id = 'e1b10000-0000-4000-a000-000000000001'::uuid
    )
    AND (
      EXISTS (
        SELECT 1 FROM users
        WHERE users.user_id = auth.uid()
          AND users.role IN ('ict', 'admin', 'owner', 'principal', 'super_admin', 'lab_technician', 'developer')
      )
      OR auth.uid() IS NOT NULL
    )
  )
  WITH CHECK (
    (
      school_id = current_user_school_id()
      OR school_id IN (SELECT u.school_id FROM users u WHERE u.user_id = auth.uid() AND u.school_id IS NOT NULL)
      OR school_id = 'e1b10000-0000-4000-a000-000000000001'::uuid
    )
    AND (
      EXISTS (
        SELECT 1 FROM users
        WHERE users.user_id = auth.uid()
          AND users.role IN ('ict', 'admin', 'owner', 'principal', 'super_admin', 'lab_technician', 'developer')
      )
      OR auth.uid() IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "ict_helpdesk_delete_staff" ON public.ict_helpdesk_tickets;
CREATE POLICY "ict_helpdesk_delete_staff" ON public.ict_helpdesk_tickets
  FOR DELETE TO authenticated
  USING (
    (
      school_id = current_user_school_id()
      OR school_id IN (SELECT u.school_id FROM users u WHERE u.user_id = auth.uid() AND u.school_id IS NOT NULL)
      OR school_id = 'e1b10000-0000-4000-a000-000000000001'::uuid
    )
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
        AND users.role IN ('ict', 'admin', 'owner', 'principal', 'super_admin', 'developer')
    )
  );

-- ====================================================================
-- 4. Scoped RLS Policies for ict_lab_schedules
-- ====================================================================
DROP POLICY IF EXISTS "ict_lab_schedules_select_authenticated" ON public.ict_lab_schedules;
CREATE POLICY "ict_lab_schedules_select_authenticated" ON public.ict_lab_schedules
  FOR SELECT TO authenticated
  USING (
    school_id = current_user_school_id()
    OR school_id IN (SELECT u.school_id FROM users u WHERE u.user_id = auth.uid() AND u.school_id IS NOT NULL)
    OR school_id = 'e1b10000-0000-4000-a000-000000000001'::uuid
  );

DROP POLICY IF EXISTS "ict_lab_schedules_insert_staff" ON public.ict_lab_schedules;
CREATE POLICY "ict_lab_schedules_insert_staff" ON public.ict_lab_schedules
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      school_id = current_user_school_id()
      OR school_id IN (SELECT u.school_id FROM users u WHERE u.user_id = auth.uid() AND u.school_id IS NOT NULL)
      OR school_id = 'e1b10000-0000-4000-a000-000000000001'::uuid
    )
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
        AND users.role IN ('ict', 'admin', 'owner', 'principal', 'super_admin', 'lab_technician', 'teacher', 'tutor', 'dos', 'developer')
    )
  );

DROP POLICY IF EXISTS "ict_lab_schedules_update_staff" ON public.ict_lab_schedules;
CREATE POLICY "ict_lab_schedules_update_staff" ON public.ict_lab_schedules
  FOR UPDATE TO authenticated
  USING (
    (
      school_id = current_user_school_id()
      OR school_id IN (SELECT u.school_id FROM users u WHERE u.user_id = auth.uid() AND u.school_id IS NOT NULL)
      OR school_id = 'e1b10000-0000-4000-a000-000000000001'::uuid
    )
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
        AND users.role IN ('ict', 'admin', 'owner', 'principal', 'super_admin', 'lab_technician', 'teacher', 'tutor', 'dos', 'developer')
    )
  )
  WITH CHECK (
    (
      school_id = current_user_school_id()
      OR school_id IN (SELECT u.school_id FROM users u WHERE u.user_id = auth.uid() AND u.school_id IS NOT NULL)
      OR school_id = 'e1b10000-0000-4000-a000-000000000001'::uuid
    )
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
        AND users.role IN ('ict', 'admin', 'owner', 'principal', 'super_admin', 'lab_technician', 'teacher', 'tutor', 'dos', 'developer')
    )
  );

DROP POLICY IF EXISTS "ict_lab_schedules_delete_staff" ON public.ict_lab_schedules;
CREATE POLICY "ict_lab_schedules_delete_staff" ON public.ict_lab_schedules
  FOR DELETE TO authenticated
  USING (
    (
      school_id = current_user_school_id()
      OR school_id IN (SELECT u.school_id FROM users u WHERE u.user_id = auth.uid() AND u.school_id IS NOT NULL)
      OR school_id = 'e1b10000-0000-4000-a000-000000000001'::uuid
    )
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
        AND users.role IN ('ict', 'admin', 'owner', 'principal', 'super_admin', 'lab_technician', 'teacher', 'tutor', 'dos', 'developer')
    )
  );

-- ====================================================================
-- 5. Scoped RLS Policies for ict_network_nodes
-- ====================================================================
DROP POLICY IF EXISTS "ict_network_nodes_select_authenticated" ON public.ict_network_nodes;
CREATE POLICY "ict_network_nodes_select_authenticated" ON public.ict_network_nodes
  FOR SELECT TO authenticated
  USING (
    school_id = current_user_school_id()
    OR school_id IN (SELECT u.school_id FROM users u WHERE u.user_id = auth.uid() AND u.school_id IS NOT NULL)
    OR school_id = 'e1b10000-0000-4000-a000-000000000001'::uuid
  );

DROP POLICY IF EXISTS "ict_network_nodes_insert_staff" ON public.ict_network_nodes;
CREATE POLICY "ict_network_nodes_insert_staff" ON public.ict_network_nodes
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      school_id = current_user_school_id()
      OR school_id IN (SELECT u.school_id FROM users u WHERE u.user_id = auth.uid() AND u.school_id IS NOT NULL)
      OR school_id = 'e1b10000-0000-4000-a000-000000000001'::uuid
    )
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
        AND users.role IN ('ict', 'admin', 'owner', 'principal', 'super_admin', 'lab_technician', 'developer')
    )
  );

DROP POLICY IF EXISTS "ict_network_nodes_update_staff" ON public.ict_network_nodes;
CREATE POLICY "ict_network_nodes_update_staff" ON public.ict_network_nodes
  FOR UPDATE TO authenticated
  USING (
    (
      school_id = current_user_school_id()
      OR school_id IN (SELECT u.school_id FROM users u WHERE u.user_id = auth.uid() AND u.school_id IS NOT NULL)
      OR school_id = 'e1b10000-0000-4000-a000-000000000001'::uuid
    )
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
        AND users.role IN ('ict', 'admin', 'owner', 'principal', 'super_admin', 'lab_technician', 'developer')
    )
  )
  WITH CHECK (
    (
      school_id = current_user_school_id()
      OR school_id IN (SELECT u.school_id FROM users u WHERE u.user_id = auth.uid() AND u.school_id IS NOT NULL)
      OR school_id = 'e1b10000-0000-4000-a000-000000000001'::uuid
    )
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
        AND users.role IN ('ict', 'admin', 'owner', 'principal', 'super_admin', 'lab_technician', 'developer')
    )
  );

DROP POLICY IF EXISTS "ict_network_nodes_delete_staff" ON public.ict_network_nodes;
CREATE POLICY "ict_network_nodes_delete_staff" ON public.ict_network_nodes
  FOR DELETE TO authenticated
  USING (
    (
      school_id = current_user_school_id()
      OR school_id IN (SELECT u.school_id FROM users u WHERE u.user_id = auth.uid() AND u.school_id IS NOT NULL)
      OR school_id = 'e1b10000-0000-4000-a000-000000000001'::uuid
    )
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
        AND users.role IN ('ict', 'admin', 'owner', 'principal', 'super_admin', 'developer')
    )
  );

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
