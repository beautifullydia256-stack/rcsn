-- O-Level teacher saves populate final_score but not marks_obtained; report builders expect
-- marks_obtained/total_marks (primary-style). Sync after line-key RPC (20260526120000).

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
BEGIN
  IF p_school_id IS NULL OR p_exam_set_id IS NULL OR p_student_id IS NULL THEN
    RETURN json_build_object('error', 'Missing required parameters');
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

COMMENT ON FUNCTION public.teacher_upsert_exam_result_secondary(
  uuid, uuid, uuid, text, text, numeric, text, numeric, numeric, numeric, text, text, text, text, text, text, text
) IS 'Secondary O-Level ECS upsert; line key = topic + paper; syncs marks_obtained/total_marks with final_score for reports.';
