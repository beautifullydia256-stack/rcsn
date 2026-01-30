-- Enhance snapshot schema with all required report data fields
-- This migration adds fields needed for complete report generation

-- Add additional fields to report_snapshot_data
ALTER TABLE report_snapshot_data
ADD COLUMN IF NOT EXISTS fees_balance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS fees_paid NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS student_photo_url TEXT,
ADD COLUMN IF NOT EXISTS school_logo_url TEXT,
ADD COLUMN IF NOT EXISTS position_in_class INTEGER,
ADD COLUMN IF NOT EXISTS aggregate_score NUMERIC,
ADD COLUMN IF NOT EXISTS total_marks NUMERIC,
ADD COLUMN IF NOT EXISTS average_percentage NUMERIC,
ADD COLUMN IF NOT EXISTS division TEXT,
ADD COLUMN IF NOT EXISTS behaviour_summary JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS fees_expected NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS fees_total_paid NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS exam_set_name TEXT,
ADD COLUMN IF NOT EXISTS exam_set_term INTEGER,
ADD COLUMN IF NOT EXISTS exam_set_year INTEGER;

-- Add indexes for new fields
CREATE INDEX IF NOT EXISTS idx_snapshot_data_position ON report_snapshot_data(snapshot_id, position_in_class);
CREATE INDEX IF NOT EXISTS idx_snapshot_data_class ON report_snapshot_data(snapshot_id, class_name);

-- Add metadata fields to report_snapshots for better tracking
ALTER TABLE report_snapshots
ADD COLUMN IF NOT EXISTS student_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS class_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS generation_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS generation_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS generation_duration_seconds INTEGER;

-- Function to update student count after snapshot data insertion
CREATE OR REPLACE FUNCTION update_snapshot_student_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE report_snapshots
  SET student_count = (
    SELECT COUNT(DISTINCT student_id)
    FROM report_snapshot_data
    WHERE snapshot_id = NEW.snapshot_id
  )
  WHERE id = NEW.snapshot_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update student count
DROP TRIGGER IF EXISTS trigger_update_snapshot_student_count ON report_snapshot_data;
CREATE TRIGGER trigger_update_snapshot_student_count
AFTER INSERT ON report_snapshot_data
FOR EACH ROW
EXECUTE FUNCTION update_snapshot_student_count();




