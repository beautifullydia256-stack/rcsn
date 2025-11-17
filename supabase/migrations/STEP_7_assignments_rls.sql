-- STEP 7: Add RLS Policies for Assignments
-- Run this after Step 6 succeeds

-- Drop existing policies if they exist (safe to re-run)
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

