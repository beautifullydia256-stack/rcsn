-- Fix trigger_add_default_exam_sets_for_new_school function
-- The problem: It has SET search_path TO '' (empty) and calls function without schema prefix

CREATE OR REPLACE FUNCTION public.trigger_add_default_exam_sets_for_new_school()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_school_type TEXT;
    v_current_year INTEGER;
BEGIN
    -- Get school type
    SELECT type INTO v_school_type
    FROM public.schools
    WHERE school_id = NEW.school_id;
    
    IF v_school_type IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Get current year
    v_current_year := EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- For Nursery/Primary schools, create Mid Term and End of Term for all 3 terms
    -- Inline the logic to avoid function lookup issues
    IF v_school_type = 'Nursery/Primary' OR v_school_type = 'Primary' THEN
        INSERT INTO public.exam_sets (school_id, name, term, year, is_active, created_at, updated_at)
        SELECT 
            NEW.school_id,
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
            SELECT 1 FROM public.exam_sets es 
            WHERE es.school_id = NEW.school_id 
            AND es.name = exam_types.exam_name
            AND es.term = exam_types.term_number
            AND es.year = v_current_year
        );
    END IF;
    
    RETURN NEW;
END;
$$;




