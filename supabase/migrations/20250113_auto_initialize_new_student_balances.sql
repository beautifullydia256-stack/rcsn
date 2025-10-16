-- Auto-initialize student_balances when new students are added
-- This ensures new students immediately appear in the accountant dashboard

CREATE OR REPLACE FUNCTION auto_initialize_student_balance()
RETURNS TRIGGER AS $$
DECLARE
    v_current_term_id UUID;
    v_class_fees NUMERIC(10,2);
BEGIN
    -- Get the most recent term for this school
    SELECT id INTO v_current_term_id
    FROM school_terms
    WHERE school_id = NEW.school_id
    ORDER BY year DESC, term DESC
    LIMIT 1;
    
    -- Only proceed if we have a current term
    IF v_current_term_id IS NOT NULL THEN
        -- Get class fees if student has a class_id
        IF NEW.class_id IS NOT NULL THEN
            SELECT c.total_fees INTO v_class_fees
            FROM classes c
            WHERE c.class_id = NEW.class_id;
        END IF;
        
        -- Use class fees, or fallback to student's expected_fee_amount, or 0
        v_class_fees := COALESCE(v_class_fees, NEW.expected_fee_amount, 0);
        
        -- Insert balance record for the new student
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
            NEW.student_id,
            NEW.school_id,
            v_current_term_id,
            NEW.class_id,
            v_class_fees,
            0, -- No payments yet
            NULL, -- No last payment date
            NOW(),
            NOW()
        )
        ON CONFLICT (student_id, term_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on students table
DROP TRIGGER IF EXISTS trigger_auto_initialize_student_balance ON students;
CREATE TRIGGER trigger_auto_initialize_student_balance
    AFTER INSERT ON students
    FOR EACH ROW
    EXECUTE FUNCTION auto_initialize_student_balance();

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION auto_initialize_student_balance TO authenticated;

COMMENT ON FUNCTION auto_initialize_student_balance IS 'Automatically creates student_balances record when a new student is added, ensuring they appear in the accountant dashboard immediately';
