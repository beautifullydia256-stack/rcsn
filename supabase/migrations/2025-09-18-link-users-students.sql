-- Align schema with app logic: link users to students and ensure lookup fields/policies

-- 1) Ensure students.admission_number exists for lookups (unique optional)
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS admission_number TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS students_admission_number_key
  ON students((lower(admission_number)))
  WHERE admission_number IS NOT NULL AND admission_number <> '';

-- 2) Ensure users.student_id exists and is linked
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS student_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'users_student_fk'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_student_fk
      FOREIGN KEY (student_id)
      REFERENCES students(student_id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- 3) Policy: allow a student to read their own students row via users.student_id linkage
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE polname = 'students self read'
  ) THEN
    CREATE POLICY "students self read" ON students
    FOR SELECT TO authenticated USING (
      student_id = (SELECT u.student_id FROM users u WHERE u.user_id = auth.uid())
    );
  END IF;
END $$;

-- 4) (Optional) Helpful indexes
CREATE INDEX IF NOT EXISTS idx_users_student_id ON users(student_id);
CREATE INDEX IF NOT EXISTS idx_students_school_id ON students(school_id);


