-- ============================================================================
-- Student discipline: timeline, suspension (manual lift), deactivation, soft delete,
-- owner-only restore, filtered list RPC, RLS on discipline_records.
-- ============================================================================

-- 1) Delegated permission key
ALTER TABLE public.user_school_permissions
  DROP CONSTRAINT IF EXISTS user_school_permissions_key_check;

ALTER TABLE public.user_school_permissions
  ADD CONSTRAINT user_school_permissions_key_check CHECK (
    permission_key IN (
      'students.manage',
      'accounting.full',
      'accounting.expenses_direct_approve',
      'discipline.manage'
    )
  );

-- 2) Students: discipline columns
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS discipline_deactivated_at TIMESTAMPTZ;

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS suspension_open BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS suspension_period_start DATE;

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS suspension_period_end DATE;

COMMENT ON COLUMN public.students.deleted_at IS 'Soft delete (discipline deletion); cleared only via owner_restore_soft_deleted_student.';
COMMENT ON COLUMN public.students.discipline_deactivated_at IS 'Discipline deactivation; separate from enrollment_status.';
COMMENT ON COLUMN public.students.suspension_open IS 'True until staff records lift_suspension (calendar end date does not auto-clear).';
COMMENT ON COLUMN public.students.suspension_period_start IS 'Denormalized from latest suspension action for admin UI.';
COMMENT ON COLUMN public.students.suspension_period_end IS 'Denormalized from latest suspension action for admin UI.';

CREATE INDEX IF NOT EXISTS idx_students_school_deleted_at ON public.students (school_id) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_students_school_suspension_open ON public.students (school_id) WHERE suspension_open;
CREATE INDEX IF NOT EXISTS idx_students_school_discipline_deactivated ON public.students (school_id) WHERE discipline_deactivated_at IS NOT NULL;

-- 3) discipline_records canonical table
CREATE TABLE IF NOT EXISTS public.discipline_records (
  record_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools (school_id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students (student_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by UUID REFERENCES public.users (user_id) ON DELETE SET NULL,
  notes TEXT NOT NULL,
  action_type TEXT NOT NULL,
  suspension_start_date DATE,
  suspension_end_date DATE,
  evidence_storage_path TEXT,
  incident_type TEXT,
  title TEXT,
  description TEXT,
  action_taken TEXT,
  incident_date TIMESTAMPTZ,
  CONSTRAINT discipline_records_action_type_check CHECK (
    action_type IN (
      'warning',
      'suspension',
      'lift_suspension',
      'deactivation',
      'deletion',
      'restoration',
      'achievement',
      'commendation'
    )
  )
);

-- Backfill / add columns if table pre-existed with fewer columns
ALTER TABLE public.discipline_records ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.discipline_records ADD COLUMN IF NOT EXISTS action_type TEXT;
ALTER TABLE public.discipline_records ADD COLUMN IF NOT EXISTS suspension_start_date DATE;
ALTER TABLE public.discipline_records ADD COLUMN IF NOT EXISTS suspension_end_date DATE;
ALTER TABLE public.discipline_records ADD COLUMN IF NOT EXISTS evidence_storage_path TEXT;
ALTER TABLE public.discipline_records ADD COLUMN IF NOT EXISTS incident_type TEXT;
ALTER TABLE public.discipline_records ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.discipline_records ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.discipline_records ADD COLUMN IF NOT EXISTS action_taken TEXT;
ALTER TABLE public.discipline_records ADD COLUMN IF NOT EXISTS incident_date TIMESTAMPTZ;
ALTER TABLE public.discipline_records ADD COLUMN IF NOT EXISTS recorded_by UUID;
ALTER TABLE public.discipline_records ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE public.discipline_records ADD COLUMN IF NOT EXISTS school_id UUID;
ALTER TABLE public.discipline_records ADD COLUMN IF NOT EXISTS student_id UUID;

-- Relax NOT NULL for legacy rows then enforce via app for new rows
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'discipline_records' AND column_name = 'notes'
  ) THEN
    ALTER TABLE public.discipline_records ALTER COLUMN notes DROP NOT NULL;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

UPDATE public.discipline_records
SET
  notes = COALESCE(NULLIF(trim(notes), ''), NULLIF(trim(description), ''), NULLIF(trim(title), ''), '—'),
  action_type = CASE
    WHEN lower(trim(COALESCE(action_type, ''))) IN (
      'warning', 'suspension', 'lift_suspension', 'deactivation', 'deletion', 'restoration', 'achievement', 'commendation'
    ) THEN lower(trim(action_type))
    WHEN lower(trim(COALESCE(incident_type, ''))) IN (
      'warning', 'suspension', 'deactivation', 'deletion', 'achievement', 'commendation'
    ) THEN lower(trim(incident_type))
    ELSE 'warning'
  END,
  created_at = COALESCE(created_at, incident_date, NOW()),
  incident_date = COALESCE(incident_date, created_at, NOW())
WHERE notes IS NULL OR action_type IS NULL OR trim(COALESCE(notes, '')) = '';

UPDATE public.discipline_records dr
SET school_id = s.school_id
FROM public.students s
WHERE dr.student_id = s.student_id AND dr.school_id IS NULL;

UPDATE public.discipline_records SET notes = '—' WHERE notes IS NULL;

ALTER TABLE public.discipline_records ALTER COLUMN notes SET NOT NULL;
ALTER TABLE public.discipline_records ALTER COLUMN action_type SET NOT NULL;
ALTER TABLE public.discipline_records ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE public.discipline_records ALTER COLUMN created_at SET DEFAULT NOW();

-- Drop old constraint name if present and re-add unified check
ALTER TABLE public.discipline_records DROP CONSTRAINT IF EXISTS discipline_records_action_type_check;
ALTER TABLE public.discipline_records ADD CONSTRAINT discipline_records_action_type_check CHECK (
  action_type IN (
    'warning',
    'suspension',
    'lift_suspension',
    'deactivation',
    'deletion',
    'restoration',
    'achievement',
    'commendation'
  )
);

CREATE INDEX IF NOT EXISTS idx_discipline_records_school_student ON public.discipline_records (school_id, student_id);
CREATE INDEX IF NOT EXISTS idx_discipline_records_student_created ON public.discipline_records (student_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.discipline_records_sync_legacy_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.incident_type := COALESCE(NEW.incident_type, NEW.action_type);
  NEW.incident_date := COALESCE(NEW.incident_date, NEW.created_at, NOW());
  NEW.description := COALESCE(NEW.description, NEW.notes);
  NEW.title := COALESCE(
    NEW.title,
    CASE NEW.action_type
      WHEN 'warning' THEN 'Discipline: Warning'
      WHEN 'suspension' THEN 'Discipline: Suspension'
      WHEN 'lift_suspension' THEN 'Discipline: Suspension ended'
      WHEN 'deactivation' THEN 'Discipline: Deactivation'
      WHEN 'deletion' THEN 'Discipline: Student archived'
      WHEN 'restoration' THEN 'Discipline: Student restored'
      ELSE 'Discipline'
    END
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_discipline_records_legacy ON public.discipline_records;
CREATE TRIGGER trg_discipline_records_legacy
  BEFORE INSERT OR UPDATE ON public.discipline_records
  FOR EACH ROW
  EXECUTE FUNCTION public.discipline_records_sync_legacy_fields();

-- 4) Permission helper
CREATE OR REPLACE FUNCTION public.current_user_can_manage_discipline()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := (SELECT auth.uid());
  v_role_norm TEXT;
  v_school UUID;
BEGIN
  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;
  SELECT u.school_id, lower(regexp_replace(trim(COALESCE(u.role, '')), '\s+', '_', 'g'))
    INTO v_school, v_role_norm
  FROM public.users u
  WHERE u.user_id = v_uid
  LIMIT 1;
  IF v_school IS NULL THEN
    RETURN FALSE;
  END IF;
  IF v_role_norm IN ('admin', 'owner', 'head_teacher') THEN
    RETURN TRUE;
  END IF;
  RETURN EXISTS (
    SELECT 1
    FROM public.user_school_permissions p
    WHERE p.user_id = v_uid
      AND p.school_id = v_school
      AND p.permission_key = 'discipline.manage'
  );
END;
$$;

-- 5) RPC: add discipline action
CREATE OR REPLACE FUNCTION public.admin_add_discipline_action(
  p_student_id UUID,
  p_action_type TEXT,
  p_notes TEXT,
  p_suspension_start DATE DEFAULT NULL,
  p_suspension_end DATE DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := (SELECT auth.uid());
  v_school UUID;
  v_student_school UUID;
  v_action TEXT;
  v_rid UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF NOT public.current_user_can_manage_discipline() THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  v_action := lower(trim(p_action_type));
  IF p_notes IS NULL OR trim(p_notes) = '' THEN
    RAISE EXCEPTION 'notes required';
  END IF;

  SELECT u.school_id INTO v_school FROM public.users u WHERE u.user_id = v_uid LIMIT 1;
  SELECT s.school_id INTO v_student_school FROM public.students s WHERE s.student_id = p_student_id LIMIT 1;
  IF v_student_school IS NULL THEN
    RAISE EXCEPTION 'student not found';
  END IF;
  IF v_student_school IS DISTINCT FROM v_school THEN
    RAISE EXCEPTION 'student not in your school';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.student_id = p_student_id AND s.deleted_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'student is archived';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.student_id = p_student_id AND s.discipline_deactivated_at IS NOT NULL
  ) AND v_action IN ('warning', 'suspension', 'lift_suspension') THEN
    RAISE EXCEPTION 'student is deactivated';
  END IF;

  IF v_action = 'suspension' THEN
    IF p_suspension_start IS NULL OR p_suspension_end IS NULL THEN
      RAISE EXCEPTION 'suspension requires start and end dates';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.student_id = p_student_id AND COALESCE(s.suspension_open, false)
    ) THEN
      RAISE EXCEPTION 'student already has an open suspension; lift it first';
    END IF;
  ELSIF v_action = 'lift_suspension' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.student_id = p_student_id AND COALESCE(s.suspension_open, false)
    ) THEN
      RAISE EXCEPTION 'no open suspension to lift';
    END IF;
  ELSIF v_action NOT IN ('warning', 'deactivation', 'deletion') THEN
    RAISE EXCEPTION 'invalid action_type';
  END IF;

  INSERT INTO public.discipline_records (
    school_id,
    student_id,
    recorded_by,
    notes,
    action_type,
    suspension_start_date,
    suspension_end_date
  )
  VALUES (
    v_student_school,
    p_student_id,
    v_uid,
    trim(p_notes),
    v_action,
    CASE WHEN v_action = 'suspension' THEN p_suspension_start ELSE NULL END,
    CASE WHEN v_action = 'suspension' THEN p_suspension_end ELSE NULL END
  )
  RETURNING record_id INTO v_rid;

  IF v_action = 'warning' THEN
    UPDATE public.students
    SET suspension_period_start = NULL,
        suspension_period_end = NULL
    WHERE student_id = p_student_id;
  ELSIF v_action = 'suspension' THEN
    UPDATE public.students
    SET
      suspension_open = true,
      suspension_period_start = p_suspension_start,
      suspension_period_end = p_suspension_end
    WHERE student_id = p_student_id;
  ELSIF v_action = 'lift_suspension' THEN
    UPDATE public.students
    SET
      suspension_open = false,
      suspension_period_start = NULL,
      suspension_period_end = NULL
    WHERE student_id = p_student_id;
  ELSIF v_action = 'deactivation' THEN
    UPDATE public.students
    SET
      discipline_deactivated_at = NOW(),
      suspension_open = false,
      suspension_period_start = NULL,
      suspension_period_end = NULL
    WHERE student_id = p_student_id;
  ELSIF v_action = 'deletion' THEN
    IF EXISTS (
      SELECT 1 FROM public.students s WHERE s.student_id = p_student_id AND s.deleted_at IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'student already archived';
    END IF;
    UPDATE public.students
    SET
      deleted_at = NOW(),
      suspension_open = false,
      suspension_period_start = NULL,
      suspension_period_end = NULL
    WHERE student_id = p_student_id;
  END IF;

  RETURN v_rid;
END;
$$;

-- 6) Owner-only restore
CREATE OR REPLACE FUNCTION public.owner_restore_soft_deleted_student(
  p_student_id UUID,
  p_notes TEXT DEFAULT ''
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := (SELECT auth.uid());
  v_role_norm TEXT;
  v_school UUID;
  v_student_school UUID;
  v_rid UUID;
  v_notes TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  SELECT u.school_id, lower(regexp_replace(trim(COALESCE(u.role, '')), '\s+', '_', 'g'))
    INTO v_school, v_role_norm
  FROM public.users u
  WHERE u.user_id = v_uid
  LIMIT 1;
  IF v_role_norm IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'only owner may restore';
  END IF;
  IF v_school IS NULL THEN
    RAISE EXCEPTION 'no school';
  END IF;

  SELECT s.school_id INTO v_student_school FROM public.students s WHERE s.student_id = p_student_id LIMIT 1;
  IF v_student_school IS NULL THEN
    RAISE EXCEPTION 'student not found';
  END IF;
  IF v_student_school IS DISTINCT FROM v_school THEN
    RAISE EXCEPTION 'student not in your school';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.students s WHERE s.student_id = p_student_id AND s.deleted_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'student is not archived';
  END IF;

  v_notes := COALESCE(NULLIF(trim(p_notes), ''), 'Restored by owner');

  UPDATE public.students
  SET deleted_at = NULL
  WHERE student_id = p_student_id;

  INSERT INTO public.discipline_records (
    school_id,
    student_id,
    recorded_by,
    notes,
    action_type,
    suspension_start_date,
    suspension_end_date
  )
  VALUES (
    v_student_school,
    p_student_id,
    v_uid,
    v_notes,
    'restoration',
    NULL,
    NULL
  )
  RETURNING record_id INTO v_rid;

  RETURN v_rid;
END;
$$;

-- 7) Filtered student list
CREATE OR REPLACE FUNCTION public.admin_list_students_discipline_filtered(p_filter TEXT)
RETURNS SETOF public.students
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school UUID;
  v_f TEXT;
BEGIN
  IF NOT public.current_user_can_manage_discipline() THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  SELECT u.school_id INTO v_school FROM public.users u WHERE u.user_id = (SELECT auth.uid()) LIMIT 1;
  IF v_school IS NULL THEN
    RETURN;
  END IF;

  v_f := lower(trim(COALESCE(p_filter, 'all')));

  RETURN QUERY
  SELECT s.*
  FROM public.students s
  WHERE s.school_id = v_school
    AND (
      v_f IN ('all', '')
      OR (
        v_f = 'active'
        AND s.deleted_at IS NULL
        AND s.discipline_deactivated_at IS NULL
        AND NOT COALESCE(s.suspension_open, false)
        AND NOT EXISTS (
          SELECT 1
          FROM public.discipline_records dr
          WHERE dr.student_id = s.student_id
            AND dr.action_type = 'warning'
        )
      )
      OR (
        v_f = 'warned'
        AND s.deleted_at IS NULL
        AND s.discipline_deactivated_at IS NULL
        AND NOT COALESCE(s.suspension_open, false)
        AND EXISTS (
          SELECT 1
          FROM public.discipline_records dr
          WHERE dr.student_id = s.student_id
            AND dr.action_type = 'warning'
        )
      )
      OR (
        v_f = 'suspended'
        AND s.deleted_at IS NULL
        AND s.discipline_deactivated_at IS NULL
        AND COALESCE(s.suspension_open, false)
      )
      OR (
        v_f = 'deactivated'
        AND s.deleted_at IS NULL
        AND s.discipline_deactivated_at IS NOT NULL
      )
      OR (
        v_f = 'deleted'
        AND s.deleted_at IS NOT NULL
      )
    )
  ORDER BY s.created_at DESC;
END;
$$;

-- 8) RLS discipline_records
ALTER TABLE public.discipline_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS discipline_records_select_school_staff ON public.discipline_records;
CREATE POLICY discipline_records_select_school_staff
  ON public.discipline_records
  FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT u.school_id FROM public.users u WHERE u.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS discipline_records_select_parent ON public.discipline_records;
CREATE POLICY discipline_records_select_parent
  ON public.discipline_records
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.parents p
      WHERE p.student_id = discipline_records.student_id
        AND p.parent_id = (SELECT auth.uid())
    )
  );

-- No INSERT/UPDATE/DELETE for authenticated — use SECURITY DEFINER RPCs

GRANT EXECUTE ON FUNCTION public.current_user_can_manage_discipline() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_add_discipline_action(UUID, TEXT, TEXT, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_restore_soft_deleted_student(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_students_discipline_filtered(TEXT) TO authenticated;
