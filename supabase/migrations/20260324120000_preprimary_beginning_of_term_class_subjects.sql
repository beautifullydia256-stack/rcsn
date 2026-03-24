-- Default class_subjects for Beginning-of-term holistic strands (Baby, Middle, Top).
-- One row per (school, class, strand subject). ON CONFLICT DO NOTHING keeps re-runs safe.

INSERT INTO public.class_subjects (school_id, class_name, subject)
SELECT
  s.school_id,
  c.class_name,
  subj.subject_name
FROM public.schools s
CROSS JOIN (
  VALUES
    ('Baby Class'),
    ('Middle Class'),
    ('Top Class')
) AS c(class_name)
CROSS JOIN (
  VALUES
    ('Relating with others (Social development)'),
    ('Relating and knowing my environment (Language I)'),
    ('Taking care of myself (Health habits)'),
    ('Development and using mathematical concepts'),
    ('Development and using language (Language II)')
) AS subj(subject_name)
WHERE s.type = 'Nursery/Primary'
ON CONFLICT (school_id, class_name, subject) DO NOTHING;

COMMENT ON TABLE public.class_subjects IS 'Subjects per class; includes Beginning-of-term holistic strands for pre-primary.';
