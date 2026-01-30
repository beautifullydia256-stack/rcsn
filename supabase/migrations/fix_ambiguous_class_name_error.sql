-- Fix ambiguous class_name error by ensuring proper schema qualification
-- Both functions have empty search_path, so they need public. prefixes

-- 1. Fix setup_default_teacher_remarks_for_school function
CREATE OR REPLACE FUNCTION public.setup_default_teacher_remarks_for_school(p_school_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  subject_record RECORD;
BEGIN
  -- Get all subjects for this school from class_subjects
  FOR subject_record IN 
    SELECT DISTINCT subject 
    FROM public.class_subjects 
    WHERE school_id = p_school_id
  LOOP
    -- Add default remarks for this subject if they don't exist
    IF NOT EXISTS (
      SELECT 1 FROM public.teacher_remarks_settings 
      WHERE school_id = p_school_id 
      AND subject = subject_record.subject
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

-- 2. Fix add_default_teacher_remarks_for_subject function
CREATE OR REPLACE FUNCTION public.add_default_teacher_remarks_for_subject()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Only add default remarks if this is a new subject for this school
  IF NOT EXISTS (
    SELECT 1 FROM public.teacher_remarks_settings 
    WHERE school_id = NEW.school_id 
    AND subject = NEW.subject
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




