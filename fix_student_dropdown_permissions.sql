-- Fix student dropdown permissions for report generation
-- The get_report_students_for_class function was revoked in security fixes
-- but is needed for the report generation page student dropdown

-- Grant execute permission to authenticated users for report generation
GRANT EXECUTE ON FUNCTION public.get_report_students_for_class(uuid, uuid, text) TO authenticated;

-- Verify the function exists and check its definition
-- This function should be SECURITY DEFINER and have proper RLS checks
SELECT 
    proname as function_name,
    prosecdef as is_security_definer,
    proacl as permissions
FROM pg_proc 
WHERE proname = 'get_report_students_for_class';

-- If the function doesn't exist or needs to be recreated, here's a safe version:
/*
CREATE OR REPLACE FUNCTION public.get_report_students_for_class(
    p_school_id uuid,
    p_exam_set_id uuid,
    p_class_name text
)
RETURNS TABLE(
    student_id uuid,
    name text,
    admission_number text,
    current_class text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verify the user has access to this school
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE user_id = auth.uid() 
        AND school_id = p_school_id
    ) THEN
        RAISE EXCEPTION 'Access denied to school data';
    END IF;

    -- Return students who have exam results for this exam set and class
    RETURN QUERY
    SELECT DISTINCT
        s.student_id,
        s.name,
        s.admission_number,
        s.current_class
    FROM students s
    INNER JOIN exam_results er ON s.student_id = er.student_id
    WHERE s.school_id = p_school_id
    AND er.exam_set_id = p_exam_set_id
    AND er.class_name = p_class_name
    ORDER BY s.name;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_report_students_for_class(uuid, uuid, text) TO authenticated;
*/