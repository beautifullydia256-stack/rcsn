-- Fix ensure_all_students_have_all_subjects - it has p_class_name parameter
-- and queries exam_results.class_name column, causing ambiguity
-- CRITICAL: Qualify all class_name column references with table alias

CREATE OR REPLACE FUNCTION public.ensure_all_students_have_all_subjects(
  p_school_id UUID,
  p_exam_set_id UUID,
  p_class_name TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subject TEXT;
  v_student_id UUID;
  v_existing_count INTEGER;
BEGIN
  -- Get all distinct subjects that have exam results for this class and exam set
  -- CRITICAL FIX: Qualify class_name column with table alias (er.class_name)
  FOR v_subject IN
    SELECT DISTINCT er.subject
    FROM public.exam_results er
    WHERE er.school_id = p_school_id
      AND er.exam_set_id = p_exam_set_id
      AND er.class_name = p_class_name  -- er.class_name = parameter p_class_name
  LOOP
    -- For each subject, ensure all active students in the class have an entry
    FOR v_student_id IN
      SELECT s.student_id
      FROM public.students s
      WHERE s.school_id = p_school_id
        AND s.current_class = p_class_name
        AND s.status = 'active'
    LOOP
      -- Check if this student already has an entry for this subject
      -- CRITICAL FIX: Qualify class_name column with table alias
      SELECT COUNT(*)
      INTO v_existing_count
      FROM public.exam_results er
      WHERE er.school_id = p_school_id
        AND er.exam_set_id = p_exam_set_id
        AND er.student_id = v_student_id
        AND er.class_name = p_class_name  -- er.class_name = parameter p_class_name
        AND er.subject = v_subject;
      
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
          p_class_name,  -- Using parameter value
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




