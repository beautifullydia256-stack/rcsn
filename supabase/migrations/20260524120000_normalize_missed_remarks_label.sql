-- Replace verbose auto-placeholder text with plain "MISSED" (grade already MISSED).
-- Historical note: "MISSED - Entry created automatically" was for debugging; reports should match grade label.

UPDATE public.exam_results
SET remarks = 'MISSED'
WHERE remarks = 'MISSED - Entry created automatically';

UPDATE public.processed_primary_exam_results
SET teacher_remark = 'MISSED'
WHERE teacher_remark = 'MISSED - Entry created automatically';

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
  FOR v_subject IN
    SELECT DISTINCT er.subject
    FROM public.exam_results er
    WHERE er.school_id = p_school_id
      AND er.exam_set_id = p_exam_set_id
      AND er.class_name = p_class_name
  LOOP
    FOR v_student_id IN
      SELECT s.student_id
      FROM public.students s
      WHERE s.school_id = p_school_id
        AND s.current_class = p_class_name
        AND s.status = 'active'
    LOOP
      SELECT COUNT(*)
      INTO v_existing_count
      FROM public.exam_results er
      WHERE er.school_id = p_school_id
        AND er.exam_set_id = p_exam_set_id
        AND er.student_id = v_student_id
        AND er.class_name = p_class_name
        AND er.subject = v_subject;

      IF v_existing_count = 0 THEN
        INSERT INTO public.exam_results (
          school_id, exam_set_id, student_id, class_name, subject,
          marks_obtained, total_marks, grade, remarks
        )
        VALUES (
          p_school_id, p_exam_set_id, v_student_id, p_class_name, v_subject,
          0, 100, 'MISSED', 'MISSED'
        );
      END IF;
    END LOOP;
  END LOOP;
END;
$$;
