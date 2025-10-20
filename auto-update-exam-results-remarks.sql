-- Auto-update exam results remarks based on Teacher's Remarks Settings
-- Run this in Supabase SQL Editor

-- Create function to get teacher remark based on percentage and subject
CREATE OR REPLACE FUNCTION public.get_teacher_remark_by_percentage(
  p_school_id UUID,
  p_subject TEXT,
  p_percentage NUMERIC
) RETURNS TEXT AS $$
DECLARE
  remark_text TEXT;
BEGIN
  -- Get the matching remark from teacher_remarks_settings
  SELECT trs.comment_text INTO remark_text
  FROM public.teacher_remarks_settings trs
  WHERE trs.school_id = p_school_id
    AND trs.subject = p_subject
    AND p_percentage >= trs.min_percent
    AND p_percentage <= trs.max_percent
  ORDER BY trs.min_percent
  LIMIT 1;
  
  -- Return the remark or a default message
  RETURN COALESCE(remark_text, 'No comment available');
END;
$$ LANGUAGE plpgsql;

-- Create function to auto-update exam results remarks
CREATE OR REPLACE FUNCTION public.auto_update_exam_results_remarks()
RETURNS TRIGGER AS $$
DECLARE
  calculated_percentage NUMERIC;
  auto_remark TEXT;
BEGIN
  -- Calculate percentage
  calculated_percentage := (NEW.marks_obtained / NEW.total_marks) * 100;
  
  -- Get auto-generated remark from teacher_remarks_settings
  auto_remark := public.get_teacher_remark_by_percentage(
    NEW.school_id,
    NEW.subject,
    calculated_percentage
  );
  
  -- Only update if there's no existing remark (preserve manual remarks)
  -- OR if the marks have changed significantly (update auto-generated remarks)
  IF NEW.remarks IS NULL OR NEW.remarks = '' OR NEW.remarks = auto_remark THEN
    NEW.remarks := auto_remark;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_update_exam_results_remarks ON public.exam_results;

-- Create trigger to auto-update remarks on INSERT and UPDATE
CREATE TRIGGER trigger_auto_update_exam_results_remarks
  BEFORE INSERT OR UPDATE ON public.exam_results
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_update_exam_results_remarks();

-- Test the function
SELECT 'Trigger created successfully' as status;
