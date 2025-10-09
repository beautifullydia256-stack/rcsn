-- ============================================================================
-- UPDATE CASH TRANSACTION REFS TO HUMAN-READABLE FORMAT
-- Format: CASH-YYYYMMDD-[ADMISSION/ID]-NN
-- ============================================================================

DO $$
DECLARE
  payment_record RECORD;
  counter INTEGER := 1;
  date_str TEXT;
  student_ref TEXT;
  final_ref TEXT;
BEGIN
  -- Update all cash payments
  FOR payment_record IN 
    SELECT 
      sp.payment_id,
      sp.payment_date,
      sp.student_id,
      s.admission_number,
      ROW_NUMBER() OVER (PARTITION BY sp.payment_date, sp.student_id ORDER BY sp.created_at) as seq_num
    FROM student_payments sp
    LEFT JOIN students s ON sp.student_id = s.student_id
    WHERE LOWER(sp.payment_method) IN ('cash', 'Cash', 'CASH')
    ORDER BY sp.payment_date, sp.created_at
  LOOP
    -- Format date as YYYYMMDD
    date_str := TO_CHAR(payment_record.payment_date, 'YYYYMMDD');
    
    -- Use admission number if available, otherwise use last 4 chars of student_id
    IF payment_record.admission_number IS NOT NULL AND payment_record.admission_number != '' THEN
      -- Clean admission number: remove special chars, take first 6, uppercase
      student_ref := UPPER(REGEXP_REPLACE(payment_record.admission_number, '[^a-zA-Z0-9]', '', 'g'));
      student_ref := SUBSTRING(student_ref, 1, 6);
    ELSE
      -- Use STU + last 4 chars of student_id
      student_ref := 'STU' || UPPER(SUBSTRING(payment_record.student_id::TEXT, LENGTH(payment_record.student_id::TEXT) - 3, 4));
    END IF;
    
    -- Generate final reference: CASH-YYYYMMDD-STUDENTREF-NN
    final_ref := 'CASH-' || date_str || '-' || student_ref || '-' || LPAD(payment_record.seq_num::TEXT, 2, '0');
    
    -- Update the payment
    UPDATE student_payments 
    SET transaction_ref = final_ref
    WHERE payment_id = payment_record.payment_id;
    
    counter := counter + 1;
  END LOOP;

  RAISE NOTICE 'Updated % cash payment(s) with human-readable transaction references', counter - 1;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- View updated cash transaction references
SELECT 
  sp.payment_method,
  sp.transaction_ref,
  s.name as student_name,
  s.admission_number,
  sp.amount_paid,
  sp.payment_date
FROM student_payments sp
LEFT JOIN students s ON sp.student_id = s.student_id
WHERE LOWER(sp.payment_method) = 'cash'
ORDER BY sp.payment_date, sp.transaction_ref;

-- Count by payment method
SELECT 
  payment_method,
  COUNT(*) as total_payments,
  COUNT(transaction_ref) as with_ref,
  COUNT(*) - COUNT(transaction_ref) as without_ref
FROM student_payments
GROUP BY payment_method
ORDER BY payment_method;

