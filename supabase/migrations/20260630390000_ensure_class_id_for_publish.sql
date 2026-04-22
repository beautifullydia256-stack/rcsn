-- Ensure a classes row exists for publish/report flows when exam_results has a label
-- but classes was never seeded (e.g. nursery). Staff-only; same gate as published reports.

CREATE OR REPLACE FUNCTION public.ensure_class_id_for_publish(
  p_school_id uuid,
  p_class_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_normalized text;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT public.published_reports_user_is_school_staff(p_school_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_normalized := trim(regexp_replace(coalesce(p_class_name, ''), '\s+', ' ', 'g'));
  IF v_normalized = '' THEN
    RAISE EXCEPTION 'class name required';
  END IF;

  SELECT c.class_id
  INTO v_id
  FROM public.classes c
  WHERE c.school_id = p_school_id
    AND c.class_name = v_normalized
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  SELECT c.class_id
  INTO v_id
  FROM public.classes c
  WHERE c.school_id = p_school_id
    AND lower(trim(regexp_replace(coalesce(c.class_name, ''), '\s+', ' ', 'g'))) = lower(v_normalized)
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  BEGIN
    INSERT INTO public.classes (school_id, class_name, max_students, total_fees)
    VALUES (p_school_id, v_normalized, 1000, 0)
    RETURNING class_id INTO v_id;
    RETURN v_id;
  EXCEPTION
    WHEN unique_violation THEN
      SELECT c.class_id
      INTO v_id
      FROM public.classes c
      WHERE c.school_id = p_school_id
        AND lower(trim(regexp_replace(coalesce(c.class_name, ''), '\s+', ' ', 'g'))) = lower(v_normalized)
      LIMIT 1;
      IF v_id IS NULL THEN
        RAISE;
      END IF;
      RETURN v_id;
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_class_id_for_publish(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_class_id_for_publish(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.ensure_class_id_for_publish IS
  'Returns classes.class_id for the school, creating the row if missing (staff only). Normalizes whitespace; match is case-insensitive when finding.';
