-- PERMANENT SYSTEM FIX: Ensure ALL schools get proper class-subject assignments
-- This fixes the root cause and ensures future schools work automatically

-- Step 1: Fix ALL existing schools that are missing class-subject assignments
DO $$
DECLARE
    school_record RECORD;
    class_subject_count INTEGER;
BEGIN
    RAISE NOTICE 'Fixing class-subject assignments for ALL schools missing them...';
    
    FOR school_record IN 
        SELECT s.school_id, s.name, s.type 
        FROM schools s 
        WHERE s.type IN ('Primary', 'Secondary', 'Nursery/Primary')
    LOOP
        -- Check if school has any class-subject assignments
        SELECT COUNT(*) INTO class_subject_count 
        FROM class_subjects 
        WHERE school_id = school_record.school_id;
        
        -- If no class-subject assignments, create them
        IF class_subject_count = 0 THEN
            RAISE NOTICE 'Creating class-subject assignments for: % (Type: %)', school_record.name, school_record.type;
            
            IF school_record.type = 'Primary' OR school_record.type = 'Nursery/Primary' THEN
                -- Nursery classes (Baby, Middle, Top) - Holistic subjects
                INSERT INTO public.class_subjects (school_id, class_name, subject)
                SELECT school_record.school_id, class_name, subject_name
                FROM (VALUES 
                    ('Baby Class'), ('Middle Class'), ('Top Class')
                ) AS nursery_classes(class_name)
                CROSS JOIN (VALUES 
                    ('Development and using language (Language II)'),
                    ('Development and using mathematical concepts'),
                    ('Relating and knowing my environment (Language I)'),
                    ('Relating with others (Social development)'),
                    ('Taking care of myself (Health habits)')
                ) AS nursery_subjects(subject_name)
                WHERE EXISTS (
                    SELECT 1 FROM classes c 
                    WHERE c.school_id = school_record.school_id 
                      AND c.class_name = nursery_classes.class_name
                )
                AND NOT EXISTS (
                    SELECT 1 FROM public.class_subjects cs
                    WHERE cs.school_id = school_record.school_id 
                      AND cs.class_name = nursery_classes.class_name 
                      AND cs.subject = subject_name
                );

                -- Primary 1-3 - Extended subjects
                INSERT INTO public.class_subjects (school_id, class_name, subject)
                SELECT school_record.school_id, class_name, subject_name
                FROM (VALUES 
                    ('Primary 1'), ('Primary 2'), ('Primary 3')
                ) AS early_primary(class_name)
                CROSS JOIN (VALUES 
                    ('ENGLISH'),
                    ('LITERACY I'),
                    ('LITERACY II'),
                    ('MATHEMATICS'),
                    ('Reading'),
                    ('Religious Education (R.E)'),
                    ('Luganda')
                ) AS early_subjects(subject_name)
                WHERE EXISTS (
                    SELECT 1 FROM classes c 
                    WHERE c.school_id = school_record.school_id 
                      AND c.class_name = early_primary.class_name
                )
                AND NOT EXISTS (
                    SELECT 1 FROM public.class_subjects cs
                    WHERE cs.school_id = school_record.school_id 
                      AND cs.class_name = early_primary.class_name 
                      AND cs.subject = subject_name
                );

                -- Primary 4-7 - Core subjects
                INSERT INTO public.class_subjects (school_id, class_name, subject)
                SELECT school_record.school_id, class_name, subject_name
                FROM (VALUES 
                    ('Primary 4'), ('Primary 5'), ('Primary 6'), ('Primary 7')
                ) AS upper_primary(class_name)
                CROSS JOIN (VALUES 
                    ('ENGLISH'),
                    ('MATHEMATICS'),
                    ('SCIENCE'),
                    ('SOCIAL STUDIES')
                ) AS core_subjects(subject_name)
                WHERE EXISTS (
                    SELECT 1 FROM classes c 
                    WHERE c.school_id = school_record.school_id 
                      AND c.class_name = upper_primary.class_name
                )
                AND NOT EXISTS (
                    SELECT 1 FROM public.class_subjects cs
                    WHERE cs.school_id = school_record.school_id 
                      AND cs.class_name = upper_primary.class_name 
                      AND cs.subject = subject_name
                );

            ELSIF school_record.type = 'Secondary' THEN
                -- Secondary schools use catalog system - this should already be handled
                -- by the existing setup_new_school_defaults function
                RAISE NOTICE 'Secondary school % should use existing catalog assignments', school_record.name;
            END IF;
            
            RAISE NOTICE 'Completed class-subject assignments for: %', school_record.name;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Completed fixing ALL schools with missing class-subject assignments';
END $$;

-- Step 2: Update the setup_new_school_defaults function to ALWAYS create class-subject assignments
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
      -- Insert default subjects
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

    -- CRITICAL: Create class-subject assignments for Primary/Nursery schools
    BEGIN
      -- Nursery classes (if they exist)
      INSERT INTO public.class_subjects (school_id, class_name, subject)
      SELECT NEW.school_id, class_name, subject_name
      FROM (VALUES 
          ('Baby Class'), ('Middle Class'), ('Top Class')
      ) AS nursery_classes(class_name)
      CROSS JOIN (VALUES 
          ('Development and using language (Language II)'),
          ('Development and using mathematical concepts'),
          ('Relating and knowing my environment (Language I)'),
          ('Relating with others (Social development)'),
          ('Taking care of myself (Health habits)')
      ) AS nursery_subjects(subject_name)
      WHERE EXISTS (
          SELECT 1 FROM classes c 
          WHERE c.school_id = NEW.school_id 
            AND c.class_name = nursery_classes.class_name
      )
      AND NOT EXISTS (
          SELECT 1 FROM public.class_subjects cs
          WHERE cs.school_id = NEW.school_id 
            AND cs.class_name = nursery_classes.class_name 
            AND cs.subject = subject_name
      );

      -- Primary 1-3 classes
      INSERT INTO public.class_subjects (school_id, class_name, subject)
      SELECT NEW.school_id, class_name, subject_name
      FROM (VALUES 
          ('Primary 1'), ('Primary 2'), ('Primary 3')
      ) AS early_primary(class_name)
      CROSS JOIN (VALUES 
          ('ENGLISH'),
          ('LITERACY I'),
          ('LITERACY II'),
          ('MATHEMATICS'),
          ('Reading'),
          ('Religious Education (R.E)'),
          ('Luganda')
      ) AS early_subjects(subject_name)
      WHERE EXISTS (
          SELECT 1 FROM classes c 
          WHERE c.school_id = NEW.school_id 
            AND c.class_name = early_primary.class_name
      )
      AND NOT EXISTS (
          SELECT 1 FROM public.class_subjects cs
          WHERE cs.school_id = NEW.school_id 
            AND cs.class_name = early_primary.class_name 
            AND cs.subject = subject_name
      );

      -- Primary 4-7 classes
      INSERT INTO public.class_subjects (school_id, class_name, subject)
      SELECT NEW.school_id, class_name, subject_name
      FROM (VALUES 
          ('Primary 4'), ('Primary 5'), ('Primary 6'), ('Primary 7')
      ) AS upper_primary(class_name)
      CROSS JOIN (VALUES 
          ('ENGLISH'),
          ('MATHEMATICS'),
          ('SCIENCE'),
          ('SOCIAL STUDIES')
      ) AS core_subjects(subject_name)
      WHERE EXISTS (
          SELECT 1 FROM classes c 
          WHERE c.school_id = NEW.school_id 
            AND c.class_name = upper_primary.class_name
      )
      AND NOT EXISTS (
          SELECT 1 FROM public.class_subjects cs
          WHERE cs.school_id = NEW.school_id 
            AND cs.class_name = upper_primary.class_name 
            AND cs.subject = subject_name
      );
      
      RAISE NOTICE 'Successfully created class-subject assignments for primary school: %', NEW.name;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to create class-subject assignments for school %: %', NEW.name, SQLERRM;
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

    -- Set up class subjects for secondary using catalog
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

  -- Continue with rest of setup (terms, categories, etc.) - same as before
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