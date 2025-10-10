-- ============================================================================
-- EXPENSE TRACKING SYSTEM
-- Track school expenses with approval workflow
-- ============================================================================

-- 1. CREATE EXPENSE_CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS expense_categories (
  category_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(school_id) ON DELETE CASCADE NOT NULL,
  category_name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(school_id, category_name)
);

-- Insert default expense categories
INSERT INTO expense_categories (school_id, category_name, description)
SELECT DISTINCT 
  school_id,
  category_name,
  description
FROM (
  SELECT school_id FROM schools
) schools
CROSS JOIN (
  VALUES 
    ('Teachers Salary', 'Payment to teaching staff'),
    ('Non-Teaching Staff Salary', 'Payment to support staff'),
    ('Utilities', 'Electricity, water, internet bills'),
    ('Food & Catering', 'School meals and kitchen supplies'),
    ('Maintenance & Repairs', 'Building and equipment maintenance'),
    ('Transport', 'School transport and fuel costs'),
    ('Stationery & Supplies', 'Office and classroom supplies'),
    ('Textbooks & Learning Materials', 'Educational materials'),
    ('Events & Activities', 'School events, sports, trips'),
    ('Medical & Health', 'First aid, health services'),
    ('Security', 'Security services and equipment'),
    ('Marketing & Advertising', 'Promotional activities'),
    ('Insurance', 'School insurance premiums'),
    ('Licenses & Permits', 'Government fees and licenses'),
    ('Other', 'Miscellaneous expenses')
) AS categories(category_name, description)
ON CONFLICT (school_id, category_name) DO NOTHING;

-- 2. CREATE SCHOOL_EXPENSES TABLE
CREATE TABLE IF NOT EXISTS school_expenses (
  expense_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(school_id) ON DELETE CASCADE NOT NULL,
  term_id UUID REFERENCES school_terms(id) ON DELETE CASCADE,
  category_id UUID REFERENCES expense_categories(category_id) ON DELETE SET NULL,
  category_name TEXT NOT NULL, -- Denormalized for easier querying
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  payment_method TEXT CHECK (payment_method IN ('cash', 'bank', 'mobile_money', 'cheque', 'other')),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_number TEXT UNIQUE,
  receipt_attachment TEXT, -- URL to uploaded receipt/invoice
  
  -- Approval workflow
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  recorded_by UUID REFERENCES users(user_id) NOT NULL,
  approved_by UUID REFERENCES users(user_id),
  approved_at TIMESTAMP,
  approval_notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. CREATE INDEXES
CREATE INDEX IF NOT EXISTS idx_school_expenses_school ON school_expenses(school_id);
CREATE INDEX IF NOT EXISTS idx_school_expenses_term ON school_expenses(term_id);
CREATE INDEX IF NOT EXISTS idx_school_expenses_category ON school_expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_school_expenses_status ON school_expenses(status);
CREATE INDEX IF NOT EXISTS idx_school_expenses_date ON school_expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_school_expenses_recorded_by ON school_expenses(recorded_by);

-- 4. FUNCTION TO AUTO-GENERATE EXPENSE REFERENCE NUMBER
CREATE OR REPLACE FUNCTION generate_expense_reference(
  p_school_id UUID,
  p_expense_date DATE,
  p_category_name TEXT
) RETURNS TEXT AS $$
DECLARE
  v_school_abbr TEXT;
  v_year TEXT;
  v_month TEXT;
  v_category_code TEXT;
  v_sequence INT;
  v_number TEXT;
BEGIN
  -- Get school abbreviation
  SELECT UPPER(SUBSTRING(name FROM 1 FOR 3))
  INTO v_school_abbr
  FROM schools
  WHERE school_id = p_school_id;
  
  IF v_school_abbr IS NULL OR LENGTH(v_school_abbr) < 2 THEN
    v_school_abbr := 'SCH';
  END IF;
  
  -- Extract year and month
  v_year := TO_CHAR(p_expense_date, 'YYYY');
  v_month := TO_CHAR(p_expense_date, 'MM');
  
  -- Generate category code (first 2-3 letters)
  v_category_code := UPPER(SUBSTRING(REPLACE(p_category_name, ' ', '') FROM 1 FOR 3));
  
  -- Get next sequence number for this school and date
  SELECT COALESCE(MAX(
    CASE 
      WHEN reference_number ~ ('^EXP-' || v_school_abbr || '-' || v_year || v_month || '-[0-9]+$')
      THEN CAST(SUBSTRING(reference_number FROM '[0-9]+$') AS INT)
      ELSE 0
    END
  ), 0) + 1
  INTO v_sequence
  FROM school_expenses
  WHERE school_id = p_school_id;
  
  -- Format: EXP-SCHOOL-YYYYMM-NNN
  v_number := LPAD(v_sequence::TEXT, 3, '0');
  RETURN 'EXP-' || v_school_abbr || '-' || v_year || v_month || '-' || v_number;
END;
$$ LANGUAGE plpgsql;

-- 5. TRIGGER TO AUTO-UPDATE UPDATED_AT
CREATE OR REPLACE FUNCTION update_expense_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_expense_timestamp ON school_expenses;
CREATE TRIGGER trigger_update_expense_timestamp
  BEFORE UPDATE ON school_expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_expense_timestamp();

-- 6. ROW LEVEL SECURITY POLICIES
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_expenses ENABLE ROW LEVEL SECURITY;

-- EXPENSE_CATEGORIES POLICIES
CREATE POLICY "expense_categories_school_users_select" ON expense_categories
FOR SELECT TO authenticated
USING (school_id IN (SELECT u.school_id FROM users u WHERE u.user_id = auth.uid()));

CREATE POLICY "expense_categories_admin_all" ON expense_categories
FOR ALL TO authenticated
USING (school_id IN (SELECT school_id FROM schools WHERE admin_id = auth.uid()))
WITH CHECK (school_id IN (SELECT school_id FROM schools WHERE admin_id = auth.uid()));

-- SCHOOL_EXPENSES POLICIES
-- Accountant can insert and view all expenses
CREATE POLICY "school_expenses_accountant_insert" ON school_expenses
FOR INSERT TO authenticated
WITH CHECK (
  school_id IN (SELECT u.school_id FROM users u WHERE u.user_id = auth.uid() AND u.role IN ('accountant', 'admin'))
);

CREATE POLICY "school_expenses_accountant_select" ON school_expenses
FOR SELECT TO authenticated
USING (
  school_id IN (SELECT u.school_id FROM users u WHERE u.user_id = auth.uid() AND u.role IN ('accountant', 'admin', 'head_teacher'))
);

-- Admin/Head Teacher can approve/reject (update)
CREATE POLICY "school_expenses_admin_update" ON school_expenses
FOR UPDATE TO authenticated
USING (
  school_id IN (SELECT u.school_id FROM users u WHERE u.user_id = auth.uid() AND u.role IN ('admin', 'head_teacher'))
)
WITH CHECK (
  school_id IN (SELECT u.school_id FROM users u WHERE u.user_id = auth.uid() AND u.role IN ('admin', 'head_teacher'))
);

-- Admin can delete
CREATE POLICY "school_expenses_admin_delete" ON school_expenses
FOR DELETE TO authenticated
USING (
  school_id IN (SELECT school_id FROM schools WHERE admin_id = auth.uid())
);

-- Owner can see all
CREATE POLICY "school_expenses_owner_all" ON school_expenses
FOR ALL TO authenticated
USING ((SELECT role FROM users WHERE user_id = auth.uid()) = 'owner');

-- 7. HELPFUL VIEWS
-- View for expense summary by category
CREATE OR REPLACE VIEW v_expense_summary_by_category AS
SELECT 
  e.school_id,
  e.term_id,
  e.category_name,
  COUNT(e.expense_id) as expense_count,
  SUM(CASE WHEN e.status = 'approved' OR e.status = 'paid' THEN e.amount ELSE 0 END) as approved_amount,
  SUM(CASE WHEN e.status = 'pending' THEN e.amount ELSE 0 END) as pending_amount,
  SUM(CASE WHEN e.status = 'rejected' THEN e.amount ELSE 0 END) as rejected_amount,
  SUM(e.amount) as total_amount
FROM school_expenses e
GROUP BY e.school_id, e.term_id, e.category_name;

-- View for pending approvals
CREATE OR REPLACE VIEW v_pending_expense_approvals AS
SELECT 
  e.expense_id,
  e.school_id,
  e.category_name,
  e.description,
  e.amount,
  e.expense_date,
  e.reference_number,
  e.recorded_by,
  u.name as recorded_by_name,
  e.created_at
FROM school_expenses e
JOIN users u ON e.recorded_by = u.user_id
WHERE e.status = 'pending'
ORDER BY e.created_at DESC;

-- ============================================================================
-- COMPLETE
-- ============================================================================

COMMENT ON TABLE expense_categories IS 'Expense categories for school expenses';
COMMENT ON TABLE school_expenses IS 'School expense records with approval workflow';
COMMENT ON FUNCTION generate_expense_reference IS 'Auto-generates expense reference numbers';

