-- =============================================================================
-- Expense hierarchy: main category → subcategory → line item (description)
-- Multi-tenant: expense_subcategories rows per school; defaults copied from templates.
-- =============================================================================

-- 1) Main categories (global taxonomy)
CREATE TABLE IF NOT EXISTS public.expense_main_categories (
  code TEXT PRIMARY KEY,
  label_en TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

INSERT INTO public.expense_main_categories (code, label_en, sort_order) VALUES
  ('academic_instructional', 'Academic / Instructional', 10),
  ('administrative', 'Administrative', 20),
  ('infrastructure_maintenance', 'Infrastructure & Maintenance', 30),
  ('utilities', 'Utilities', 40),
  ('feeding_boarding', 'Feeding / Boarding', 50),
  ('health_medical', 'Health & Medical', 60),
  ('transport', 'Transport', 70),
  ('security', 'Security', 80),
  ('cocurricular', 'Co-curricular Activities', 90),
  ('ict_technology', 'ICT / Technology', 100),
  ('financial_compliance', 'Financial & Compliance', 110),
  ('student_welfare', 'Student Welfare', 120),
  ('marketing_admissions', 'Marketing & Admissions', 130),
  ('religious_moral', 'Religious / Moral (optional)', 140)
ON CONFLICT (code) DO NOTHING;

-- 2) Default subcategories (templates — copied per school)
CREATE TABLE IF NOT EXISTS public.expense_subcategory_defaults (
  id SERIAL PRIMARY KEY,
  main_category_code TEXT NOT NULL REFERENCES public.expense_main_categories (code) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_salary BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  UNIQUE (main_category_code, name)
);

INSERT INTO public.expense_subcategory_defaults (main_category_code, name, is_salary, sort_order) VALUES
  ('academic_instructional', 'Teaching materials', false, 10),
  ('academic_instructional', 'Exams & assessments', false, 20),
  ('academic_instructional', 'Teacher training', false, 30),
  ('academic_instructional', 'Teacher salaries', true, 40),
  ('administrative', 'Office supplies', false, 10),
  ('administrative', 'Communication', false, 20),
  ('administrative', 'Bank charges', false, 30),
  ('administrative', 'Non-teaching staff salaries', true, 40),
  ('infrastructure_maintenance', 'Repairs & maintenance', false, 10),
  ('infrastructure_maintenance', 'Building supplies', false, 20),
  ('utilities', 'Electricity', false, 10),
  ('utilities', 'Water', false, 20),
  ('utilities', 'Internet & telecoms', false, 30),
  ('feeding_boarding', 'Food supplies', false, 10),
  ('feeding_boarding', 'Cooking fuel', false, 20),
  ('feeding_boarding', 'Kitchen equipment', false, 30),
  ('health_medical', 'Medical supplies', false, 10),
  ('health_medical', 'First aid & health services', false, 20),
  ('transport', 'Fuel', false, 10),
  ('transport', 'Vehicle repairs', false, 20),
  ('transport', 'Driver & transport staff salaries', true, 30),
  ('security', 'Security services', false, 10),
  ('security', 'Security equipment', false, 20),
  ('cocurricular', 'Sports & clubs', false, 10),
  ('cocurricular', 'Events & trips', false, 20),
  ('ict_technology', 'Hardware & devices', false, 10),
  ('ict_technology', 'Software & licences', false, 20),
  ('financial_compliance', 'Taxes & statutory fees', false, 10),
  ('financial_compliance', 'Licences & permits', false, 20),
  ('student_welfare', 'Scholarships & support', false, 10),
  ('marketing_admissions', 'Advertising & outreach', false, 10),
  ('religious_moral', 'Religious & moral programmes', false, 10)
ON CONFLICT (main_category_code, name) DO NOTHING;

-- 3) Per-school subcategories
CREATE TABLE IF NOT EXISTS public.expense_subcategories (
  subcategory_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools (school_id) ON DELETE CASCADE,
  main_category_code TEXT NOT NULL REFERENCES public.expense_main_categories (code) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  is_salary BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (school_id, main_category_code, name)
);

CREATE INDEX IF NOT EXISTS idx_expense_subcategories_school_main
  ON public.expense_subcategories (school_id, main_category_code);

-- 4) Extend school_expenses
ALTER TABLE public.school_expenses
  ADD COLUMN IF NOT EXISTS subcategory_id UUID REFERENCES public.expense_subcategories (subcategory_id) ON DELETE SET NULL;

ALTER TABLE public.school_expenses
  ADD COLUMN IF NOT EXISTS salary_period_label TEXT;

CREATE INDEX IF NOT EXISTS idx_school_expenses_subcategory ON public.school_expenses (subcategory_id)
  WHERE subcategory_id IS NOT NULL;

COMMENT ON COLUMN public.school_expenses.subcategory_id IS 'Preferred categorization: main + sub hierarchy.';
COMMENT ON COLUMN public.school_expenses.salary_period_label IS 'e.g. January 2026 — for salary expense lines.';

-- 5) Seed subcategories for every existing school (idempotent)
INSERT INTO public.expense_subcategories (school_id, main_category_code, name, is_salary, sort_order)
SELECT s.school_id, d.main_category_code, d.name, d.is_salary, d.sort_order
FROM public.schools s
CROSS JOIN public.expense_subcategory_defaults d
ON CONFLICT (school_id, main_category_code, name) DO NOTHING;

-- 6) New schools: copy defaults when a school row is inserted
CREATE OR REPLACE FUNCTION public.seed_expense_subcategories_for_school(p_school_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.expense_subcategories (school_id, main_category_code, name, is_salary, sort_order)
  SELECT p_school_id, d.main_category_code, d.name, d.is_salary, d.sort_order
  FROM public.expense_subcategory_defaults d
  ON CONFLICT (school_id, main_category_code, name) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_schools_seed_expense_subcategories()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_expense_subcategories_for_school(NEW.school_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS schools_after_insert_expense_subcategories ON public.schools;
CREATE TRIGGER schools_after_insert_expense_subcategories
  AFTER INSERT ON public.schools
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_schools_seed_expense_subcategories();

-- 7) RLS
ALTER TABLE public.expense_main_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_subcategory_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_subcategories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "expense_main_categories_read_all" ON public.expense_main_categories;
CREATE POLICY "expense_main_categories_read_all"
  ON public.expense_main_categories FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "expense_subcategory_defaults_read_all" ON public.expense_subcategory_defaults;
CREATE POLICY "expense_subcategory_defaults_read_all"
  ON public.expense_subcategory_defaults FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "expense_subcategories_select_school" ON public.expense_subcategories;
CREATE POLICY "expense_subcategories_select_school"
  ON public.expense_subcategories FOR SELECT TO authenticated
  USING (
    school_id IN (SELECT u.school_id FROM public.users u WHERE u.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "expense_subcategories_admin_write" ON public.expense_subcategories;
CREATE POLICY "expense_subcategories_admin_write"
  ON public.expense_subcategories FOR ALL TO authenticated
  USING (
    school_id IN (SELECT s.school_id FROM public.schools s WHERE s.admin_id = auth.uid())
  )
  WITH CHECK (
    school_id IN (SELECT s.school_id FROM public.schools s WHERE s.admin_id = auth.uid())
  );

COMMENT ON TABLE public.expense_subcategories IS 'Per-school subcategories under expense_main_categories; seeded from expense_subcategory_defaults.';
