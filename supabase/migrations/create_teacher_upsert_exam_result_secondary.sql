-- Create teacher_upsert_exam_result_secondary function for secondary school exam results

CREATE OR REPLACE FUNCTION teacher_upsert_exam_result_secondary(
    p_school_id UUID,
    p_exam_set_id UUID,
    p_student_id UUID,
    p_class_name TEXT,
    p_subject TEXT,
    p_activity_score NUMERIC,
    p_descriptor TEXT,
    p_formative_score NUMERIC,
    p_exam_score NUMERIC,
    p_final_score NUMERIC,
    p_overall_remark TEXT,
    p_teacher_initials TEXT,
    p_teacher_id TEXT,
    p_topic TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result_record RECORD;
BEGIN
    -- Validate inputs
    IF p_school_id IS NULL OR p_exam_set_id IS NULL OR p_student_id IS NULL THEN
        RAISE EXCEPTION 'Required parameters cannot be null';
    END IF;
    
    IF p_class_name IS NULL OR p_subject IS NULL THEN
        RAISE EXCEPTION 'Class name and subject cannot be null';
    END IF;
    
    -- Upsert the exam result
    INSERT INTO exam_results (
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
        NOW(),
        NOW()
    )
    ON CONFLICT (exam_set_id, student_id, subject)
    DO UPDATE SET
        activity_score = EXCLUDED.activity_score,
        descriptor = EXCLUDED.descriptor,
        formative_score = EXCLUDED.formative_score,
        exam_score = EXCLUDED.exam_score,
        final_score = EXCLUDED.final_score,
        overall_remark = EXCLUDED.overall_remark,
        teacher_initials = EXCLUDED.teacher_initials,
        teacher_id = EXCLUDED.teacher_id,
        topic = EXCLUDED.topic,
        updated_at = NOW();
    
    -- Return success
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

-- Grant execute permission to authenticated users (signature required when overloaded)
GRANT EXECUTE ON FUNCTION public.teacher_upsert_exam_result_secondary(
    uuid, uuid, uuid, text, text, numeric, text, numeric, numeric, numeric, text, text, text, text
) TO authenticated;

-- Force schema cache refresh
SELECT pg_notify('pgrst', 'reload schema');
