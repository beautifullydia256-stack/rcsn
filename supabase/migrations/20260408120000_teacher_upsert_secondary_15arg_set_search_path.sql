-- The UI calls teacher_upsert_exam_result_secondary with p_grade (15 parameters).
-- PostgREST uses that overload, not the 14-arg version in 20250927.
-- Recreate it with SET search_path and qualified public.exam_results so empty search_path
-- from older migrations cannot break saves after CREATE OR REPLACE elsewhere.

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
    p_teacher_id uuid,
    p_topic text DEFAULT NULL,
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
BEGIN
    IF p_school_id IS NULL OR p_exam_set_id IS NULL OR p_student_id IS NULL THEN
        RETURN json_build_object('error', 'Missing required parameters');
    END IF;

    IF p_activity_score IS NULL OR p_formative_score IS NULL OR p_exam_score IS NULL OR p_final_score IS NULL THEN
        RETURN json_build_object('error', 'All scores are required');
    END IF;

    SELECT id INTO result_id
    FROM public.exam_results
    WHERE school_id = p_school_id
      AND exam_set_id = p_exam_set_id
      AND student_id = p_student_id
      AND class_name = p_class_name
      AND subject = p_subject;

    IF result_id IS NOT NULL THEN
        UPDATE public.exam_results
        SET
            activity_score = p_activity_score,
            descriptor = p_descriptor,
            formative_score = p_formative_score,
            exam_score = p_exam_score,
            final_score = p_final_score,
            overall_remark = p_overall_remark,
            teacher_initials = p_teacher_initials,
            teacher_id = p_teacher_id,
            topic = p_topic,
            grade = p_grade,
            updated_at = now()
        WHERE id = result_id;

        result := json_build_object(
            'success', true,
            'action', 'updated',
            'id', result_id
        );
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
            overall_remark,
            teacher_initials,
            teacher_id,
            topic,
            grade,
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
            p_overall_remark,
            p_teacher_initials,
            p_teacher_id,
            p_topic,
            p_grade,
            now(),
            now()
        ) RETURNING id INTO result_id;

        result := json_build_object(
            'success', true,
            'action', 'inserted',
            'id', result_id
        );
    END IF;

    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'error', 'Database error: ' || SQLERRM
        );
END;
$$;

GRANT EXECUTE ON FUNCTION public.teacher_upsert_exam_result_secondary(
    uuid, uuid, uuid, text, text, numeric, text, numeric, numeric, numeric, text, text, uuid, text, text
) TO authenticated;

COMMENT ON FUNCTION public.teacher_upsert_exam_result_secondary(
    uuid, uuid, uuid, text, text, numeric, text, numeric, numeric, numeric, text, text, uuid, text, text
) IS 'Secure RPC for secondary O-Level exam results (includes p_grade; search_path safe).';
