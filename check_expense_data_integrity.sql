-- Check for expenses with missing category names or reference numbers
SELECT 
    expense_id,
    school_id,
    description,
    amount,
    expense_date,
    category_name,
    reference_number,
    status,
    created_at,
    CASE 
        WHEN category_name IS NULL OR category_name = '' THEN 'Missing category_name'
        WHEN reference_number IS NULL OR reference_number = '' THEN 'Missing reference_number'
        ELSE 'OK'
    END as issue
FROM school_expenses 
WHERE 
    category_name IS NULL 
    OR category_name = '' 
    OR reference_number IS NULL 
    OR reference_number = ''
ORDER BY created_at DESC
LIMIT 20;

-- Count of expenses with issues
SELECT 
    COUNT(*) as total_expenses,
    COUNT(CASE WHEN category_name IS NULL OR category_name = '' THEN 1 END) as missing_category,
    COUNT(CASE WHEN reference_number IS NULL OR reference_number = '' THEN 1 END) as missing_reference
FROM school_expenses;

-- Update expenses with missing category names (if any exist)
UPDATE school_expenses 
SET category_name = 'General Expense'
WHERE category_name IS NULL OR category_name = '';

-- Update expenses with missing reference numbers (if any exist)
UPDATE school_expenses 
SET reference_number = 'EXP-' || TO_CHAR(expense_date, 'YYYYMMDD') || '-' || 
    LPAD((ROW_NUMBER() OVER (PARTITION BY school_id, expense_date ORDER BY created_at))::TEXT, 3, '0')
WHERE reference_number IS NULL OR reference_number = '';