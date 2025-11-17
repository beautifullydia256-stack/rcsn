-- Update existing exam results with correct teacher remarks
-- Run this in Supabase SQL Editor

-- Function to update all existing exam results with correct remarks
CREATE OR REPLACE FUNCTION public.update_all_exam_results_remarks()
RETURNS TABLE(
  updated_count INTEGER,
  sample_updates TEXT[]
) AS $$
DECLARE
  update_count INTEGER := 0;
  sample_results TEXT[] := ARRAY[]::TEXT[];
  rec RECORD;
BEGIN
  -- Update all exam results with auto-generated remarks
  UPDATE public.exam_results 
  SET remarks = public.get_teacher_remark_by_percentage(
    school_id,
    subject,
    (marks_obtained / total_marks) * 100
  )
  WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d';
  
  GET DIAGNOSTICS update_count = ROW_COUNT;
  
  -- Get sample of updated results
  FOR rec IN 
    SELECT 
      er.subject,
      er.marks_obtained,
      er.total_marks,
      er.remarks,
      ROUND((er.marks_obtained / er.total_marks) * 100, 1) as percentage
    FROM public.exam_results er
    WHERE er.school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
    ORDER BY er.created_at DESC
    LIMIT 5
  LOOP
    sample_results := sample_results || 
      ARRAY[rec.subject || ': ' || rec.marks_obtained || '/' || rec.total_marks || 
            ' (' || rec.percentage || '%) -> ' || rec.remarks];
  END LOOP;
  
  RETURN QUERY SELECT update_count, sample_results;
END;
$$ LANGUAGE plpgsql;

-- Run the update function
SELECT * FROM public.update_all_exam_results_remarks();
