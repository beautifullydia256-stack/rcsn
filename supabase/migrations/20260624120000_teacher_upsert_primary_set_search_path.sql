-- Primary exam RPC: SECURITY DEFINER must resolve public.exam_results reliably (avoids "relation exam_results does not exist").
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
BEGIN
    IF p_school_id IS NULL OR p_exam_set_id IS NULL OR p_student_id IS NULL THEN
        RAISE EXCEPTION 'Required parameters cannot be null';
    END IF;

    IF p_class_name IS NULL OR p_subject IS NULL THEN
        RAISE EXCEPTION 'Class name and subject cannot be null';
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

GRANT EXECUTE ON FUNCTION public.teacher_upsert_exam_result_primary(
  uuid, uuid, uuid, text, text, numeric, numeric, text, text, text, text, jsonb
) TO authenticated;
