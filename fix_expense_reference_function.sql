-- Check if generate_expense_reference function exists and create a fallback if needed
DO $$
BEGIN
    -- Check if the function exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'generate_expense_reference'
    ) THEN
        -- Create a simple fallback function
        CREATE OR REPLACE FUNCTION generate_expense_reference(
            p_school_id UUID,
            p_expense_date DATE,
            p_category_name TEXT
        ) RETURNS TEXT AS $func$
        DECLARE
            date_str TEXT;
            category_prefix TEXT;
            counter INTEGER;
            reference_num TEXT;
        BEGIN
            -- Format date as YYYYMMDD
            date_str := TO_CHAR(p_expense_date, 'YYYYMMDD');
            
            -- Get first 3 characters of category name, uppercase
            category_prefix := UPPER(LEFT(REGEXP_REPLACE(p_category_name, '[^A-Za-z]', '', 'g'), 3));
            IF LENGTH(category_prefix) < 3 THEN
                category_prefix := LPAD(category_prefix, 3, 'X');
            END IF;
            
            -- Get next counter for this school and date
            SELECT COALESCE(MAX(
                CAST(
                    SUBSTRING(reference_number FROM '[0-9]+$') AS INTEGER
                )
            ), 0) + 1
            INTO counter
            FROM school_expenses 
            WHERE school_id = p_school_id 
            AND expense_date = p_expense_date
            AND reference_number IS NOT NULL;
            
            -- Generate reference: EXP-CATEGORY-YYYYMMDD-001
            reference_num := 'EXP-' || category_prefix || '-' || date_str || '-' || LPAD(counter::TEXT, 3, '0');
            
            RETURN reference_num;
        END;
        $func$ LANGUAGE plpgsql;
        
        RAISE NOTICE 'Created fallback generate_expense_reference function';
    ELSE
        RAISE NOTICE 'generate_expense_reference function already exists';
    END IF;
END $$;

-- Test the function
SELECT generate_expense_reference(
    '00000000-0000-0000-0000-000000000000'::UUID,
    CURRENT_DATE,
    'Test Category'
) as test_reference;