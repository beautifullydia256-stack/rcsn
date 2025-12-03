-- Create the ensure_all_students_have_all_subjects function
-- This function ensures all students in a class have exam result entries for all subjects
-- that any student in that class has results for (creates MISSED entries for missing ones)

CREATE OR REPLACE FUNCTION ensure_all_students_have_all_subjects(
  p_school_id UUID,
  p_exam_set_id UUID,
  p_class_name TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_subject TEXT;
  v_student_id UUID;
  v_existing_count INTEGER;
BEGIN
  -- Get all distinct subjects that have exam results for this class and exam set
  FOR v_subject IN
    SELECT DISTINCT subject
    FROM public.exam_results
    WHERE school_id = p_school_id
      AND exam_set_id = p_exam_set_id
      AND class_name = p_class_name
  LOOP
    -- For each subject, ensure all active students in the class have an entry
    FOR v_student_id IN
      SELECT student_id
      FROM public.students
      WHERE school_id = p_school_id
        AND current_class = p_class_name
        AND status = 'active'
    LOOP
      -- Check if this student already has an entry for this subject
      SELECT COUNT(*)
      INTO v_existing_count
      FROM public.exam_results
      WHERE school_id = p_school_id
        AND exam_set_id = p_exam_set_id
        AND student_id = v_student_id
        AND class_name = p_class_name
        AND subject = v_subject;
      
      -- If no entry exists, create a MISSED entry
      IF v_existing_count = 0 THEN
        INSERT INTO public.exam_results (
          school_id,
          exam_set_id,
          student_id,
          class_name,
          subject,
          marks_obtained,
          total_marks,
          grade,
          remarks
        )
        VALUES (
          p_school_id,
          p_exam_set_id,
          v_student_id,
          p_class_name,
          v_subject,
          0,
          100,
          'MISSED',
          'MISSED - Entry created automatically'
        );
      END IF;
    END LOOP;
  END LOOP;
END;
$$;

