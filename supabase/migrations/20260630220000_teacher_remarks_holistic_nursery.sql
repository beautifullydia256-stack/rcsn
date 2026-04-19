-- Nursery / pre-primary: teacher_remarks_settings rows keyed by holistic grade enum
-- (Very Good, Good, Needs Improvement, Tries) instead of min/max % bands.
-- Percent-based rows keep holistic_grade_enum NULL.

ALTER TABLE public.teacher_remarks_settings
  ADD COLUMN IF NOT EXISTS holistic_grade_enum text;

ALTER TABLE public.teacher_remarks_settings
  ALTER COLUMN min_percent DROP NOT NULL,
  ALTER COLUMN max_percent DROP NOT NULL;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'teacher_remarks_settings'
      AND c.contype = 'u'
  LOOP
    EXECUTE format('ALTER TABLE public.teacher_remarks_settings DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.teacher_remarks_settings
  DROP CONSTRAINT IF EXISTS teacher_remarks_settings_mode_chk;

ALTER TABLE public.teacher_remarks_settings
  ADD CONSTRAINT teacher_remarks_settings_mode_chk CHECK (
    (
      holistic_grade_enum IS NOT NULL
      AND holistic_grade_enum IN ('VERY_GOOD', 'GOOD', 'NEEDS_IMPROVEMENT', 'TRIES')
      AND min_percent IS NULL
      AND max_percent IS NULL
    )
    OR
    (
      (holistic_grade_enum IS NULL)
      AND min_percent IS NOT NULL
      AND max_percent IS NOT NULL
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_trs_holistic_one
  ON public.teacher_remarks_settings (school_id, subject, holistic_grade_enum)
  WHERE holistic_grade_enum IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_trs_percent_band
  ON public.teacher_remarks_settings (school_id, subject, min_percent, max_percent)
  WHERE holistic_grade_enum IS NULL;

COMMENT ON COLUMN public.teacher_remarks_settings.holistic_grade_enum IS
  'Pre-primary: one row per subject per holistic grade; min_percent/max_percent must be null. Primary: null with percent bands.';

CREATE OR REPLACE FUNCTION public.normalize_pre_primary_grade_token(p_raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT CASE upper(replace(btrim(p_raw), ' ', '_'))
    WHEN 'VERY_GOOD' THEN 'VERY_GOOD'
    WHEN 'GOOD' THEN 'GOOD'
    WHEN 'NEEDS_IMPROVEMENT' THEN 'NEEDS_IMPROVEMENT'
    WHEN 'TRIES' THEN 'TRIES'
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.worst_pre_primary_holistic_grade_from_json(p_perf jsonb)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  WITH pairs AS (
    SELECT public.normalize_pre_primary_grade_token(v) AS g
    FROM jsonb_each_text(COALESCE(p_perf, '{}'::jsonb)) AS x(k, v)
  ),
  ranked AS (
    SELECT g,
      CASE g
        WHEN 'VERY_GOOD' THEN 4
        WHEN 'GOOD' THEN 3
        WHEN 'NEEDS_IMPROVEMENT' THEN 2
        WHEN 'TRIES' THEN 1
        ELSE NULL
      END AS rk
    FROM pairs
  )
  SELECT g FROM ranked
  WHERE rk IS NOT NULL
  ORDER BY rk ASC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.process_exam_results_for_student(
  p_school_id uuid,
  p_student_id uuid,
  p_exam_set_id uuid
) RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  exam_set_record record;
  student_record record;
  subject_result record;
  teacher_remark text;
  class_teacher_comment text;
  headteacher_comment text;
  student_average numeric;
  total_marks numeric;
  total_possible numeric;
  pct_teacher_remark text;
  holistic_comment text;
  cls_comment text;
  ht_comment text;
  has_nursery_performance boolean;
  next_term_begins_date date;
  next_term_year integer;
  next_term_number integer;
  worst_enum text;
BEGIN
  SELECT es.name, es.term, es.year INTO exam_set_record
  FROM exam_sets es
  WHERE es.id = p_exam_set_id AND es.school_id = p_school_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT name, admission_number, current_class INTO student_record
  FROM students
  WHERE student_id = p_student_id AND school_id = p_school_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT
    COALESCE(SUM(marks_obtained), 0),
    COALESCE(SUM(total_marks), 0)
  INTO total_marks, total_possible
  FROM exam_results
  WHERE student_id = p_student_id
    AND exam_set_id = p_exam_set_id
    AND school_id = p_school_id;

  student_average := CASE
    WHEN total_possible > 0 THEN (total_marks / total_possible) * 100
    ELSE 0
  END;

  SELECT comment_text INTO cls_comment
  FROM class_teacher_comments_settings
  WHERE school_id = p_school_id
    AND class_name = student_record.current_class
    AND student_average >= min_percent
    AND student_average <= max_percent
  ORDER BY min_percent DESC
  LIMIT 1;

  class_teacher_comment := COALESCE(
    cls_comment,
    CASE
      WHEN student_average >= 81 THEN 'Excellent performance! Keep up the good work.'
      WHEN student_average >= 61 THEN 'Good work! Continue to improve.'
      WHEN student_average >= 41 THEN 'Fair performance. Work harder next time.'
      ELSE 'Needs more effort. Try harder next time.'
    END
  );

  SELECT comment_text INTO ht_comment
  FROM headteacher_comments_settings
  WHERE school_id = p_school_id
    AND student_average >= min_percent
    AND student_average <= max_percent
  ORDER BY min_percent DESC
  LIMIT 1;

  headteacher_comment := COALESCE(
    ht_comment,
    CASE
      WHEN student_average >= 81 THEN 'An excellent performance that shows hard work, focus, and discipline. Maintain this level of commitment for continued success.'
      WHEN student_average >= 61 THEN 'A good performance reflecting steady progress. Keep encouraging consistent effort to reach higher levels.'
      WHEN student_average >= 41 THEN 'A fair performance. With greater consistency and focus, the student can improve significantly.'
      ELSE 'The student needs to put in more effort. With proper guidance and hard work, better results can be achieved next term.'
    END
  );

  FOR subject_result IN
    SELECT
      er.subject,
      er.marks_obtained,
      er.total_marks,
      er.grade,
      er.teacher_initials,
      er.remarks,
      er.nursery_skill_performance
    FROM exam_results er
    WHERE er.student_id = p_student_id
      AND er.exam_set_id = p_exam_set_id
      AND er.school_id = p_school_id
  LOOP
    pct_teacher_remark := NULL;
    holistic_comment := NULL;
    has_nursery_performance := subject_result.nursery_skill_performance IS NOT NULL
      AND subject_result.nursery_skill_performance <> '{}'::jsonb;

    IF NOT has_nursery_performance THEN
      SELECT trs.comment_text INTO pct_teacher_remark
      FROM teacher_remarks_settings trs
      WHERE trs.school_id = p_school_id
        AND trs.subject = subject_result.subject
        AND trs.holistic_grade_enum IS NULL
        AND (subject_result.marks_obtained / NULLIF(subject_result.total_marks, 0)) * 100 >= trs.min_percent
        AND (subject_result.marks_obtained / NULLIF(subject_result.total_marks, 0)) * 100 <= trs.max_percent
      ORDER BY trs.min_percent DESC
      LIMIT 1;

      teacher_remark := COALESCE(
        pct_teacher_remark,
        CASE
          WHEN (subject_result.marks_obtained / NULLIF(subject_result.total_marks, 0)) * 100 >= 81 THEN 'Excellent! Keep shining!'
          WHEN (subject_result.marks_obtained / NULLIF(subject_result.total_marks, 0)) * 100 >= 61 THEN 'Good work. Keep it up!'
          WHEN (subject_result.marks_obtained / NULLIF(subject_result.total_marks, 0)) * 100 >= 41 THEN 'Fair work. You can do better.'
          ELSE 'Needs more effort. Try harder next time.'
        END
      );
    ELSE
      worst_enum := public.worst_pre_primary_holistic_grade_from_json(subject_result.nursery_skill_performance);
      IF worst_enum IS NOT NULL THEN
        SELECT trs.comment_text INTO holistic_comment
        FROM teacher_remarks_settings trs
        WHERE trs.school_id = p_school_id
          AND trs.subject = subject_result.subject
          AND trs.holistic_grade_enum = worst_enum
        LIMIT 1;
      END IF;

      teacher_remark := COALESCE(
        NULLIF(trim(subject_result.remarks), ''),
        holistic_comment,
        'Performance recorded via checklist'
      );
    END IF;

    IF exam_set_record.term = 3 THEN
      next_term_year := exam_set_record.year + 1;
      next_term_number := 1;
    ELSE
      next_term_year := exam_set_record.year;
      next_term_number := exam_set_record.term + 1;
    END IF;

    SELECT start_date INTO next_term_begins_date
    FROM school_terms
    WHERE school_id = p_school_id
      AND year = next_term_year
      AND term = next_term_number
    LIMIT 1;

    INSERT INTO processed_primary_exam_results (
      school_id,
      student_id,
      exam_set_id,
      year,
      term,
      exam_set_name,
      student_name,
      class_name,
      admission_number,
      subject,
      marks_obtained,
      total_marks,
      grade,
      teacher_remark,
      teacher_initials,
      class_teacher_comment,
      headteacher_comment,
      next_term_begins_date,
      nursery_skill_performance
    ) VALUES (
      p_school_id,
      p_student_id,
      p_exam_set_id,
      exam_set_record.year,
      exam_set_record.term,
      exam_set_record.name,
      student_record.name,
      student_record.current_class,
      student_record.admission_number,
      subject_result.subject,
      subject_result.marks_obtained,
      subject_result.total_marks,
      subject_result.grade,
      teacher_remark,
      subject_result.teacher_initials,
      class_teacher_comment,
      headteacher_comment,
      next_term_begins_date,
      COALESCE(subject_result.nursery_skill_performance, '{}'::jsonb)
    )
    ON CONFLICT (school_id, student_id, exam_set_id, subject)
    DO UPDATE SET
      year = EXCLUDED.year,
      term = EXCLUDED.term,
      exam_set_name = EXCLUDED.exam_set_name,
      student_name = EXCLUDED.student_name,
      class_name = EXCLUDED.class_name,
      admission_number = EXCLUDED.admission_number,
      marks_obtained = EXCLUDED.marks_obtained,
      total_marks = EXCLUDED.total_marks,
      grade = EXCLUDED.grade,
      teacher_remark = EXCLUDED.teacher_remark,
      teacher_initials = EXCLUDED.teacher_initials,
      class_teacher_comment = EXCLUDED.class_teacher_comment,
      headteacher_comment = EXCLUDED.headteacher_comment,
      next_term_begins_date = EXCLUDED.next_term_begins_date,
      nursery_skill_performance = EXCLUDED.nursery_skill_performance,
      processed_at = NOW();
  END LOOP;
END;
$$;

NOTIFY pgrst, 'reload schema';
