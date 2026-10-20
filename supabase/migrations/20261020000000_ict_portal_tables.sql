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

-- Seed initial 30 workstations for RCSN Computer Lab if table is empty
INSERT INTO public.ict_workstations (school_id, station_code, row_number, cpu_specs, ram_gb, storage_specs, os_version, has_ups, mouse_status, keyboard_status, monitor_status, overall_status)
SELECT
  'e1b10000-0000-4000-a000-000000000001',
  'PC-' || LPAD(s.n::text, 2, '0'),
  'Row ' || (((s.n - 1) / 6) + 1)::text,
  'Intel Core i5-8500',
  8,
  '256GB SSD',
  'Windows 11 Pro',
  true,
  'working',
  'working',
  'working',
  'operational'
FROM generate_series(1, 30) AS s(n)
ON CONFLICT (school_id, station_code) DO NOTHING;

-- Seed Network & CCTV infrastructure if empty
INSERT INTO public.ict_network_nodes (school_id, name, device_type, location, ip_address, status)
VALUES
  ('e1b10000-0000-4000-a000-000000000001', 'Main Gateway Router (Fiber)', 'router', 'Server Room', '192.168.1.1', 'online'),
  ('e1b10000-0000-4000-a000-000000000001', 'Core 24-Port Switch A', 'switch', 'Server Room', '192.168.1.2', 'online'),
  ('e1b10000-0000-4000-a000-000000000001', 'Admin Block Wi-Fi AP', 'access_point', 'Admin Block Corridor', '192.168.1.10', 'online'),
  ('e1b10000-0000-4000-a000-000000000001', 'Computer Lab High-Density AP', 'access_point', 'Computer Lab', '192.168.1.11', 'online'),
  ('e1b10000-0000-4000-a000-000000000001', 'Library Wi-Fi AP', 'access_point', 'Library Reading Hall', '192.168.1.12', 'online'),
  ('e1b10000-0000-4000-a000-000000000001', 'Lecture Hall 1 Wi-Fi AP', 'access_point', 'Lecture Block A', '192.168.1.13', 'online'),
  ('e1b10000-0000-4000-a000-000000000001', 'CCTV 01 - Campus Main Gate', 'cctv_camera', 'Security Gatehouse', '192.168.1.51', 'online'),
  ('e1b10000-0000-4000-a000-000000000001', 'CCTV 02 - Admin Reception', 'cctv_camera', 'Admin Foyer', '192.168.1.52', 'online'),
  ('e1b10000-0000-4000-a000-000000000001', 'CCTV 03 - Computer Laboratory', 'cctv_camera', 'Computer Lab Interior', '192.168.1.53', 'online'),
  ('e1b10000-0000-4000-a000-000000000001', 'CCTV 04 - Skills Laboratory', 'cctv_camera', 'Skills Lab Entrance', '192.168.1.54', 'online')
ON CONFLICT DO NOTHING;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
