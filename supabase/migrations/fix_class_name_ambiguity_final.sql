-- Fix ambiguous class_name error by ensuring all column references are qualified
-- The error "It could refer to either a PL/pgSQL variable or a table column" means
-- there's a variable/parameter named class_name conflicting with a column

-- Fix setup_default_teacher_remarks_for_school to explicitly qualify class_name column
CREATE OR REPLACE FUNCTION public.setup_default_teacher_remarks_for_school(p_school_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  subject_record RECORD;
BEGIN
  -- Get all subjects for this school from class_subjects
  -- CRITICAL: Use table alias and qualify class_name to avoid ambiguity
  FOR subject_record IN 
    SELECT DISTINCT cs.subject 
    FROM public.class_subjects cs
    WHERE cs.school_id = p_school_id
  LOOP
    -- Add default remarks for this subject if they don't exist
    IF NOT EXISTS (
      SELECT 1 FROM public.teacher_remarks_settings trs
      WHERE trs.school_id = p_school_id 
      AND trs.subject = subject_record.subject
    ) THEN
      INSERT INTO public.teacher_remarks_settings (school_id, subject, min_percent, max_percent, comment_text, created_by)
      VALUES 
        (p_school_id, subject_record.subject, 0, 40, 'Needs more effort. Try harder next time.', NULL),
        (p_school_id, subject_record.subject, 41, 60, 'Fair work. You can do better.', NULL),
        (p_school_id, subject_record.subject, 61, 80, 'Good work. Keep it up!', NULL),
        (p_school_id, subject_record.subject, 81, 100, 'Excellent! Keep shining!', NULL);
    END IF;
  END LOOP;
END;
$$;

-- Also ensure add_default_teacher_remarks_for_subject qualifies references
CREATE OR REPLACE FUNCTION public.add_default_teacher_remarks_for_subject()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Only add default remarks if this is a new subject for this school
  -- CRITICAL: Use table alias to avoid any ambiguity
  IF NOT EXISTS (
    SELECT 1 FROM public.teacher_remarks_settings trs
    WHERE trs.school_id = NEW.school_id 
    AND trs.subject = NEW.subject
  ) THEN
    -- Insert default remark ranges for the new subject
    INSERT INTO public.teacher_remarks_settings (school_id, subject, min_percent, max_percent, comment_text, created_by)
    VALUES 
      (NEW.school_id, NEW.subject, 0, 40, 'Needs more effort. Try harder next time.', NULL),
      (NEW.school_id, NEW.subject, 41, 60, 'Fair work. You can do better.', NULL),
      (NEW.school_id, NEW.subject, 61, 80, 'Good work. Keep it up!', NULL),
      (NEW.school_id, NEW.subject, 81, 100, 'Excellent! Keep shining!', NULL);
  END IF;
  
  RETURN NEW;
END;
$$;




