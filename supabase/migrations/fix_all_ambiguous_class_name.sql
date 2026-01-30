-- Comprehensive fix for ambiguous class_name errors
-- Ensure all functions that might be called during registration qualify class_name properly

-- 1. Fix set_class_subject_defaults_and_linking to ensure it doesn't cause ambiguity
-- This trigger runs BEFORE INSERT on class_subjects
CREATE OR REPLACE FUNCTION public.set_class_subject_defaults_and_linking()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    -- Set default values for new class subjects
    IF NEW.created_at IS NULL THEN
        NEW.created_at := NOW();
    END IF;
    
    -- Ensure class subject is properly linked to school
    IF NEW.school_id IS NULL THEN
        RAISE EXCEPTION 'Class subject must be linked to a school';
    END IF;
    
    -- NOTE: We do NOT validate that class_name exists in classes table here
    -- because during registration, classes might be inserted after class_subjects
    -- Any validation should happen at the application level or in a separate constraint
    
    RETURN NEW;
END;
$$;

-- 2. Ensure get_fee_structure_status qualifies all references (already done, but ensure it's correct)
-- The function already qualifies class_name properly, but let's make sure search_path is set
-- (Already fixed in previous migration, but keeping for completeness)

-- 3. Make sure setup_default_teacher_remarks_for_school doesn't cause issues
-- (Already fixed in previous migration)

-- 4. Make sure add_default_teacher_remarks_for_subject doesn't cause issues  
-- (Already fixed in previous migration)




