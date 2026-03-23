-- Grant RPC for clients to generate expense reference numbers
GRANT EXECUTE ON FUNCTION public.generate_expense_reference(UUID, DATE, TEXT) TO authenticated;

-- Optional: months the school plans to pay a given teacher (for budgeting / teacher visibility)
CREATE TABLE IF NOT EXISTS public.teacher_salary_planned_months (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools (school_id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.teachers (teacher_id) ON DELETE CASCADE,
  year INT NOT NULL CHECK (year >= 2000 AND year <= 2100),
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (teacher_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_teacher_salary_planned_school ON public.teacher_salary_planned_months (school_id);
CREATE INDEX IF NOT EXISTS idx_teacher_salary_planned_teacher ON public.teacher_salary_planned_months (teacher_id);

COMMENT ON TABLE public.teacher_salary_planned_months IS
  'Planned salary pay months per teacher (e.g. Jan, May, Aug). Distinct from actual payments in school_expenses.';

ALTER TABLE public.teacher_salary_planned_months ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teacher_salary_planned_select_school" ON public.teacher_salary_planned_months;
DROP POLICY IF EXISTS "teacher_salary_planned_teacher_own" ON public.teacher_salary_planned_months;
DROP POLICY IF EXISTS "teacher_salary_planned_select" ON public.teacher_salary_planned_months;

CREATE POLICY "teacher_salary_planned_select"
  ON public.teacher_salary_planned_months FOR SELECT TO authenticated
  USING (
    (
      school_id IN (
        SELECT u.school_id FROM public.users u
        WHERE u.user_id = auth.uid()
          AND u.role IN ('admin', 'accountant', 'head_teacher', 'owner')
          AND u.school_id IS NOT NULL
      )
    )
    OR (
      EXISTS (
        SELECT 1
        FROM public.teachers t
        INNER JOIN public.users u ON u.user_id = auth.uid()
        WHERE t.teacher_id = teacher_salary_planned_months.teacher_id
          AND t.school_id = teacher_salary_planned_months.school_id
          AND LOWER(TRIM(COALESCE(t.email, ''))) = LOWER(TRIM(COALESCE(u.email, '')))
      )
    )
  );

DROP POLICY IF EXISTS "teacher_salary_planned_admin_write" ON public.teacher_salary_planned_months;
CREATE POLICY "teacher_salary_planned_admin_write"
  ON public.teacher_salary_planned_months FOR ALL TO authenticated
  USING (
    school_id IN (SELECT s.school_id FROM public.schools s WHERE s.admin_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.user_id = auth.uid() AND u.role IN ('accountant', 'head_teacher') AND u.school_id = teacher_salary_planned_months.school_id)
  )
  WITH CHECK (
    school_id IN (SELECT u.school_id FROM public.users u WHERE u.user_id = auth.uid() AND u.school_id IS NOT NULL)
  );
