-- Canonical UACE (A-Level) subject list for Uganda: principals vs subsidiaries.
-- Single global reference for S.5 / S.6 (all schools). See docs/UACE_SUBJECT_CATALOG.md

CREATE TABLE IF NOT EXISTS public.uace_subject_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_name text NOT NULL,
  subject_type text NOT NULL CHECK (subject_type IN ('principal', 'subsidiary')),
  category text NOT NULL,
  abbreviation text,
  sort_order integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uace_subject_catalog_name_unique UNIQUE (subject_name)
);

COMMENT ON TABLE public.uace_subject_catalog IS
  'UNEB-style A-Level subjects: principal (pick 3) vs subsidiary (GP + optional). Global defaults for S.5/S.6.';

CREATE INDEX IF NOT EXISTS idx_uace_subject_catalog_type
  ON public.uace_subject_catalog (subject_type);

CREATE INDEX IF NOT EXISTS idx_uace_subject_catalog_category
  ON public.uace_subject_catalog (category);

-- Idempotent seed
INSERT INTO public.uace_subject_catalog (subject_name, subject_type, category, abbreviation, sort_order, notes)
VALUES
  -- Subsidiaries (UNEB)
  ('General Paper', 'subsidiary', 'Subsidiary (UNEB)', 'GP', 10, 'Compulsory for all A-Level students.'),
  ('Subsidiary Mathematics', 'subsidiary', 'Subsidiary (UNEB)', NULL, 20, 'For students not offering Mathematics as a principal.'),
  ('Subsidiary ICT', 'subsidiary', 'Subsidiary (UNEB)', NULL, 30, 'Subsidiary level ICT.'),
  ('Subsidiary Computer Studies', 'subsidiary', 'Subsidiary (UNEB)', NULL, 40, 'More technical than Subsidiary ICT; subsidiary level.'),
  ('Subsidiary Economics', 'subsidiary', 'Subsidiary (UNEB)', NULL, 50, 'Some schools offer as subsidiary only.'),
  -- Principals — Sciences
  ('Mathematics', 'principal', 'Sciences', 'M', 100, NULL),
  ('Physics', 'principal', 'Sciences', 'P', 110, NULL),
  ('Chemistry', 'principal', 'Sciences', 'C', 120, NULL),
  ('Biology', 'principal', 'Sciences', 'B', 130, NULL),
  ('Agriculture', 'principal', 'Sciences', 'A', 140, NULL),
  ('Food and Nutrition', 'principal', 'Sciences', 'FN', 150, NULL),
  -- Principals — Commercial / Business
  ('Economics', 'principal', 'Commercial / Business', 'E', 200, NULL),
  ('Entrepreneurship Education', 'principal', 'Commercial / Business', 'EE', 210, NULL),
  -- Principals — Arts / Humanities
  ('History', 'principal', 'Arts / Humanities', 'H', 300, NULL),
  ('Geography', 'principal', 'Arts / Humanities', 'G', 310, NULL),
  ('Divinity (CRE)', 'principal', 'Arts / Humanities', NULL, 320, 'Christian Religious Education.'),
  ('Islamic Religious Education', 'principal', 'Arts / Humanities', 'IRE', 330, NULL),
  ('Literature in English', 'principal', 'Arts / Humanities', 'L', 340, NULL),
  ('Fine Art', 'principal', 'Arts / Humanities', 'ART', 350, NULL),
  -- Principals — Languages
  ('English Language', 'principal', 'Languages', NULL, 400, 'Rare as principal; included for completeness.'),
  ('French', 'principal', 'Languages', NULL, 410, NULL),
  ('Kiswahili', 'principal', 'Languages', NULL, 420, NULL),
  ('Luganda', 'principal', 'Languages', NULL, 430, NULL),
  ('Local Language (Other)', 'principal', 'Languages', NULL, 440, 'e.g. Runyankole, Ateso — specify in school records if needed.'),
  -- Principals — Technical / Vocational
  ('ICT', 'principal', 'Technical / Vocational', NULL, 500, 'Principal offering; do not combine with Computer Studies as principal per typical rules.'),
  ('Computer Studies', 'principal', 'Technical / Vocational', NULL, 510, 'Principal offering; do not combine with ICT as principal per typical rules.')
ON CONFLICT (subject_name) DO NOTHING;

ALTER TABLE public.uace_subject_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "uace_subject_catalog_select_authenticated" ON public.uace_subject_catalog;
CREATE POLICY "uace_subject_catalog_select_authenticated"
  ON public.uace_subject_catalog
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "uace_subject_catalog_select_anon" ON public.uace_subject_catalog;
CREATE POLICY "uace_subject_catalog_select_anon"
  ON public.uace_subject_catalog
  FOR SELECT
  TO anon
  USING (true);

GRANT SELECT ON TABLE public.uace_subject_catalog TO authenticated, anon;
