-- Supabase database linter:
-- 0011_function_search_path_mutable: pin search_path on SECURITY-sensitive helpers.
-- 0025_public_bucket_allows_listing: drop broad public SELECT on school-assets (listing);
--   public URLs for objects still work when the bucket is marked public; see Supabase lint docs.

-- -----------------------------------------------------------------------------
-- Functions: SET search_path = public
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.olevel_class_senior_band(class_name text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (regexp_match(trim(both from COALESCE(class_name, '')), '^senior\s*([1-4])(?:\s|$)', 'i'))[1]::integer,
    (regexp_match(trim(both from COALESCE(class_name, '')), '^s\.?\s*([1-4])(?:\s|$)', 'i'))[1]::integer
  );
$$;

COMMENT ON FUNCTION public.olevel_class_senior_band(text) IS
  'Senior 1–4 band number from class label (e.g. Senior 1, S1, S.1). NULL if not O-Level shaped.';

CREATE OR REPLACE FUNCTION public.pweza_phone_last9(p text)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
SET search_path = public
AS $$
  SELECT CASE
    WHEN length(regexp_replace(coalesce(p, ''), '\D', '', 'g')) >= 9
    THEN right(regexp_replace(coalesce(p, ''), '\D', '', 'g'), 9)
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.uace_default_grade_from_percent(p_pct numeric)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_pct >= 80 THEN 'A'
    WHEN p_pct >= 70 THEN 'B'
    WHEN p_pct >= 60 THEN 'C'
    WHEN p_pct >= 50 THEN 'D'
    WHEN p_pct >= 45 THEN 'E'
    WHEN p_pct >= 40 THEN 'O'
    ELSE 'F'
  END;
$$;

COMMENT ON FUNCTION public.uace_default_grade_from_percent(numeric) IS
  'Default UNEB-style UACE letter from subject % (0–100). Pair with app: reportUtils.calculateUacePrincipalGradeFromMarks. See docs/UACE_ALEVEL_GRADING_LOGIC.md.';

CREATE OR REPLACE FUNCTION public.uace_default_points_from_grade(p_grade text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE upper(trim(COALESCE(p_grade, '')))
    WHEN 'A' THEN 6
    WHEN 'B' THEN 5
    WHEN 'C' THEN 4
    WHEN 'D' THEN 3
    WHEN 'E' THEN 2
    WHEN 'O' THEN 1
    WHEN 'F' THEN 0
    ELSE NULL
  END;
$$;

COMMENT ON FUNCTION public.uace_default_points_from_grade(text) IS
  'UACE points from letter grade (principal scale). See docs/UACE_ALEVEL_GRADING_LOGIC.md.';

-- -----------------------------------------------------------------------------
-- Storage: remove anonymous listing of entire school-assets bucket
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Public read access to school assets" ON storage.objects;

-- Authenticated users can still read objects under school-badges (e.g. admin previews)
-- without granting anonymous LIST on the whole bucket.
DROP POLICY IF EXISTS "Authenticated read school-badges" ON storage.objects;
CREATE POLICY "Authenticated read school-badges"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'school-assets'
  AND (storage.foldername(name))[1] = 'school-badges'
);

SELECT pg_notify('pgrst', 'reload schema');
