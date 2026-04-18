-- PostgREST PGRST203: two 12-argument overloads of teacher_upsert_exam_result_primary existed
-- (same types, different order: p_teacher_id before vs after p_marks_obtained/p_total_marks).
-- Named JSON RPC calls could not resolve. Drop the legacy overload and keep the canonical order
-- used by the app: marks/grade/remarks, then p_teacher_id, p_teacher_comment, p_nursery_skills.

DROP FUNCTION IF EXISTS public.teacher_upsert_exam_result_primary(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  numeric,
  numeric,
  text,
  text,
  text,
  jsonb
);

CREATE OR REPLACE FUNCTION public.teacher_upsert_exam_result_primary(
  p_school_id uuid,
  p_exam_set_id uuid,
  p_student_id uuid,
  p_class_name text,
  p_subject text,
  p_marks_obtained numeric,
  p_total_marks numeric,
  p_grade text,
  p_remarks text,
  p_teacher_id text,
  p_teacher_comment text DEFAULT NULL,
  p_nursery_skills jsonb DEFAULT NULL
)
RETURNS json
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
  )
  VALUES (
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

COMMENT ON FUNCTION public.teacher_upsert_exam_result_primary(
  uuid, uuid, uuid, text, text, numeric, numeric, text, text, text, text, jsonb
) IS
  'Primary/nursery exam upsert; single overload (marks before teacher_id) for PostgREST.';

GRANT EXECUTE ON FUNCTION public.teacher_upsert_exam_result_primary(
  uuid, uuid, uuid, text, text, numeric, numeric, text, text, text, text, jsonb
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.teacher_upsert_exam_result_primary(
  uuid, uuid, uuid, text, text, numeric, numeric, text, text, text, text, jsonb
) TO service_role;

SELECT pg_notify('pgrst', 'reload schema');
