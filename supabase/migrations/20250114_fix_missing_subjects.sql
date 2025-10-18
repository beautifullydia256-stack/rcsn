-- Fix missing subjects in processed_primary_exam_results
-- Ensure all students have entries for all subjects that ANY student has results for

-- First, let's see what we have currently
SELECT 
  school_id,
  class_name,
  exam_set_id,
  COUNT(DISTINCT subject) as subject_count,
  COUNT(DISTINCT student_id) as student_count
FROM processed_primary_exam_results 
GROUP BY school_id, class_name, exam_set_id
ORDER BY school_id, class_name, exam_set_id;

-- Get all subjects that ANY student has results for in each class/exam set
WITH all_subjects_per_class AS (
  SELECT 
    school_id,
    class_name,
    exam_set_id,
    ARRAY_AGG(DISTINCT subject ORDER BY subject) as all_subjects
  FROM processed_primary_exam_results 
  GROUP BY school_id, class_name, exam_set_id
),
-- Get all students in each class/exam set
all_students_per_class AS (
  SELECT 
    school_id,
    class_name,
    exam_set_id,
    ARRAY_AGG(DISTINCT student_id) as all_students
  FROM processed_primary_exam_results 
  GROUP BY school_id, class_name, exam_set_id
),
-- Create missing entries
missing_entries AS (
  SELECT 
    s.school_id,
    s.class_name,
    s.exam_set_id,
    unnested_student_id as student_id,
    unnested_subject as subject,
    -- Get exam set details
    es.year,
    es.term,
    es.name as exam_set_name,
    -- Get student details
    st.name as student_name,
    st.admission_number,
    st.current_class,
    -- Get class teacher comment from any existing result for this student
    (SELECT class_teacher_comment FROM processed_primary_exam_results pper2 
     WHERE pper2.school_id = s.school_id 
       AND pper2.student_id = unnested_student_id 
       AND pper2.exam_set_id = s.exam_set_id 
     LIMIT 1) as class_teacher_comment
  FROM all_students_per_class s
  CROSS JOIN LATERAL unnest(s.all_students) as unnested_student_id
  CROSS JOIN all_subjects_per_class subj
  CROSS JOIN LATERAL unnest(subj.all_subjects) as unnested_subject
  JOIN exam_sets es ON es.id = s.exam_set_id AND es.school_id = s.school_id
  JOIN students st ON st.student_id = unnested_student_id AND st.school_id = s.school_id
  WHERE s.school_id = subj.school_id 
    AND s.class_name = subj.class_name 
    AND s.exam_set_id = subj.exam_set_id
    -- Only include combinations that don't already exist
    AND NOT EXISTS (
      SELECT 1 FROM processed_primary_exam_results pper 
      WHERE pper.school_id = s.school_id 
        AND pper.student_id = unnested_student_id 
        AND pper.exam_set_id = s.exam_set_id 
        AND pper.subject = unnested_subject
    )
)
-- Insert missing entries
INSERT INTO processed_primary_exam_results (
  school_id,
  student_id,
  exam_set_id,
  year,
  term,
  exam_set_name,
  student_name,
  class_name,
  admission_number,
  subject,
  marks_obtained,
  total_marks,
  grade,
  teacher_remark,
  teacher_initials,
  class_teacher_comment
)
SELECT 
  school_id,
  student_id,
  exam_set_id,
  year,
  term,
  exam_set_name,
  student_name,
  current_class,
  admission_number,
  subject,
  0 as marks_obtained,
  100 as total_marks,
  'MISSED' as grade,
  'MISSED' as teacher_remark,
  'MISSED' as teacher_initials,
  class_teacher_comment
FROM missing_entries;

-- Show the results after the fix
SELECT 
  school_id,
  class_name,
  exam_set_id,
  COUNT(DISTINCT subject) as subject_count,
  COUNT(DISTINCT student_id) as student_count,
  COUNT(*) as total_entries
FROM processed_primary_exam_results 
GROUP BY school_id, class_name, exam_set_id
ORDER BY school_id, class_name, exam_set_id;
