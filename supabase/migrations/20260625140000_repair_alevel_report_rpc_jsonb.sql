-- Repair: exam_results_for_secondary_report failed at runtime when building merged rows:
-- ERROR: could not determine polymorphic type because input has type unknown (jsonb/to_jsonb).
-- Replaces function with explicit ::text / ::numeric / ::integer casts on json values.
-- Safe to run after 20260625120000 (or standalone repair).

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
        to_jsonb(public.uace_default_grade_from_percent(agg_rec.final_pct)::text),
        'uace_points',
        to_jsonb(
          public.uace_default_points_from_grade(public.uace_default_grade_from_percent(agg_rec.final_pct))::integer
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
