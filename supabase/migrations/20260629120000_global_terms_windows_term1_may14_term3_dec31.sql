-- ============================================================================
-- Nationwide engine windows (global_terms) — updated calendar
-- Term I:   1 Jan  – 14 May
-- Term II:  15 May – 21 Aug
-- Term III: 22 Aug – 31 Dec
-- ============================================================================

UPDATE public.global_terms gt
SET
  window_start = CASE gt.term
    WHEN 1 THEN make_date(gt.year, 1, 1)
    WHEN 2 THEN make_date(gt.year, 5, 15)
    WHEN 3 THEN make_date(gt.year, 8, 22)
  END,
  window_end = CASE gt.term
    WHEN 1 THEN make_date(gt.year, 5, 14)
    WHEN 2 THEN make_date(gt.year, 8, 21)
    WHEN 3 THEN make_date(gt.year, 12, 31)
  END,
  hard_stop_date = CASE gt.term
    WHEN 1 THEN make_date(gt.year, 5, 14)
    WHEN 2 THEN make_date(gt.year, 8, 21)
    WHEN 3 THEN make_date(gt.year, 12, 31)
  END;

COMMENT ON TABLE public.global_terms IS
  'Central term definitions. Term I: 1 Jan–14 May; Term II: 15 May–21 Aug; Term III: 22 Aug–31 Dec. Schools set display dates on school_terms; engine uses these windows.';

CREATE OR REPLACE FUNCTION public.ensure_academic_year_exists(p_year INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.global_terms WHERE year = p_year LIMIT 1) THEN
    RETURN;
  END IF;

  INSERT INTO public.global_terms (year, term, term_name, window_start, window_end, hard_stop_date)
  VALUES
    (p_year, 1, 'T1', make_date(p_year, 1, 1),  make_date(p_year, 5, 14), make_date(p_year, 5, 14)),
    (p_year, 2, 'T2', make_date(p_year, 5, 15), make_date(p_year, 8, 21), make_date(p_year, 8, 21)),
    (p_year, 3, 'T3', make_date(p_year, 8, 22), make_date(p_year, 12, 31), make_date(p_year, 12, 31))
  ON CONFLICT (year, term) DO NOTHING;

  INSERT INTO public.system_actions (action, details)
  VALUES ('ensure_academic_year', jsonb_build_object('year', p_year));
END;
$$;

COMMENT ON FUNCTION public.ensure_academic_year_exists(INTEGER) IS
  'Ensures global_terms has all 3 terms for the given year (Term I Jan 1–May 14; Term II May 15–Aug 21; Term III Aug 22–Dec 31).';
