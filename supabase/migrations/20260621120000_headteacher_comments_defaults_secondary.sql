-- Default head teacher comment bands for Secondary schools (same meaning as class-teacher
-- O-Level bands, but distinct wording so reports read naturally).
-- Primary schools were already seeded in 20250928_create_headteacher_comments_settings.sql.
-- Uses ON CONFLICT DO NOTHING so existing customised rows are preserved.

INSERT INTO public.headteacher_comments_settings (school_id, min_percent, max_percent, comment_text)
SELECT
  s.school_id,
  0,
  40,
  'Outcomes are below the level we expect at this stage. The learner must show sharper focus and a stronger work ethic; there remains ample scope for substantial improvement next term.'
FROM public.schools s
WHERE s.type = 'Secondary'
ON CONFLICT (school_id, min_percent, max_percent) DO NOTHING;

INSERT INTO public.headteacher_comments_settings (school_id, min_percent, max_percent, comment_text)
SELECT
  s.school_id,
  41,
  60,
  'This is a middling term: some topics are grasped while others are only partly mastered. Steadier routines and greater persistence will be needed to lift results further.'
FROM public.schools s
WHERE s.type = 'Secondary'
ON CONFLICT (school_id, min_percent, max_percent) DO NOTHING;

INSERT INTO public.headteacher_comments_settings (school_id, min_percent, max_percent, comment_text)
SELECT
  s.school_id,
  61,
  80,
  'Overall performance is creditable, with evidence of steady gains. Maintaining this momentum and attention to detail ought to yield even stronger work in due course.'
FROM public.schools s
WHERE s.type = 'Secondary'
ON CONFLICT (school_id, min_percent, max_percent) DO NOTHING;

INSERT INTO public.headteacher_comments_settings (school_id, min_percent, max_percent, comment_text)
SELECT
  s.school_id,
  81,
  100,
  'A highly commendable term marked by diligence and self-discipline. The learner should sustain this standard while continuing to reach for the highest standards.'
FROM public.schools s
WHERE s.type = 'Secondary'
ON CONFLICT (school_id, min_percent, max_percent) DO NOTHING;

-- Idempotent seed for one school (new Secondary schools via trigger below).
CREATE OR REPLACE FUNCTION public.setup_default_headteacher_comments_secondary(p_school_id uuid)
RETURNS void
LANGUAGE sql
SET search_path = public
AS $$
  INSERT INTO public.headteacher_comments_settings (school_id, min_percent, max_percent, comment_text)
  VALUES
    (p_school_id, 0, 40,
     'Outcomes are below the level we expect at this stage. The learner must show sharper focus and a stronger work ethic; there remains ample scope for substantial improvement next term.'),
    (p_school_id, 41, 60,
     'This is a middling term: some topics are grasped while others are only partly mastered. Steadier routines and greater persistence will be needed to lift results further.'),
    (p_school_id, 61, 80,
     'Overall performance is creditable, with evidence of steady gains. Maintaining this momentum and attention to detail ought to yield even stronger work in due course.'),
    (p_school_id, 81, 100,
     'A highly commendable term marked by diligence and self-discipline. The learner should sustain this standard while continuing to reach for the highest standards.')
  ON CONFLICT (school_id, min_percent, max_percent) DO NOTHING;
$$;

COMMENT ON FUNCTION public.setup_default_headteacher_comments_secondary(uuid) IS
  'Inserts default Secondary head-teacher comment bands (distinct wording from class-teacher templates).';

CREATE OR REPLACE FUNCTION public.trg_schools_after_insert_headteacher_secondary_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.type = 'Secondary' THEN
    PERFORM public.setup_default_headteacher_comments_secondary(NEW.school_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS schools_after_insert_headteacher_secondary_defaults ON public.schools;
CREATE TRIGGER schools_after_insert_headteacher_secondary_defaults
  AFTER INSERT ON public.schools
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_schools_after_insert_headteacher_secondary_defaults();

COMMENT ON TABLE public.headteacher_comments_settings IS
  'School-wide head teacher comment bands by average %; Secondary defaults added in 20260621120000.';
