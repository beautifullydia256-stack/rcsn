-- ============================================================================
-- AUTO-GENERATE TRANSACTION REFERENCES FOR EXISTING CASH PAYMENTS
-- ============================================================================

-- Update all cash payments without transaction references
-- Generate format: CASH-YYYY-NNNNNN (where NNNNNN is a sequential number)

DO $$
DECLARE
  payment_record RECORD;
  counter INTEGER := 1;
  year_value TEXT;
BEGIN
  -- Get year from payment_date or use current year
  FOR payment_record IN 
    SELECT 
      payment_id,
      payment_date,
      EXTRACT(YEAR FROM COALESCE(payment_date::date, CURRENT_DATE)) as payment_year
    FROM student_payments 
    WHERE LOWER(payment_method) IN ('cash', 'Cash', 'CASH')
      AND (transaction_ref IS NULL OR transaction_ref = '')
    ORDER BY payment_date, created_at
  LOOP
    -- Generate transaction reference
    year_value := payment_record.payment_year::TEXT;
    
    UPDATE student_payments 
    SET transaction_ref = 'CASH-' || year_value || '-' || LPAD(counter::TEXT, 6, '0')
    WHERE payment_id = payment_record.payment_id;
    
    counter := counter + 1;
  END LOOP;

  RAISE NOTICE 'Updated % cash payment(s) with auto-generated transaction references', counter - 1;
END $$;

-- Also update any existing payments table (old schema) if it still exists
DO $$
DECLARE
  payment_record RECORD;
  counter INTEGER := 1;
  year_value TEXT;
BEGIN
  -- Check if old payments table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
    FOR payment_record IN 
      SELECT 
        payment_id,
        created_at,
        EXTRACT(YEAR FROM created_at) as payment_year
      FROM payments 
      WHERE LOWER(payment_method) IN ('cash', 'Cash', 'CASH')
        AND payment_id NOT IN (
          SELECT transaction_ref::uuid 
          FROM student_payments 
          WHERE transaction_ref ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        )
      ORDER BY created_at
    LOOP
      year_value := payment_record.payment_year::TEXT;
      
      -- We can't update the old table directly, but we can add a note
      -- that it's been migrated with auto-generated ref
      counter := counter + 1;
    END LOOP;

    RAISE NOTICE 'Found % cash payment(s) in old payments table', counter - 1;
  END IF;
END $$;

-- Create index on transaction_ref for faster lookups
CREATE INDEX IF NOT EXISTS idx_student_payments_transaction_ref 
ON student_payments(transaction_ref) 
WHERE transaction_ref IS NOT NULL;

-- Add comment
COMMENT ON COLUMN student_payments.transaction_ref IS 'Auto-generated for cash (CASH-YYYY-NNNNNN), manual input for other methods';

-- ============================================================================
-- VERIFICATION QUERY (run this after to verify)
-- ============================================================================

-- To verify the update worked, run this:
/*
SELECT 
  payment_method,
  COUNT(*) as total_payments,
  COUNT(transaction_ref) as with_ref,
  COUNT(*) - COUNT(transaction_ref) as without_ref
FROM student_payments
GROUP BY payment_method
ORDER BY payment_method;
*/

-- To see sample of generated refs:
/*
SELECT 
  payment_method,
  transaction_ref,
  amount_paid,
  payment_date
FROM student_payments
WHERE LOWER(payment_method) = 'cash'
ORDER BY transaction_ref
LIMIT 10;
*/

