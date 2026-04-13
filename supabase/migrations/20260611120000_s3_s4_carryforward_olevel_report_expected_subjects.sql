-- Senior 3 → Senior 4: carry forward the learner's UCE subject combination (no subsidiary wipe).
-- Senior 2 → Senior 3 (and other S3–4 entry): keep existing behaviour — profile trimmed to compulsories; subsidiaries re-picked.

CREATE OR REPLACE FUNCTION public.students_programme_follow_class_trg_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new text := trim(both from NEW.current_class);
  v_old text;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    v_old := trim(both from COALESCE(OLD.current_class, ''));
    IF v_new IS NOT DISTINCT FROM v_old THEN
      RETURN NEW;
    END IF;
  END IF;

  IF v_new ~* '^(senior\s*[56]|s\.?\s*[56])(\s|$)' THEN
    DELETE FROM public.student_olevel_subjects WHERE student_id = NEW.student_id;
    PERFORM public.ensure_student_general_paper_alevel(NEW.student_id);
    RETURN NEW;
  END IF;

  IF v_new ~* '^(senior\s*[12]|s\.?\s*[12])(\s|$)' THEN
    DELETE FROM public.student_olevel_subjects WHERE student_id = NEW.student_id;
    INSERT INTO public.student_olevel_subjects (school_id, student_id, subject_name)
    SELECT DISTINCT cs.school_id, NEW.student_id, trim(both from cs.subject)
    FROM public.class_subjects cs
    WHERE cs.school_id = NEW.school_id
      AND trim(both from cs.class_name) = v_new
    ON CONFLICT (student_id, subject_name) DO NOTHING;
    RETURN NEW;
  END IF;

  IF v_new ~* '^(senior\s*[34]|s\.?\s*[34])(\s|$)' THEN
    IF TG_OP = 'UPDATE'
       AND v_old ~* '^(senior\s*3|s\.?\s*3)(\s|$)'
       AND v_new ~* '^(senior\s*4|s\.?\s*4)(\s|$)' THEN
      DELETE FROM public.student_olevel_subjects s
      WHERE s.student_id = NEW.student_id
        AND NOT EXISTS (
          SELECT 1
          FROM public.class_subjects cs
          WHERE cs.school_id = NEW.school_id
            AND trim(both from cs.class_name) = v_new
            AND trim(both from cs.subject) = trim(both from s.subject_name)
        );

      INSERT INTO public.student_olevel_subjects (school_id, student_id, subject_name)
      SELECT DISTINCT cs.school_id, NEW.student_id, trim(both from cs.subject)
      FROM public.class_subjects cs
      WHERE cs.school_id = NEW.school_id
        AND trim(both from cs.class_name) = v_new
        AND cs.uce_offering_type = 'compulsory'
      ON CONFLICT (student_id, subject_name) DO NOTHING;
      RETURN NEW;
    END IF;

    DELETE FROM public.student_olevel_subjects s
    WHERE s.student_id = NEW.student_id
      AND NOT EXISTS (
        SELECT 1
        FROM public.class_subjects cs
        WHERE cs.school_id = NEW.school_id
          AND trim(both from cs.class_name) = v_new
          AND trim(both from cs.subject) = trim(both from s.subject_name)
          AND cs.uce_offering_type = 'compulsory'
      );

    INSERT INTO public.student_olevel_subjects (school_id, student_id, subject_name)
    SELECT DISTINCT cs.school_id, NEW.student_id, trim(both from cs.subject)
    FROM public.class_subjects cs
    WHERE cs.school_id = NEW.school_id
      AND trim(both from cs.class_name) = v_new
      AND cs.uce_offering_type = 'compulsory'
    ON CONFLICT (student_id, subject_name) DO NOTHING;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF v_old ~* '^(senior\s*[1-4]|s\.?\s*[1-4])(\s|$)'
       AND v_new !~* '^(senior\s*[1-4]|s\.?\s*[1-4])(\s|$)' THEN
      DELETE FROM public.student_olevel_subjects WHERE student_id = NEW.student_id;
    END IF;

    IF v_old ~* '^(senior\s*[56]|s\.?\s*[56])(\s|$)'
       AND v_new !~* '^(senior\s*[56]|s\.?\s*[56])(\s|$)' THEN
      DELETE FROM public.student_alevel_subjects WHERE student_id = NEW.student_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.students_programme_follow_class_trg_fn() IS
  'Sync student_olevel_subjects / A-Level GP when current_class changes. S3→S4 preserves subsidiary picks; S2→S3 resets to compulsories.';
