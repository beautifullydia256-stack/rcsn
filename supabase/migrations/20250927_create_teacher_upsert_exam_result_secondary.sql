-- Create RPC function for teachers to upsert exam results (secondary schools)
-- This function handles the secure insertion/update of exam results for secondary schools

-- Drop the function if it exists to avoid conflicts
DROP FUNCTION IF EXISTS teacher_upsert_exam_result_secondary(UUID, UUID, UUID, TEXT, TEXT, NUMERIC, TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, UUID, TEXT);

CREATE OR REPLACE FUNCTION teacher_upsert_exam_result_secondary(
    p_school_id UUID,
    p_exam_set_id UUID,
    p_student_id UUID,
    p_class_name TEXT,
    p_subject TEXT,
    p_activity_score NUMERIC(3,1),
    p_descriptor TEXT,
    p_formative_score NUMERIC(4,1),
    p_exam_score NUMERIC(4,1),
    p_final_score NUMERIC(4,1),
    p_overall_remark TEXT,
    p_teacher_initials TEXT,
    p_teacher_id UUID,
    p_topic TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result_id UUID;
    result JSON;
BEGIN
    -- Validate inputs
    IF p_school_id IS NULL OR p_exam_set_id IS NULL OR p_student_id IS NULL THEN
        RETURN json_build_object('error', 'Missing required parameters');
    END IF;
    
    IF p_activity_score IS NULL OR p_formative_score IS NULL OR p_exam_score IS NULL OR p_final_score IS NULL THEN
        RETURN json_build_object('error', 'All scores are required');
    END IF;
    
    -- Check if exam result already exists
    SELECT id INTO result_id
    FROM exam_results
    WHERE school_id = p_school_id
      AND exam_set_id = p_exam_set_id
      AND student_id = p_student_id
      AND class_name = p_class_name
      AND subject = p_subject;
    
    IF result_id IS NOT NULL THEN
        -- Update existing record
        UPDATE exam_results
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
            updated_at = NOW()
        WHERE id = result_id;
        
        result := json_build_object(
            'success', true,
            'action', 'updated',
            'id', result_id
        );
    ELSE
        -- Insert new record
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION teacher_upsert_exam_result_secondary TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION teacher_upsert_exam_result_secondary IS 'Secure RPC function for teachers to insert/update exam results for secondary schools';
