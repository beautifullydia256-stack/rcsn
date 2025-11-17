-- Check the current state of fee data in the database
-- Run these commands in your Supabase SQL editor

-- 1. Check fee structure
SELECT 
    class_name,
    tuition_amount,
    boarding_tuition_amount,
    school_id
FROM school_fee_structure 
WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
ORDER BY class_name;

-- 2. Check students and their expected fees
SELECT 
    student_id,
    name,
    current_class,
    boarding_type,
    expected_fee_amount,
    status
FROM students 
WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
AND status = 'active'
ORDER BY name;

-- 3. Check payments
SELECT 
    payment_id,
    student_id,
    amount,
    status,
    created_at
FROM payments 
WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
ORDER BY created_at DESC;

-- 4. Calculate outstanding balances (same logic as the app)
WITH student_payments AS (
    SELECT 
        student_id,
        SUM(amount) as total_paid
    FROM payments 
    WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
    AND status = 'Approved'
    GROUP BY student_id
)
SELECT 
    s.student_id,
    s.name,
    s.current_class,
    s.boarding_type,
    s.expected_fee_amount,
    COALESCE(sp.total_paid, 0) as amount_paid,
    GREATEST(0, s.expected_fee_amount - COALESCE(sp.total_paid, 0)) as balance,
    (s.expected_fee_amount > COALESCE(sp.total_paid, 0)) as has_pending
FROM students s
LEFT JOIN student_payments sp ON s.student_id = sp.student_id
WHERE s.school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
AND s.status = 'active'
ORDER BY s.name;
