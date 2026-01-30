-- Fix setup_default_class_teacher_comments_settings
-- It has a variable 'class_name' that conflicts with the column 'class_name' in INSERT
-- CRITICAL: Rename the variable to avoid ambiguity

CREATE OR REPLACE FUNCTION public.setup_default_class_teacher_comments_settings(
  p_school_id uuid, 
  p_created_by uuid
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  classes TEXT[] := ARRAY['Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6', 'Primary 7', 'Senior 1', 'Senior 2', 'Senior 3', 'Senior 4'];
  v_class_name TEXT;  -- Renamed from 'class_name' to 'v_class_name' to avoid ambiguity
BEGIN
  FOREACH v_class_name IN ARRAY classes
  LOOP
    INSERT INTO public.class_teacher_comments_settings (school_id, class_name, min_percent, max_percent, comment, comment_text, created_by)
    VALUES
    (p_school_id, v_class_name, 0, 40, 'The student needs to work much harder. With better focus and effort, there is room for great improvement next term.', 'The student needs to work much harder. With better focus and effort, there is room for great improvement next term.', p_created_by),
    (p_school_id, v_class_name, 41, 60, 'A fair performance, showing some understanding. More consistency and commitment are needed to reach higher results.', 'A fair performance, showing some understanding. More consistency and commitment are needed to reach higher results.', p_created_by),
    (p_school_id, v_class_name, 61, 80, 'A good performance with steady progress. Continued effort and focus will lead to even better achievement.', 'A good performance with steady progress. Continued effort and focus will lead to even better achievement.', p_created_by),
    (p_school_id, v_class_name, 81, 100, 'An excellent performance showing discipline and hard work. Keep up this spirit and continue striving for excellence.', 'An excellent performance showing discipline and hard work. Keep up this spirit and continue striving for excellence.', p_created_by)
    ON CONFLICT (school_id, class_name, min_percent, max_percent) DO NOTHING;
  END LOOP;
END;
$$;




