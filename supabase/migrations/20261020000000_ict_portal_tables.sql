-- ====================================================================
-- Migration: 20261020000000_ict_portal_tables.sql
-- Description: Computer Lab Workstations, ICT Helpdesk, Lab Schedules,
--              and Network/CCTV Surveillance Nodes for RCSN
-- ====================================================================

-- 1. Computer Lab Workstations
CREATE TABLE IF NOT EXISTS public.ict_workstations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL DEFAULT 'e1b10000-0000-4000-a000-000000000001',
  station_code TEXT NOT NULL,
  row_number TEXT DEFAULT 'Row 1',
  cpu_specs TEXT DEFAULT 'Intel Core i5',
  ram_gb INTEGER DEFAULT 8,
  storage_specs TEXT DEFAULT '256GB SSD',
  os_version TEXT DEFAULT 'Windows 11 Pro',
  has_ups BOOLEAN DEFAULT true,
  mouse_status TEXT DEFAULT 'working',
  keyboard_status TEXT DEFAULT 'working',
  monitor_status TEXT DEFAULT 'working',
  overall_status TEXT DEFAULT 'operational', -- 'operational', 'needs_update', 'faulty_component', 'out_of_service'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT ict_workstations_code_uniq UNIQUE(school_id, station_code)
);

-- 2. ICT Helpdesk & Hardware Repair Tickets
CREATE TABLE IF NOT EXISTS public.ict_helpdesk_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL DEFAULT 'e1b10000-0000-4000-a000-000000000001',
  ticket_number TEXT NOT NULL,
  reporter_name TEXT NOT NULL,
  department TEXT DEFAULT 'General',
  location TEXT NOT NULL,
  category TEXT DEFAULT 'hardware', -- 'hardware', 'software', 'network', 'printer', 'projector', 'biometric'
  priority TEXT DEFAULT 'normal', -- 'urgent', 'normal', 'low'
  status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
  description TEXT NOT NULL,
  resolution_notes TEXT,
  assigned_to TEXT DEFAULT 'ICT Department',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- 3. Computer Lab Class Bookings & Practical Sessions
CREATE TABLE IF NOT EXISTS public.ict_lab_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL DEFAULT 'e1b10000-0000-4000-a000-000000000001',
  title TEXT NOT NULL,
  tutor_name TEXT NOT NULL,
  class_name TEXT NOT NULL,
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  pcs_needed INTEGER DEFAULT 30,
  session_type TEXT DEFAULT 'practical', -- 'practical', 'lecture', 'cbt_exam', 'research'
  status TEXT DEFAULT 'confirmed', -- 'confirmed', 'pending', 'cancelled'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Campus Network Nodes & Surveillance Directory
CREATE TABLE IF NOT EXISTS public.ict_network_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL DEFAULT 'e1b10000-0000-4000-a000-000000000001',
  name TEXT NOT NULL,
  device_type TEXT NOT NULL, -- 'access_point', 'router', 'switch', 'cctv_camera', 'nvr_server'
  location TEXT NOT NULL,
  ip_address TEXT,
  mac_address TEXT,
  status TEXT DEFAULT 'online', -- 'online', 'offline', 'maintenance'
  last_ping_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ict_workstations_school ON public.ict_workstations(school_id);
CREATE INDEX IF NOT EXISTS idx_ict_helpdesk_school ON public.ict_helpdesk_tickets(school_id, status);
CREATE INDEX IF NOT EXISTS idx_ict_lab_schedules_date ON public.ict_lab_schedules(school_id, session_date);
CREATE INDEX IF NOT EXISTS idx_ict_network_nodes_school ON public.ict_network_nodes(school_id, device_type);

-- Enable RLS
ALTER TABLE public.ict_workstations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ict_helpdesk_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ict_lab_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ict_network_nodes ENABLE ROW LEVEL SECURITY;

-- Permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ict_workstations TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ict_helpdesk_tickets TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ict_lab_schedules TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ict_network_nodes TO authenticated, service_role;

-- Scoped RLS policies for ict_workstations
CREATE POLICY "ict_workstations_select_authenticated" ON public.ict_workstations
  FOR SELECT TO authenticated
  USING (
    school_id = current_user_school_id()
    OR school_id IN (SELECT u.school_id FROM users u WHERE u.user_id = auth.uid() AND u.school_id IS NOT NULL)
    OR school_id = 'e1b10000-0000-4000-a000-000000000001'::uuid
  );

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

-- Scoped RLS policies for ict_helpdesk_tickets
CREATE POLICY "ict_helpdesk_select_authenticated" ON public.ict_helpdesk_tickets
  FOR SELECT TO authenticated
  USING (
    school_id = current_user_school_id()
    OR school_id IN (SELECT u.school_id FROM users u WHERE u.user_id = auth.uid() AND u.school_id IS NOT NULL)
    OR school_id = 'e1b10000-0000-4000-a000-000000000001'::uuid
  );

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

-- Scoped RLS policies for ict_lab_schedules
CREATE POLICY "ict_lab_schedules_select_authenticated" ON public.ict_lab_schedules
  FOR SELECT TO authenticated
  USING (
    school_id = current_user_school_id()
    OR school_id IN (SELECT u.school_id FROM users u WHERE u.user_id = auth.uid() AND u.school_id IS NOT NULL)
    OR school_id = 'e1b10000-0000-4000-a000-000000000001'::uuid
  );

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

-- Scoped RLS policies for ict_network_nodes
CREATE POLICY "ict_network_nodes_select_authenticated" ON public.ict_network_nodes
  FOR SELECT TO authenticated
  USING (
    school_id = current_user_school_id()
    OR school_id IN (SELECT u.school_id FROM users u WHERE u.user_id = auth.uid() AND u.school_id IS NOT NULL)
    OR school_id = 'e1b10000-0000-4000-a000-000000000001'::uuid
  );

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

