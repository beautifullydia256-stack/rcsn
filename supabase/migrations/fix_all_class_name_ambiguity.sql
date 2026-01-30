-- Fix ALL functions with p_class_name parameter that query tables with class_name column
-- The ambiguity occurs when WHERE clauses reference class_name without table qualification

-- 1. Fix ensure_all_students_have_all_subjects
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
          0, 100, 'MISSED', 'MISSED - Entry created automatically'
        );
      END IF;
    END LOOP;
  END LOOP;
END;
$$;

-- 2. Fix backfill_missed_entries_for_class
CREATE OR REPLACE FUNCTION public.backfill_missed_entries_for_class(
  p_school_id uuid, 
  p_class_name text
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  exam_set_record RECORD;
BEGIN
  FOR exam_set_record IN
    SELECT DISTINCT es.id, es.name, es.term, es.year
    FROM public.exam_sets es
    WHERE es.school_id = p_school_id
      AND EXISTS (
        SELECT 1
        FROM public.exam_results er
        WHERE er.school_id = p_school_id
          AND er.exam_set_id = es.id
          AND er.class_name = p_class_name
      )
  LOOP
    PERFORM public.ensure_all_students_have_all_subjects(
      p_school_id,
      exam_set_record.id,
      p_class_name
    );
  END LOOP;
END;
$$;

-- 3. Fix calculate_class_positions_for_exam_set
CREATE OR REPLACE FUNCTION public.calculate_class_positions_for_exam_set(
  p_school_id uuid, 
  p_exam_set_id uuid, 
  p_class_name text
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  WITH student_averages AS (
    SELECT 
      ppr.student_id,
      (SUM(ppr.marks_obtained) / NULLIF(SUM(ppr.total_marks), 0)) * 100 as average
    FROM public.processed_primary_exam_results ppr
    WHERE ppr.school_id = p_school_id
      AND ppr.exam_set_id = p_exam_set_id
      AND ppr.class_name = p_class_name
      AND ppr.grade != 'MISSED'
    GROUP BY ppr.student_id
  ),
  ranked_students AS (
    SELECT 
      student_id,
      DENSE_RANK() OVER (ORDER BY average DESC NULLS LAST) as position
    FROM student_averages
  )
  UPDATE public.processed_primary_exam_results ppr
  SET class_position = ranked_students.position
  FROM ranked_students
  WHERE ppr.school_id = p_school_id
    AND ppr.exam_set_id = p_exam_set_id
    AND ppr.class_name = p_class_name
    AND ppr.student_id = ranked_students.student_id;
END;
$$;

