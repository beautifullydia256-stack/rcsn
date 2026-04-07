-- Canonical UCE (O-Level) subject list for Uganda — Senior 1–4 global defaults.
-- Matches common UNEB/school offerings; use subject_name in exam_results for consistency.
-- See companion: public.uace_subject_catalog (S.5–S.6).

CREATE TABLE IF NOT EXISTS public.uce_subject_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_name text NOT NULL,
  category text NOT NULL,
  abbreviation text,
  sort_order integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uce_subject_catalog_name_unique UNIQUE (subject_name)
);

COMMENT ON TABLE public.uce_subject_catalog IS
  'UNEB-style O-Level (UCE) subjects for S.1–S.4; global defaults for all secondary schools.';

CREATE INDEX IF NOT EXISTS idx_uce_subject_catalog_category
  ON public.uce_subject_catalog (category);

INSERT INTO public.uce_subject_catalog (subject_name, category, abbreviation, sort_order, notes)
VALUES
  ('Biology', 'Sciences', NULL, 10, NULL),
  ('Chemistry', 'Sciences', NULL, 20, NULL),
  ('Mathematics', 'Sciences', NULL, 30, NULL),
  ('Physics', 'Sciences', NULL, 40, NULL),
  ('English Language', 'Languages', NULL, 50, 'Often labeled “English” on reports; matches typical exam_results naming.'),
  ('Kiswahili', 'Languages', NULL, 60, NULL),
  ('Geography', 'Social Studies', NULL, 70, NULL),
  ('History and Political Education', 'Social Studies', NULL, 80, NULL),
  ('Art and Design', 'Arts', NULL, 90, NULL),
  ('Entrepreneurship', 'Business', NULL, 100, 'UCE entrepreneurship strand; distinct from UACE “Entrepreneurship Education” naming.'),
  ('Islamic Religious Education (IRE)', 'Religious Education', 'IRE', 110, NULL),
  ('Physical Education', 'Co-curricular', NULL, 120, NULL)
ON CONFLICT (subject_name) DO NOTHING;

ALTER TABLE public.uce_subject_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "uce_subject_catalog_select_authenticated" ON public.uce_subject_catalog;
CREATE POLICY "uce_subject_catalog_select_authenticated"
  ON public.uce_subject_catalog
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "uce_subject_catalog_select_anon" ON public.uce_subject_catalog;
CREATE POLICY "uce_subject_catalog_select_anon"
  ON public.uce_subject_catalog
  FOR SELECT
  TO anon
  USING (true);

GRANT SELECT ON TABLE public.uce_subject_catalog TO authenticated, anon;
