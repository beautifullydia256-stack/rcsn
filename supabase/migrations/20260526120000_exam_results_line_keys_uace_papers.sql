-- Multi-line exam_results per (exam_set, student, subject): O-Level topics + A-Level papers (UNEB codes).
-- Drops UNIQUE (exam_set_id, student_id, subject); adds line keys + paper_code.
-- Extends processed_secondary_exam_results; replaces auto_populate_processed_on_exam_insert (class band: senior S1–S6).
-- Adds school_uace_class_subject_papers for school paper configuration (master plan §1b).

-- -----------------------------------------------------------------------------
-- 1) exam_results
-- -----------------------------------------------------------------------------
ALTER TABLE public.exam_results
  ADD COLUMN IF NOT EXISTS paper_code text;

COMMENT ON COLUMN public.exam_results.paper_code IS
  'Multi-paper (esp. A-Level): official UNEB-style code (e.g. P250/1). Complements paper_number; keys use coalesce(paper_code, paper_number).';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'exam_results' AND column_name = 'exam_topic_key'
  ) THEN
    ALTER TABLE public.exam_results
      ADD COLUMN exam_topic_key text
      GENERATED ALWAYS AS (
        COALESCE(NULLIF(BTRIM(COALESCE(topic, '')), ''), '')
      ) STORED;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'exam_results' AND column_name = 'exam_paper_key'
  ) THEN
    ALTER TABLE public.exam_results
      ADD COLUMN exam_paper_key text
      GENERATED ALWAYS AS (
        COALESCE(
          NULLIF(BTRIM(COALESCE(paper_code, '')), ''),
          NULLIF(BTRIM(COALESCE(paper_number, '')), ''),
          ''
        )
      ) STORED;
  END IF;
END $$;

ALTER TABLE public.exam_results DROP CONSTRAINT IF EXISTS exam_results_unique_constraint;

DROP INDEX IF EXISTS public.exam_results_exam_student_subject_line_uidx;

CREATE UNIQUE INDEX exam_results_exam_student_subject_line_uidx
  ON public.exam_results (exam_set_id, student_id, subject, exam_topic_key, exam_paper_key);

-- -----------------------------------------------------------------------------
-- 2) processed_secondary_exam_results
-- -----------------------------------------------------------------------------
ALTER TABLE public.processed_secondary_exam_results
  ADD COLUMN IF NOT EXISTS topic text;

ALTER TABLE public.processed_secondary_exam_results
  ADD COLUMN IF NOT EXISTS paper_code text;

ALTER TABLE public.processed_secondary_exam_results
  ADD COLUMN IF NOT EXISTS paper_number text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'processed_secondary_exam_results'
      AND column_name = 'proc_topic_key'
  ) THEN
    ALTER TABLE public.processed_secondary_exam_results
      ADD COLUMN proc_topic_key text
      GENERATED ALWAYS AS (
        COALESCE(NULLIF(BTRIM(COALESCE(topic, '')), ''), '')
      ) STORED;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'processed_secondary_exam_results'
      AND column_name = 'proc_paper_key'
  ) THEN
    ALTER TABLE public.processed_secondary_exam_results
      ADD COLUMN proc_paper_key text
      GENERATED ALWAYS AS (
        COALESCE(
          NULLIF(BTRIM(COALESCE(paper_code, '')), ''),
          NULLIF(BTRIM(COALESCE(paper_number, '')), ''),
          ''
        )
      ) STORED;
  END IF;
END $$;

ALTER TABLE public.processed_secondary_exam_results
  DROP CONSTRAINT IF EXISTS processed_secondary_exam_resu_school_id_student_id_exam_set_key;

DROP INDEX IF EXISTS public.processed_secondary_exam_line_uidx;

CREATE UNIQUE INDEX processed_secondary_exam_line_uidx
  ON public.processed_secondary_exam_results (
    school_id,
    student_id,
    exam_set_id,
    subject,
    proc_topic_key,
    proc_paper_key
  );

-- -----------------------------------------------------------------------------
-- 3) processed sync trigger (Senior 1–6 style class names only)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._class_name_is_senior_secondary(p_class text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT trim(both ' ' FROM coalesce(p_class, '')) ~* '^(senior\s*[1-6]|s\.?\s*[1-6])\b';
$$;

CREATE OR REPLACE FUNCTION public.auto_populate_processed_on_exam_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year integer;
  v_term integer;
  v_student_name text;
  v_admission text;
  v_class text;
  v_pc text;
  v_pn text;
  v_class_for_guard text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_class_for_guard := OLD.class_name;
    IF NOT public._class_name_is_senior_secondary(v_class_for_guard) THEN
      RETURN OLD;
    END IF;
    DELETE FROM public.processed_secondary_exam_results ps
    WHERE ps.school_id = OLD.school_id
      AND ps.student_id = OLD.student_id
      AND ps.exam_set_id = OLD.exam_set_id
      AND ps.subject = OLD.subject
      AND ps.proc_topic_key = OLD.exam_topic_key
      AND ps.proc_paper_key = OLD.exam_paper_key;
    RETURN OLD;
  END IF;

  v_class_for_guard := NEW.class_name;
  IF NOT public._class_name_is_senior_secondary(v_class_for_guard) THEN
    RETURN NEW;
  END IF;

  SELECT es.year, es.term
  INTO v_year, v_term
  FROM public.exam_sets es
  WHERE es.id = NEW.exam_set_id
  LIMIT 1;

  SELECT
    COALESCE(NULLIF(BTRIM(COALESCE(s.name, '')), ''), ''),
    s.admission_number,
    COALESCE(NULLIF(BTRIM(COALESCE(s.current_class, '')), ''), NEW.class_name)
  INTO v_student_name, v_admission, v_class
  FROM public.students s
  WHERE s.student_id = NEW.student_id
  LIMIT 1;

  v_pc := NULLIF(BTRIM(COALESCE(NEW.paper_code, '')), '');
  v_pn := NULLIF(BTRIM(COALESCE(NEW.paper_number, '')), '');

  INSERT INTO public.processed_secondary_exam_results (
    school_id,
    student_id,
    exam_set_id,
    student_name,
    admission_number,
    class_name,
    year,
    term,
    subject,
    marks_obtained,
    total_marks,
    grade,
    teacher_remark,
    teacher_initials,
    topic,
    paper_code,
    paper_number
  )
  VALUES (
    NEW.school_id,
    NEW.student_id,
    NEW.exam_set_id,
    COALESCE(v_student_name, ''),
    v_admission,
    COALESCE(v_class, NEW.class_name),
    COALESCE(v_year, 0),
    COALESCE(v_term, 0),
    NEW.subject,
    COALESCE(NEW.marks_obtained, NEW.final_score, 0),
    COALESCE(NEW.total_marks, 100),
    NEW.grade,
    COALESCE(
      NULLIF(BTRIM(COALESCE(NEW.remarks, '')), ''),
      NULLIF(BTRIM(COALESCE(NEW.overall_remark, '')), ''),
      ''
    ),
    NEW.teacher_initials,
    NEW.topic,
    v_pc,
    v_pn
  )
  ON CONFLICT (
    school_id,
    student_id,
    exam_set_id,
    subject,
    proc_topic_key,
    proc_paper_key
  )
  DO UPDATE SET
    student_name = EXCLUDED.student_name,
    admission_number = EXCLUDED.admission_number,
    class_name = EXCLUDED.class_name,
    year = EXCLUDED.year,
    term = EXCLUDED.term,
    marks_obtained = EXCLUDED.marks_obtained,
    total_marks = EXCLUDED.total_marks,
    grade = EXCLUDED.grade,
    teacher_remark = EXCLUDED.teacher_remark,
    teacher_initials = EXCLUDED.teacher_initials,
    topic = EXCLUDED.topic,
    paper_code = EXCLUDED.paper_code,
    paper_number = EXCLUDED.paper_number,
    updated_at = now();

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.auto_populate_processed_on_exam_insert IS
  'After INSERT/UPDATE/DELETE on exam_results: mirror Senior 1–6 rows into processed_secondary_exam_results by topic/paper line keys.';

DROP TRIGGER IF EXISTS trigger_auto_populate_processed_on_exam_insert ON public.exam_results;
CREATE TRIGGER trigger_auto_populate_processed_on_exam_insert
  AFTER INSERT OR UPDATE OR DELETE ON public.exam_results
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_populate_processed_on_exam_insert();

-- -----------------------------------------------------------------------------
-- 4) teacher_upsert_exam_result_secondary (three overloads + paper params)
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.teacher_upsert_exam_result_secondary(
  uuid, uuid, uuid, text, text, numeric, text, numeric, numeric, numeric, text, text, text, text
);
DROP FUNCTION IF EXISTS public.teacher_upsert_exam_result_secondary(
  uuid, uuid, uuid, text, text, numeric, text, numeric, numeric, numeric, text, text, uuid, text
);
DROP FUNCTION IF EXISTS public.teacher_upsert_exam_result_secondary(
  uuid, uuid, uuid, text, text, numeric, text, numeric, numeric, numeric, text, text, uuid, text, text
);

CREATE OR REPLACE FUNCTION public.teacher_upsert_exam_result_secondary(
  p_school_id uuid,
  p_exam_set_id uuid,
  p_student_id uuid,
  p_class_name text,
  p_subject text,
  p_activity_score numeric,
  p_descriptor text,
  p_formative_score numeric,
  p_exam_score numeric,
  p_final_score numeric,
  p_overall_remark text,
  p_teacher_initials text,
  p_teacher_id text,
  p_topic text DEFAULT NULL,
  p_paper_code text DEFAULT NULL,
  p_paper_number text DEFAULT NULL,
  p_grade text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_id uuid;
  result json;
  v_topic_key text;
  v_paper_key text;
BEGIN
  IF p_school_id IS NULL OR p_exam_set_id IS NULL OR p_student_id IS NULL THEN
    RETURN json_build_object('error', 'Missing required parameters');
  END IF;

  IF p_activity_score IS NULL OR p_formative_score IS NULL OR p_exam_score IS NULL OR p_final_score IS NULL THEN
    RETURN json_build_object('error', 'All scores are required');
  END IF;

  v_topic_key := COALESCE(NULLIF(BTRIM(COALESCE(p_topic, '')), ''), '');
  v_paper_key := COALESCE(
    NULLIF(BTRIM(COALESCE(p_paper_code, '')), ''),
    NULLIF(BTRIM(COALESCE(p_paper_number, '')), ''),
    ''
  );

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
      activity_score = p_activity_score,
      descriptor = p_descriptor,
      formative_score = p_formative_score,
      exam_score = p_exam_score,
      final_score = p_final_score,
      overall_remark = p_overall_remark,
      teacher_initials = p_teacher_initials,
      teacher_id = p_teacher_id,
      topic = NULLIF(BTRIM(COALESCE(p_topic, '')), ''),
      paper_code = NULLIF(BTRIM(COALESCE(p_paper_code, '')), ''),
      paper_number = NULLIF(BTRIM(COALESCE(p_paper_number, '')), ''),
      grade = COALESCE(p_grade, grade),
      updated_at = now()
    WHERE id = result_id;

    result := json_build_object('success', true, 'action', 'updated', 'id', result_id);
  ELSE
    INSERT INTO public.exam_results (
      school_id,
      exam_set_id,
      student_id,
      class_name,
      subject,
      activity_score,
      descriptor,
      formative_score,
      exam_score,
      final_score,
      overall_remark,
      teacher_initials,
      teacher_id,
      topic,
      paper_code,
      paper_number,
      grade,
      nursery_skill_performance,
      created_at,
      updated_at
    ) VALUES (
      p_school_id,
      p_exam_set_id,
      p_student_id,
      p_class_name,
      p_subject,
      p_activity_score,
      p_descriptor,
      p_formative_score,
      p_exam_score,
      p_final_score,
      p_overall_remark,
      p_teacher_initials,
      p_teacher_id,
      NULLIF(BTRIM(COALESCE(p_topic, '')), ''),
      NULLIF(BTRIM(COALESCE(p_paper_code, '')), ''),
      NULLIF(BTRIM(COALESCE(p_paper_number, '')), ''),
      p_grade,
      '{}'::jsonb,
      now(),
      now()
    ) RETURNING id INTO result_id;

    result := json_build_object('success', true, 'action', 'inserted', 'id', result_id);
  END IF;

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('error', 'Database error: ' || SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.teacher_upsert_exam_result_secondary(
  p_school_id uuid,
  p_exam_set_id uuid,
  p_student_id uuid,
  p_class_name text,
  p_subject text,
  p_activity_score numeric,
  p_descriptor text,
  p_formative_score numeric,
  p_exam_score numeric,
  p_final_score numeric,
  p_overall_remark text,
  p_teacher_initials text,
  p_teacher_id uuid,
  p_topic text DEFAULT NULL,
  p_paper_code text DEFAULT NULL,
  p_paper_number text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.teacher_upsert_exam_result_secondary(
    p_school_id,
    p_exam_set_id,
    p_student_id,
    p_class_name,
    p_subject,
    p_activity_score,
    p_descriptor,
    p_formative_score,
    p_exam_score,
    p_final_score,
    p_overall_remark,
    p_teacher_initials,
    p_teacher_id::text,
    p_topic,
    p_paper_code,
    p_paper_number,
    NULL::text
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.teacher_upsert_exam_result_secondary(
  p_school_id uuid,
  p_exam_set_id uuid,
  p_student_id uuid,
  p_class_name text,
  p_subject text,
  p_activity_score numeric,
  p_descriptor text,
  p_formative_score numeric,
  p_exam_score numeric,
  p_final_score numeric,
  p_overall_remark text,
  p_teacher_initials text,
  p_teacher_id uuid,
  p_topic text DEFAULT NULL,
  p_paper_code text DEFAULT NULL,
  p_paper_number text DEFAULT NULL,
  p_grade text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.teacher_upsert_exam_result_secondary(
    p_school_id,
    p_exam_set_id,
    p_student_id,
    p_class_name,
    p_subject,
    p_activity_score,
    p_descriptor,
    p_formative_score,
    p_exam_score,
    p_final_score,
    p_overall_remark,
    p_teacher_initials,
    p_teacher_id::text,
    p_topic,
    p_paper_code,
    p_paper_number,
    p_grade
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.teacher_upsert_exam_result_secondary(
  uuid, uuid, uuid, text, text, numeric, text, numeric, numeric, numeric, text, text, text, text, text, text, text
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.teacher_upsert_exam_result_secondary(
  uuid, uuid, uuid, text, text, numeric, text, numeric, numeric, numeric, text, text, uuid, text, text, text
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.teacher_upsert_exam_result_secondary(
  uuid, uuid, uuid, text, text, numeric, text, numeric, numeric, numeric, text, text, uuid, text, text, text, text
) TO authenticated;

COMMENT ON FUNCTION public.teacher_upsert_exam_result_secondary(
  uuid, uuid, uuid, text, text, numeric, text, numeric, numeric, numeric, text, text, text, text, text, text, text
) IS 'Secondary O-Level ECS upsert; line key = topic + paper_code/paper_number.';

-- -----------------------------------------------------------------------------
-- 5) teacher_upsert_exam_result_alevel (marks path; independent from ECS RPC)
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.teacher_upsert_exam_result_alevel(
  uuid, uuid, uuid, text, text, numeric, numeric, text, text, uuid, text, text
);
DROP FUNCTION IF EXISTS public.teacher_upsert_exam_result_alevel(
  uuid, uuid, uuid, text, text, numeric, numeric, text, text, uuid, text, text, text
);

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
BEGIN
  IF p_school_id IS NULL OR p_exam_set_id IS NULL OR p_student_id IS NULL THEN
    RETURN json_build_object('error', 'Missing required parameters');
  END IF;

  v_paper_key := COALESCE(
    NULLIF(BTRIM(COALESCE(p_paper_code, '')), ''),
    NULLIF(BTRIM(COALESCE(p_paper_number, '')), ''),
    ''
  );

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
      grade = p_grade,
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
    p_grade,
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

GRANT EXECUTE ON FUNCTION public.teacher_upsert_exam_result_alevel(
  uuid, uuid, uuid, text, text, numeric, numeric, text, text, uuid, text, text, text
) TO authenticated;

COMMENT ON FUNCTION public.teacher_upsert_exam_result_alevel(
  uuid, uuid, uuid, text, text, numeric, numeric, text, text, uuid, text, text, text
) IS 'A-Level marks upsert; line key = paper_code/paper_number (topic empty).';

-- -----------------------------------------------------------------------------
-- 6) school_uace_class_subject_papers
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.school_uace_class_subject_papers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(school_id) ON DELETE CASCADE,
  class_name text NOT NULL,
  subject_name text NOT NULL,
  paper_code text NOT NULL,
  paper_label text,
  sort_order integer NOT NULL DEFAULT 0,
  teacher_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT school_uace_class_subject_papers_code_unique
    UNIQUE (school_id, class_name, subject_name, paper_code)
);

CREATE INDEX IF NOT EXISTS idx_school_uace_papers_school_class
  ON public.school_uace_class_subject_papers (school_id, class_name);

COMMENT ON TABLE public.school_uace_class_subject_papers IS
  'Per-school A-Level (S5–S6): which papers exist for each class subject (UNEB codes). Optional teacher_id for paper-level assignment.';

ALTER TABLE public.school_uace_class_subject_papers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "school_uace_papers_select_school" ON public.school_uace_class_subject_papers;
CREATE POLICY "school_uace_papers_select_school"
  ON public.school_uace_class_subject_papers FOR SELECT TO authenticated
  USING (school_id IN (SELECT u.school_id FROM public.users u WHERE u.user_id = auth.uid()));

DROP POLICY IF EXISTS "school_uace_papers_mutate_staff" ON public.school_uace_class_subject_papers;
CREATE POLICY "school_uace_papers_mutate_staff"
  ON public.school_uace_class_subject_papers FOR ALL TO authenticated
  USING (school_id IN (SELECT u.school_id FROM public.users u WHERE u.user_id = auth.uid()))
  WITH CHECK (school_id IN (SELECT u.school_id FROM public.users u WHERE u.user_id = auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_uace_class_subject_papers TO authenticated;

