-- Student attendance per class per date
CREATE TABLE IF NOT EXISTS student_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(school_id) ON DELETE CASCADE,
  class_name TEXT NOT NULL,
  student_id UUID NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(teacher_id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  present BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (student_id, date)
);

ALTER TABLE student_attendance ENABLE ROW LEVEL SECURITY;

-- RLS: teacher for their school can manage; owner all
DROP POLICY IF EXISTS "st_att teacher manage" ON student_attendance;
CREATE POLICY "st_att teacher manage" ON student_attendance
FOR ALL TO authenticated
USING (
  school_id IN (SELECT school_id FROM schools WHERE admin_id = auth.uid())
  OR teacher_id = auth.uid()
)
WITH CHECK (
  school_id IN (SELECT school_id FROM schools WHERE admin_id = auth.uid())
  OR teacher_id = auth.uid()
);

DROP POLICY IF EXISTS "st_att owner all" ON student_attendance;
CREATE POLICY "st_att owner all" ON student_attendance
FOR ALL TO authenticated
USING ((SELECT role FROM users WHERE user_id = auth.uid()) = 'owner')
WITH CHECK ((SELECT role FROM users WHERE user_id = auth.uid()) = 'owner');

CREATE INDEX IF NOT EXISTS idx_student_attendance_class_date ON student_attendance(class_name, date);


