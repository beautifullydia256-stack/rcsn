-- Add Senior 5 & Senior 6 only. Primary1–7 and Senior 1–4 stay exactly as before (same class list and
-- the same four comment sentences as fix_setup_default_class_teacher_comments_ambiguous.sql; this file
-- uses comment_text only because the live table has no separate `comment` column per 20251017).

CREATE OR REPLACE FUNCTION public.setup_default_class_teacher_comments_settings(
  p_school_id uuid,
  p_created_by uuid
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  classes text[] := ARRAY[
    'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6', 'Primary 7',
    'Senior 1', 'Senior 2', 'Senior 3', 'Senior 4'
  ];
  v_alevel_only text[] := ARRAY['Senior 5', 'Senior 6'];
  v_class_name text;
BEGIN
  FOREACH v_class_name IN ARRAY classes
  LOOP
    INSERT INTO public.class_teacher_comments_settings (
      school_id, class_name, min_percent, max_percent, comment_text, created_by
    )
    VALUES
      (
        p_school_id,
        v_class_name,
        0,
        40,
        'The student needs to work much harder. With better focus and effort, there is room for great improvement next term.',
        p_created_by
      ),
      (
        p_school_id,
        v_class_name,
        41,
        60,
        'A fair performance, showing some understanding. More consistency and commitment are needed to reach higher results.',
        p_created_by
      ),
      (
        p_school_id,
        v_class_name,
        61,
        80,
        'A good performance with steady progress. Continued effort and focus will lead to even better achievement.',
        p_created_by
      ),
      (
        p_school_id,
        v_class_name,
        81,
        100,
        'An excellent performance showing discipline and hard work. Keep up this spirit and continue striving for excellence.',
        p_created_by
      )
    ON CONFLICT (school_id, class_name, min_percent, max_percent) DO NOTHING;
  END LOOP;

  FOREACH v_class_name IN ARRAY v_alevel_only
  LOOP
    INSERT INTO public.class_teacher_comments_settings (
      school_id, class_name, min_percent, max_percent, comment_text, created_by
    )
    VALUES
      (
        p_school_id,
        v_class_name,
        0,
        40,
        'The student needs to work much harder. With better focus and effort, there is room for great improvement next term.',
        p_created_by
      ),
      (
        p_school_id,
        v_class_name,
        41,
        60,
        'A fair performance, showing some understanding. More consistency and commitment are needed to reach higher results.',
        p_created_by
      ),
      (
        p_school_id,
        v_class_name,
        61,
        80,
        'A good performance with steady progress. Continued effort and focus will lead to even better achievement.',
        p_created_by
      ),
      (
        p_school_id,
        v_class_name,
        81,
        100,
        'An excellent performance showing discipline and hard work. Keep up this spirit and continue striving for excellence.',
        p_created_by
      )
    ON CONFLICT (school_id, class_name, min_percent, max_percent) DO NOTHING;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.setup_default_class_teacher_comments_settings(uuid, uuid) IS
  'Seeds class teacher comment bands: P1–P7 and S1–S4 unchanged from historical defaults; S5–S6 added with the same four sentences.';

-- Backfill Senior 5 & 6 only (no updates to other classes).
WITH school_creator AS (
  SELECT
    s.school_id,
    COALESCE(
      (
        SELECT u.user_id
        FROM public.users u
        WHERE u.school_id = s.school_id
          AND u.role IN ('owner', 'admin')
        ORDER BY u.created_at ASC NULLS LAST
        LIMIT 1
      ),
      (
        SELECT u.user_id
        FROM public.users u
        WHERE u.school_id = s.school_id
        ORDER BY u.created_at ASC NULLS LAST
        LIMIT 1
      )
    ) AS created_by
  FROM public.schools s
),
to_insert AS (
  SELECT
    sc.school_id,
    v.class_name,
    v.min_percent,
    v.max_percent,
    v.comment_text,
    sc.created_by
  FROM school_creator sc
  CROSS JOIN (
    VALUES
      (
        'Senior 5'::text,
        0,
        40,
        'The student needs to work much harder. With better focus and effort, there is room for great improvement next term.'
      ),
      (
        'Senior 5',
        41,
        60,
        'A fair performance, showing some understanding. More consistency and commitment are needed to reach higher results.'
      ),
      (
        'Senior 5',
        61,
        80,
        'A good performance with steady progress. Continued effort and focus will lead to even better achievement.'
      ),
      (
        'Senior 5',
        81,
        100,
        'An excellent performance showing discipline and hard work. Keep up this spirit and continue striving for excellence.'
      ),
      (
        'Senior 6',
        0,
        40,
        'The student needs to work much harder. With better focus and effort, there is room for great improvement next term.'
      ),
      (
        'Senior 6',
        41,
        60,
        'A fair performance, showing some understanding. More consistency and commitment are needed to reach higher results.'
      ),
      (
        'Senior 6',
        61,
        80,
        'A good performance with steady progress. Continued effort and focus will lead to even better achievement.'
      ),
      (
        'Senior 6',
        81,
        100,
        'An excellent performance showing discipline and hard work. Keep up this spirit and continue striving for excellence.'
      )
  ) AS v(class_name, min_percent, max_percent, comment_text)
  WHERE sc.created_by IS NOT NULL
)
INSERT INTO public.class_teacher_comments_settings (
  school_id,
  class_name,
  min_percent,
  max_percent,
  comment_text,
  created_by
)
SELECT
  ti.school_id,
  ti.class_name,
  ti.min_percent,
  ti.max_percent,
  ti.comment_text,
  ti.created_by
FROM to_insert ti
WHERE NOT EXISTS (
  SELECT 1
  FROM public.class_teacher_comments_settings x
  WHERE x.school_id = ti.school_id
    AND x.class_name = ti.class_name
    AND x.min_percent = ti.min_percent
    AND x.max_percent = ti.max_percent
);
