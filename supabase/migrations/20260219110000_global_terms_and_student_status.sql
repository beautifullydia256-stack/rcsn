-- ============================================================================
-- PWEZACORE — GLOBAL TERMS & STUDENT STATUS (Phase 1)
-- Implements: global_terms (Uganda windows), student enrollment_status, etc.
-- Does NOT drop or alter existing RLS. Adds new structures only.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. GLOBAL_TERMS — Central academic structure (Super Admin creates)
-- Three terms per year. Schools cannot create; they operate within windows.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.global_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
  term INTEGER NOT NULL CHECK (term IN (1, 2, 3)),
  term_name TEXT NOT NULL,
  window_start DATE NOT NULL,
  window_end DATE NOT NULL,
  hard_stop_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (year, term)
);

COMMENT ON TABLE public.global_terms IS 'Central term definitions. Created by Super Admin. Schools set their start/end within these windows.';
COMMENT ON COLUMN public.global_terms.window_start IS 'Earliest date a school may start this term';
COMMENT ON COLUMN public.global_terms.window_end IS 'End of the operating window';
COMMENT ON COLUMN public.global_terms.hard_stop_date IS 'No school may end term after this date';

CREATE INDEX IF NOT EXISTS idx_global_terms_year_term ON public.global_terms(year, term);

ALTER TABLE public.global_terms ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read (schools need to see windows)
CREATE POLICY "global_terms_select"
  ON public.global_terms FOR SELECT TO authenticated
  USING (true);

-- Only owner can manage (Super Admin = owner for now)
CREATE POLICY "global_terms_manage"
  ON public.global_terms FOR ALL TO authenticated
  USING ((SELECT role FROM public.users WHERE user_id = auth.uid()) = 'owner')
  WITH CHECK ((SELECT role FROM public.users WHERE user_id = auth.uid()) = 'owner');

-- ---------------------------------------------------------------------------
-- 2. SEED DEFAULT GLOBAL TERMS (Uganda windows per spec)
-- Term 1: Jan 1 - May 1 | Term 2: May 2 - Aug 21 | Term 3: Aug 22 - Dec 25
-- ---------------------------------------------------------------------------
INSERT INTO public.global_terms (year, term, term_name, window_start, window_end, hard_stop_date)
SELECT y, t,
  'T' || t,
  CASE t
    WHEN 1 THEN make_date(y, 1, 1)
    WHEN 2 THEN make_date(y, 5, 2)
    WHEN 3 THEN make_date(y, 8, 22)
  END,
  CASE t
    WHEN 1 THEN make_date(y, 5, 1)
    WHEN 2 THEN make_date(y, 8, 21)
    WHEN 3 THEN make_date(y, 12, 25)
  END,
  CASE t
    WHEN 1 THEN make_date(y, 5, 1)
    WHEN 2 THEN make_date(y, 8, 21)
    WHEN 3 THEN make_date(y, 12, 25)
  END
FROM generate_series(2024, 2030) AS y
CROSS JOIN generate_series(1, 3) AS t
ON CONFLICT (year, term) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. LINK school_terms TO global_terms (nullable for existing rows)
-- ---------------------------------------------------------------------------
ALTER TABLE public.school_terms
  ADD COLUMN IF NOT EXISTS global_term_id UUID REFERENCES public.global_terms(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.school_terms.global_term_id IS 'Links to central term. Null = legacy row before global terms.';

CREATE INDEX IF NOT EXISTS idx_school_terms_global_term ON public.school_terms(global_term_id) WHERE global_term_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 4. STUDENT COLUMNS — Academic class, promotion year, enrollment status
-- ---------------------------------------------------------------------------
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS academic_class TEXT;

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS academic_year_promoted INTEGER;

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS enrollment_status TEXT;

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS activation_date TIMESTAMPTZ;

-- Backfill: academic_class from current_class, enrollment_status from status
UPDATE public.students
SET academic_class = COALESCE(academic_class, current_class),
    enrollment_status = COALESCE(enrollment_status,
      CASE WHEN status = 'graduated' THEN 'Graduated' ELSE 'Active' END)
WHERE academic_class IS NULL OR enrollment_status IS NULL;

-- Add check for enrollment_status (after backfill)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'students_enrollment_status_check'
  ) THEN
    ALTER TABLE public.students
      ADD CONSTRAINT students_enrollment_status_check
      CHECK (enrollment_status IS NULL OR enrollment_status IN ('Active', 'Inactive', 'Graduated'));
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

COMMENT ON COLUMN public.students.academic_class IS 'Class after promotion (P6, S3). Matches current_class until rollover.';
COMMENT ON COLUMN public.students.academic_year_promoted IS 'Year when student was last promoted (rollover)';
COMMENT ON COLUMN public.students.enrollment_status IS 'Active=present this term | Inactive=promoted but not returned | Graduated';
COMMENT ON COLUMN public.students.activation_date IS 'Set when student pays, registers, or is confirmed present';

-- ---------------------------------------------------------------------------
-- 5. VALIDATION: School term dates within global window (trigger)
-- Only fires when global_term_id is set
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_school_term_dates()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_window_start DATE;
  v_hard_stop DATE;
BEGIN
  IF NEW.global_term_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT window_start, hard_stop_date INTO v_window_start, v_hard_stop
  FROM public.global_terms WHERE id = NEW.global_term_id;

  IF NEW.start_date < v_window_start THEN
    RAISE EXCEPTION 'School cannot start term before % (national window)', v_window_start;
  END IF;

  IF NEW.end_date > v_hard_stop THEN
    RAISE EXCEPTION 'School cannot end term after % (hard stop)', v_hard_stop;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_validate_school_term_dates ON public.school_terms;
CREATE TRIGGER trigger_validate_school_term_dates
  BEFORE INSERT OR UPDATE ON public.school_terms
  FOR EACH ROW
  WHEN (NEW.global_term_id IS NOT NULL)
  EXECUTE FUNCTION public.validate_school_term_dates();
