-- ============================================================================
-- Workforce / HR: leave, payroll periods & payslips, job applications, onboarding,
-- staff reviews & goals. Extends delegated permission keys (hr.manage, hr.payroll).
-- ============================================================================

-- 1) Permission keys
ALTER TABLE public.user_school_permissions
  DROP CONSTRAINT IF EXISTS user_school_permissions_key_check;

ALTER TABLE public.user_school_permissions
  ADD CONSTRAINT user_school_permissions_key_check CHECK (
    permission_key IN (
      'students.manage',
      'accounting.full',
      'accounting.expenses_direct_approve',
      'discipline.manage',
      'hr.manage',
      'hr.payroll'
    )
  );

-- 2) jobs.status (admin UI posts with status)
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open';

COMMENT ON COLUMN public.jobs.status IS 'Vacancy lifecycle: open, closed, filled, draft.';

-- 3) Helper: HR module (leave, recruitment, onboarding, reviews) — not payroll-only
CREATE OR REPLACE FUNCTION public.hr_user_can_manage_hr(p_school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.user_id = (SELECT auth.uid())
      AND u.school_id = p_school_id
      AND (
        u.role IN ('admin', 'owner', 'head_teacher')
        OR EXISTS (
          SELECT 1
          FROM public.user_school_permissions p
          WHERE p.user_id = u.user_id
            AND p.school_id = p_school_id
            AND p.permission_key = 'hr.manage'
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.hr_user_can_payroll(p_school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.user_id = (SELECT auth.uid())
      AND u.school_id = p_school_id
      AND (
        u.role IN ('admin', 'owner', 'head_teacher')
        OR EXISTS (
          SELECT 1
          FROM public.user_school_permissions p
          WHERE p.user_id = u.user_id
            AND p.school_id = p_school_id
            AND p.permission_key IN ('hr.payroll', 'hr.manage')
        )
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.hr_user_can_manage_hr(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hr_user_can_payroll(uuid) TO authenticated;

-- 4) Leave types
CREATE TABLE IF NOT EXISTS public.hr_leave_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools (school_id) ON DELETE CASCADE,
  name text NOT NULL,
  paid boolean NOT NULL DEFAULT true,
  default_days_per_year numeric(6, 2) NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, name)
);

CREATE INDEX IF NOT EXISTS idx_hr_leave_types_school ON public.hr_leave_types (school_id);

-- 5) Leave balances (per calendar year)
CREATE TABLE IF NOT EXISTS public.hr_leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools (school_id) ON DELETE CASCADE,
  staff_kind text NOT NULL CHECK (staff_kind IN ('teacher', 'other_staff')),
  staff_id uuid NOT NULL,
  leave_type_id uuid NOT NULL REFERENCES public.hr_leave_types (id) ON DELETE CASCADE,
  year int NOT NULL CHECK (year >= 2000 AND year <= 2100),
  balance_days numeric(8, 2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, staff_kind, staff_id, leave_type_id, year)
);

CREATE INDEX IF NOT EXISTS idx_hr_leave_balances_lookup
  ON public.hr_leave_balances (school_id, staff_kind, staff_id, year);

-- 6) Leave requests
CREATE TABLE IF NOT EXISTS public.hr_leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools (school_id) ON DELETE CASCADE,
  staff_kind text NOT NULL CHECK (staff_kind IN ('teacher', 'other_staff')),
  staff_id uuid NOT NULL,
  leave_type_id uuid NOT NULL REFERENCES public.hr_leave_types (id) ON DELETE RESTRICT,
  start_date date NOT NULL,
  end_date date NOT NULL,
  half_day_part text CHECK (half_day_part IS NULL OR half_day_part IN ('am', 'pm')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  reason text,
  requested_by_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  reviewed_by_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hr_leave_requests_dates_ok CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_hr_leave_requests_school_status
  ON public.hr_leave_requests (school_id, status, start_date);

-- Validate staff belongs to school
CREATE OR REPLACE FUNCTION public.hr_trg_validate_leave_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.staff_kind = 'teacher' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.teacher_id = NEW.staff_id AND t.school_id = NEW.school_id
    ) THEN
      RAISE EXCEPTION 'Leave request: teacher not in school';
    END IF;
  ELSIF NEW.staff_kind = 'other_staff' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.other_staff_members o
      WHERE o.id = NEW.staff_id AND o.school_id = NEW.school_id
    ) THEN
      RAISE EXCEPTION 'Leave request: staff not in school';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hr_leave_requests_validate ON public.hr_leave_requests;
CREATE TRIGGER trg_hr_leave_requests_validate
  BEFORE INSERT OR UPDATE OF school_id, staff_kind, staff_id ON public.hr_leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.hr_trg_validate_leave_request();

-- Deduct balance when approved (transition into approved)
CREATE OR REPLACE FUNCTION public.hr_leave_request_days(p_row public.hr_leave_requests)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  d int;
  frac numeric;
BEGIN
  d := (p_row.end_date - p_row.start_date) + 1;
  IF p_row.half_day_part IS NOT NULL THEN
    frac := 0.5;
  ELSE
    frac := d::numeric;
  END IF;
  RETURN frac;
END;
$$;

CREATE OR REPLACE FUNCTION public.hr_trg_leave_balance_on_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  y int;
  days numeric;
  def_days numeric;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status <> 'approved') THEN
    y := EXTRACT(YEAR FROM NEW.start_date)::int;
    days := public.hr_leave_request_days(NEW);
    SELECT COALESCE(lt.default_days_per_year, 0) INTO def_days
    FROM public.hr_leave_types lt WHERE lt.id = NEW.leave_type_id;
    INSERT INTO public.hr_leave_balances (school_id, staff_kind, staff_id, leave_type_id, year, balance_days)
    VALUES (NEW.school_id, NEW.staff_kind, NEW.staff_id, NEW.leave_type_id, y, def_days - days)
    ON CONFLICT (school_id, staff_kind, staff_id, leave_type_id, year)
    DO UPDATE SET
      balance_days = public.hr_leave_balances.balance_days - days,
      updated_at = now();
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'approved' AND NEW.status IS DISTINCT FROM 'approved' THEN
    y := EXTRACT(YEAR FROM OLD.start_date)::int;
    days := public.hr_leave_request_days(OLD);
    UPDATE public.hr_leave_balances b
    SET balance_days = b.balance_days + days, updated_at = now()
    WHERE b.school_id = OLD.school_id
      AND b.staff_kind = OLD.staff_kind
      AND b.staff_id = OLD.staff_id
      AND b.leave_type_id = OLD.leave_type_id
      AND b.year = y;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hr_leave_balance_status ON public.hr_leave_requests;
CREATE TRIGGER trg_hr_leave_balance_status
  AFTER UPDATE OF status ON public.hr_leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.hr_trg_leave_balance_on_status();

-- 7) Payroll
CREATE TABLE IF NOT EXISTS public.hr_payroll_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools (school_id) ON DELETE CASCADE,
  label text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed')),
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hr_payroll_periods_range_ok CHECK (period_end >= period_start)
);

CREATE INDEX IF NOT EXISTS idx_hr_payroll_periods_school ON public.hr_payroll_periods (school_id, status);

CREATE TABLE IF NOT EXISTS public.hr_payslips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools (school_id) ON DELETE CASCADE,
  payroll_period_id uuid NOT NULL REFERENCES public.hr_payroll_periods (id) ON DELETE CASCADE,
  staff_kind text NOT NULL CHECK (staff_kind IN ('teacher', 'other_staff')),
  staff_id uuid NOT NULL,
  gross numeric(14, 2) NOT NULL DEFAULT 0,
  allowances jsonb NOT NULL DEFAULT '[]'::jsonb,
  deductions jsonb NOT NULL DEFAULT '[]'::jsonb,
  net numeric(14, 2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'UGX',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (payroll_period_id, staff_kind, staff_id)
);

CREATE INDEX IF NOT EXISTS idx_hr_payslips_school ON public.hr_payslips (school_id);

-- 8) Job applications (ATS)
CREATE TABLE IF NOT EXISTS public.hr_job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs (job_id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.schools (school_id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  cover_letter text,
  cv_url text,
  status text NOT NULL DEFAULT 'new' CHECK (
    status IN ('new', 'screening', 'interview', 'offer', 'hired', 'rejected')
  ),
  stage_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hr_job_applications_job ON public.hr_job_applications (job_id, status);
CREATE INDEX IF NOT EXISTS idx_hr_job_applications_school ON public.hr_job_applications (school_id);

-- 9) Onboarding
CREATE TABLE IF NOT EXISTS public.hr_onboarding_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools (school_id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_onboarding_template_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.hr_onboarding_templates (id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  sort_order int NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.hr_onboarding_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools (school_id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.hr_onboarding_templates (id) ON DELETE SET NULL,
  subject_staff_kind text NOT NULL CHECK (subject_staff_kind IN ('teacher', 'other_staff')),
  subject_staff_id uuid NOT NULL,
  job_application_id uuid REFERENCES public.hr_job_applications (id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.hr_onboarding_run_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.hr_onboarding_runs (id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  done_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_hr_onboarding_runs_school ON public.hr_onboarding_runs (school_id, status);

-- 10) Performance
CREATE TABLE IF NOT EXISTS public.hr_review_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools (school_id) ON DELETE CASCADE,
  name text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hr_review_cycles_range_ok CHECK (period_end >= period_start)
);

CREATE TABLE IF NOT EXISTS public.hr_staff_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools (school_id) ON DELETE CASCADE,
  cycle_id uuid REFERENCES public.hr_review_cycles (id) ON DELETE SET NULL,
  staff_kind text NOT NULL CHECK (staff_kind IN ('teacher', 'other_staff')),
  staff_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  target_value text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_staff_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools (school_id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL REFERENCES public.hr_review_cycles (id) ON DELETE CASCADE,
  staff_kind text NOT NULL CHECK (staff_kind IN ('teacher', 'other_staff')),
  staff_id uuid NOT NULL,
  reviewer_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  rating numeric(4, 2),
  summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cycle_id, staff_kind, staff_id)
);

CREATE INDEX IF NOT EXISTS idx_hr_staff_goals_school ON public.hr_staff_goals (school_id);
CREATE INDEX IF NOT EXISTS idx_hr_staff_reviews_cycle ON public.hr_staff_reviews (cycle_id);

-- 11) RLS enable
ALTER TABLE public.hr_leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_onboarding_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_onboarding_template_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_onboarding_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_onboarding_run_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_review_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_staff_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_staff_reviews ENABLE ROW LEVEL SECURITY;

-- 12) Policies: leave types / balances / requests
CREATE POLICY hr_leave_types_school_read ON public.hr_leave_types
  FOR SELECT TO authenticated USING (
    school_id IN (SELECT u.school_id FROM public.users u WHERE u.user_id = (SELECT auth.uid()))
  );

CREATE POLICY hr_leave_types_mutate ON public.hr_leave_types
  FOR INSERT TO authenticated
  WITH CHECK (public.hr_user_can_manage_hr(school_id));

CREATE POLICY hr_leave_types_update ON public.hr_leave_types
  FOR UPDATE TO authenticated
  USING (public.hr_user_can_manage_hr(school_id))
  WITH CHECK (public.hr_user_can_manage_hr(school_id));

CREATE POLICY hr_leave_types_delete ON public.hr_leave_types
  FOR DELETE TO authenticated
  USING (public.hr_user_can_manage_hr(school_id));

CREATE POLICY hr_leave_balances_select ON public.hr_leave_balances
  FOR SELECT TO authenticated USING (
    public.hr_user_can_manage_hr(school_id)
    OR (
      staff_kind = 'teacher'
      AND staff_id = (SELECT u.linked_teacher_id FROM public.users u WHERE u.user_id = (SELECT auth.uid()) LIMIT 1)
    )
    OR (
      staff_kind = 'other_staff'
      AND EXISTS (
        SELECT 1 FROM public.other_staff_members o
        WHERE o.id = hr_leave_balances.staff_id AND o.linked_user_id = (SELECT auth.uid())
      )
    )
  );

CREATE POLICY hr_leave_balances_mutate ON public.hr_leave_balances
  FOR ALL TO authenticated
  USING (public.hr_user_can_manage_hr(school_id))
  WITH CHECK (public.hr_user_can_manage_hr(school_id));

CREATE POLICY hr_leave_requests_select ON public.hr_leave_requests
  FOR SELECT TO authenticated USING (
    public.hr_user_can_manage_hr(school_id)
    OR (
      staff_kind = 'teacher'
      AND staff_id = (SELECT u.linked_teacher_id FROM public.users u WHERE u.user_id = (SELECT auth.uid()) LIMIT 1)
    )
    OR (
      staff_kind = 'other_staff'
      AND EXISTS (
        SELECT 1 FROM public.other_staff_members o
        WHERE o.id = hr_leave_requests.staff_id AND o.linked_user_id = (SELECT auth.uid())
      )
    )
  );

CREATE POLICY hr_leave_requests_insert ON public.hr_leave_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    school_id IN (SELECT u.school_id FROM public.users u WHERE u.user_id = (SELECT auth.uid()))
    AND (
      public.hr_user_can_manage_hr(school_id)
      OR (
        staff_kind = 'teacher'
        AND staff_id = (SELECT u.linked_teacher_id FROM public.users u WHERE u.user_id = (SELECT auth.uid()) AND u.linked_teacher_id IS NOT NULL LIMIT 1)
      )
      OR (
        staff_kind = 'other_staff'
        AND EXISTS (
          SELECT 1 FROM public.other_staff_members o
          WHERE o.id = staff_id AND o.linked_user_id = (SELECT auth.uid())
        )
      )
    )
  );

CREATE POLICY hr_leave_requests_update ON public.hr_leave_requests
  FOR UPDATE TO authenticated
  USING (
    public.hr_user_can_manage_hr(school_id)
    OR (
      status = 'pending'
      AND (
        (
          staff_kind = 'teacher'
          AND staff_id = (SELECT u.linked_teacher_id FROM public.users u WHERE u.user_id = (SELECT auth.uid()) LIMIT 1)
        )
        OR (
          staff_kind = 'other_staff'
          AND EXISTS (
            SELECT 1 FROM public.other_staff_members o
            WHERE o.id = hr_leave_requests.staff_id AND o.linked_user_id = (SELECT auth.uid())
          )
        )
      )
    )
  )
  WITH CHECK (
    public.hr_user_can_manage_hr(school_id)
    OR (
      status IN ('pending', 'cancelled')
      AND (
        (
          staff_kind = 'teacher'
          AND staff_id = (SELECT u.linked_teacher_id FROM public.users u WHERE u.user_id = (SELECT auth.uid()) LIMIT 1)
        )
        OR (
          staff_kind = 'other_staff'
          AND EXISTS (
            SELECT 1 FROM public.other_staff_members o
            WHERE o.id = staff_id AND o.linked_user_id = (SELECT auth.uid())
          )
        )
      )
    )
  );

-- 13) Payroll policies
CREATE POLICY hr_payroll_periods_select ON public.hr_payroll_periods
  FOR SELECT TO authenticated USING (public.hr_user_can_payroll(school_id));

CREATE POLICY hr_payroll_periods_mutate ON public.hr_payroll_periods
  FOR ALL TO authenticated
  USING (public.hr_user_can_payroll(school_id))
  WITH CHECK (public.hr_user_can_payroll(school_id));

CREATE POLICY hr_payslips_select ON public.hr_payslips
  FOR SELECT TO authenticated USING (
    public.hr_user_can_payroll(school_id)
    OR (
      staff_kind = 'teacher'
      AND staff_id = (SELECT u.linked_teacher_id FROM public.users u WHERE u.user_id = (SELECT auth.uid()) LIMIT 1)
    )
    OR (
      staff_kind = 'other_staff'
      AND EXISTS (
        SELECT 1 FROM public.other_staff_members o
        WHERE o.id = hr_payslips.staff_id AND o.linked_user_id = (SELECT auth.uid())
      )
    )
  );

CREATE POLICY hr_payslips_mutate ON public.hr_payslips
  FOR ALL TO authenticated
  USING (public.hr_user_can_payroll(school_id))
  WITH CHECK (public.hr_user_can_payroll(school_id));

-- 14) Job applications
CREATE POLICY hr_job_applications_select ON public.hr_job_applications
  FOR SELECT TO authenticated USING (public.hr_user_can_manage_hr(school_id));

CREATE POLICY hr_job_applications_mutate ON public.hr_job_applications
  FOR ALL TO authenticated
  USING (public.hr_user_can_manage_hr(school_id))
  WITH CHECK (public.hr_user_can_manage_hr(school_id));

-- 15) Onboarding
CREATE POLICY hr_onboarding_templates_select ON public.hr_onboarding_templates
  FOR SELECT TO authenticated USING (public.hr_user_can_manage_hr(school_id));

CREATE POLICY hr_onboarding_templates_mutate ON public.hr_onboarding_templates
  FOR ALL TO authenticated
  USING (public.hr_user_can_manage_hr(school_id))
  WITH CHECK (public.hr_user_can_manage_hr(school_id));

CREATE POLICY hr_onboarding_template_tasks_all ON public.hr_onboarding_template_tasks
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.hr_onboarding_templates t
      WHERE t.id = hr_onboarding_template_tasks.template_id AND public.hr_user_can_manage_hr(t.school_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.hr_onboarding_templates t
      WHERE t.id = template_id AND public.hr_user_can_manage_hr(t.school_id)
    )
  );

CREATE POLICY hr_onboarding_runs_select ON public.hr_onboarding_runs
  FOR SELECT TO authenticated USING (public.hr_user_can_manage_hr(school_id));

CREATE POLICY hr_onboarding_runs_mutate ON public.hr_onboarding_runs
  FOR ALL TO authenticated
  USING (public.hr_user_can_manage_hr(school_id))
  WITH CHECK (public.hr_user_can_manage_hr(school_id));

CREATE POLICY hr_onboarding_run_tasks_all ON public.hr_onboarding_run_tasks
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.hr_onboarding_runs r
      WHERE r.id = hr_onboarding_run_tasks.run_id AND public.hr_user_can_manage_hr(r.school_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.hr_onboarding_runs r
      WHERE r.id = run_id AND public.hr_user_can_manage_hr(r.school_id)
    )
  );

-- 16) Performance
CREATE POLICY hr_review_cycles_all ON public.hr_review_cycles
  FOR ALL TO authenticated
  USING (public.hr_user_can_manage_hr(school_id))
  WITH CHECK (public.hr_user_can_manage_hr(school_id));

CREATE POLICY hr_staff_goals_select ON public.hr_staff_goals
  FOR SELECT TO authenticated USING (
    public.hr_user_can_manage_hr(school_id)
    OR (
      staff_kind = 'teacher'
      AND staff_id = (SELECT u.linked_teacher_id FROM public.users u WHERE u.user_id = (SELECT auth.uid()) LIMIT 1)
    )
    OR (
      staff_kind = 'other_staff'
      AND EXISTS (
        SELECT 1 FROM public.other_staff_members o
        WHERE o.id = hr_staff_goals.staff_id AND o.linked_user_id = (SELECT auth.uid())
      )
    )
  );

CREATE POLICY hr_staff_goals_mutate ON public.hr_staff_goals
  FOR ALL TO authenticated
  USING (public.hr_user_can_manage_hr(school_id))
  WITH CHECK (public.hr_user_can_manage_hr(school_id));

CREATE POLICY hr_staff_reviews_select ON public.hr_staff_reviews
  FOR SELECT TO authenticated USING (
    public.hr_user_can_manage_hr(school_id)
    OR (
      staff_kind = 'teacher'
      AND staff_id = (SELECT u.linked_teacher_id FROM public.users u WHERE u.user_id = (SELECT auth.uid()) LIMIT 1)
    )
    OR (
      staff_kind = 'other_staff'
      AND EXISTS (
        SELECT 1 FROM public.other_staff_members o
        WHERE o.id = hr_staff_reviews.staff_id AND o.linked_user_id = (SELECT auth.uid())
      )
    )
  );

CREATE POLICY hr_staff_reviews_mutate ON public.hr_staff_reviews
  FOR ALL TO authenticated
  USING (public.hr_user_can_manage_hr(school_id))
  WITH CHECK (public.hr_user_can_manage_hr(school_id));

COMMENT ON TABLE public.hr_leave_types IS 'Per-school leave categories (annual, sick, etc.).';
COMMENT ON TABLE public.hr_job_applications IS 'ATS applications; public submit via service-role API route.';
