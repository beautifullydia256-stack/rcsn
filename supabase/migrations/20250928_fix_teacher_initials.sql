-- Fix teacher initials in processed results
-- Check if teacher_initials are missing and update them

-- First, let's see what's in the processed results
SELECT 
  subject,
  teacher_initials,
  teacher_remark,
  marks_obtained,
  total_marks
FROM processed_primary_exam_results 
LIMIT 10;

-- Update teacher initials from exam_results if they're missing
UPDATE processed_primary_exam_results 
SET teacher_initials = (
  SELECT er.teacher_initials 
  FROM exam_results er 
  WHERE er.school_id = processed_primary_exam_results.school_id
    AND er.student_id = processed_primary_exam_results.student_id
    AND er.exam_set_id = processed_primary_exam_results.exam_set_id
    AND er.subject = processed_primary_exam_results.subject
  LIMIT 1
)
WHERE teacher_initials IS NULL OR teacher_initials = '';

-- If still no initials, set a default based on the subject or use a generic one
UPDATE processed_primary_exam_results 
SET teacher_initials = CASE 
  WHEN subject ILIKE '%english%' THEN 'ET'
  WHEN subject ILIKE '%math%' THEN 'MT'
  WHEN subject ILIKE '%science%' THEN 'ST'
  WHEN subject ILIKE '%social%' THEN 'SST'
  WHEN subject ILIKE '%religious%' THEN 'RT'
  WHEN subject ILIKE '%physical%' THEN 'PT'
  WHEN subject ILIKE '%art%' THEN 'AT'
  WHEN subject ILIKE '%music%' THEN 'MT'
  ELSE 'T'
END
WHERE teacher_initials IS NULL OR teacher_initials = '';

-- Show updated results
SELECT 
  subject,
  teacher_initials,
  teacher_remark,
  marks_obtained,
  total_marks
FROM processed_primary_exam_results 
WHERE teacher_initials IS NOT NULL AND teacher_initials != ''
LIMIT 10;
