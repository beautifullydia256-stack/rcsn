-- Create class_subjects table to track subjects available per class per school
CREATE TABLE IF NOT EXISTS class_subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(school_id) ON DELETE CASCADE,
  class_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (school_id, class_name, subject)
);

ALTER TABLE class_subjects ENABLE ROW LEVEL SECURITY;

-- RLS: admin for the school can manage; owner all
CREATE POLICY IF NOT EXISTS "class_subjects admin manage" ON class_subjects
FOR ALL TO authenticated USING (
  school_id IN (SELECT school_id FROM schools WHERE admin_id = auth.uid())
) WITH CHECK (
  school_id IN (SELECT school_id FROM schools WHERE admin_id = auth.uid())
);

CREATE POLICY IF NOT EXISTS "owner all on class_subjects" ON class_subjects
FOR ALL TO authenticated USING (
  (SELECT role FROM users WHERE user_id = auth.uid()) = 'owner'
);

CREATE INDEX IF NOT EXISTS idx_class_subjects_school_class ON class_subjects(school_id, class_name);


