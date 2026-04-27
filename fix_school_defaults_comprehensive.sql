-- COMPREHENSIVE FIX: Ensure school defaults always work for all schools
-- This fixes the current broken school AND prevents future issues

-- Step 1: Fix any schools that are missing default subjects and classes
DO $$
DECLARE
    school_record RECORD;
    subject_count INTEGER;
    class_count INTEGER;
BEGIN
    -- Find all schools that are missing default subjects or classes
    FOR school_record IN 
        SELECT s.school_id, s.name, s.type 
        FROM schools s 
        WHERE s.type IN ('Primary', 'Secondary', 'Nursery/Primary')
    LOOP
        -- Check if school has subjects
        SELECT COUNT(*) INTO subject_count 
        FROM subjects 
        WHERE school_id = school_record.school_id;
        
        -- Check if school has classes
        SELECT COUNT(*) INTO class_count 
        FROM classes 
        WHERE school_id = school_record.school_id;
        
        -- If missing subjects or classes, set them up
        IF subject_count = 0 OR class_count = 0 THEN
            RAISE NOTICE 'Setting up defaults for school: % (Type: %)', school_record.name, school_record.type;
            
            -- Create a temporary NEW record to trigger the function
            DECLARE
                temp_new RECORD;
            BEGIN
                temp_new := ROW(
                    school_record.school_id,
                    school_record.name,
                    NULL, -- location
                    school_record.type,
                    NULL, -- admin_id
                    NULL, -- subscription_plan
                    NULL, -- student_count
                    NULL, -- referral_code_id
                    NULL  -- affiliate_id
                );
                
                -- Call the setup function directly
                PERFORM setup_new_school_defaults_manual(temp_new);
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE NOTICE 'Error setting up school %: %', school_record.name, SQLERRM;
            END;
        END IF;
    END LOOP;
END $$;

-- Step 2: Create a manual version of the setup function that we can call directly
CREATE OR REPLACE FUNCTION setup_new_school_defaults_manual(school_row RECORD)
RETURNS void
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
  -- Set up subjects and classes based on school type
  IF school_row.type = 'Primary' OR school_row.type = 'Nursery/Primary' THEN
    -- Insert default subjects (without is_core column)
    INSERT INTO public.subjects (school_id, name) 
    SELECT school_row.school_id, subject_name
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
      WHERE school_id = school_row.school_id AND name = subject_name
    );

    -- Insert default classes
    INSERT INTO public.classes (school_id, class_name, max_students) 
    SELECT school_row.school_id, class_name, 1000
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
      WHERE school_id = school_row.school_id AND class_name = default_classes.class_name
    );

  ELSIF school_row.type = 'Secondary' THEN
    -- Insert default classes for secondary
    INSERT INTO public.classes (school_id, class_name, max_students) 
    SELECT school_row.school_id, class_name, 1000
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
      WHERE school_id = school_row.school_id AND class_name = default_classes.class_name
    );

    -- Set up class subjects for secondary (if tables exist)
    BEGIN
      INSERT INTO public.class_subjects (school_id, class_name, subject, uce_offering_type, is_non_removable_default)
      SELECT
        school_row.school_id,
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
        WHERE cs.school_id = school_row.school_id 
          AND cs.class_name = c.class_name 
          AND cs.subject = u.subject_name
      );

      INSERT INTO public.class_subjects (school_id, class_name, subject)
      SELECT school_row.school_id, c.class_name, u.subject_name
      FROM (
        VALUES ('Senior 5'), ('Senior 6')
      ) AS c(class_name)
      CROSS JOIN public.uace_subject_catalog u
      WHERE NOT EXISTS (
        SELECT 1 FROM public.class_subjects cs
        WHERE cs.school_id = school_row.school_id 
          AND cs.class_name = c.class_name 
          AND cs.subject = u.subject_name
      );
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Could not set up class subjects: %', SQLERRM;
    END;
  END IF;

  -- Set up academic year and terms
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

    -- Set up school terms
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
          school_row.school_id,
          v_join_year,
          v_t,
          v_ws,
          v_he,
          (v_t = v_join_term),
          v_gt_id
        WHERE NOT EXISTS (
          SELECT 1 FROM public.school_terms st
          WHERE st.school_id = school_row.school_id 
            AND st.year = v_join_year 
            AND st.term = v_t
        );
      END IF;
    END LOOP;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Could not set up terms: %', SQLERRM;
  END;

  -- Set up default expense categories
  BEGIN
    INSERT INTO public.expense_categories (school_id, category_name, description, is_default) 
    SELECT school_row.school_id, category_name, description, true
    FROM (VALUES 
      ('Tuition Fees', 'Regular tuition fees'),
      ('Registration Fees', 'Student registration fees'),
      ('Examination Fees', 'Examination and assessment fees'),
      ('Library Fees', 'Library and resource fees'),
      ('Sports Fees', 'Sports and extracurricular fees')
    ) AS default_categories(category_name, description)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.expense_categories ec
      WHERE ec.school_id = school_row.school_id AND ec.category_name = default_categories.category_name
    );
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Could not set up expense categories: %', SQLERRM;
  END;

  -- Set up default teacher remarks
  BEGIN
    PERFORM public.setup_default_teacher_remarks_for_school(school_row.school_id);
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Could not set up teacher remarks: %', SQLERRM;
  END;

  -- Set up exam sets
  BEGIN
    IF school_row.type = 'Nursery/Primary' OR school_row.type = 'Primary' THEN
      INSERT INTO public.exam_sets (school_id, name, term, year, is_active, created_at, updated_at)
      SELECT
        school_row.school_id,
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
          WHERE es.school_id = school_row.school_id
            AND es.name = exam_types.exam_name
            AND es.term = exam_types.term_number
            AND es.year = v_join_year
        );
    END IF;

    IF school_row.type = 'Secondary' THEN
      INSERT INTO public.exam_sets (school_id, name, term, year, is_active, created_at, updated_at)
      SELECT
        school_row.school_id,
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
          WHERE es.school_id = school_row.school_id
            AND es.name = exam_types.exam_name
            AND es.term = exam_types.term_number
            AND es.year = v_join_year
        );
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Could not set up exam sets: %', SQLERRM;
  END;

  RAISE NOTICE 'Successfully set up defaults for school: %', school_row.school_id;
END;
$$;

-- Step 3: Ensure the main trigger function is working properly
-- Update the existing function to be more robust
CREATE OR REPLACE FUNCTION public.setup_new_school_defaults()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Call our robust manual function
  PERFORM setup_new_school_defaults_manual(NEW);
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the school creation
    RAISE WARNING 'setup_new_school_defaults failed for school %: %', NEW.school_id, SQLERRM;
    RETURN NEW;
END;
$$;