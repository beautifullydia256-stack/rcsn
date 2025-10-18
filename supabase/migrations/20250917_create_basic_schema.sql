-- Create basic schema tables first
-- This migration creates the foundational tables that other migrations depend on

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT CHECK (role IN ('owner','admin','teacher','parent','student','accountant','librarian','head_teacher')) NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  school_id UUID,
  -- optional linkage to student row for student accounts
  student_id UUID,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Schools table
CREATE TABLE IF NOT EXISTS schools (
  school_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  type TEXT CHECK (type IN ('Nursery/Primary','Secondary')) NOT NULL,
  admin_id UUID,
  subscription_plan TEXT DEFAULT 'Free (0-20)',
  student_count INTEGER DEFAULT 0,
  wifi_ssid TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add foreign key constraints after both tables exist
ALTER TABLE users ADD CONSTRAINT fk_users_school_id FOREIGN KEY (school_id) REFERENCES schools(school_id);
ALTER TABLE schools ADD CONSTRAINT fk_schools_admin_id FOREIGN KEY (admin_id) REFERENCES users(user_id);

-- Students table
CREATE TABLE IF NOT EXISTS students (
  student_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(school_id) NOT NULL,
  name TEXT NOT NULL,
  current_class TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','graduated')),
  graduation_year INTEGER,
  repeat_year BOOLEAN DEFAULT FALSE,
  expected_fee_amount NUMERIC,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add foreign key constraint for users.student_id
ALTER TABLE users ADD CONSTRAINT fk_users_student_id FOREIGN KEY (student_id) REFERENCES students(student_id);

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies
CREATE POLICY "Users can view their own data" ON users FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own data" ON users FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their school data" ON schools FOR SELECT USING (
  school_id IN (SELECT school_id FROM users WHERE user_id = auth.uid())
);

CREATE POLICY "Users can view students in their school" ON students FOR SELECT USING (
  school_id IN (SELECT school_id FROM users WHERE user_id = auth.uid())
);
