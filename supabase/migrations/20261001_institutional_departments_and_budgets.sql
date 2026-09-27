-- ============================================================================
-- PwezaCore Migration: Institutional Departments, Stores & Budget Governance
-- Creates tables for Custom Departments, Staff Assignments, Stores & Daily Indents,
-- Multi-Tier Requisitions, and Multi-Admin Quorum Approvals.
-- ============================================================================

-- 1. School Departments Table (Defaults + Custom)
CREATE TABLE IF NOT EXISTS public.school_departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(school_id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT 'Folder',
    is_starter BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    budget_code TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(school_id, code)
);

CREATE INDEX IF NOT EXISTS idx_school_departments_school ON public.school_departments(school_id);

-- 2. Staff Department Portfolio Assignments
CREATE TABLE IF NOT EXISTS public.staff_department_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(school_id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    department_id UUID NOT NULL REFERENCES public.school_departments(id) ON DELETE CASCADE,
    role_in_department TEXT DEFAULT 'manager', -- 'manager', 'assistant', 'member'
    can_requisition BOOLEAN DEFAULT true,
    can_approve_dept BOOLEAN DEFAULT false,
    assigned_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(school_id, user_id, department_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_dept_assignments_user ON public.staff_department_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_dept_assignments_school ON public.staff_department_assignments(school_id);

-- 3. Flexible Store Items
CREATE TABLE IF NOT EXISTS public.store_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(school_id) ON DELETE CASCADE,
    department_id UUID REFERENCES public.school_departments(id) ON DELETE SET NULL,
    item_code TEXT,
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- 'food_kitchen', 'clinical_reagent', 'medical_consumable', 'ict_hardware', 'stationery', 'general'
    unit_of_measure TEXT NOT NULL, -- 'kg', 'liters', 'pieces', 'boxes', 'reams', 'vials', 'sets', 'bags_50kg'
    current_stock NUMERIC(12, 2) DEFAULT 0,
    min_reorder_level NUMERIC(12, 2) DEFAULT 10,
    unit_cost NUMERIC(14, 2) DEFAULT 0,
    storage_location TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_items_school ON public.store_items(school_id);

-- 4. Daily Store Indents & Physical Issuance Logs
CREATE TABLE IF NOT EXISTS public.store_daily_indents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(school_id) ON DELETE CASCADE,
    department_id UUID REFERENCES public.school_departments(id),
    requested_for_date DATE NOT NULL,
    requisition_number TEXT NOT NULL,
    requested_by UUID NOT NULL,
    issued_by UUID,
    target_headcount INTEGER,
    status TEXT DEFAULT 'pending', -- 'pending', 'issued', 'partially_issued', 'rejected'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    issued_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_store_daily_indents_school_date ON public.store_daily_indents(school_id, requested_for_date);

-- 5. Daily Indent Line Items
CREATE TABLE IF NOT EXISTS public.store_daily_indent_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    indent_id UUID NOT NULL REFERENCES public.store_daily_indents(id) ON DELETE CASCADE,
    store_item_id UUID NOT NULL REFERENCES public.store_items(id),
    quantity_requested NUMERIC(12, 2) NOT NULL,
    quantity_issued NUMERIC(12, 2) DEFAULT 0,
    unit_of_measure TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Department Monthly Budget Requisition Header
CREATE TABLE IF NOT EXISTS public.budget_requisitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(school_id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES public.school_departments(id),
    requisition_number TEXT UNIQUE NOT NULL,
    budget_month DATE NOT NULL,
    is_supplementary BOOLEAN DEFAULT false,
    supplementary_reason TEXT,
    total_amount NUMERIC(14, 2) DEFAULT 0,
    status TEXT DEFAULT 'draft',
    created_by UUID NOT NULL,
    tier1_reviewed_by UUID,
    tier1_reviewed_at TIMESTAMPTZ,
    tier1_notes TEXT,
    tier2_reviewed_by UUID,
    tier2_reviewed_at TIMESTAMPTZ,
    tier2_notes TEXT,
    admin_accepted_by UUID,
    admin_accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_budget_req_school_month ON public.budget_requisitions(school_id, budget_month);

-- 7. Budget Requisition Line Items
CREATE TABLE IF NOT EXISTS public.budget_requisition_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requisition_id UUID NOT NULL REFERENCES public.budget_requisitions(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    category TEXT NOT NULL,
    unit_of_measure TEXT NOT NULL,
    quantity_requested NUMERIC(12, 2) NOT NULL,
    estimated_unit_cost NUMERIC(14, 2) NOT NULL,
    total_estimated_cost NUMERIC(14, 2) GENERATED ALWAYS AS (quantity_requested * estimated_unit_cost) STORED,
    justification TEXT,
    supplier_quote_ref TEXT,
    admin_adjusted_quantity NUMERIC(12, 2),
    admin_adjusted_unit_cost NUMERIC(14, 2),
    is_accepted BOOLEAN DEFAULT true,
    query_thread JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Consolidated Monthly Institutional Budget
CREATE TABLE IF NOT EXISTS public.monthly_consolidated_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(school_id) ON DELETE CASCADE,
    budget_month DATE NOT NULL,
    total_inflow_projected NUMERIC(14, 2) DEFAULT 0,
    total_budget_requested NUMERIC(14, 2) DEFAULT 0,
    total_budget_approved NUMERIC(14, 2) DEFAULT 0,
    status TEXT DEFAULT 'proposed',
    required_admin_approvals INTEGER DEFAULT 3,
    current_approval_count INTEGER DEFAULT 0,
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(school_id, budget_month)
);

-- 9. Multi-Admin Quorum Approvals
CREATE TABLE IF NOT EXISTS public.budget_admin_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consolidated_budget_id UUID NOT NULL REFERENCES public.monthly_consolidated_budgets(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.schools(school_id) ON DELETE CASCADE,
    admin_user_id UUID NOT NULL,
    admin_name TEXT NOT NULL,
    admin_title TEXT,
    approved_at TIMESTAMPTZ DEFAULT now(),
    digital_signature_hash TEXT NOT NULL,
    comments TEXT,
    UNIQUE(consolidated_budget_id, admin_user_id)
);

-- Helper Function: Seed Starter Departments for a School
CREATE OR REPLACE FUNCTION public.seed_school_starter_departments(p_school_id UUID)
RETURNS void AS $$
BEGIN
    INSERT INTO public.school_departments (school_id, code, name, description, icon, is_starter, budget_code)
    VALUES
        (p_school_id, 'DEPT_KITCHEN_STORES', 'Stores & Kitchen Management', 'Central food storage, student catering, consumables and cleaning supplies', 'Utensils', true, 'BDG-STR-01'),
        (p_school_id, 'DEPT_SKILLS_LAB', 'Science & Clinical Skills Lab', 'Clinical simulation laboratory, anatomical models, reagents, needles & clinical equipment', 'FlaskConical', true, 'BDG-LAB-02'),
        (p_school_id, 'DEPT_ICT_LAB', 'Computer Laboratory & ICT', 'Computer lab hardware, network infrastructure, software licenses and accessories', 'Monitor', true, 'BDG-ICT-03'),
        (p_school_id, 'DEPT_LIBRARY', 'Library & Academic Resources', 'Books, nursing references, medical journals and cataloging materials', 'BookOpen', true, 'BDG-LIB-04'),
        (p_school_id, 'DEPT_CLINIC', 'Health Services & Sickbay', 'Student medical clinic, emergency first aid, pharmaceuticals and basic triage', 'HeartPulse', true, 'BDG-CLN-05'),
        (p_school_id, 'DEPT_ESTATES', 'Estates, Maintenance & Security', 'Compound sanitation, facility repairs, plumbing, electricals and security services', 'Wrench', true, 'BDG-EST-06'),
        (p_school_id, 'DEPT_ACADEMICS', 'Academic Affairs & Practicum', 'Curriculum, clinical ward attachment supervision, exam materials & logbooks', 'GraduationCap', true, 'BDG-ACD-07'),
        (p_school_id, 'DEPT_HR_WELFARE', 'Human Resources & Staff Welfare', 'Staff development, tutor logistics, welfare requisitions and administration', 'Users', true, 'BDG-HR-08')
    ON CONFLICT (school_id, code) DO NOTHING;
END;
$$ LANGUAGE plpgsql;
