-- Fix setup_new_school_defaults to use correct expense_categories columns
-- Table has: category_name (not name), is_active (not is_default)

CREATE OR REPLACE FUNCTION public.setup_new_school_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_current_year INTEGER;
    v_current_month INTEGER;
    v_current_term INTEGER;
BEGIN
  IF NEW.type = 'Primary' OR NEW.type = 'Nursery/Primary' THEN
    INSERT INTO public.subjects (school_id, name, is_core) VALUES
      (NEW.school_id, 'LITERACY I', true),
      (NEW.school_id, 'LITERACY II', true),
      (NEW.school_id, 'SCIENCE', true),
      (NEW.school_id, 'SOCIAL STUDIES', true),
      (NEW.school_id, 'ENGLISH', true),
      (NEW.school_id, 'MATHEMATICS', true);
    
    INSERT INTO public.classes (school_id, class_name, max_students) VALUES
      (NEW.school_id, 'Primary 1', 1000),
      (NEW.school_id, 'Primary 2', 1000),
      (NEW.school_id, 'Primary 3', 1000),
      (NEW.school_id, 'Primary 4', 1000),
      (NEW.school_id, 'Primary 5', 1000),
      (NEW.school_id, 'Primary 6', 1000),
      (NEW.school_id, 'Primary 7', 1000);
      
  ELSIF NEW.type = 'Secondary' THEN
    INSERT INTO public.classes (school_id, class_name, max_students) VALUES
      (NEW.school_id, 'Senior 1', 1000),
      (NEW.school_id, 'Senior 2', 1000),
      (NEW.school_id, 'Senior 3', 1000),
      (NEW.school_id, 'Senior 4', 1000),
      (NEW.school_id, 'Senior 5', 1000),
      (NEW.school_id, 'Senior 6', 1000);
    
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
  
  -- Detect current term based on today's month (Uganda School Calendar)
  v_current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  v_current_month := EXTRACT(MONTH FROM CURRENT_DATE);
  
  -- Determine current term: Jan-Apr=Term1, May-Aug=Term2, Sep-Dec=Term3
  IF v_current_month >= 1 AND v_current_month <= 4 THEN
    v_current_term := 1;  -- January-April: Term 1
  ELSIF v_current_month >= 5 AND v_current_month <= 8 THEN
    v_current_term := 2;  -- May-August: Term 2
  ELSE
    v_current_term := 3;  -- September-December: Term 3
  END IF;
  
  -- Insert terms with correct is_current flag
  INSERT INTO public.school_terms (school_id, year, term, start_date, end_date, is_current) VALUES
    (NEW.school_id, v_current_year, 1, CURRENT_DATE, CURRENT_DATE + INTERVAL '3 months', (v_current_term = 1)),
    (NEW.school_id, v_current_year, 2, CURRENT_DATE + INTERVAL '3 months', CURRENT_DATE + INTERVAL '6 months', (v_current_term = 2)),
    (NEW.school_id, v_current_year, 3, CURRENT_DATE + INTERVAL '6 months', CURRENT_DATE + INTERVAL '9 months', (v_current_term = 3));
  
  -- FIX: Use category_name (not name) and is_active (not is_default)
  INSERT INTO public.expense_categories (school_id, category_name, description, is_active) VALUES
    (NEW.school_id, 'Tuition Fees', 'Regular tuition fees', true),
    (NEW.school_id, 'Registration Fees', 'Student registration fees', true),
    (NEW.school_id, 'Examination Fees', 'Examination and assessment fees', true),
    (NEW.school_id, 'Library Fees', 'Library and resource fees', true),
    (NEW.school_id, 'Sports Fees', 'Sports and extracurricular fees', true);
  
  PERFORM public.setup_default_teacher_remarks_for_school(NEW.school_id);
  
  IF NEW.type = 'Nursery/Primary' OR NEW.type = 'Primary' THEN
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




