-- Sample Test Data for Accountant Dashboard
-- Run this in Supabase SQL Editor to populate test data

-- NOTE: Replace 'YOUR_SCHOOL_ID_HERE' with your actual school_id
-- You can find it by running: SELECT school_id, name FROM schools;

-- Set your school_id here
DO $$
DECLARE
  v_school_id UUID := 'YOUR_SCHOOL_ID_HERE'; -- REPLACE THIS!
  v_student1_id UUID := uuid_generate_v4();
  v_student2_id UUID := uuid_generate_v4();
  v_student3_id UUID := uuid_generate_v4();
BEGIN

  -- 1. Create a current term (if not exists)
  INSERT INTO school_terms (school_id, year, term, start_date, end_date)
  VALUES (
    v_school_id,
    2025,
    1,
    '2025-01-15',
    '2025-04-15'
  )
  ON CONFLICT (school_id, year, term) DO NOTHING;

  -- 2. Create or update sample students with expected fees
  INSERT INTO students (student_id, school_id, name, current_class, status, expected_fee_amount, admission_number)
  VALUES 
    (v_student1_id, v_school_id, 'John Doe', 'Primary 5', 'active', 1500000, 'STU001'),
    (v_student2_id, v_school_id, 'Jane Smith', 'Primary 6', 'active', 1500000, 'STU002'),
    (v_student3_id, v_school_id, 'Bob Johnson', 'Primary 4', 'active', 1200000, 'STU003')
  ON CONFLICT (student_id) DO UPDATE
  SET expected_fee_amount = EXCLUDED.expected_fee_amount;

  -- 3. Create sample payments (some today, some in the term, some fully paid)
  
  -- Payments made today
  INSERT INTO payments (student_id, school_id, amount, payment_method, description, created_at)
  VALUES 
    (v_student1_id, v_school_id, 500000, 'cash', 'First term payment', NOW()),
    (v_student2_id, v_school_id, 300000, 'mobile_money', 'Partial payment', NOW());

  -- Payments made earlier this term
  INSERT INTO payments (student_id, school_id, amount, payment_method, description, created_at)
  VALUES 
    (v_student1_id, v_school_id, 400000, 'bank', 'Second installment', '2025-02-15 10:30:00'),
    (v_student2_id, v_school_id, 700000, 'cash', 'Large payment', '2025-02-20 14:00:00'),
    (v_student3_id, v_school_id, 1200000, 'bank', 'Full payment', '2025-03-01 09:00:00');

  -- Payments from previous term (for comparison)
  INSERT INTO payments (student_id, school_id, amount, payment_method, description, created_at)
  VALUES 
    (v_student1_id, v_school_id, 200000, 'cash', 'Late payment from term 3', '2024-12-15 10:00:00');

  RAISE NOTICE 'Test data created successfully!';
  RAISE NOTICE 'Student 1 (John): Expected: 1,500,000 | Paid: 1,100,000 | Balance: 400,000';
  RAISE NOTICE 'Student 2 (Jane): Expected: 1,500,000 | Paid: 1,000,000 | Balance: 500,000';
  RAISE NOTICE 'Student 3 (Bob): Expected: 1,200,000 | Paid: 1,200,000 | Balance: 0 (FULLY PAID)';
  RAISE NOTICE '';
  RAISE NOTICE 'Expected Dashboard KPIs:';
  RAISE NOTICE '- Collected Today: 800,000 UGX (500k + 300k)';
  RAISE NOTICE '- Collected This Term: 2,800,000 UGX (all payments in term 1 2025)';
  RAISE NOTICE '- Outstanding Balances: 900,000 UGX (400k + 500k)';
  RAISE NOTICE '- Students with Balances: 2 (John and Jane)';

END $$;

