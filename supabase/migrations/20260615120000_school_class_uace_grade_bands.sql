-- Per-school, per-class UACE (A-Level) percentage bands. When no row exists or bands is empty,
-- public.uace_default_grade_from_percent is used (existing UNEB-style defaults).

CREATE TABLE IF NOT EXISTS public.school_class_uace_grade_bands (
  school_id uuid NOT NULL REFERENCES public.schools (school_id) ON DELETE CASCADE,
  class_name text NOT NULL,
  bands jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT school_class_uace_grade_bands_pk PRIMARY KEY (school_id, class_name),
  CONSTRAINT school_class_uace_grade_bands_bands_array    CHECK (jsonb_typeof(bands) = 'array')
);

COMMENT ON TABLE public.school_class_uace_grade_bands IS
  'Canonical UACE % to letter bands per school + class label (e.g. Senior 5). JSON array: [{ "grade": "A", "min_pct": 80, "max_pct": 100 }, ...]. Empty array = use database defaults.';

CREATE INDEX IF NOT EXISTS idx_school_class_uace_grade_bands_school
  ON public.school_class_uace_grade_bands (school_id);

ALTER TABLE public.school_class_uace_grade_bands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS scuace_bands_select ON public.school_class_uace_grade_bands;
DROP POLICY IF EXISTS scuace_bands_insert ON public.school_class_uace_grade_bands;
DROP POLICY IF EXISTS scuace_bands_update ON public.school_class_uace_grade_bands;
DROP POLICY IF EXISTS scuace_bands_delete ON public.school_class_uace_grade_bands;

CREATE POLICY scuace_bands_select ON public.school_class_uace_grade_bands
  FOR SELECT TO authenticated
  USING (
    school_id = (SELECT u.school_id FROM public.users u WHERE u.user_id = (SELECT auth.uid()) LIMIT 1)
  );

CREATE POLICY scuace_bands_insert ON public.school_class_uace_grade_bands
  FOR INSERT TO authenticated
  WITH CHECK (
    school_id = (SELECT u.school_id FROM public.users u WHERE u.user_id = (SELECT auth.uid()) LIMIT 1)
    AND (
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.user_id = (SELECT auth.uid())
          AND u.school_id = school_class_uace_grade_bands.school_id
          AND u.role IN ('admin', 'owner', 'head_teacher')
      )
      OR EXISTS (
        SELECT 1
        FROM public.teacher_class_subjects tcs
        INNER JOIN public.users u ON u.user_id = (SELECT auth.uid()) AND u.school_id = tcs.school_id
        INNER JOIN public.teachers t ON t.teacher_id = tcs.teacher_id AND t.school_id = tcs.school_id
        WHERE tcs.school_id = school_class_uace_grade_bands.school_id
          AND trim(tcs.class_name) = trim(school_class_uace_grade_bands.class_name)
          AND (
            (u.linked_teacher_id IS NOT NULL AND u.linked_teacher_id = tcs.teacher_id)
            OR (
              t.email IS NOT NULL
              AND trim(t.email) <> ''
              AND lower(trim(t.email)) = lower(trim(COALESCE(
                nullif(trim(u.email), ''),
                nullif(trim(COALESCE((SELECT auth.jwt()) ->> 'email', '')), ''),
                ''
              )))
            )
          )
      )
    )
  );

CREATE POLICY scuace_bands_update ON public.school_class_uace_grade_bands
  FOR UPDATE TO authenticated
  USING (
    school_id = (SELECT u.school_id FROM public.users u WHERE u.user_id = (SELECT auth.uid()) LIMIT 1)
    AND (
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.user_id = (SELECT auth.uid())
          AND u.school_id = school_class_uace_grade_bands.school_id
          AND u.role IN ('admin', 'owner', 'head_teacher')
      )
      OR EXISTS (
        SELECT 1
        FROM public.teacher_class_subjects tcs
        INNER JOIN public.users u ON u.user_id = (SELECT auth.uid()) AND u.school_id = tcs.school_id
        INNER JOIN public.teachers t ON t.teacher_id = tcs.teacher_id AND t.school_id = tcs.school_id
        WHERE tcs.school_id = school_class_uace_grade_bands.school_id
          AND trim(tcs.class_name) = trim(school_class_uace_grade_bands.class_name)
          AND (
            (u.linked_teacher_id IS NOT NULL AND u.linked_teacher_id = tcs.teacher_id)
            OR (
              t.email IS NOT NULL
              AND trim(t.email) <> ''
              AND lower(trim(t.email)) = lower(trim(COALESCE(
                nullif(trim(u.email), ''),
                nullif(trim(COALESCE((SELECT auth.jwt()) ->> 'email', '')), ''),
                ''
              )))
            )
          )
      )
    )
  )
  WITH CHECK (
    school_id = (SELECT u.school_id FROM public.users u WHERE u.user_id = (SELECT auth.uid()) LIMIT 1)
    AND (
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.user_id = (SELECT auth.uid())
          AND u.school_id = school_class_uace_grade_bands.school_id
          AND u.role IN ('admin', 'owner', 'head_teacher')
      )
      OR EXISTS (
        SELECT 1
        FROM public.teacher_class_subjects tcs
        INNER JOIN public.users u ON u.user_id = (SELECT auth.uid()) AND u.school_id = tcs.school_id
        INNER JOIN public.teachers t ON t.teacher_id = tcs.teacher_id AND t.school_id = tcs.school_id
        WHERE tcs.school_id = school_class_uace_grade_bands.school_id
          AND trim(tcs.class_name) = trim(school_class_uace_grade_bands.class_name)
          AND (
            (u.linked_teacher_id IS NOT NULL AND u.linked_teacher_id = tcs.teacher_id)
            OR (
              t.email IS NOT NULL
              AND trim(t.email) <> ''
              AND lower(trim(t.email)) = lower(trim(COALESCE(
                nullif(trim(u.email), ''),
                nullif(trim(COALESCE((SELECT auth.jwt()) ->> 'email', '')), ''),
                ''
              )))
            )
          )
      )
    )
  );

CREATE POLICY scuace_bands_delete ON public.school_class_uace_grade_bands
  FOR DELETE TO authenticated
  USING (
    school_id = (SELECT u.school_id FROM public.users u WHERE u.user_id = (SELECT auth.uid()) LIMIT 1)
    AND (
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.user_id = (SELECT auth.uid())
          AND u.school_id = school_class_uace_grade_bands.school_id
          AND u.role IN ('admin', 'owner', 'head_teacher')
      )
      OR EXISTS (
        SELECT 1
        FROM public.teacher_class_subjects tcs
        INNER JOIN public.users u ON u.user_id = (SELECT auth.uid()) AND u.school_id = tcs.school_id
        INNER JOIN public.teachers t ON t.teacher_id = tcs.teacher_id AND t.school_id = tcs.school_id
        WHERE tcs.school_id = school_class_uace_grade_bands.school_id
          AND trim(tcs.class_name) = trim(school_class_uace_grade_bands.class_name)
          AND (
            (u.linked_teacher_id IS NOT NULL AND u.linked_teacher_id = tcs.teacher_id)
            OR (
              t.email IS NOT NULL
              AND trim(t.email) <> ''
              AND lower(trim(t.email)) = lower(trim(COALESCE(
                nullif(trim(u.email), ''),
                nullif(trim(COALESCE((SELECT auth.jwt()) ->> 'email', '')), ''),
                ''
              )))
            )
          )
      )
    )
  );

CREATE OR REPLACE FUNCTION public.trg_school_class_uace_grade_bands_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_school_class_uace_grade_bands_updated_at ON public.school_class_uace_grade_bands;
CREATE TRIGGER tr_school_class_uace_grade_bands_updated_at
  BEFORE UPDATE ON public.school_class_uace_grade_bands
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_school_class_uace_grade_bands_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_class_uace_grade_bands TO authenticated;
GRANT ALL ON public.school_class_uace_grade_bands TO service_role;

-- Resolve letter grade from % using class-specific bands when configured.
CREATE OR REPLACE FUNCTION public.uace_grade_from_percent_for_class(
  p_school_id uuid,
  p_class_name text,
  p_pct numeric
)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  j jsonb;
  el jsonb;
  g text;
  mn numeric;
  mx numeric;
  pct numeric;
  i integer;
  n integer;
BEGIN
  IF p_pct IS NULL OR p_pct <> p_pct THEN
    RETURN NULL;
  END IF;

  pct := round(p_pct::numeric, 8);

  IF p_school_id IS NULL OR trim(both ' ' FROM coalesce(p_class_name, '')) = '' THEN
    RETURN public.uace_default_grade_from_percent(p_pct);
  END IF;

  SELECT b.bands INTO j
  FROM public.school_class_uace_grade_bands b
  WHERE b.school_id = p_school_id
    AND trim(both ' ' FROM b.class_name) = trim(both ' ' FROM p_class_name)
  LIMIT 1;

  IF j IS NULL OR jsonb_typeof(j) <> 'array' OR jsonb_array_length(j) = 0 THEN
    RETURN public.uace_default_grade_from_percent(p_pct);
  END IF;

  n := jsonb_array_length(j);
  FOR i IN 0 .. n - 1 LOOP
    el := j -> i;
    g := upper(trim(both ' ' FROM coalesce(el ->> 'grade', '')));
    BEGIN
      mn := nullif(trim(both ' ' FROM coalesce(el ->> 'min_pct', '')), '')::numeric;
      mx := nullif(trim(both ' ' FROM coalesce(el ->> 'max_pct', '')), '')::numeric;
    EXCEPTION
      WHEN OTHERS THEN
        CONTINUE;
    END;
    IF g = '' OR mn IS NULL OR mx IS NULL THEN
      CONTINUE;
    END IF;
    IF pct >= mn AND pct <= mx THEN
      RETURN g;
    END IF;
  END LOOP;

  RETURN public.uace_default_grade_from_percent(p_pct);
END;
$$;

COMMENT ON FUNCTION public.uace_grade_from_percent_for_class(uuid, text, numeric) IS
  'UACE letter from subject % using school_class_uace_grade_bands when present; else uace_default_grade_from_percent.';

GRANT EXECUTE ON FUNCTION public.uace_grade_from_percent_for_class(uuid, text, numeric) TO authenticated, service_role;

-- A-Level exam upsert: use class-scoped bands.
CREATE OR REPLACE FUNCTION public.teacher_upsert_exam_result_alevel(
  p_school_id uuid,
  p_exam_set_id uuid,
  p_student_id uuid,
  p_class_name text,
  p_subject text,
  p_marks_obtained numeric,
  p_total_marks numeric,
  p_grade text,
  p_remarks text,
  p_teacher_id uuid,
  p_teacher_comment text,
  p_paper_number text DEFAULT NULL,
  p_paper_code text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_id uuid;
  v_topic_key text := '';
  v_paper_key text;
  v_grade text;
  v_points integer;
  v_pct numeric;
BEGIN
  IF p_school_id IS NULL OR p_exam_set_id IS NULL OR p_student_id IS NULL THEN
    RETURN json_build_object('error', 'Missing required parameters');
  END IF;

  v_paper_key := COALESCE(
    NULLIF(BTRIM(COALESCE(p_paper_code, '')), ''),
    NULLIF(BTRIM(COALESCE(p_paper_number, '')), ''),
    ''
  );

  v_grade := p_grade;
  v_points := public.uace_default_points_from_grade(p_grade);

  IF p_marks_obtained IS NOT NULL
     AND p_total_marks IS NOT NULL
     AND p_total_marks > 0 THEN
    v_pct := (p_marks_obtained / p_total_marks) * 100;
    v_grade := public.uace_grade_from_percent_for_class(p_school_id, p_class_name, v_pct);
    v_points := public.uace_default_points_from_grade(v_grade);
  END IF;

  SELECT er.id INTO result_id
  FROM public.exam_results er
  WHERE er.school_id = p_school_id
    AND er.exam_set_id = p_exam_set_id
    AND er.student_id = p_student_id
    AND er.class_name = p_class_name
    AND er.subject = p_subject
    AND er.exam_topic_key = v_topic_key
    AND er.exam_paper_key = v_paper_key;

  IF result_id IS NOT NULL THEN
    UPDATE public.exam_results
    SET
      marks_obtained = p_marks_obtained,
      total_marks = p_total_marks,
      grade = v_grade,
      uace_points = v_points,
      remarks = p_remarks,
      teacher_comment = p_teacher_comment,
      teacher_id = p_teacher_id::text,
      paper_code = NULLIF(BTRIM(COALESCE(p_paper_code, '')), ''),
      paper_number = NULLIF(BTRIM(COALESCE(p_paper_number, '')), ''),
      updated_at = now()
    WHERE id = result_id;

    RETURN json_build_object('success', true, 'action', 'updated', 'id', result_id);
  END IF;

  INSERT INTO public.exam_results (
    school_id,
    exam_set_id,
    student_id,
    class_name,
    subject,
    marks_obtained,
    total_marks,
    grade,
    uace_points,
    remarks,
    teacher_comment,
    teacher_id,
    paper_code,
    paper_number,
    nursery_skill_performance,
    created_at,
    updated_at
  ) VALUES (
    p_school_id,
    p_exam_set_id,
    p_student_id,
    p_class_name,
    p_subject,
    p_marks_obtained,
    p_total_marks,
    v_grade,
    v_points,
    p_remarks,
    p_teacher_comment,
    p_teacher_id::text,
    NULLIF(BTRIM(COALESCE(p_paper_code, '')), ''),
    NULLIF(BTRIM(COALESCE(p_paper_number, '')), ''),
    '{}'::jsonb,
    now(),
    now()
  ) RETURNING id INTO result_id;

  RETURN json_build_object('success', true, 'action', 'inserted', 'id', result_id);

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('error', 'Database error: ' || SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.teacher_upsert_exam_result_alevel(
  uuid, uuid, uuid, text, text, numeric, numeric, text, text, uuid, text, text, text
) IS 'A-Level marks upsert; grade/uace_points from marks/total using school_class_uace_grade_bands when set, else default UACE bands.';

-- Report RPC merged lines: same class-scoped grade resolution.
CREATE OR REPLACE FUNCTION public.exam_results_for_secondary_report(
  p_school_id uuid,
  p_exam_set_ids uuid[],
  p_class_names text[] DEFAULT NULL
)
RETURNS SETOF exam_results
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  r public.exam_results%ROWTYPE;
  j jsonb;
  agg_rec RECORD;
  v_uace_grade text;
BEGIN
  FOR r IN
    WITH base AS (
      SELECT er.*
      FROM public.exam_results er
      WHERE er.school_id = p_school_id
        AND er.exam_set_id = ANY (p_exam_set_ids)
        AND (
          p_class_names IS NULL
          OR cardinality(p_class_names) = 0
          OR er.class_name = ANY (p_class_names)
        )
    ),
    al_raw AS (
      SELECT b.*
      FROM base b
      WHERE public._class_name_is_alevel(b.class_name)
        AND b.exam_topic_key = ''
        AND b.exam_paper_key <> ''
    ),
    matched_all AS (
      SELECT
        b.*,
        cfg.paper_slot,
        cfg.weight_percent
      FROM al_raw b
      INNER JOIN LATERAL public._uace_subject_paper_config(b.school_id, b.subject, b.class_name) cfg ON TRUE
      WHERE public._uace_exam_paper_key_matches_config(
        b.exam_paper_key,
        cfg.paper_slot,
        cfg.paper_code,
        cfg.paper_label
      )
    ),
    matched_best AS (
      SELECT DISTINCT ON (ma.student_id, ma.exam_set_id, ma.class_name, ma.subject, ma.paper_slot)
        ma.*
      FROM matched_all ma
      ORDER BY
        ma.student_id,
        ma.exam_set_id,
        ma.class_name,
        ma.subject,
        ma.paper_slot,
        ma.updated_at DESC NULLS LAST
    ),
    merge_keys AS (
      SELECT DISTINCT
        mb.student_id,
        mb.exam_set_id,
        mb.class_name,
        mb.subject
      FROM matched_best mb
      WHERE (
        SELECT COUNT(*)::integer
        FROM public._uace_subject_paper_config(mb.school_id, mb.subject, mb.class_name)
      ) >= 2
    ),
    excluded AS (
      SELECT mb.id
      FROM matched_best mb
      INNER JOIN merge_keys k
        ON k.student_id = mb.student_id
        AND k.exam_set_id = mb.exam_set_id
        AND k.class_name = mb.class_name
        AND k.subject = mb.subject
    ),
    passthrough AS (
      SELECT b.*
      FROM base b
      WHERE NOT EXISTS (SELECT 1 FROM excluded e WHERE e.id = b.id)
    )
    SELECT * FROM passthrough
  LOOP
    RETURN NEXT r;
  END LOOP;

  FOR agg_rec IN
    WITH base AS (
      SELECT er.*
      FROM public.exam_results er
      WHERE er.school_id = p_school_id
        AND er.exam_set_id = ANY (p_exam_set_ids)
        AND (
          p_class_names IS NULL
          OR cardinality(p_class_names) = 0
          OR er.class_name = ANY (p_class_names)
        )
    ),
    al_raw AS (
      SELECT b.*
      FROM base b
      WHERE public._class_name_is_alevel(b.class_name)
        AND b.exam_topic_key = ''
        AND b.exam_paper_key <> ''
    ),
    matched_all AS (
      SELECT
        b.*,
        cfg.paper_slot,
        cfg.weight_percent
      FROM al_raw b
      INNER JOIN LATERAL public._uace_subject_paper_config(b.school_id, b.subject, b.class_name) cfg ON TRUE
      WHERE public._uace_exam_paper_key_matches_config(
        b.exam_paper_key,
        cfg.paper_slot,
        cfg.paper_code,
        cfg.paper_label
      )
    ),
    matched_best AS (
      SELECT DISTINCT ON (ma.student_id, ma.exam_set_id, ma.class_name, ma.subject, ma.paper_slot)
        ma.*
      FROM matched_all ma
      ORDER BY
        ma.student_id,
        ma.exam_set_id,
        ma.class_name,
        ma.subject,
        ma.paper_slot,
        ma.updated_at DESC NULLS LAST
    ),
    merge_keys AS (
      SELECT DISTINCT
        mb.student_id,
        mb.exam_set_id,
        mb.class_name,
        mb.subject
      FROM matched_best mb
      WHERE (
        SELECT COUNT(*)::integer
        FROM public._uace_subject_paper_config(mb.school_id, mb.subject, mb.class_name)
      ) >= 2
    ),
    scored AS (
      SELECT
        mb.*,
        SUM(mb.weight_percent) OVER (
          PARTITION BY mb.student_id, mb.exam_set_id, mb.class_name, mb.subject
        ) AS w_sum,
        LEAST(
          100::numeric,
          GREATEST(
            0::numeric,
            (COALESCE(mb.final_score, mb.marks_obtained, 0)::numeric / NULLIF(mb.total_marks, 0)) * 100
          )
        ) AS pct
      FROM matched_best mb
      INNER JOIN merge_keys k
        ON k.student_id = mb.student_id
        AND k.exam_set_id = mb.exam_set_id
        AND k.class_name = mb.class_name
        AND k.subject = mb.subject
      WHERE COALESCE(mb.weight_percent, 0) > 0
    ),
    agg AS (
      SELECT
        s.student_id,
        s.exam_set_id,
        s.class_name,
        s.subject,
        SUM((s.weight_percent / NULLIF(s.w_sum, 0)) * s.pct)::numeric AS final_pct,
        (array_agg(s.id ORDER BY s.updated_at DESC NULLS LAST))[1] AS pick_id,
        string_agg(
          NULLIF(trim(both ' ' FROM COALESCE(s.overall_remark, s.remarks, '')), ''),
          ' | '
          ORDER BY s.paper_slot
        ) FILTER (WHERE COALESCE(trim(both ' ' FROM COALESCE(s.overall_remark, s.remarks, '')), '') <> '') AS agg_remarks,
        string_agg(
          NULLIF(trim(both ' ' FROM COALESCE(s.overall_remark, '')), ''),
          ' | '
          ORDER BY s.paper_slot
        ) FILTER (WHERE COALESCE(trim(both ' ' FROM COALESCE(s.overall_remark, '')), '') <> '') AS agg_overall,
        string_agg(
          NULLIF(trim(both ' ' FROM COALESCE(s.teacher_comment, '')), ''),
          ' | '
          ORDER BY s.paper_slot
        ) FILTER (WHERE COALESCE(trim(both ' ' FROM COALESCE(s.teacher_comment, '')), '') <> '') AS agg_teacher_comment
      FROM scored s
      GROUP BY s.student_id, s.exam_set_id, s.class_name, s.subject
    )
    SELECT * FROM agg
  LOOP
    SELECT to_jsonb(e.*)
    INTO j
    FROM public.exam_results e
    WHERE e.id = agg_rec.pick_id;

    IF j IS NULL THEN
      CONTINUE;
    END IF;

    v_uace_grade := public.uace_grade_from_percent_for_class(p_school_id, agg_rec.class_name, agg_rec.final_pct);

    j :=
      j
      || jsonb_build_object(
        'marks_obtained',
        to_jsonb(round(agg_rec.final_pct, 2)::numeric),
        'total_marks',
        to_jsonb(100::numeric),
        'final_score',
        to_jsonb(round(agg_rec.final_pct, 2)::numeric),
        'grade',
        to_jsonb(v_uace_grade::text),
        'uace_points',
        to_jsonb(
          public.uace_default_points_from_grade(v_uace_grade)::integer
        ),
        'remarks',
        to_jsonb(coalesce(agg_rec.agg_remarks, j ->> 'remarks')::text),
        'overall_remark',
        to_jsonb(
          coalesce(
            nullif(trim(both ' ' FROM coalesce(agg_rec.agg_overall, '')), ''),
            nullif(trim(both ' ' FROM coalesce(agg_rec.agg_remarks, '')), ''),
            nullif(trim(both ' ' FROM coalesce(j ->> 'overall_remark', '')), ''),
            ''::text
          )
        ),
        'teacher_comment',
        to_jsonb(
          coalesce(
            nullif(trim(both ' ' FROM coalesce(agg_rec.agg_teacher_comment, '')), ''),
            nullif(trim(both ' ' FROM coalesce(j ->> 'teacher_comment', '')), ''),
            ''::text
          )
        ),
        'paper_code',
        'null'::jsonb,
        'paper_number',
        'null'::jsonb,
        'topic',
        'null'::jsonb,
        'exam_topic_key',
        to_jsonb(''::text),
        'exam_paper_key',
        to_jsonb(''::text),
        'activity_score',
        'null'::jsonb,
        'descriptor',
        'null'::jsonb,
        'formative_score',
        'null'::jsonb,
        'exam_score',
        'null'::jsonb
      );

    SELECT * INTO r FROM json_populate_record(NULL::public.exam_results, j::json);
    RETURN NEXT r;
  END LOOP;

  RETURN;
END;
$$;

COMMENT ON FUNCTION public.exam_results_for_secondary_report(uuid, uuid[], text[]) IS
  'Exam result rows for secondary report builder: A-Level multi-paper subjects merged; grades use school_class_uace_grade_bands when set.';
