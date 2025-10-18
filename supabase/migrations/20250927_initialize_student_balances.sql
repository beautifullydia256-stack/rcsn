-- Initialize student_balances for all active students in current terms
-- This ensures the accountant dashboard shows all students, even those with no payments yet

-- Function to initialize balances for a specific school and term
CREATE OR REPLACE FUNCTION initialize_student_balances_for_term(
    p_school_id UUID,
    p_term_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
    v_student_record RECORD;
    v_class_fees NUMERIC(10,2);
BEGIN
    -- Loop through all active students in the school
    FOR v_student_record IN 
        SELECT s.student_id, s.class_id, s.expected_fee_amount
        FROM students s
        WHERE s.school_id = p_school_id 
          AND s.status = 'active'
    LOOP
        -- Get class fees if student has a class_id
        IF v_student_record.class_id IS NOT NULL THEN
            SELECT c.total_fees INTO v_class_fees
            FROM classes c
            WHERE c.class_id = v_student_record.class_id;
        END IF;
        
        -- Use class fees, or fallback to student's expected_fee_amount, or 0
        v_class_fees := COALESCE(v_class_fees, v_student_record.expected_fee_amount, 0);
        
        -- Insert balance record if it doesn't exist
        INSERT INTO student_balances (
            student_id,
            school_id,
            term_id,
            class_id,
            total_fees,
            total_paid,
            last_payment_date,
            created_at,
            updated_at
        )
        VALUES (
            v_student_record.student_id,
            p_school_id,
            p_term_id,
            v_student_record.class_id,
            v_class_fees,
            0, -- No payments yet
            NULL, -- No last payment date
            NOW(),
            NOW()
        )
        ON CONFLICT (student_id, term_id) DO NOTHING;
        
        v_count := v_count + 1;
    END LOOP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Initialize balances for all schools and their current terms
DO $$
DECLARE
    v_school_record RECORD;
    v_term_record RECORD;
    v_total_initialized INTEGER := 0;
BEGIN
    -- Loop through all schools
    FOR v_school_record IN 
        SELECT school_id FROM schools
    LOOP
        -- Get the most recent term for this school
        SELECT id INTO v_term_record
        FROM school_terms
        WHERE school_id = v_school_record.school_id
        ORDER BY year DESC, term DESC
        LIMIT 1;
        
        -- Initialize balances for this school and term
        IF v_term_record.id IS NOT NULL THEN
            v_total_initialized := v_total_initialized + initialize_student_balances_for_term(
                v_school_record.school_id, 
                v_term_record.id
            );
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Initialized % student balance records', v_total_initialized;
END $$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION initialize_student_balances_for_term TO authenticated;

COMMENT ON FUNCTION initialize_student_balances_for_term IS 'Initializes student_balances records for all active students in a school and term, ensuring they appear in the accountant dashboard even before any payments are made';
