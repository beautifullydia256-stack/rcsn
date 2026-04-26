-- Fix the setup_default_teacher_remarks_settings function that's causing the ON CONFLICT error
CREATE OR REPLACE FUNCTION public.setup_default_teacher_remarks_settings(p_school_id uuid, p_created_by uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  subject_name text;
BEGIN
  FOR subject_name IN 
    SELECT unnest(ARRAY['Mathematics', 'English', 'Science', 'Social Studies', 'Art', 'Physical Education'])
  LOOP
    -- Use IF NOT EXISTS instead of ON CONFLICT
    IF NOT EXISTS (
      SELECT 1 FROM public.teacher_remarks_settings 
      WHERE school_id = p_school_id 
        AND subject = subject_name 
        AND min_percent = 0 
        AND max_percent = 40
    ) THEN
      INSERT INTO public.teacher_remarks_settings (school_id, subject, min_percent, max_percent, comment_text, created_by) 
      VALUES (p_school_id, subject_name, 0, 40, 'Needs more effort. Try harder next time.', p_created_by);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.teacher_remarks_settings 
      WHERE school_id = p_school_id 
        AND subject = subject_name 
        AND min_percent = 41 
        AND max_percent = 60
    ) THEN
      INSERT INTO public.teacher_remarks_settings (school_id, subject, min_percent, max_percent, comment_text, created_by) 
      VALUES (p_school_id, subject_name, 41, 60, 'Fair work. You can do better.', p_created_by);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.teacher_remarks_settings 
      WHERE school_id = p_school_id 
        AND subject = subject_name 
        AND min_percent = 61 
        AND max_percent = 80
    ) THEN
      INSERT INTO public.teacher_remarks_settings (school_id, subject, min_percent, max_percent, comment_text, created_by) 
      VALUES (p_school_id, subject_name, 61, 80, 'Good work. Keep it up!', p_created_by);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.teacher_remarks_settings 
      WHERE school_id = p_school_id 
        AND subject = subject_name 
        AND min_percent = 81 
        AND max_percent = 100
    ) THEN
      INSERT INTO public.teacher_remarks_settings (school_id, subject, min_percent, max_percent, comment_text, created_by) 
      VALUES (p_school_id, subject_name, 81, 100, 'Excellent! Keep shining!', p_created_by);
    END IF;
  END LOOP;
END;
$$;