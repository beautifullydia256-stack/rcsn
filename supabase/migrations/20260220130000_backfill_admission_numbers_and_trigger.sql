-- 1) Backfill all existing students to new format (no hyphens: RIP202510001).
-- 2) Trigger so any new/updated row without a valid admission_number gets one.

-- ---------------------------------------------------------------------------
-- Part 1: Backfill — assign PREFIX+YEAR+MONTH+SEQ (e.g. RIP202510001) to every student
-- Order: by school_id, admission_date, created_at. Sequence resets per school per year-month.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
  v_seq INT := 0;
  v_prev_school_id UUID := NULL;
  v_prev_ym TEXT := NULL;
  v_ym TEXT;
  v_new_adm TEXT;
BEGIN
  FOR r IN
    SELECT s.student_id, s.school_id,
           COALESCE(s.admission_date, s.created_at::DATE, CURRENT_DATE) AS adm_date
    FROM public.students s
    ORDER BY s.school_id, COALESCE(s.admission_date, s.created_at::DATE), s.created_at
  LOOP
    v_ym := EXTRACT(YEAR FROM r.adm_date)::TEXT || LPAD(EXTRACT(MONTH FROM r.adm_date)::TEXT, 2, '0');
    IF v_prev_school_id IS DISTINCT FROM r.school_id OR v_prev_ym IS DISTINCT FROM v_ym THEN
      v_seq := 1;
      v_prev_school_id := r.school_id;
      v_prev_ym := v_ym;
    ELSE
      v_seq := v_seq + 1;
    END IF;
    v_new_adm := generate_admission_number_for_student(r.school_id, r.adm_date, v_seq);
    UPDATE public.students SET admission_number = v_new_adm WHERE student_id = r.student_id;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Part 2: Trigger — if admission_number is null/empty on INSERT or UPDATE, set it
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_student_admission_number_if_empty()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.admission_number IS NULL OR TRIM(COALESCE(NEW.admission_number, '')) = '' THEN
    NEW.admission_number := generate_admission_number(
      NEW.school_id,
      COALESCE(NEW.first_name, ''),
      NEW.middle_name,
      COALESCE(NEW.last_name, ''),
      COALESCE(NEW.admission_date, CURRENT_DATE)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_student_admission_number_if_empty ON public.students;
CREATE TRIGGER trigger_set_student_admission_number_if_empty
  BEFORE INSERT OR UPDATE OF admission_number, school_id, admission_date, first_name, last_name, middle_name
  ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.set_student_admission_number_if_empty();

COMMENT ON FUNCTION public.set_student_admission_number_if_empty() IS
  'Ensures admission_number is never null/empty; format PREFIX+YEAR+MONTH+SEQ e.g. RIP202510001.';
