-- Migration: Create tables for Teacher Dashboard features (SAFE VERSION)
-- Date: 2025-01-25
-- Description: Adds timetables, assignments, messages, and notifications tables for the new AI-powered teacher dashboard
-- 
-- SAFETY NOTES:
-- - Uses IF NOT EXISTS for all CREATE TABLE statements (won't break if tables exist)
-- - Uses DROP POLICY IF EXISTS before creating policies (safe to re-run)
-- - All RLS policies use existing columns only (users.role, not user_type)
-- - No ALTER TABLE statements that modify existing tables
-- - This migration is safe to run multiple times
-- - Will NOT disrupt existing database structure

-- ============================================
-- 1. Timetables Table
-- ============================================
CREATE TABLE IF NOT EXISTS timetables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES teachers(teacher_id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(school_id) ON DELETE CASCADE,
  class_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Monday, 6=Sunday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timetables_teacher ON timetables(teacher_id);
CREATE INDEX IF NOT EXISTS idx_timetables_school ON timetables(school_id);
CREATE INDEX IF NOT EXISTS idx_timetables_day ON timetables(day_of_week);

-- Enable RLS
ALTER TABLE timetables ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (safe operation)
DROP POLICY IF EXISTS "timetables_teacher_view" ON timetables;
DROP POLICY IF EXISTS "timetables_admin_manage" ON timetables;

-- RLS Policy: Teachers can view their own timetables
CREATE POLICY "timetables_teacher_view" ON timetables
  FOR SELECT
  TO authenticated
  USING (
    teacher_id IN (
      SELECT teacher_id FROM teachers 
      WHERE school_id IN (
        SELECT school_id FROM users WHERE user_id = auth.uid()
      )
    )
    OR school_id IN (SELECT school_id FROM schools WHERE admin_id = auth.uid())
  );

-- RLS Policy: Admins can manage timetables for their school
CREATE POLICY "timetables_admin_manage" ON timetables
  FOR ALL
  TO authenticated
  USING (
    school_id IN (SELECT school_id FROM schools WHERE admin_id = auth.uid())
    OR school_id IN (SELECT school_id FROM users WHERE user_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    school_id IN (SELECT school_id FROM schools WHERE admin_id = auth.uid())
    OR school_id IN (SELECT school_id FROM users WHERE user_id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- 2. Assignments Table
-- ============================================
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES teachers(teacher_id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(school_id) ON DELETE CASCADE,
  class_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(student_id) ON DELETE CASCADE,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  file_url TEXT,
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'graded', 'late')),
  grade NUMERIC,
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assignments_teacher ON assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_assignments_school ON assignments(school_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student ON assignment_submissions(student_id);

-- Enable RLS
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (safe operation)
DROP POLICY IF EXISTS "assignments_teacher_manage" ON assignments;
DROP POLICY IF EXISTS "assignments_student_view" ON assignments;
DROP POLICY IF EXISTS "assignment_submissions_student_submit" ON assignment_submissions;
DROP POLICY IF EXISTS "assignment_submissions_teacher_manage" ON assignment_submissions;

-- RLS Policy: Teachers can manage their assignments
CREATE POLICY "assignments_teacher_manage" ON assignments
  FOR ALL
  TO authenticated
  USING (
    teacher_id IN (
      SELECT teacher_id FROM teachers 
      WHERE school_id IN (
        SELECT school_id FROM users WHERE user_id = auth.uid()
      )
    )
    OR school_id IN (SELECT school_id FROM schools WHERE admin_id = auth.uid())
  )
  WITH CHECK (
    teacher_id IN (
      SELECT teacher_id FROM teachers 
      WHERE school_id IN (
        SELECT school_id FROM users WHERE user_id = auth.uid()
      )
    )
    OR school_id IN (SELECT school_id FROM schools WHERE admin_id = auth.uid())
  );

-- RLS Policy: Students can view assignments for their class
CREATE POLICY "assignments_student_view" ON assignments
  FOR SELECT
  TO authenticated
  USING (
    class_name IN (
      SELECT current_class FROM students 
      WHERE student_id IN (
        SELECT student_id FROM users WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policy: Students can submit assignments
CREATE POLICY "assignment_submissions_student_submit" ON assignment_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id IN (
      SELECT student_id FROM users WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Teachers can view and grade submissions
CREATE POLICY "assignment_submissions_teacher_manage" ON assignment_submissions
  FOR ALL
  TO authenticated
  USING (
    assignment_id IN (
      SELECT id FROM assignments 
      WHERE teacher_id IN (
        SELECT teacher_id FROM teachers 
        WHERE school_id IN (
          SELECT school_id FROM users WHERE user_id = auth.uid()
        )
      )
    )
  )
  WITH CHECK (
    assignment_id IN (
      SELECT id FROM assignments 
      WHERE teacher_id IN (
        SELECT teacher_id FROM teachers 
        WHERE school_id IN (
          SELECT school_id FROM users WHERE user_id = auth.uid()
        )
      )
    )
  );

-- ============================================
-- 3. Messages Table
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('admin', 'parent', 'student', 'teacher', 'owner')),
  recipient_id UUID NOT NULL,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('teacher', 'admin', 'parent', 'student', 'owner')),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id, recipient_type);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id, sender_type);
CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(recipient_id, read);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (safe operation)
DROP POLICY IF EXISTS "messages_user_view" ON messages;
DROP POLICY IF EXISTS "messages_user_send" ON messages;
DROP POLICY IF EXISTS "messages_user_update" ON messages;

-- RLS Policy: Users can view messages sent to or from them
CREATE POLICY "messages_user_view" ON messages
  FOR SELECT
  TO authenticated
  USING (
    recipient_id = auth.uid() 
    OR sender_id = auth.uid()
    OR (
      recipient_type = 'teacher' AND recipient_id IN (
        SELECT teacher_id FROM teachers 
        WHERE school_id IN (
          SELECT school_id FROM users WHERE user_id = auth.uid()
        )
      )
    )
  );

-- RLS Policy: Users can send messages
CREATE POLICY "messages_user_send" ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    OR (
      sender_type = 'admin' AND sender_id IN (
        SELECT user_id FROM users 
        WHERE role = 'admin' 
        AND school_id IN (
          SELECT school_id FROM users WHERE user_id = auth.uid()
        )
      )
    )
  );

-- RLS Policy: Users can mark their messages as read
CREATE POLICY "messages_user_update" ON messages
  FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- ============================================
-- 4. Notifications Table
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('teacher', 'admin', 'student', 'parent', 'owner')),
  type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, user_type);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (safe operation)
DROP POLICY IF EXISTS "notifications_user_view" ON notifications;
DROP POLICY IF EXISTS "notifications_system_create" ON notifications;
DROP POLICY IF EXISTS "notifications_user_update" ON notifications;

-- RLS Policy: Users can view their own notifications
-- Simple policy: user_id in notifications should match auth.uid() or related IDs
-- The user_type column is just metadata for filtering, we match by user_id only
CREATE POLICY "notifications_user_view" ON notifications
  FOR SELECT
  TO authenticated
  USING (
    -- Direct match: user_id matches authenticated user (for users table)
    user_id = auth.uid()
    -- For teachers: if user_id in notifications is a teacher_id, match via email
    OR user_id IN (
      SELECT teacher_id FROM teachers 
      WHERE email IN (
        SELECT email FROM users WHERE user_id = auth.uid()
      )
    )
    -- For students: if user_id in notifications is a student_id, match via users table
    OR user_id IN (
      SELECT student_id FROM users WHERE user_id = auth.uid()
    )
    -- For parents: match via parent-student relationship
    OR user_id IN (
      SELECT parent_id FROM parents 
      WHERE student_id IN (
        SELECT student_id FROM users WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policy: System can create notifications (handled by service role)
-- This allows authenticated users to create notifications, but should be restricted in app code
CREATE POLICY "notifications_system_create" ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true); -- Will be restricted by service role in application code

-- RLS Policy: Users can mark their own notifications as read
CREATE POLICY "notifications_user_update" ON notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE timetables IS 'Teacher class schedules and timetables';
COMMENT ON TABLE assignments IS 'Teacher assignments and homework';
COMMENT ON TABLE assignment_submissions IS 'Student submissions for assignments';
COMMENT ON TABLE messages IS 'Internal messaging system between users';
COMMENT ON TABLE notifications IS 'System notifications for users';

