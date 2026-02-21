-- Backfill missing school codes and ensure they are always set
-- 1) Find and fix all schools with NULL or empty school_code
-- 2) Trigger so new/updated rows always get a code when missing

-- ---------------------------------------------------------------------------
-- Part 1: Backfill — update schools with no code (row-by-row so uniqueness holds)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
  v_code TEXT;
BEGIN
  FOR r IN
    SELECT school_id, name
    FROM public.schools
    WHERE school_code IS NULL OR TRIM(COALESCE(school_code, '')) = ''
    ORDER BY created_at NULLS LAST, name
  LOOP
    v_code := generate_unique_school_code(r.name, NULL);
    UPDATE public.schools
    SET school_code = v_code
    WHERE school_id = r.school_id;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Part 2: Trigger — auto-set school_code on INSERT/UPDATE when null or empty
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_school_code_if_empty()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.school_code IS NULL OR TRIM(COALESCE(NEW.school_code, '')) = '' THEN
    NEW.school_code := generate_unique_school_code(NEW.name, NULL);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_school_code_if_empty ON public.schools;
CREATE TRIGGER trigger_set_school_code_if_empty
  BEFORE INSERT OR UPDATE OF name, school_code
  ON public.schools
  FOR EACH ROW
  EXECUTE FUNCTION public.set_school_code_if_empty();

COMMENT ON FUNCTION public.set_school_code_if_empty() IS
  'Ensures school_code is never null/empty: generates from school name using generate_unique_school_code.';

-- ---------------------------------------------------------------------------
-- Part 3: Enforce NOT NULL so schema guarantees a code is always present
-- ---------------------------------------------------------------------------
ALTER TABLE public.schools
  ALTER COLUMN school_code SET NOT NULL;

-- Optional: diagnostic query you can run anytime to confirm no missing codes
-- SELECT school_id, name, school_code FROM public.schools WHERE school_code IS NULL OR TRIM(school_code) = '';
