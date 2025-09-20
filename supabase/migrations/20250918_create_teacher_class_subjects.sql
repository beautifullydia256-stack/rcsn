-- Links a teacher to a class and a subject for that class
CREATE TABLE IF NOT EXISTS teacher_class_subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(school_id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(teacher_id) ON DELETE CASCADE,
  class_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (teacher_id, class_name, subject)
);

ALTER TABLE teacher_class_subjects ENABLE ROW LEVEL SECURITY;

-- RLS: school admin manage; owner all
DROP POLICY IF EXISTS "tcs admin manage" ON teacher_class_subjects;
CREATE POLICY "tcs admin manage" ON teacher_class_subjects
FOR ALL TO authenticated
USING (
  school_id IN (SELECT school_id FROM schools WHERE admin_id = auth.uid())
)
WITH CHECK (
  school_id IN (SELECT school_id FROM schools WHERE admin_id = auth.uid())
);

DROP POLICY IF EXISTS "tcs owner all" ON teacher_class_subjects;
CREATE POLICY "tcs owner all" ON teacher_class_subjects
FOR ALL TO authenticated
USING (
  (SELECT role FROM users WHERE user_id = auth.uid()) = 'owner'
)
WITH CHECK (
  (SELECT role FROM users WHERE user_id = auth.uid()) = 'owner'
);

CREATE INDEX IF NOT EXISTS idx_tcs_school_class ON teacher_class_subjects(school_id, class_name);
CREATE INDEX IF NOT EXISTS idx_tcs_teacher ON teacher_class_subjects(teacher_id);


