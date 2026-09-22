-- Migration: 20260923000002_school_store_and_inventory.sql
-- Description: School Store & Food/Kitchen Supplies Management (Inventory, Daily Consumption, Runway & Expense Linkage)

-- 1. Create table public.store_items
CREATE TABLE IF NOT EXISTS public.store_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(school_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'food_kitchen' CHECK (category IN ('food_kitchen', 'cleaning_sanitation', 'scholastic_supplies', 'general_maintenance', 'other')),
    unit_of_measure TEXT NOT NULL DEFAULT 'kg',
    current_stock NUMERIC(12,2) NOT NULL DEFAULT 0,
    min_reorder_level NUMERIC(12,2) NOT NULL DEFAULT 0,
    planned_daily_usage NUMERIC(12,2) NOT NULL DEFAULT 0,
    unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
    storage_location TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for store_items
CREATE INDEX IF NOT EXISTS idx_store_items_school_cat ON public.store_items(school_id, category);
CREATE INDEX IF NOT EXISTS idx_store_items_school_stock ON public.store_items(school_id, current_stock);

-- 2. Create table public.store_transactions
CREATE TABLE IF NOT EXISTS public.store_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(school_id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.store_items(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase_in', 'dispatch_out', 'adjustment', 'waste_spoilage')),
    quantity NUMERIC(12,2) NOT NULL,
    unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
    recipient_or_supplier TEXT,
    linked_expense_id UUID REFERENCES public.school_expenses(expense_id) ON DELETE SET NULL,
    notes TEXT,
    recorded_by UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for store_transactions
CREATE INDEX IF NOT EXISTS idx_store_transactions_school_date ON public.store_transactions(school_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_store_transactions_item ON public.store_transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_store_transactions_expense ON public.store_transactions(linked_expense_id);

-- 3. Row Level Security Policies
ALTER TABLE public.store_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_transactions ENABLE ROW LEVEL SECURITY;

-- Helper check if user belongs to the school
DROP POLICY IF EXISTS "Users can view store items for their school" ON public.store_items;
CREATE POLICY "Users can view store items for their school"
    ON public.store_items FOR SELECT
    TO authenticated
    USING (
        school_id IN (
            SELECT u.school_id FROM public.users u WHERE u.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Staff can insert store items for their school" ON public.store_items;
CREATE POLICY "Staff can insert store items for their school"
    ON public.store_items FOR INSERT
    TO authenticated
    WITH CHECK (
        school_id IN (
            SELECT u.school_id FROM public.users u WHERE u.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Staff can update store items for their school" ON public.store_items;
CREATE POLICY "Staff can update store items for their school"
    ON public.store_items FOR UPDATE
    TO authenticated
    USING (
        school_id IN (
            SELECT u.school_id FROM public.users u WHERE u.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Staff can delete store items for their school" ON public.store_items;
CREATE POLICY "Staff can delete store items for their school"
    ON public.store_items FOR DELETE
    TO authenticated
    USING (
        school_id IN (
            SELECT u.school_id FROM public.users u WHERE u.user_id = auth.uid()
        )
    );

-- Transactions RLS
DROP POLICY IF EXISTS "Users can view store transactions for their school" ON public.store_transactions;
CREATE POLICY "Users can view store transactions for their school"
    ON public.store_transactions FOR SELECT
    TO authenticated
    USING (
        school_id IN (
            SELECT u.school_id FROM public.users u WHERE u.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Staff can insert store transactions for their school" ON public.store_transactions;
CREATE POLICY "Staff can insert store transactions for their school"
    ON public.store_transactions FOR INSERT
    TO authenticated
    WITH CHECK (
        school_id IN (
            SELECT u.school_id FROM public.users u WHERE u.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Staff can update store transactions for their school" ON public.store_transactions;
CREATE POLICY "Staff can update store transactions for their school"
    ON public.store_transactions FOR UPDATE
    TO authenticated
    USING (
        school_id IN (
            SELECT u.school_id FROM public.users u WHERE u.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Staff can delete store transactions for their school" ON public.store_transactions;
CREATE POLICY "Staff can delete store transactions for their school"
    ON public.store_transactions FOR DELETE
    TO authenticated
    USING (
        school_id IN (
            SELECT u.school_id FROM public.users u WHERE u.user_id = auth.uid()
        )
    );
