-- Snapshot-based Report System (Arbor MIS-style)
-- This migration creates tables for frozen report data and cached generated reports

-- Snapshot table for frozen assessment data
CREATE TABLE IF NOT EXISTS report_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(school_id) ON DELETE CASCADE,
  term INTEGER NOT NULL,
  year INTEGER NOT NULL,
  exam_set_id UUID REFERENCES exam_sets(id) ON DELETE SET NULL,
  template_id UUID REFERENCES report_templates(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  locked_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'locked', 'generated')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Snapshot data (frozen student data at snapshot time)
CREATE TABLE IF NOT EXISTS report_snapshot_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL REFERENCES report_snapshots(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  class_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  marks_obtained NUMERIC,
  total_marks NUMERIC,
  grade TEXT,
  remarks TEXT,
  teacher_initials TEXT,
  teacher_comment TEXT,
  class_teacher_comment TEXT,
  headteacher_comment TEXT,
  attendance_percentage NUMERIC,
  position INTEGER,
  aggregate NUMERIC,
  -- All other report fields frozen at snapshot time
  frozen_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Generated reports cache
CREATE TABLE IF NOT EXISTS generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL REFERENCES report_snapshots(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  template_id UUID REFERENCES report_templates(id) ON DELETE SET NULL,
  report_data JSONB NOT NULL, -- Precomputed report object
  pdf_url TEXT, -- Cached PDF URL
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  template_version TEXT,
  generated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  file_size_bytes INTEGER,
  UNIQUE(snapshot_id, student_id, template_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_report_snapshots_school_id ON report_snapshots(school_id);
CREATE INDEX IF NOT EXISTS idx_report_snapshots_status ON report_snapshots(status);
CREATE INDEX IF NOT EXISTS idx_report_snapshots_term_year ON report_snapshots(term, year);
CREATE INDEX IF NOT EXISTS idx_report_snapshot_data_snapshot_id ON report_snapshot_data(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_report_snapshot_data_student_id ON report_snapshot_data(student_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_snapshot_id ON generated_reports(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_student_id ON generated_reports(student_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_template_id ON generated_reports(template_id);

-- RLS Policies
ALTER TABLE report_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_snapshot_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_reports ENABLE ROW LEVEL SECURITY;

-- Snapshot policies
CREATE POLICY "Users can view snapshots for their school"
  ON report_snapshots FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can create snapshots for their school"
  ON report_snapshots FOR INSERT
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM users WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update snapshots for their school"
  ON report_snapshots FOR UPDATE
  USING (
    school_id IN (
      SELECT school_id FROM users WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Snapshot data policies
CREATE POLICY "Users can view snapshot data for their school"
  ON report_snapshot_data FOR SELECT
  USING (
    snapshot_id IN (
      SELECT id FROM report_snapshots
      WHERE school_id IN (
        SELECT school_id FROM users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "System can insert snapshot data"
  ON report_snapshot_data FOR INSERT
  WITH CHECK (true); -- Controlled by application logic

-- Generated reports policies
CREATE POLICY "Users can view generated reports for their school"
  ON generated_reports FOR SELECT
  USING (
    snapshot_id IN (
      SELECT id FROM report_snapshots
      WHERE school_id IN (
        SELECT school_id FROM users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "System can insert generated reports"
  ON generated_reports FOR INSERT
  WITH CHECK (true); -- Controlled by application logic

-- Function to lock a snapshot (make it immutable)
CREATE OR REPLACE FUNCTION lock_report_snapshot(p_snapshot_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE report_snapshots
  SET 
    status = 'locked',
    locked_at = NOW()
  WHERE id = p_snapshot_id
    AND status = 'draft';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Snapshot not found or already locked';
  END IF;
END;
$$;

-- Function to check if snapshot is locked
CREATE OR REPLACE FUNCTION is_snapshot_locked(p_snapshot_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_status TEXT;
BEGIN
  SELECT status INTO v_status
  FROM report_snapshots
  WHERE id = p_snapshot_id;
  
  RETURN v_status IN ('locked', 'generated');
END;
$$;




