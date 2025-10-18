-- Create teacher_attendance_logs table for GPS-based attendance tracking
-- This replaces the old WiFi-based system with location verification

CREATE TABLE IF NOT EXISTS teacher_attendance_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(school_id) ON DELETE CASCADE,
  date DATE NOT NULL,
  punch_in TIMESTAMP WITH TIME ZONE,
  punch_out TIMESTAMP WITH TIME ZONE,
  location_verified BOOLEAN DEFAULT FALSE,
  location_method TEXT CHECK (location_method IN ('gps', 'ip', 'none')) DEFAULT 'none',
  location_distance DECIMAL(10, 2), -- distance in meters
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one record per teacher per day
  UNIQUE(teacher_id, date)
);

-- Add comments for documentation
COMMENT ON TABLE teacher_attendance_logs IS 'GPS-based teacher attendance tracking with location verification';
COMMENT ON COLUMN teacher_attendance_logs.location_verified IS 'Whether location was verified when punching in/out';
COMMENT ON COLUMN teacher_attendance_logs.location_method IS 'Method used for location verification (gps, ip, none)';
COMMENT ON COLUMN teacher_attendance_logs.location_distance IS 'Distance from school in meters when location was verified';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_logs_teacher_id ON teacher_attendance_logs(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_logs_school_id ON teacher_attendance_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_logs_date ON teacher_attendance_logs(date);
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_logs_teacher_date ON teacher_attendance_logs(teacher_id, date);

-- Enable Row Level Security
ALTER TABLE teacher_attendance_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Teachers can view and modify their own attendance logs
CREATE POLICY "Teachers can view own attendance logs" ON teacher_attendance_logs
  FOR SELECT USING (
    teacher_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'owner', 'head_teacher')
      AND school_id = teacher_attendance_logs.school_id
    )
  );

CREATE POLICY "Teachers can insert own attendance logs" ON teacher_attendance_logs
  FOR INSERT WITH CHECK (
    teacher_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE user_id = auth.uid() 
      AND role = 'teacher'
      AND school_id = teacher_attendance_logs.school_id
    )
  );

CREATE POLICY "Teachers can update own attendance logs" ON teacher_attendance_logs
  FOR UPDATE USING (
    teacher_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE user_id = auth.uid() 
      AND role = 'teacher'
      AND school_id = teacher_attendance_logs.school_id
    )
  );

-- Admins, owners, and head teachers can view all attendance logs for their school
CREATE POLICY "Admins can view all school attendance logs" ON teacher_attendance_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'owner', 'head_teacher')
      AND school_id = teacher_attendance_logs.school_id
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_teacher_attendance_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_teacher_attendance_logs_updated_at
  BEFORE UPDATE ON teacher_attendance_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_teacher_attendance_logs_updated_at();
