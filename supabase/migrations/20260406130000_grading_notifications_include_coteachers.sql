-- Include co-teachers (teacher_class_subjects) in grading-setting in-app notifications.
-- Safe to apply after 20260406120000: replaces notifier + trigger bodies so class/subject scoping is passed.

DROP FUNCTION IF EXISTS public.notify_school_staff_grading_settings_change(uuid, uuid, text, text, text, jsonb);

CREATE OR REPLACE FUNCTION public.notify_school_staff_grading_settings_change(
  p_school_id uuid,
  p_actor_id uuid,
  p_title text,
  p_body text,
  p_category text,
  p_metadata jsonb,
  p_class_name text DEFAULT NULL,
  p_subject text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
BEGIN
  IF p_school_id IS NULL OR p_actor_id IS NULL THEN
    RETURN;
  END IF;

  PERFORM public.insert_school_notification_grading_settings(p_school_id, p_actor_id, p_title, p_body);

  FOR r IN
    SELECT DISTINCT q.user_id
    FROM (
      SELECT u.user_id
      FROM public.users u
      WHERE u.school_id = p_school_id
        AND u.role IN ('admin', 'owner', 'head_teacher', 'accountant')
        AND COALESCE(u.is_active, TRUE)
      UNION
      SELECT u.user_id
      FROM public.teacher_class_subjects tcs
      INNER JOIN public.users u
        ON u.linked_teacher_id = tcs.teacher_id
        AND u.school_id = tcs.school_id
      WHERE tcs.school_id = p_school_id
        AND p_class_name IS NOT NULL
        AND tcs.class_name = p_class_name
        AND (p_subject IS NULL OR tcs.subject = p_subject)
        AND u.linked_teacher_id IS NOT NULL
        AND COALESCE(u.is_active, TRUE)
    ) AS q
    WHERE q.user_id IS DISTINCT FROM p_actor_id
  LOOP
    INSERT INTO public.user_in_app_notifications (school_id, user_id, title, body, category, metadata)
    VALUES (
      p_school_id,
      r.user_id,
      p_title,
      p_body,
      p_category,
      COALESCE(p_metadata, '{}'::jsonb)
    );
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_notify_teacher_exam_class_prefs_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid;
  v_label text;
  v_title text;
  v_body text;
  v_meta jsonb;
  parts text[] := ARRAY[]::text[];
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF
      OLD.o_level_formative_max IS NOT DISTINCT FROM NEW.o_level_formative_max
      AND OLD.auto_remark_enabled IS NOT DISTINCT FROM NEW.auto_remark_enabled
      AND OLD.primary_division_settings IS NOT DISTINCT FROM NEW.primary_division_settings
      AND OLD.grade_remarks_olevel IS NOT DISTINCT FROM NEW.grade_remarks_olevel
      AND OLD.grade_remarks_alevel IS NOT DISTINCT FROM NEW.grade_remarks_alevel
    THEN
      RETURN NEW;
    END IF;
  END IF;

  v_label := COALESCE(public.grading_settings_actor_label(v_actor), 'Someone');
  v_title := 'Exam grading preferences updated';

  IF TG_OP = 'INSERT' THEN
    parts := array_append(parts, format('auto remarks %s', CASE WHEN NEW.auto_remark_enabled THEN 'on' ELSE 'off' END));
  ELSIF NEW.auto_remark_enabled IS DISTINCT FROM OLD.auto_remark_enabled THEN
    parts := array_append(parts, format('auto remarks %s', CASE WHEN NEW.auto_remark_enabled THEN 'on' ELSE 'off' END));
  END IF;

  IF TG_OP = 'INSERT' THEN
    parts := array_append(parts, format('formative cap %s%%', NEW.o_level_formative_max));
  ELSIF NEW.o_level_formative_max IS DISTINCT FROM OLD.o_level_formative_max THEN
    parts := array_append(parts, format('formative cap %s%%', NEW.o_level_formative_max));
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.primary_division_settings IS DISTINCT FROM OLD.primary_division_settings THEN
    parts := array_append(parts, 'primary division settings changed');
  ELSIF TG_OP = 'INSERT' AND NEW.primary_division_settings IS NOT NULL THEN
    parts := array_append(parts, 'primary division settings set');
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.grade_remarks_olevel IS DISTINCT FROM OLD.grade_remarks_olevel THEN
    parts := array_append(parts, 'O-Level grade remark texts updated');
  ELSIF TG_OP = 'INSERT'
    AND NEW.grade_remarks_olevel IS NOT NULL
    AND NEW.grade_remarks_olevel <> '{}'::jsonb
  THEN
    parts := array_append(parts, 'O-Level grade remark texts set');
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.grade_remarks_alevel IS DISTINCT FROM OLD.grade_remarks_alevel THEN
    parts := array_append(parts, 'A-Level grade remark texts updated');
  ELSIF TG_OP = 'INSERT'
    AND NEW.grade_remarks_alevel IS NOT NULL
    AND NEW.grade_remarks_alevel <> '{}'::jsonb
  THEN
    parts := array_append(parts, 'A-Level grade remark texts set');
  END IF;

  IF array_length(parts, 1) IS NULL OR array_length(parts, 1) = 0 THEN
    parts := ARRAY['settings saved'];
  END IF;

  v_body := format(
    '%s updated shared exam preferences for class %s: %s.',
    v_label,
    NEW.class_name,
    array_to_string(parts, '; ')
  );

  v_meta := jsonb_build_object(
    'kind', 'teacher_exam_class_prefs',
    'class_name', NEW.class_name,
    'changed_by_user_id', v_actor,
    'prefs', jsonb_build_object(
      'o_level_formative_max', NEW.o_level_formative_max,
      'auto_remark_enabled', NEW.auto_remark_enabled,
      'primary_division_settings', NEW.primary_division_settings,
      'grade_remarks_olevel', NEW.grade_remarks_olevel,
      'grade_remarks_alevel', NEW.grade_remarks_alevel
    )
  );

  PERFORM public.notify_school_staff_grading_settings_change(
    NEW.school_id,
    v_actor,
    v_title,
    v_body,
    'exam_grading',
    v_meta,
    NEW.class_name,
    NULL
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_notify_teacher_exam_grade_bands_after_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid;
  v_label text;
  r_group RECORD;
  v_title text;
  v_body text;
  v_bands text;
  v_meta jsonb;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN
    RETURN NULL;
  END IF;

  v_label := COALESCE(public.grading_settings_actor_label(v_actor), 'Someone');
  v_title := 'Exam grade bands updated';

  FOR r_group IN
    SELECT
      t.school_id,
      t.class_name,
      t.subject,
      t.scale_kind,
      count(*)::int AS n_bands,
      string_agg(
        format('%s (%s%%–%s%%)', t.grade_label, t.min_percent, t.max_percent),
        ', '
        ORDER BY t.sort_order, t.min_percent, t.grade_label
      ) AS band_summary
    FROM new_tab t
    GROUP BY t.school_id, t.class_name, t.subject, t.scale_kind
  LOOP
    v_bands := COALESCE(r_group.band_summary, '');
    IF length(v_bands) > 400 THEN
      v_bands := left(v_bands, 397) || '…';
    END IF;

    v_body := format(
      '%s updated %s grading bands for class %s, subject «%s» (%s band%s): %s.',
      v_label,
      r_group.scale_kind,
      r_group.class_name,
      r_group.subject,
      r_group.n_bands,
      CASE WHEN r_group.n_bands = 1 THEN '' ELSE 's' END,
      v_bands
    );

    v_meta := jsonb_build_object(
      'kind', 'teacher_exam_grade_bands',
      'class_name', r_group.class_name,
      'subject', r_group.subject,
      'scale_kind', r_group.scale_kind,
      'changed_by_user_id', v_actor,
      'band_count', r_group.n_bands
    );

    PERFORM public.notify_school_staff_grading_settings_change(
      r_group.school_id,
      v_actor,
      v_title,
      v_body,
      'exam_grading',
      v_meta,
      r_group.class_name,
      r_group.subject
    );
  END LOOP;

  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.notify_school_staff_grading_settings_change(uuid, uuid, text, text, text, jsonb, text, text) IS
  'Broadcast grading/exam settings to school notifications feed and in-app inbox: admin roles plus co-teachers on the class (prefs) or class+subject (bands). Actor excluded from inbox.';
