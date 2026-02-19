-- ============================================================================
-- PWEZACORE — AUTO-GENERATED ACADEMIC YEARS (INFINITE CALENDAR)
-- ensure_academic_year_exists(year): idempotent, creates 3 terms if missing.
-- No manual year creation needed; calendar never runs out.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. SYSTEM ACTIONS AUDIT (for auto-created years; no RLS so definer can write)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.system_actions IS 'Audit trail for system-generated actions (e.g. auto-created academic years). Not user-writable.';

-- No RLS: only SECURITY DEFINER functions / superuser write here.

-- ---------------------------------------------------------------------------
-- 2. ensure_academic_year_exists(year) — Idempotent, SECURITY DEFINER
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ensure_academic_year_exists(p_year INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Idempotent: if year already has terms, do nothing
  IF EXISTS (SELECT 1 FROM public.global_terms WHERE year = p_year LIMIT 1) THEN
    RETURN;
  END IF;

  -- Insert exactly 3 terms with Uganda national windows (non-configurable)
  INSERT INTO public.global_terms (year, term, term_name, window_start, window_end, hard_stop_date)
  VALUES
    (p_year, 1, 'T1', make_date(p_year, 1, 1),  make_date(p_year, 5, 1),  make_date(p_year, 5, 1)),
    (p_year, 2, 'T2', make_date(p_year, 5, 2),  make_date(p_year, 8, 21), make_date(p_year, 8, 21)),
    (p_year, 3, 'T3', make_date(p_year, 8, 22), make_date(p_year, 12, 25), make_date(p_year, 12, 25))
  ON CONFLICT (year, term) DO NOTHING;

  -- Audit: system action
  INSERT INTO public.system_actions (action, details)
  VALUES ('ensure_academic_year', jsonb_build_object('year', p_year));
END;
$$;

COMMENT ON FUNCTION public.ensure_academic_year_exists(INTEGER) IS 'Ensures global_terms has all 3 terms for the given year. Idempotent. Called by app/rollover/triggers.';

GRANT EXECUTE ON FUNCTION public.ensure_academic_year_exists(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_academic_year_exists(INTEGER) TO service_role;

-- ---------------------------------------------------------------------------
-- 3. TRIGGER: When school_terms row has a year, ensure that year exists
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trigger_ensure_academic_year_for_school_term()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.year IS NOT NULL THEN
    PERFORM public.ensure_academic_year_exists(NEW.year);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_academic_year_on_school_term ON public.school_terms;
CREATE TRIGGER ensure_academic_year_on_school_term
  BEFORE INSERT OR UPDATE OF year ON public.school_terms
  FOR EACH ROW
  WHEN (NEW.year IS NOT NULL)
  EXECUTE FUNCTION public.trigger_ensure_academic_year_for_school_term();
