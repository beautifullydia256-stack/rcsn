-- Create function to insert default exam sets for all terms for a new school
-- This ensures new schools have the same default exam sets as existing schools

CREATE OR REPLACE FUNCTION public.insert_default_exam_sets_all_terms(p_school_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_school_type TEXT;
    v_current_year INTEGER;
BEGIN
    -- Get school type
    SELECT type INTO v_school_type
    FROM schools
    WHERE school_id = p_school_id;
    
    IF v_school_type IS NULL THEN
        RAISE EXCEPTION 'School with id % does not exist', p_school_id;
    END IF;
    
    -- Get current year
    v_current_year := EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- For Nursery/Primary schools, create Mid Term and End of Term for all 3 terms
    IF v_school_type = 'Nursery/Primary' OR v_school_type = 'Primary' THEN
        -- Insert Mid Term and End of Term for each term (1, 2, 3)
        INSERT INTO exam_sets (school_id, name, term, year, is_active, created_at, updated_at)
        SELECT 
            p_school_id,
            exam_name,
            term_number,
            v_current_year,
            true,
            NOW(),
            NOW()
        FROM (
            VALUES 
                ('Mid Term', 1),
                ('End of Term', 1),
                ('Mid Term', 2),
                ('End of Term', 2),
                ('Mid Term', 3),
                ('End of Term', 3)
        ) AS exam_types(exam_name, term_number)
        WHERE NOT EXISTS (
            SELECT 1 FROM exam_sets es 
            WHERE es.school_id = p_school_id 
            AND es.name = exam_types.exam_name
            AND es.term = exam_types.term_number
            AND es.year = v_current_year
        );
    END IF;
    
    -- For Secondary schools, you can add default exam sets here if needed
    -- For now, secondary schools don't have default exam sets
    
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.insert_default_exam_sets_all_terms TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_default_exam_sets_all_terms TO service_role;

-- Add this function call to the trigger that runs when a new school is created
-- First, let's check if the trigger exists and update it

-- Find the trigger function that runs on school creation
-- Based on the migration file, it should be in the automatic_default_teacher_remarks trigger

