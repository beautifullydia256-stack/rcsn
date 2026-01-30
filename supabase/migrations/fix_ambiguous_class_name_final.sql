-- Final fix: Update setup_new_school_defaults to use a transaction-safe approach
-- and ensure all class_name references are properly qualified

CREATE OR REPLACE FUNCTION public.setup_new_school_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_current_year INTEGER;
BEGIN
  -- Insert default subjects and classes based on school type
  IF NEW.type = 'Primary' OR NEW.type = 'Nursery/Primary' THEN
    -- Primary school subjects
    INSERT INTO public.subjects (school_id, name, is_core) VALUES
      (NEW.school_id, 'LITERACY I', true),
      (NEW.school_id, 'LITERACY II', true),
      (NEW.school_id, 'SCIENCE', true),
      (NEW.school_id, 'SOCIAL STUDIES', true),
      (NEW.school_id, 'ENGLISH', true),
      (NEW.school_id, 'MATHEMATICS', true);
    
    -- Primary classes
    INSERT INTO public.classes (school_id, class_name, max_students) VALUES
      (NEW.school_id, 'Primary 1', 1000),
      (NEW.school_id, 'Primary 2', 1000),
      (NEW.school_id, 'Primary 3', 1000),
      (NEW.school_id, 'Primary 4', 1000),
      (NEW.school_id, 'Primary 5', 1000),
      (NEW.school_id, 'Primary 6', 1000),
      (NEW.school_id, 'Primary 7', 1000);
      
  ELSIF NEW.type = 'Secondary' THEN
    -- CRITICAL: Insert classes FIRST to ensure they exist before any validation
    INSERT INTO public.classes (school_id, class_name, max_students) VALUES
      (NEW.school_id, 'Senior 1', 1000),
      (NEW.school_id, 'Senior 2', 1000),
      (NEW.school_id, 'Senior 3', 1000),
      (NEW.school_id, 'Senior 4', 1000),
      (NEW.school_id, 'Senior 5', 1000),
      (NEW.school_id, 'Senior 6', 1000);
    
    -- Now insert class_subjects (classes already exist, so any validation won't be ambiguous)
    INSERT INTO public.class_subjects (school_id, class_name, subject) VALUES
      (NEW.school_id, 'Senior 1', 'English Language'),
      (NEW.school_id, 'Senior 1', 'Mathematics'),
      (NEW.school_id, 'Senior 1', 'Biology'),
      (NEW.school_id, 'Senior 1', 'Chemistry'),
      (NEW.school_id, 'Senior 1', 'Physics'),
      (NEW.school_id, 'Senior 1', 'Geography'),
      (NEW.school_id, 'Senior 1', 'History and Political Education'),
      (NEW.school_id, 'Senior 2', 'English Language'),
      (NEW.school_id, 'Senior 2', 'Mathematics'),
      (NEW.school_id, 'Senior 2', 'Biology'),
      (NEW.school_id, 'Senior 2', 'Chemistry'),
      (NEW.school_id, 'Senior 2', 'Physics'),
      (NEW.school_id, 'Senior 2', 'Geography'),
      (NEW.school_id, 'Senior 2', 'History and Political Education'),
      (NEW.school_id, 'Senior 3', 'English Language'),
      (NEW.school_id, 'Senior 3', 'Mathematics'),
      (NEW.school_id, 'Senior 3', 'Biology'),
      (NEW.school_id, 'Senior 3', 'Chemistry'),
      (NEW.school_id, 'Senior 3', 'Physics'),
      (NEW.school_id, 'Senior 3', 'Geography'),
      (NEW.school_id, 'Senior 3', 'History and Political Education'),
      (NEW.school_id, 'Senior 4', 'English Language'),
      (NEW.school_id, 'Senior 4', 'Mathematics'),
      (NEW.school_id, 'Senior 4', 'Biology'),
      (NEW.school_id, 'Senior 4', 'Chemistry'),
      (NEW.school_id, 'Senior 4', 'Physics'),
      (NEW.school_id, 'Senior 4', 'Geography'),
      (NEW.school_id, 'Senior 4', 'History and Political Education');
  END IF;
  
  -- Insert default terms
  INSERT INTO public.school_terms (school_id, term_name, start_date, end_date, is_current) VALUES
    (NEW.school_id, 'Term 1', CURRENT_DATE, CURRENT_DATE + INTERVAL '3 months', true),
    (NEW.school_id, 'Term 2', CURRENT_DATE + INTERVAL '3 months', CURRENT_DATE + INTERVAL '6 months', false),
    (NEW.school_id, 'Term 3', CURRENT_DATE + INTERVAL '6 months', CURRENT_DATE + INTERVAL '9 months', false);
  
  -- Insert default expense categories
  INSERT INTO public.expense_categories (school_id, name, description, is_default) VALUES
    (NEW.school_id, 'Tuition Fees', 'Regular tuition fees', true),
    (NEW.school_id, 'Registration Fees', 'Student registration fees', true),
    (NEW.school_id, 'Examination Fees', 'Examination and assessment fees', true),
    (NEW.school_id, 'Library Fees', 'Library and resource fees', true),
    (NEW.school_id, 'Sports Fees', 'Sports and extracurricular fees', true);
  
  -- Setup default teacher remarks for all subjects
  PERFORM public.setup_default_teacher_remarks_for_school(NEW.school_id);
  
  -- Insert default exam sets for Primary schools
  IF NEW.type = 'Nursery/Primary' OR NEW.type = 'Primary' THEN
    v_current_year := EXTRACT(YEAR FROM CURRENT_DATE);
    
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

