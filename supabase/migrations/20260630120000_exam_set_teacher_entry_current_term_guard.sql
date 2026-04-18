-- Teachers may only enter/edit exam results for exam sets that:
--   belong to the school's resolved current (calendar) term,
--   and are flagged is_active + active_for_input.
-- Aligns UI filtering (teacherExamSetsInput) with server-side enforcement.

CREATE OR REPLACE FUNCTION public.exam_set_teacher_entry_guard_message(
  p_school_id uuid,
  p_exam_set_id uuid
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_term_id uuid;
  v_cur_year integer;
  v_cur_term integer;
  r_es record;
BEGIN
  IF p_school_id IS NULL OR p_exam_set_id IS NULL THEN
    RETURN 'Missing school or exam set.';
  END IF;

  v_term_id := public.resolve_current_school_term_id(p_school_id, CURRENT_DATE);
  IF v_term_id IS NULL THEN
    RETURN 'Current school term is not configured. Ask an administrator to set up the school calendar before entering results.';
  END IF;

  SELECT st.year, st.term
  INTO v_cur_year, v_cur_term
  FROM public.school_terms st
  WHERE st.id = v_term_id
    AND st.school_id = p_school_id;

  IF v_cur_year IS NULL OR v_cur_term IS NULL THEN
    RETURN 'Current school term record is missing.';
  END IF;

  SELECT es.year, es.term, es.is_active, es.active_for_input
  INTO r_es
  FROM public.exam_sets es
  WHERE es.id = p_exam_set_id
    AND es.school_id = p_school_id;

  IF NOT FOUND THEN
    RETURN 'Exam set not found for this school.';
  END IF;

  IF NOT COALESCE(r_es.is_active, false) OR NOT COALESCE(r_es.active_for_input, false) THEN
    RETURN 'This exam set is not active for result entry.';
  END IF;

  -- Parentheses: avoid parser treating `... IS DISTINCT FROM v_cur_year OR ...` as SQL `FROM` + relation.
  IF (r_es.year IS DISTINCT FROM v_cur_year)
     OR (r_es.term IS DISTINCT FROM v_cur_term) THEN
    RETURN 'Results can only be entered for the current school term. This exam set belongs to another term.';
  END IF;

  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.exam_set_teacher_entry_guard_message(uuid, uuid) IS
  'Returns NULL if the exam set is open for teacher entry for the resolved current term; otherwise a short error message.';

GRANT EXECUTE ON FUNCTION public.exam_set_teacher_entry_guard_message(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.exam_set_teacher_entry_guard_message(uuid, uuid) TO service_role;

-- Primary upsert: guard before insert/update
CREATE OR REPLACE FUNCTION public.teacher_upsert_exam_result_primary(
    p_school_id UUID,
    p_exam_set_id UUID,
    p_student_id UUID,
    p_class_name TEXT,
    p_subject TEXT,
    p_marks_obtained NUMERIC,
    p_total_marks NUMERIC,
    p_grade TEXT,
    p_remarks TEXT,
    p_teacher_id TEXT,
    p_teacher_comment TEXT DEFAULT NULL,
    p_nursery_skills JSONB DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guard text;
BEGIN
    IF p_school_id IS NULL OR p_exam_set_id IS NULL OR p_student_id IS NULL THEN
        RAISE EXCEPTION 'Required parameters cannot be null';
    END IF;

    IF p_class_name IS NULL OR p_subject IS NULL THEN
        RAISE EXCEPTION 'Class name and subject cannot be null';
    END IF;

    v_guard := public.exam_set_teacher_entry_guard_message(p_school_id, p_exam_set_id);
    IF v_guard IS NOT NULL THEN
        RETURN json_build_object('success', false, 'error', v_guard);
    END IF;

    INSERT INTO public.exam_results (
        school_id,
        exam_set_id,
        student_id,
        class_name,
        subject,
        marks_obtained,
        total_marks,
        grade,
        remarks,
        teacher_id,
        overall_remark,
        nursery_skill_performance,
        created_at,
        updated_at
    ) VALUES (
        p_school_id,
        p_exam_set_id,
        p_student_id,
        p_class_name,
        p_subject,
        p_marks_obtained,
        p_total_marks,
        p_grade,
        p_remarks,
        p_teacher_id,
        p_teacher_comment,
        COALESCE(p_nursery_skills, '{}'::jsonb),
        NOW(),
        NOW()
    )
    ON CONFLICT (exam_set_id, student_id, subject, exam_topic_key, exam_paper_key)
    DO UPDATE SET
        marks_obtained = EXCLUDED.marks_obtained,
        total_marks = EXCLUDED.total_marks,
        grade = EXCLUDED.grade,
        remarks = EXCLUDED.remarks,
        teacher_id = EXCLUDED.teacher_id,
        overall_remark = EXCLUDED.overall_remark,
        nursery_skill_performance = COALESCE(EXCLUDED.nursery_skill_performance, '{}'::jsonb),
        updated_at = NOW();

    RETURN json_build_object(
        'success', true,
        'message', 'Exam result saved successfully'
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- Secondary O-Level upsert
CREATE OR REPLACE FUNCTION public.teacher_upsert_exam_result_secondary(
  p_school_id uuid,
  p_exam_set_id uuid,
  p_student_id uuid,
  p_class_name text,
  p_subject text,
  p_activity_score numeric,
  p_descriptor text,
  p_formative_score numeric,
  p_exam_score numeric,
  p_final_score numeric,
  p_overall_remark text,
  p_teacher_initials text,
  p_teacher_id text,
  p_topic text DEFAULT NULL,
  p_paper_code text DEFAULT NULL,
  p_paper_number text DEFAULT NULL,
  p_grade text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_id uuid;
  result json;
  v_topic_key text;
  v_paper_key text;
  v_guard text;
BEGIN
  IF p_school_id IS NULL OR p_exam_set_id IS NULL OR p_student_id IS NULL THEN
    RETURN json_build_object('error', 'Missing required parameters');
  END IF;

  v_guard := public.exam_set_teacher_entry_guard_message(p_school_id, p_exam_set_id);
  IF v_guard IS NOT NULL THEN
    RETURN json_build_object('error', v_guard);
  END IF;

  IF p_activity_score IS NULL OR p_formative_score IS NULL OR p_exam_score IS NULL OR p_final_score IS NULL THEN
    RETURN json_build_object('error', 'All scores are required');
  END IF;

  v_topic_key := COALESCE(NULLIF(BTRIM(COALESCE(p_topic, '')), ''), '');
  v_paper_key := COALESCE(
    NULLIF(BTRIM(COALESCE(p_paper_code, '')), ''),
    NULLIF(BTRIM(COALESCE(p_paper_number, '')), ''),
    ''
  );

  IF v_topic_key <> '' THEN
    SELECT er.id INTO result_id
    FROM public.exam_results er
    WHERE er.school_id = p_school_id
      AND er.exam_set_id = p_exam_set_id
      AND er.student_id = p_student_id
      AND er.class_name = p_class_name
      AND er.subject = p_subject
      AND er.exam_topic_key = v_topic_key
      AND er.exam_paper_key = v_paper_key;

    IF result_id IS NULL THEN
      SELECT er.id INTO result_id
      FROM public.exam_results er
      WHERE er.school_id = p_school_id
        AND er.exam_set_id = p_exam_set_id
        AND er.student_id = p_student_id
        AND er.class_name = p_class_name
        AND er.subject = p_subject
        AND er.exam_topic_key = ''
        AND er.exam_paper_key = v_paper_key
      ORDER BY er.updated_at DESC NULLS LAST, er.created_at DESC NULLS LAST
      LIMIT 1;
    END IF;
  ELSE
    SELECT er.id INTO result_id
    FROM public.exam_results er
    WHERE er.school_id = p_school_id
      AND er.exam_set_id = p_exam_set_id
      AND er.student_id = p_student_id
      AND er.class_name = p_class_name
      AND er.subject = p_subject
      AND er.exam_paper_key = v_paper_key
      AND er.exam_topic_key <> ''
    ORDER BY er.updated_at DESC NULLS LAST, er.created_at DESC NULLS LAST
    LIMIT 1;

    IF result_id IS NOT NULL THEN
      DELETE FROM public.exam_results erd
      WHERE erd.school_id = p_school_id
        AND erd.exam_set_id = p_exam_set_id
        AND erd.student_id = p_student_id
        AND erd.class_name = p_class_name
        AND erd.subject = p_subject
        AND erd.exam_paper_key = v_paper_key
        AND erd.exam_topic_key = ''
        AND erd.id IS DISTINCT FROM result_id;
    END IF;

    IF result_id IS NULL THEN
      SELECT er.id INTO result_id
      FROM public.exam_results er
      WHERE er.school_id = p_school_id
        AND er.exam_set_id = p_exam_set_id
        AND er.student_id = p_student_id
        AND er.class_name = p_class_name
        AND er.subject = p_subject
        AND er.exam_paper_key = v_paper_key
        AND er.exam_topic_key = ''
      ORDER BY er.updated_at DESC NULLS LAST, er.created_at DESC NULLS LAST
      LIMIT 1;
    END IF;
  END IF;

  IF result_id IS NOT NULL THEN
    UPDATE public.exam_results
    SET
      activity_score = p_activity_score,
      descriptor = p_descriptor,
      formative_score = p_formative_score,
      exam_score = p_exam_score,
      final_score = p_final_score,
      marks_obtained = p_final_score,
      total_marks = 100,
      overall_remark = p_overall_remark,
      teacher_initials = p_teacher_initials,
      teacher_id = p_teacher_id,
      topic = NULLIF(BTRIM(COALESCE(p_topic, '')), ''),
      paper_code = NULLIF(BTRIM(COALESCE(p_paper_code, '')), ''),
      paper_number = NULLIF(BTRIM(COALESCE(p_paper_number, '')), ''),
      grade = COALESCE(p_grade, grade),
      updated_at = now()
    WHERE id = result_id;

    result := json_build_object('success', true, 'action', 'updated', 'id', result_id);
  ELSE
    INSERT INTO public.exam_results (
      school_id,
      exam_set_id,
      student_id,
      class_name,
      subject,
      activity_score,
      descriptor,
      formative_score,
      exam_score,
      final_score,
      marks_obtained,
      total_marks,
      overall_remark,
      teacher_initials,
      teacher_id,
      topic,
      paper_code,
      paper_number,
      grade,
      nursery_skill_performance,
      created_at,
      updated_at
    ) VALUES (
      p_school_id,
      p_exam_set_id,
      p_student_id,
      p_class_name,
      p_subject,
      p_activity_score,
      p_descriptor,
      p_formative_score,
      p_exam_score,
      p_final_score,
      p_final_score,
      100,
      p_overall_remark,
      p_teacher_initials,
      p_teacher_id,
      NULLIF(BTRIM(COALESCE(p_topic, '')), ''),
      NULLIF(BTRIM(COALESCE(p_paper_code, '')), ''),
      NULLIF(BTRIM(COALESCE(p_paper_number, '')), ''),
      p_grade,
      '{}'::jsonb,
      now(),
      now()
    ) RETURNING id INTO result_id;

    result := json_build_object('success', true, 'action', 'inserted', 'id', result_id);
  END IF;

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('error', 'Database error: ' || SQLERRM);
END;
$$;

-- A-Level upsert
CREATE OR REPLACE FUNCTION public.teacher_upsert_exam_result_alevel(
  p_school_id uuid,
  p_exam_set_id uuid,
  p_student_id uuid,
  p_class_name text,
  p_subject text,
  p_marks_obtained numeric,
  p_total_marks numeric,
  p_grade text,
  p_remarks text,
  p_teacher_id uuid,
  p_teacher_comment text,
  p_paper_number text DEFAULT NULL,
  p_paper_code text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_id uuid;
  v_topic_key text := '';
  v_paper_key text;
  v_grade text;
  v_points integer;
  v_pct numeric;
  v_guard text;
BEGIN
  IF p_school_id IS NULL OR p_exam_set_id IS NULL OR p_student_id IS NULL THEN
    RETURN json_build_object('error', 'Missing required parameters');
  END IF;

  v_guard := public.exam_set_teacher_entry_guard_message(p_school_id, p_exam_set_id);
  IF v_guard IS NOT NULL THEN
    RETURN json_build_object('error', v_guard);
  END IF;

  v_paper_key := COALESCE(
    NULLIF(BTRIM(COALESCE(p_paper_code, '')), ''),
    NULLIF(BTRIM(COALESCE(p_paper_number, '')), ''),
    ''
  );

  v_grade := p_grade;
  v_points := public.uace_default_points_from_grade(p_grade);

  IF p_marks_obtained IS NOT NULL
     AND p_total_marks IS NOT NULL
     AND p_total_marks > 0 THEN
    v_pct := (p_marks_obtained / p_total_marks) * 100;
    v_grade := public.uace_grade_from_percent_for_class(p_school_id, p_class_name, v_pct);
    v_points := public.uace_default_points_from_grade(v_grade);
  END IF;

  SELECT er.id INTO result_id
  FROM public.exam_results er
  WHERE er.school_id = p_school_id
    AND er.exam_set_id = p_exam_set_id
    AND er.student_id = p_student_id
    AND er.class_name = p_class_name
    AND er.subject = p_subject
    AND er.exam_topic_key = v_topic_key
    AND er.exam_paper_key = v_paper_key;

  IF result_id IS NOT NULL THEN
    UPDATE public.exam_results
    SET
      marks_obtained = p_marks_obtained,
      total_marks = p_total_marks,
      grade = v_grade,
      uace_points = v_points,
      remarks = p_remarks,
      teacher_comment = p_teacher_comment,
      teacher_id = p_teacher_id::text,
      paper_code = NULLIF(BTRIM(COALESCE(p_paper_code, '')), ''),
      paper_number = NULLIF(BTRIM(COALESCE(p_paper_number, '')), ''),
      updated_at = now()
    WHERE id = result_id;

    RETURN json_build_object('success', true, 'action', 'updated', 'id', result_id);
  END IF;

  INSERT INTO public.exam_results (
    school_id,
    exam_set_id,
    student_id,
    class_name,
    subject,
    marks_obtained,
    total_marks,
    grade,
    uace_points,
    remarks,
    teacher_comment,
    teacher_id,
    paper_code,
    paper_number,
    nursery_skill_performance,
    created_at,
    updated_at
  ) VALUES (
    p_school_id,
    p_exam_set_id,
    p_student_id,
    p_class_name,
    p_subject,
    p_marks_obtained,
    p_total_marks,
    v_grade,
    v_points,
    p_remarks,
    p_teacher_comment,
    p_teacher_id::text,
    NULLIF(BTRIM(COALESCE(p_paper_code, '')), ''),
    NULLIF(BTRIM(COALESCE(p_paper_number, '')), ''),
    '{}'::jsonb,
    now(),
    now()
  ) RETURNING id INTO result_id;

  RETURN json_build_object('success', true, 'action', 'inserted', 'id', result_id);

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('error', 'Database error: ' || SQLERRM);
END;
$$;

SELECT pg_notify('pgrst', 'reload schema');
