-- Create RPC function for teachers to upsert exam results (primary schools)
-- This function handles the secure insertion/update of exam results for primary schools

CREATE OR REPLACE FUNCTION teacher_upsert_exam_result_primary(
    p_school_id UUID,
    p_exam_set_id UUID,
    p_student_id UUID,
    p_class_name TEXT,
    p_subject TEXT,
    p_marks_obtained NUMERIC,
    p_total_marks NUMERIC,
    p_grade TEXT,
    p_remarks TEXT,
    p_teacher_id UUID,
    p_teacher_comment TEXT DEFAULT NULL
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
    
    IF p_marks_obtained IS NULL OR p_total_marks IS NULL THEN
        RETURN json_build_object('error', 'Marks and total marks are required');
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
            marks_obtained = p_marks_obtained,
            total_marks = p_total_marks,
            grade = p_grade,
            remarks = p_remarks,
            teacher_id = p_teacher_id,
            overall_remark = p_teacher_comment,
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
            marks_obtained,
            total_marks,
            grade,
            remarks,
            teacher_id,
            overall_remark,
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
GRANT EXECUTE ON FUNCTION teacher_upsert_exam_result_primary TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION teacher_upsert_exam_result_primary IS 'Secure RPC function for teachers to insert/update exam results for primary schools';
