-- =============================================================================
-- Migration: Seed Expense Hierarchy & Subcategories for RCSN
-- Resolves: "Hierarchy not seeded for this school — using legacy categories."
-- =============================================================================

-- 1. Seed Main Categories
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

-- 2. Seed Default Subcategories Templates
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

-- 3. Seed Per-School Subcategories for all registered schools
INSERT INTO public.expense_subcategories (school_id, main_category_code, name, is_salary, sort_order)
SELECT s.school_id, d.main_category_code, d.name, d.is_salary, d.sort_order
FROM public.schools s
CROSS JOIN public.expense_subcategory_defaults d
ON CONFLICT (school_id, main_category_code, name) DO NOTHING;
