-- PwezaCore Database Schema
-- Multi-tenant school management system

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- Users table
CREATE TABLE users (
  user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role TEXT CHECK (role IN ('owner','admin','teacher','parent','student','accountant','librarian','head_teacher')) NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  school_id UUID REFERENCES schools(school_id),
  -- optional linkage to student row for student accounts
  student_id UUID REFERENCES students(student_id),
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Schools table
CREATE TABLE schools (
  school_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  type TEXT CHECK (type IN ('Nursery/Primary','Secondary')) NOT NULL,
  admin_id UUID REFERENCES users(user_id),
  subscription_plan TEXT DEFAULT 'Free (0-20)',
  student_count INTEGER DEFAULT 0,
  wifi_ssid TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Students table
CREATE TABLE students (
  student_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(school_id) NOT NULL,
  name TEXT NOT NULL,
  current_class TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','graduated')),
  graduation_year INTEGER,
  repeat_year BOOLEAN DEFAULT FALSE,
  expected_fee_amount NUMERIC,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Old Students (graduated) table
CREATE TABLE old_students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID UNIQUE REFERENCES students(student_id),
  name TEXT NOT NULL,
  school_id UUID REFERENCES schools(school_id),
  final_class TEXT NOT NULL,
  graduation_year INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Teachers table
CREATE TABLE teachers (
  teacher_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  school_id UUID REFERENCES schools(school_id) NOT NULL,
  phone TEXT,
  address TEXT,
  gender TEXT CHECK (gender IN ('Male','Female','Other')),
  dob DATE,
  national_id TEXT,
  employee_id TEXT UNIQUE,
  date_of_hire DATE DEFAULT CURRENT_DATE,
  subjects TEXT[] DEFAULT '{}',
  classes TEXT[] DEFAULT '{}',
  experience TEXT,
  qualification TEXT,
  salary NUMERIC,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Exam Results table
CREATE TABLE exam_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES schools(school_id) ON DELETE CASCADE,
  exam_set_id UUID NOT NULL,
  student_id UUID NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  class_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  marks_obtained NUMERIC NOT NULL DEFAULT 0,
  total_marks NUMERIC NOT NULL DEFAULT 100,
  grade TEXT,
  remarks TEXT,
  -- Secondary school specific columns
  activity_score NUMERIC(3,1),
  descriptor TEXT,
  formative_score NUMERIC(4,1),
  exam_score NUMERIC(4,1),
  final_score NUMERIC(4,1),
  overall_remark TEXT,
  teacher_initials TEXT,
  topic TEXT,
  teacher_id UUID REFERENCES teachers(teacher_id) ON DELETE CASCADE,
  nursery_skill_performance JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Parents table
CREATE TABLE parents (
  parent_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  student_id UUID REFERENCES students(student_id) NOT NULL,
  school_id UUID REFERENCES schools(school_id) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Attendance table
CREATE TABLE attendance (
  attendance_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID REFERENCES teachers(teacher_id),
  school_id UUID REFERENCES schools(school_id) NOT NULL,
  type TEXT CHECK (type IN ('punch_in','punch_out')) NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  ip_address TEXT
);

-- Grades table
CREATE TABLE grades (
  grade_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(student_id) NOT NULL,
  teacher_id UUID REFERENCES teachers(teacher_id) NOT NULL,
  subject TEXT NOT NULL,
  grade NUMERIC NOT NULL,
  term TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Payments table
CREATE TABLE payments (
  payment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(student_id) NOT NULL,
  school_id UUID REFERENCES schools(school_id) NOT NULL,
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Reports table
CREATE TABLE reports (
  report_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(student_id) NOT NULL,
  template_name TEXT,
  file_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Receipts table
CREATE TABLE receipts (
  receipt_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(student_id) NOT NULL,
  payment_id UUID REFERENCES payments(payment_id),
  amount NUMERIC NOT NULL,
  payment_method TEXT,
  file_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Jobs table
CREATE TABLE jobs (
  job_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(school_id),
  title TEXT NOT NULL,
  location TEXT,
  description TEXT,
  posted_by TEXT DEFAULT 'owner',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Library table
CREATE TABLE library (
  content_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  uploaded_by TEXT DEFAULT 'owner',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Report Templates table
CREATE TABLE report_templates (
  template_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  school_id UUID REFERENCES schools(school_id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Student Promotion and Graduation Function
CREATE OR REPLACE FUNCTION promote_and_graduate_students()
RETURNS VOID AS $$
DECLARE
    current_year INTEGER := EXTRACT(YEAR FROM NOW());
BEGIN
    -- Graduate Primary 7 students
    INSERT INTO old_students (student_id, name, school_id, final_class, graduation_year)
    SELECT s.student_id, s.name, s.school_id, s.current_class, current_year
    FROM students s
    JOIN schools sch ON s.school_id = sch.school_id
    WHERE sch.type = 'Nursery/Primary'
      AND s.current_class = 'Primary 7'
      AND s.status = 'active'
      AND s.repeat_year = FALSE;

    UPDATE students
    SET status = 'graduated', graduation_year = current_year
    WHERE current_class = 'Primary 7'
      AND school_id IN (SELECT school_id FROM schools WHERE type = 'Nursery/Primary')
      AND status = 'active'
      AND repeat_year = FALSE;

    -- Graduate Senior 4 and Senior 6 students
    INSERT INTO old_students (student_id, name, school_id, final_class, graduation_year)
    SELECT s.student_id, s.name, s.school_id, s.current_class, current_year
    FROM students s
    JOIN schools sch ON s.school_id = sch.school_id
    WHERE sch.type = 'Secondary'
      AND s.current_class IN ('Senior 4', 'Senior 6')
      AND s.status = 'active'
      AND s.repeat_year = FALSE;

    UPDATE students
    SET status = 'graduated', graduation_year = current_year
    WHERE current_class IN ('Senior 4', 'Senior 6')
      AND school_id IN (SELECT school_id FROM schools WHERE type = 'Secondary')
      AND status = 'active'
      AND repeat_year = FALSE;

    -- Promote active students
    UPDATE students
    SET current_class = CASE current_class
        WHEN 'Primary 1' THEN 'Primary 2'
        WHEN 'Primary 2' THEN 'Primary 3'
        WHEN 'Primary 3' THEN 'Primary 4'
        WHEN 'Primary 4' THEN 'Primary 5'
        WHEN 'Primary 5' THEN 'Primary 6'
        WHEN 'Primary 6' THEN 'Primary 7'
        WHEN 'Senior 1' THEN 'Senior 2'
        WHEN 'Senior 2' THEN 'Senior 3'
        WHEN 'Senior 3' THEN 'Senior 4'
        WHEN 'Senior 5' THEN 'Senior 6'
        ELSE current_class
    END
    WHERE status = 'active'
      AND repeat_year = FALSE;
END;
$$ LANGUAGE plpgsql;

-- Schedule yearly promotion (runs on December 31st at midnight)
SELECT cron.schedule('yearly_student_promotion', '0 0 31 12 *', $$ SELECT promote_and_graduate_students(); $$);

-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE old_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE library ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies (safe defaults)

-- Users: self access; admin/owner can manage users in their school
CREATE POLICY "users self select" ON users
FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "users self update" ON users
FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "users self insert" ON users
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "owner all on users" ON users
FOR ALL TO authenticated USING ((SELECT role FROM users WHERE user_id = auth.uid()) = 'owner');

-- Allow admins to manage users in their school
CREATE POLICY "admin select users in school" ON users
FOR SELECT TO authenticated
USING (
  school_id IN (
    SELECT u.school_id FROM users u WHERE u.user_id = auth.uid() AND u.role IN ('admin', 'owner')
  )
);

CREATE POLICY "admin insert users in school" ON users
FOR INSERT TO authenticated
WITH CHECK (
  school_id IN (
    SELECT u.school_id FROM users u WHERE u.user_id = auth.uid() AND u.role IN ('admin', 'owner')
  )
);

CREATE POLICY "admin update users in school" ON users
FOR UPDATE TO authenticated
USING (
  school_id IN (
    SELECT u.school_id FROM users u WHERE u.user_id = auth.uid() AND u.role IN ('admin', 'owner')
  )
)
WITH CHECK (
  school_id IN (
    SELECT u.school_id FROM users u WHERE u.user_id = auth.uid() AND u.role IN ('admin', 'owner')
  )
);

-- Schools: admin can manage their school; owner all
CREATE POLICY "schools admin manage" ON schools
FOR ALL TO authenticated USING (admin_id = auth.uid()) WITH CHECK (admin_id = auth.uid());

CREATE POLICY "owner all on schools" ON schools
FOR ALL TO authenticated USING ((SELECT role FROM users WHERE user_id = auth.uid()) = 'owner');

-- Students: admin of school; owner all
CREATE POLICY "students admin manage" ON students
FOR ALL TO authenticated USING (
  school_id IN (SELECT school_id FROM schools WHERE admin_id = auth.uid())
) WITH CHECK (
  school_id IN (SELECT school_id FROM schools WHERE admin_id = auth.uid())
);

-- Allow student to read their own profile row
CREATE POLICY "students self read" ON students
FOR SELECT TO authenticated USING (
  student_id = (
    SELECT u.student_id FROM users u WHERE u.user_id = auth.uid()
  )
);

CREATE POLICY "owner all on students" ON students
FOR ALL TO authenticated USING ((SELECT role FROM users WHERE user_id = auth.uid()) = 'owner');

-- Teachers: admin of school; owner all
CREATE POLICY "teachers admin manage" ON teachers
FOR ALL TO authenticated USING (
  school_id IN (SELECT school_id FROM schools WHERE admin_id = auth.uid())
) WITH CHECK (
  school_id IN (SELECT school_id FROM schools WHERE admin_id = auth.uid())
);

CREATE POLICY "owner all on teachers" ON teachers
FOR ALL TO authenticated USING ((SELECT role FROM users WHERE user_id = auth.uid()) = 'owner');

-- Parents: admin of school; owner all
CREATE POLICY "parents admin manage" ON parents
FOR ALL TO authenticated USING (
  school_id IN (SELECT school_id FROM schools WHERE admin_id = auth.uid())
) WITH CHECK (
  school_id IN (SELECT school_id FROM schools WHERE admin_id = auth.uid())
);

CREATE POLICY "owner all on parents" ON parents
FOR ALL TO authenticated USING ((SELECT role FROM users WHERE user_id = auth.uid()) = 'owner');

-- Attendance: teacher self; admin of school; owner all
CREATE POLICY "attendance teacher self insert" ON attendance
FOR INSERT TO authenticated WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "attendance teacher self select" ON attendance
FOR SELECT TO authenticated USING (teacher_id = auth.uid());

CREATE POLICY "attendance admin select" ON attendance
FOR SELECT TO authenticated USING (
  school_id IN (SELECT school_id FROM schools WHERE admin_id = auth.uid())
);

CREATE POLICY "owner all on attendance" ON attendance
FOR ALL TO authenticated USING ((SELECT role FROM users WHERE user_id = auth.uid()) = 'owner');

-- Grades: teacher self manage; admin view via student's school; owner all
CREATE POLICY "grades teacher manage" ON grades
FOR ALL TO authenticated USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "grades admin select" ON grades
FOR SELECT TO authenticated USING (
  student_id IN (
    SELECT st.student_id FROM students st
    JOIN schools sch ON st.school_id = sch.school_id
    WHERE sch.admin_id = auth.uid()
  )
);

CREATE POLICY "owner all on grades" ON grades
FOR ALL TO authenticated USING ((SELECT role FROM users WHERE user_id = auth.uid()) = 'owner');

-- Payments/Reports/Receipts: admin via student's school; parent/student self; owner all
CREATE POLICY "payments admin select" ON payments
FOR SELECT TO authenticated USING (
  student_id IN (
    SELECT st.student_id FROM students st
    JOIN schools sch ON st.school_id = sch.school_id
    WHERE sch.admin_id = auth.uid()
  )
);

CREATE POLICY "owner all on payments" ON payments
FOR ALL TO authenticated USING ((SELECT role FROM users WHERE user_id = auth.uid()) = 'owner');

CREATE POLICY "reports admin select" ON reports
FOR SELECT TO authenticated USING (
  student_id IN (
    SELECT st.student_id FROM students st
    JOIN schools sch ON st.school_id = sch.school_id
    WHERE sch.admin_id = auth.uid()
  )
);

CREATE POLICY "reports parent select" ON reports
FOR SELECT TO authenticated USING (
  student_id IN (SELECT student_id FROM parents WHERE parent_id = auth.uid())
);

CREATE POLICY "owner all on reports" ON reports
FOR ALL TO authenticated USING ((SELECT role FROM users WHERE user_id = auth.uid()) = 'owner');

CREATE POLICY "receipts admin select" ON receipts
FOR SELECT TO authenticated USING (
  student_id IN (
    SELECT st.student_id FROM students st
    JOIN schools sch ON st.school_id = sch.school_id
    WHERE sch.admin_id = auth.uid()
  )
);

CREATE POLICY "receipts parent select" ON receipts
FOR SELECT TO authenticated USING (
  student_id IN (SELECT student_id FROM parents WHERE parent_id = auth.uid())
);

CREATE POLICY "owner all on receipts" ON receipts
FOR ALL TO authenticated USING ((SELECT role FROM users WHERE user_id = auth.uid()) = 'owner');

-- Jobs/Library: public read
CREATE POLICY "jobs public read" ON jobs
FOR SELECT TO public USING (TRUE);

CREATE POLICY "library public read" ON library
FOR SELECT TO public USING (TRUE);

-- Insert default owner user (you'll need to replace with actual user ID from Supabase Auth)
-- This should be done after creating the owner user in Supabase Auth
-- INSERT INTO users (user_id, email, role, name) 
-- VALUES ('<owner-user-id>', 'owner@pwezacore.com', 'owner', 'PwezaCore Owner');