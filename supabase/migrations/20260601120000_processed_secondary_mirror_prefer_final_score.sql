-- Fix: processed_secondary_exam_results mirror used COALESCE(marks_obtained, final_score, 0).
-- When marks_obtained was 0 but final_score was correct, COALESCE picked 0 → report/preview ≠ grid.
-- Prefer final_score for mirrored marks_obtained on Senior 1–6 rows.
-- Timestamp after 20260531120000 so this definition wins over exam_results_line_keys migration.

CREATE OR REPLACE FUNCTION public.auto_populate_processed_on_exam_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year integer;
  v_term integer;
  v_student_name text;
  v_admission text;
  v_class text;
  v_pc text;
  v_pn text;
  v_class_for_guard text;
  v_marks numeric;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_class_for_guard := OLD.class_name;
    IF NOT public._class_name_is_senior_secondary(v_class_for_guard) THEN
      RETURN OLD;
    END IF;
    DELETE FROM public.processed_secondary_exam_results ps
    WHERE ps.school_id = OLD.school_id
      AND ps.student_id = OLD.student_id
      AND ps.exam_set_id = OLD.exam_set_id
      AND ps.subject = OLD.subject
      AND ps.proc_topic_key = OLD.exam_topic_key
      AND ps.proc_paper_key = OLD.exam_paper_key;
    RETURN OLD;
  END IF;

  v_class_for_guard := NEW.class_name;
  IF NOT public._class_name_is_senior_secondary(v_class_for_guard) THEN
    RETURN NEW;
  END IF;

  SELECT es.year, es.term
  INTO v_year, v_term
  FROM public.exam_sets es
  WHERE es.id = NEW.exam_set_id
  LIMIT 1;

  SELECT
    COALESCE(NULLIF(BTRIM(COALESCE(s.name, '')), ''), ''),
    s.admission_number,
    COALESCE(NULLIF(BTRIM(COALESCE(s.current_class, '')), ''), NEW.class_name)
  INTO v_student_name, v_admission, v_class
  FROM public.students s
  WHERE s.student_id = NEW.student_id
  LIMIT 1;

  v_pc := NULLIF(BTRIM(COALESCE(NEW.paper_code, '')), '');
  v_pn := NULLIF(BTRIM(COALESCE(NEW.paper_number, '')), '');

  v_marks := COALESCE(NEW.final_score, NEW.marks_obtained, 0);

  INSERT INTO public.processed_secondary_exam_results (
    school_id,
    student_id,
    exam_set_id,
    student_name,
    admission_number,
    class_name,
    year,
    term,
    subject,
    marks_obtained,
    total_marks,
    grade,
    teacher_remark,
    teacher_initials,
    topic,
    paper_code,
    paper_number
  )
  VALUES (
    NEW.school_id,
    NEW.student_id,
    NEW.exam_set_id,
    COALESCE(v_student_name, ''),
    v_admission,
    COALESCE(v_class, NEW.class_name),
    COALESCE(v_year, 0),
    COALESCE(v_term, 0),
    NEW.subject,
    v_marks,
    COALESCE(NEW.total_marks, 100),
    NEW.grade,
    COALESCE(
      NULLIF(BTRIM(COALESCE(NEW.remarks, '')), ''),
      NULLIF(BTRIM(COALESCE(NEW.overall_remark, '')), ''),
      ''
    ),
    NEW.teacher_initials,
    NEW.topic,
    v_pc,
    v_pn
  )
  ON CONFLICT (
    school_id,
    student_id,
    exam_set_id,
    subject,
    proc_topic_key,
    proc_paper_key
  )
  DO UPDATE SET
    student_name = EXCLUDED.student_name,
    admission_number = EXCLUDED.admission_number,
    class_name = EXCLUDED.class_name,
    year = EXCLUDED.year,
    term = EXCLUDED.term,
    marks_obtained = EXCLUDED.marks_obtained,
    total_marks = EXCLUDED.total_marks,
    grade = EXCLUDED.grade,
    teacher_remark = EXCLUDED.teacher_remark,
    teacher_initials = EXCLUDED.teacher_initials,
    topic = EXCLUDED.topic,
    paper_code = EXCLUDED.paper_code,
    paper_number = EXCLUDED.paper_number,
    updated_at = now();

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.auto_populate_processed_on_exam_insert() IS
  'Mirror Senior 1–6 exam_results into processed_secondary_exam_results; marks_obtained prefers final_score.';
