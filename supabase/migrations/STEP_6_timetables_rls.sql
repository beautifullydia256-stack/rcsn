-- STEP 6: Add RLS Policies for Timetables
-- Run this after Step 5 succeeds

-- Drop existing policies if they exist (safe to re-run)
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

