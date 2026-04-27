-- Fix Rakai Infant Primary School specifically - add missing defaults
-- School ID: 97e253ae-1fed-4016-bea3-90d7e7c58d11

DO $$
DECLARE
    v_school_id uuid := '97e253ae-1fed-4016-bea3-90d7e7c58d11';
    v_join_year integer;
    v_join_term integer;
    v_t integer;
    v_gt_id uuid;
    v_ws date;
    v_he date;
BEGIN
    RAISE NOTICE 'Setting up missing defaults for Rakai Infant Primary School...';

    -- 1. Add missing subjects for Nursery/Primary
    INSERT INTO public.subjects (school_id, name) 
    SELECT v_school_id, subject_name
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
      WHERE school_id = v_school_id AND name = subject_name
    );
    
    RAISE NOTICE 'Added missing subjects';

    -- 2. Set up academic year and terms
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
              v_school_id,
              v_join_year,
              v_t,
              v_ws,
              v_he,
              (v_t = v_join_term),
              v_gt_id
            WHERE NOT EXISTS (
              SELECT 1 FROM public.school_terms st
              WHERE st.school_id = v_school_id 
                AND st.year = v_join_year 
                AND st.term = v_t
            );
          END IF;
        END LOOP;
        
        RAISE NOTICE 'Added missing school terms';
    EXCEPTION
        WHEN OTHERS THEN
          RAISE NOTICE 'Could not set up terms: %', SQLERRM;
    END;

    -- 3. Set up default expense categories
    BEGIN
        INSERT INTO public.expense_categories (school_id, category_name, description, is_default) 
        SELECT v_school_id, category_name, description, true
        FROM (VALUES 
          ('Tuition Fees', 'Regular tuition fees'),
          ('Registration Fees', 'Student registration fees'),
          ('Examination Fees', 'Examination and assessment fees'),
          ('Library Fees', 'Library and resource fees'),
          ('Sports Fees', 'Sports and extracurricular fees')
        ) AS default_categories(category_name, description)
        WHERE NOT EXISTS (
          SELECT 1 FROM public.expense_categories ec
          WHERE ec.school_id = v_school_id AND ec.category_name = default_categories.category_name
        );
        
        RAISE NOTICE 'Added missing expense categories';
    EXCEPTION
        WHEN OTHERS THEN
          RAISE NOTICE 'Could not set up expense categories: %', SQLERRM;
    END;

    -- 4. Set up default teacher remarks
    BEGIN
        PERFORM public.setup_default_teacher_remarks_for_school(v_school_id);
        RAISE NOTICE 'Added default teacher remarks';
    EXCEPTION
        WHEN OTHERS THEN
          RAISE NOTICE 'Could not set up teacher remarks: %', SQLERRM;
    END;

    -- 5. Set up exam sets for Nursery/Primary
    BEGIN
        INSERT INTO public.exam_sets (school_id, name, term, year, is_active, created_at, updated_at)
        SELECT
          v_school_id,
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
            WHERE es.school_id = v_school_id
              AND es.name = exam_types.exam_name
              AND es.term = exam_types.term_number
              AND es.year = v_join_year
          );
          
        RAISE NOTICE 'Added missing exam sets';
    EXCEPTION
        WHEN OTHERS THEN
          RAISE NOTICE 'Could not set up exam sets: %', SQLERRM;
    END;

    RAISE NOTICE 'Successfully completed setup for Rakai Infant Primary School';
END $$;