-- ============================================================================
-- PWEZACORE ACCOUNTING SYSTEM REDESIGN
-- Multi-payment support with automatic balance tracking per term
-- ============================================================================

-- 1. CREATE CLASSES TABLE
-- Holds class information and official term fees
CREATE TABLE IF NOT EXISTS classes (
  class_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(school_id) ON DELETE CASCADE NOT NULL,
  class_name TEXT NOT NULL,
  total_fees NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(school_id, class_name)
);

-- 2. UPDATE SCHOOL_TERMS TABLE (if needed)
-- Already exists, but ensure it has what we need
ALTER TABLE school_terms 
  ADD COLUMN IF NOT EXISTS academic_year TEXT;

-- Update academic_year based on year if NULL
UPDATE school_terms 
SET academic_year = year::TEXT 
WHERE academic_year IS NULL;

-- 3. CREATE STUDENT_PAYMENTS TABLE
-- Stores every individual payment made by a student
CREATE TABLE IF NOT EXISTS student_payments (
  payment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(student_id) ON DELETE CASCADE NOT NULL,
  school_id UUID REFERENCES schools(school_id) ON DELETE CASCADE NOT NULL,
  term_id UUID REFERENCES school_terms(id) ON DELETE CASCADE NOT NULL,
  class_id UUID REFERENCES classes(class_id) ON DELETE SET NULL,
  amount_paid NUMERIC(10,2) NOT NULL CHECK (amount_paid > 0),
  payment_method TEXT CHECK (payment_method IN ('cash', 'bank', 'mobile_money', 'cheque', 'other')),
  transaction_ref TEXT,
  payment_date DATE DEFAULT CURRENT_DATE,
  recorded_by UUID REFERENCES users(user_id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. CREATE STUDENT_BALANCES TABLE
-- Automatically tracks totals per student per term
CREATE TABLE IF NOT EXISTS student_balances (
  balance_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(student_id) ON DELETE CASCADE NOT NULL,
  school_id UUID REFERENCES schools(school_id) ON DELETE CASCADE NOT NULL,
  term_id UUID REFERENCES school_terms(id) ON DELETE CASCADE NOT NULL,
  class_id UUID REFERENCES classes(class_id) ON DELETE SET NULL,
  total_fees NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_paid NUMERIC(10,2) DEFAULT 0,
  balance NUMERIC(10,2) GENERATED ALWAYS AS (total_fees - total_paid) STORED,
  last_payment_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, term_id)
);

-- 5. ADD CLASS_ID TO STUDENTS TABLE (if not exists)
ALTER TABLE students 
  ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(class_id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_student_payments_student_term ON student_payments(student_id, term_id);
CREATE INDEX IF NOT EXISTS idx_student_payments_school ON student_payments(school_id);
CREATE INDEX IF NOT EXISTS idx_student_balances_student_term ON student_balances(student_id, term_id);
CREATE INDEX IF NOT EXISTS idx_student_balances_school ON student_balances(school_id);
CREATE INDEX IF NOT EXISTS idx_classes_school ON classes(school_id);

-- ============================================================================
-- TRIGGER FUNCTION: Auto-update student_balances when payment is added
-- ============================================================================

CREATE OR REPLACE FUNCTION update_student_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_total_paid NUMERIC(10,2);
  v_total_fees NUMERIC(10,2);
  v_class_id UUID;
BEGIN
  -- Get the student's class and expected fees
  SELECT s.class_id INTO v_class_id
  FROM students s
  WHERE s.student_id = NEW.student_id;

  -- Get total fees from class
  SELECT c.total_fees INTO v_total_fees
  FROM classes c
  WHERE c.class_id = v_class_id;

  -- If no class fees set, try to get from student's expected_fee_amount
  IF v_total_fees IS NULL THEN
    SELECT s.expected_fee_amount INTO v_total_fees
    FROM students s
    WHERE s.student_id = NEW.student_id;
  END IF;

  -- Calculate total paid for this student and term
  SELECT COALESCE(SUM(amount_paid), 0) INTO v_total_paid
  FROM student_payments
  WHERE student_id = NEW.student_id 
    AND term_id = NEW.term_id;

  -- Upsert student_balances
  INSERT INTO student_balances (
    student_id, 
    school_id, 
    term_id, 
    class_id, 
    total_fees, 
    total_paid, 
    last_payment_date,
    updated_at
  )
  VALUES (
    NEW.student_id,
    NEW.school_id,
    NEW.term_id,
    v_class_id,
    COALESCE(v_total_fees, 0),
    v_total_paid,
    NEW.payment_date,
    NOW()
  )
  ON CONFLICT (student_id, term_id)
  DO UPDATE SET
    total_paid = v_total_paid,
    last_payment_date = NEW.payment_date,
    updated_at = NOW(),
    class_id = v_class_id,
    total_fees = COALESCE(v_total_fees, student_balances.total_fees);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on student_payments
DROP TRIGGER IF EXISTS trigger_update_student_balance ON student_payments;
CREATE TRIGGER trigger_update_student_balance
  AFTER INSERT OR UPDATE ON student_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_student_balance();

-- ============================================================================
-- DATA MIGRATION: Migrate existing payments to new structure
-- ============================================================================

-- Note: This assumes you have a current term set up
-- You may need to adjust this based on your data

-- Create default classes from existing student current_class values
INSERT INTO classes (school_id, class_name, total_fees)
SELECT DISTINCT 
  s.school_id,
  s.current_class,
  COALESCE(MAX(s.expected_fee_amount), 0)
FROM students s
WHERE s.current_class IS NOT NULL 
  AND s.current_class != ''
GROUP BY s.school_id, s.current_class
ON CONFLICT (school_id, class_name) DO NOTHING;

-- Update students.class_id based on current_class name
UPDATE students s
SET class_id = c.class_id
FROM classes c
WHERE s.current_class = c.class_name 
  AND s.school_id = c.school_id
  AND s.class_id IS NULL;

-- Migrate existing payments to student_payments (if payments table has data)
-- Only migrate if we have a current term
DO $$
DECLARE
  v_current_term_id UUID;
BEGIN
  -- Get the most recent term for each school
  FOR v_current_term_id IN 
    SELECT DISTINCT ON (school_id) id 
    FROM school_terms 
    ORDER BY school_id, year DESC, term DESC
  LOOP
    -- Migrate payments for this term
    INSERT INTO student_payments (
      student_id,
      school_id,
      term_id,
      class_id,
      amount_paid,
      payment_method,
      transaction_ref,
      payment_date,
      notes,
      created_at
    )
    SELECT 
      p.student_id,
      p.school_id,
      v_current_term_id,
      s.class_id,
      p.amount,
      p.payment_method,
      p.payment_id::TEXT,
      p.created_at::DATE,
      p.description,
      p.created_at
    FROM payments p
    JOIN students s ON p.student_id = s.student_id
    WHERE p.school_id IN (SELECT school_id FROM school_terms WHERE id = v_current_term_id)
      AND NOT EXISTS (
        SELECT 1 FROM student_payments sp 
        WHERE sp.student_id = p.student_id 
          AND sp.transaction_ref = p.payment_id::TEXT
      );
  END LOOP;
END $$;

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_balances ENABLE ROW LEVEL SECURITY;

-- CLASSES POLICIES
CREATE POLICY "classes_admin_all" ON classes
FOR ALL TO authenticated
USING (school_id IN (SELECT school_id FROM schools WHERE admin_id = auth.uid()))
WITH CHECK (school_id IN (SELECT school_id FROM schools WHERE admin_id = auth.uid()));

CREATE POLICY "classes_accountant_select" ON classes
FOR SELECT TO authenticated
USING (school_id IN (SELECT u.school_id FROM users u WHERE u.user_id = auth.uid() AND u.role = 'accountant'));

CREATE POLICY "classes_owner_all" ON classes
FOR ALL TO authenticated
USING ((SELECT role FROM users WHERE user_id = auth.uid()) = 'owner');

-- STUDENT_PAYMENTS POLICIES
CREATE POLICY "student_payments_admin_all" ON student_payments
FOR ALL TO authenticated
USING (school_id IN (SELECT school_id FROM schools WHERE admin_id = auth.uid()))
WITH CHECK (school_id IN (SELECT school_id FROM schools WHERE admin_id = auth.uid()));

CREATE POLICY "student_payments_accountant_all" ON student_payments
FOR ALL TO authenticated
USING (school_id IN (SELECT u.school_id FROM users u WHERE u.user_id = auth.uid() AND u.role = 'accountant'))
WITH CHECK (school_id IN (SELECT u.school_id FROM users u WHERE u.user_id = auth.uid() AND u.role = 'accountant'));

CREATE POLICY "student_payments_parent_select" ON student_payments
FOR SELECT TO authenticated
USING (student_id IN (SELECT p.student_id FROM parents p WHERE p.parent_id = auth.uid()));

CREATE POLICY "student_payments_owner_all" ON student_payments
FOR ALL TO authenticated
USING ((SELECT role FROM users WHERE user_id = auth.uid()) = 'owner');

-- STUDENT_BALANCES POLICIES
CREATE POLICY "student_balances_admin_select" ON student_balances
FOR SELECT TO authenticated
USING (school_id IN (SELECT school_id FROM schools WHERE admin_id = auth.uid()));

CREATE POLICY "student_balances_accountant_select" ON student_balances
FOR SELECT TO authenticated
USING (school_id IN (SELECT u.school_id FROM users u WHERE u.user_id = auth.uid() AND u.role = 'accountant'));

CREATE POLICY "student_balances_parent_select" ON student_balances
FOR SELECT TO authenticated
USING (student_id IN (SELECT p.student_id FROM parents p WHERE p.parent_id = auth.uid()));

CREATE POLICY "student_balances_student_select" ON student_balances
FOR SELECT TO authenticated
USING (student_id IN (SELECT u.student_id FROM users u WHERE u.user_id = auth.uid() AND u.role = 'student'));

CREATE POLICY "student_balances_owner_all" ON student_balances
FOR ALL TO authenticated
USING ((SELECT role FROM users WHERE user_id = auth.uid()) = 'owner');

-- ============================================================================
-- HELPER VIEWS (Optional but useful)
-- ============================================================================

-- View for easy balance checking
CREATE OR REPLACE VIEW v_student_balances_summary AS
SELECT 
  sb.balance_id,
  s.student_id,
  s.name AS student_name,
  s.admission_number,
  c.class_name,
  st.year,
  st.term,
  st.academic_year,
  sb.total_fees,
  sb.total_paid,
  sb.balance,
  sb.last_payment_date,
  CASE 
    WHEN sb.balance <= 0 THEN 'Fully Paid'
    WHEN sb.total_paid = 0 THEN 'Not Paid'
    ELSE 'Partial'
  END AS payment_status
FROM student_balances sb
JOIN students s ON sb.student_id = s.student_id
LEFT JOIN classes c ON sb.class_id = c.class_id
LEFT JOIN school_terms st ON sb.term_id = st.id
ORDER BY s.name, st.year DESC, st.term DESC;

-- ============================================================================
-- COMPLETE
-- ============================================================================

COMMENT ON TABLE classes IS 'Class information with official term fees per school';
COMMENT ON TABLE student_payments IS 'Individual payment records for each student per term';
COMMENT ON TABLE student_balances IS 'Automatically calculated balance summary per student per term';
COMMENT ON TRIGGER trigger_update_student_balance ON student_payments IS 'Auto-updates student_balances when payment is added';

