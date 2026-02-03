-- Year rollover: when we enter a new calendar year (e.g. 2026), all schools roll over once.
-- All students move to next class (P1→P2, S1→S2, etc.); P7/S4/S6 graduate. No Term 3 check.
-- Runs automatically on first use in the new year. No manual button; cannot double-roll in same year.

-- 1. Old students (graduated) table – for archiving P7/S4/S6
CREATE TABLE IF NOT EXISTS public.old_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID UNIQUE REFERENCES public.students(student_id),
  name TEXT NOT NULL,
  school_id UUID REFERENCES public.schools(school_id),
  final_class TEXT NOT NULL,
  graduation_year INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Rollover status – one row per school per academic year when rollover was run
CREATE TABLE IF NOT EXISTS public.rollover_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(school_id) ON DELETE CASCADE,
  academic_year INTEGER NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  students_promoted INTEGER DEFAULT 0,
  students_graduated INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (school_id, academic_year)
);

CREATE INDEX IF NOT EXISTS idx_rollover_status_school_year ON public.rollover_status(school_id, academic_year);

-- 3. Promote and graduate: P7/S4/S6 → graduated; P1→P2, … S1→S2, … Baby Class → Primary 1
CREATE OR REPLACE FUNCTION public.promote_and_graduate_students()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
BEGIN
  -- Graduate Primary 7 (Nursery/Primary schools)
  INSERT INTO public.old_students (student_id, name, school_id, final_class, graduation_year)
  SELECT s.student_id, s.name, s.school_id, s.current_class, current_year
  FROM public.students s
  JOIN public.schools sch ON s.school_id = sch.school_id
  WHERE sch.type = 'Nursery/Primary'
    AND s.current_class = 'Primary 7'
    AND s.status = 'active'
    AND (s.repeat_year IS NULL OR s.repeat_year = FALSE)
  ON CONFLICT (student_id) DO NOTHING;

  UPDATE public.students
  SET status = 'graduated', graduation_year = current_year
  WHERE current_class = 'Primary 7'
    AND school_id IN (SELECT school_id FROM public.schools WHERE type = 'Nursery/Primary')
    AND status = 'active'
    AND (repeat_year IS NULL OR repeat_year = FALSE);

  -- Graduate Senior 4 and Senior 6 (Secondary schools)
  INSERT INTO public.old_students (student_id, name, school_id, final_class, graduation_year)
  SELECT s.student_id, s.name, s.school_id, s.current_class, current_year
  FROM public.students s
  JOIN public.schools sch ON s.school_id = sch.school_id
  WHERE sch.type = 'Secondary'
    AND s.current_class IN ('Senior 4', 'Senior 6')
    AND s.status = 'active'
    AND (s.repeat_year IS NULL OR s.repeat_year = FALSE)
  ON CONFLICT (student_id) DO NOTHING;

  UPDATE public.students
  SET status = 'graduated', graduation_year = current_year
  WHERE current_class IN ('Senior 4', 'Senior 6')
    AND school_id IN (SELECT school_id FROM public.schools WHERE type = 'Secondary')
    AND status = 'active'
    AND (repeat_year IS NULL OR repeat_year = FALSE);

  -- Promote active students (Baby Class → P1, P1→P2, … P6→P7, S1→S2, … S5→S6)
  UPDATE public.students
  SET current_class = CASE current_class
    WHEN 'Baby Class' THEN 'Primary 1'
    WHEN 'Primary 1' THEN 'Primary 2'
    WHEN 'Primary 2' THEN 'Primary 3'
    WHEN 'Primary 3' THEN 'Primary 4'
    WHEN 'Primary 4' THEN 'Primary 5'
    WHEN 'Primary 5' THEN 'Primary 6'
    WHEN 'Primary 6' THEN 'Primary 7'
    WHEN 'Senior 1' THEN 'Senior 2'
    WHEN 'Senior 2' THEN 'Senior 3'
    WHEN 'Senior 3' THEN 'Senior 4'
    WHEN 'Senior 5' THEN 'Senior 6'
    ELSE current_class
  END
  WHERE status = 'active'
    AND (repeat_year IS NULL OR repeat_year = FALSE);
END;
$$;

-- 4. Check rollover status for a school (previous calendar year only; no Term 3 check)
CREATE OR REPLACE FUNCTION public.check_rollover_status_api(p_school_id UUID)
RETURNS TABLE (
  rollover_completed BOOLEAN,
  can_run_rollover BOOLEAN,
  term3_ended BOOLEAN,
  message TEXT,
  rollover_date TIMESTAMP WITH TIME ZONE,
  students_graduated INTEGER,
  students_promoted INTEGER,
  academic_year INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_previous_year INTEGER;
  v_done BOOLEAN;
  v_students_graduated INTEGER;
  v_students_promoted INTEGER;
  v_rollover_date TIMESTAMP WITH TIME ZONE;
BEGIN
  v_previous_year := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER - 1;

  SELECT TRUE, rs.students_graduated, rs.students_promoted, rs.completed_at
  INTO v_done, v_students_graduated, v_students_promoted, v_rollover_date
  FROM public.rollover_status rs
  WHERE rs.school_id = p_school_id AND rs.academic_year = v_previous_year;

  IF v_done THEN
    RETURN QUERY SELECT
      TRUE,
      FALSE,
      TRUE,
      'Rollover completed for ' || v_previous_year::TEXT || '. Students moved to next class.',
      v_rollover_date,
      COALESCE(v_students_graduated, 0),
      COALESCE(v_students_promoted, 0),
      v_previous_year;
  ELSE
    RETURN QUERY SELECT
      FALSE,
      FALSE,
      TRUE,
      'Rollover runs automatically when you open the app in the new year.',
      NULL::TIMESTAMP WITH TIME ZONE,
      0,
      0,
      v_previous_year;
  END IF;
END;
$$;

-- 5. Run rollover once per calendar year: when we're in a new year (e.g. 2026), run for previous year (2025).
-- No Term 3 check. If any school is missing rollover for previous year, run for ALL schools and record. No double rollover.
CREATE OR REPLACE FUNCTION public.automatic_term3_rollover()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_year INTEGER;
  v_previous_year INTEGER;
  v_any_missing BOOLEAN;
BEGIN
  v_current_year := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  v_previous_year := v_current_year - 1;

  -- Only run if at least one school has not yet been rolled over for the previous year
  SELECT EXISTS (
    SELECT 1 FROM public.schools s
    WHERE NOT EXISTS (
      SELECT 1 FROM public.rollover_status rs
      WHERE rs.school_id = s.school_id AND rs.academic_year = v_previous_year
    )
  ) INTO v_any_missing;

  IF NOT v_any_missing THEN
    RETURN;
  END IF;

  -- Promote all students (all schools) and graduate P7 / S4 / S6
  PERFORM public.promote_and_graduate_students();

  -- Record rollover for every school so we never run twice for the same year
  INSERT INTO public.rollover_status (school_id, academic_year, students_promoted, students_graduated)
  SELECT s.school_id, v_previous_year, 0, 0
  FROM public.schools s
  ON CONFLICT (school_id, academic_year) DO NOTHING;
END;
$$;

-- RLS for rollover_status
DROP POLICY IF EXISTS "rollover_status_access" ON public.rollover_status;
CREATE POLICY "rollover_status_access" ON public.rollover_status
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
