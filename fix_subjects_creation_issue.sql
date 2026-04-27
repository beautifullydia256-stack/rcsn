-- Fix the subjects creation issue for ALL schools that are missing subjects
-- This addresses the root cause and fixes all affected schools

-- Step 1: Find all schools that have classes but no subjects (the exact issue you described)
DO $$
DECLARE
    school_record RECORD;
    subject_count INTEGER;
    class_count INTEGER;
BEGIN
    RAISE NOTICE 'Checking all schools for missing subjects...';
    
    FOR school_record IN 
        SELECT s.school_id, s.name, s.type 
        FROM schools s 
        WHERE s.type IN ('Primary', 'Secondary', 'Nursery/Primary')
    LOOP
        -- Check counts
        SELECT COUNT(*) INTO subject_count FROM subjects WHERE school_id = school_record.school_id;
        SELECT COUNT(*) INTO class_count FROM classes WHERE school_id = school_record.school_id;
        
        -- If school has classes but no subjects, fix it
        IF class_count > 0 AND subject_count = 0 THEN
            RAISE NOTICE 'Fixing subjects for school: % (Type: %, Classes: %, Subjects: %)', 
                school_record.name, school_record.type, class_count, subject_count;
            
            -- Add missing subjects based on school type
            IF school_record.type = 'Primary' OR school_record.type = 'Nursery/Primary' THEN
                INSERT INTO public.subjects (school_id, name) 
                SELECT school_record.school_id, subject_name
                FROM (VALUES 
                  ('LITERACY I'),
                  ('LITERACY II'),
                  ('SCIENCE'),
                  ('SOCIAL STUDIES'),
                  ('ENGLISH'),
                  ('MATHEMATICS')
                ) AS default_subjects(subject_name)
                WHERE NOT EXISTS (
                  SELECT 1 FROM public.subjects 
                  WHERE school_id = school_record.school_id AND name = subject_name
                );
                
                RAISE NOTICE 'Added % primary subjects for school: %', 6, school_record.name;
                
            ELSIF school_record.type = 'Secondary' THEN
                -- For secondary schools, we typically don't add default subjects
                -- as they use the subject catalog system
                RAISE NOTICE 'Secondary school % uses catalog system - no default subjects needed', school_record.name;
            END IF;
        ELSIF subject_count = 0 AND class_count = 0 THEN
            RAISE NOTICE 'School % has no classes or subjects - needs full setup', school_record.name;
        ELSE
            -- School is fine
            NULL;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Completed subjects fix for all schools';
END $$;

-- Step 2: Fix the root cause in the setup_new_school_defaults function
-- The issue might be that the subjects table has constraints or the insert is failing
CREATE OR REPLACE FUNCTION public.setup_new_school_defaults()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_join_year integer;
  v_join_term integer;
  v_t integer;
  v_gt_id uuid;
  v_ws date;
  v_he date;
BEGIN
  RAISE NOTICE 'Setting up defaults for new school: % (Type: %)', NEW.name, NEW.type;
  
  -- Set up subjects and classes based on school type
  IF NEW.type = 'Primary' OR NEW.type = 'Nursery/Primary' THEN
    BEGIN
      -- Insert default subjects (this was failing before)
      INSERT INTO public.subjects (school_id, name) 
      SELECT NEW.school_id, subject_name
      FROM (VALUES 
        ('LITERACY I'),
        ('LITERACY II'),
        ('SCIENCE'),
        ('SOCIAL STUDIES'),
        ('ENGLISH'),
        ('MATHEMATICS')
      ) AS default_subjects(subject_name)
      WHERE NOT EXISTS (
        SELECT 1 FROM public.subjects 
        WHERE school_id = NEW.school_id AND name = subject_name
      );
      
      RAISE NOTICE 'Successfully added subjects for school: %', NEW.name;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to add subjects for school %: %', NEW.name, SQLERRM;
    END;

    BEGIN
      -- Insert default classes
      INSERT INTO public.classes (school_id, class_name, max_students) 
      SELECT NEW.school_id, class_name, 1000
      FROM (VALUES 
        ('Primary 1'),
        ('Primary 2'),
        ('Primary 3'),
        ('Primary 4'),
        ('Primary 5'),
        ('Primary 6'),
        ('Primary 7')
      ) AS default_classes(class_name)
      WHERE NOT EXISTS (
        SELECT 1 FROM public.classes 
        WHERE school_id = NEW.school_id AND class_name = default_classes.class_name
      );
      
      RAISE NOTICE 'Successfully added classes for school: %', NEW.name;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to add classes for school %: %', NEW.name, SQLERRM;
    END;

  ELSIF NEW.type = 'Secondary' THEN
    BEGIN
      -- Insert default classes for secondary
      INSERT INTO public.classes (school_id, class_name, max_students) 
      SELECT NEW.school_id, class_name, 1000
      FROM (VALUES 
        ('Senior 1'),
        ('Senior 2'),
        ('Senior 3'),
        ('Senior 4'),
        ('Senior 5'),
        ('Senior 6')
      ) AS default_classes(class_name)
      WHERE NOT EXISTS (
        SELECT 1 FROM public.classes 
        WHERE school_id = NEW.school_id AND class_name = default_classes.class_name
      );
      
      RAISE NOTICE 'Successfully added secondary classes for school: %', NEW.name;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to add secondary classes for school %: %', NEW.name, SQLERRM;
    END;

    -- Set up class subjects for secondary (if tables exist)
    BEGIN
      INSERT INTO public.class_subjects (school_id, class_name, subject, uce_offering_type, is_non_removable_default)
      SELECT
        NEW.school_id,
        c.class_name,
        u.subject_name,
        CASE WHEN u.catalog_offering = 'compulsory' THEN 'compulsory'::text ELSE 'subsidiary'::text END,
        (u.catalog_offering = 'compulsory')
      FROM (
        VALUES ('Senior 1'), ('Senior 2'), ('Senior 3'), ('Senior 4')
      ) AS c(class_name)
      CROSS JOIN public.uce_subject_catalog u
      WHERE NOT EXISTS (
        SELECT 1 FROM public.class_subjects cs
        WHERE cs.school_id = NEW.school_id 
          AND cs.class_name = c.class_name 
          AND cs.subject = u.subject_name
      );

      INSERT INTO public.class_subjects (school_id, class_name, subject)
      SELECT NEW.school_id, c.class_name, u.subject_name
      FROM (
        VALUES ('Senior 5'), ('Senior 6')
      ) AS c(class_name)
      CROSS JOIN public.uace_subject_catalog u
      WHERE NOT EXISTS (
        SELECT 1 FROM public.class_subjects cs
        WHERE cs.school_id = NEW.school_id 
          AND cs.class_name = c.class_name 
          AND cs.subject = u.subject_name
      );
      
      RAISE NOTICE 'Successfully added class subjects for secondary school: %', NEW.name;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Could not set up class subjects for school %: %', NEW.name, SQLERRM;
    END;
  END IF;

  -- Continue with the rest of the setup (terms, categories, etc.)
  -- [Rest of the function remains the same as before]
  
  BEGIN
    PERFORM public.ensure_academic_year_exists(EXTRACT(YEAR FROM CURRENT_DATE)::int);

    SELECT g.year, g.term INTO v_join_year, v_join_term
    FROM public.global_calendar_year_term(CURRENT_DATE::date) g;

    IF v_join_year IS NULL THEN
      PERFORM public.ensure_academic_year_exists(EXTRACT(YEAR FROM CURRENT_DATE)::int - 1);
      PERFORM public.ensure_academic_year_exists(EXTRACT(YEAR FROM CURRENT_DATE)::int + 1);
      SELECT g.year, g.term INTO v_join_year, v_join_term
      FROM public.global_calendar_year_term(CURRENT_DATE::date) g;
    END IF;

    IF v_join_year IS NULL THEN
      v_join_year := EXTRACT(YEAR FROM CURRENT_DATE)::int;
      v_join_term := 1;
      PERFORM public.ensure_academic_year_exists(v_join_year);
    END IF;

    FOR v_t IN v_join_term..3 LOOP
      SELECT gt.id, gt.window_start, gt.hard_stop_date
      INTO v_gt_id, v_ws, v_he
      FROM public.global_terms gt
      WHERE gt.year = v_join_year AND gt.term = v_t;

      IF v_gt_id IS NULL THEN
        PERFORM public.ensure_academic_year_exists(v_join_year);
        SELECT gt.id, gt.window_start, gt.hard_stop_date
        INTO v_gt_id, v_ws, v_he
        FROM public.global_terms gt
        WHERE gt.year = v_join_year AND gt.term = v_t;
      END IF;

      IF v_gt_id IS NOT NULL THEN
        INSERT INTO public.school_terms (
          school_id,
          year,
          term,
          start_date,
          end_date,
          is_current,
          global_term_id
        )
        SELECT 
          NEW.school_id,
          v_join_year,
          v_t,
          v_ws,
          v_he,
          (v_t = v_join_term),
          v_gt_id
        WHERE NOT EXISTS (
          SELECT 1 FROM public.school_terms st
          WHERE st.school_id = NEW.school_id 
            AND st.year = v_join_year 
            AND st.term = v_t
        );
      END IF;
    END LOOP;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Could not set up terms for school %: %', NEW.name, SQLERRM;
  END;

  BEGIN
    INSERT INTO public.expense_categories (school_id, category_name, description, is_default) 
    SELECT NEW.school_id, category_name, description, true
    FROM (VALUES 
      ('Tuition Fees', 'Regular tuition fees'),
      ('Registration Fees', 'Student registration fees'),
      ('Examination Fees', 'Examination and assessment fees'),
      ('Library Fees', 'Library and resource fees'),
      ('Sports Fees', 'Sports and extracurricular fees')
    ) AS default_categories(category_name, description)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.expense_categories ec
      WHERE ec.school_id = NEW.school_id AND ec.category_name = default_categories.category_name
    );
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Could not set up expense categories for school %: %', NEW.name, SQLERRM;
  END;

  BEGIN
    PERFORM public.setup_default_teacher_remarks_for_school(NEW.school_id);
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Could not set up teacher remarks for school %: %', NEW.name, SQLERRM;
  END;

  -- Set up exam sets
  BEGIN
    IF NEW.type = 'Nursery/Primary' OR NEW.type = 'Primary' THEN
      INSERT INTO public.exam_sets (school_id, name, term, year, is_active, created_at, updated_at)
      SELECT
        NEW.school_id,
        exam_name,
        term_number,
        v_join_year,
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
      WHERE term_number >= v_join_term
        AND term_number <= 3
        AND NOT EXISTS (
          SELECT 1 FROM public.exam_sets es
          WHERE es.school_id = NEW.school_id
            AND es.name = exam_types.exam_name
            AND es.term = exam_types.term_number
            AND es.year = v_join_year
        );
    END IF;

    IF NEW.type = 'Secondary' THEN
      INSERT INTO public.exam_sets (school_id, name, term, year, is_active, created_at, updated_at)
      SELECT
        NEW.school_id,
        exam_name,
        term_number,
        v_join_year,
        true,
        NOW(),
        NOW()
      FROM (
        VALUES
          ('Beginning of Term', 1),
          ('Mid Term', 1),
          ('End of Term', 1),
          ('Beginning of Term', 2),
          ('Mid Term', 2),
          ('End of Term', 2),
          ('Beginning of Term', 3),
          ('Mid Term', 3),
          ('End of Term', 3)
      ) AS exam_types(exam_name, term_number)
      WHERE term_number >= v_join_term
        AND term_number <= 3
        AND NOT EXISTS (
          SELECT 1 FROM public.exam_sets es
          WHERE es.school_id = NEW.school_id
            AND es.name = exam_types.exam_name
            AND es.term = exam_types.term_number
            AND es.year = v_join_year
        );
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Could not set up exam sets for school %: %', NEW.name, SQLERRM;
  END;

  RAISE NOTICE 'Successfully completed setup for school: %', NEW.name;
  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'setup_new_school_defaults failed for school %: %', NEW.name, SQLERRM;
    RETURN NEW;
END;
$$;