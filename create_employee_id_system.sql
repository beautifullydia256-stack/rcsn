-- Employee ID Auto-Generation System
-- This creates the functionality to automatically generate Employee IDs for teachers

-- 1. Create a sequence for employee serial numbers (resets yearly)
CREATE SEQUENCE IF NOT EXISTS employee_serial_seq START 1;

-- 2. Create a function to generate school code from school name
CREATE OR REPLACE FUNCTION generate_school_code(school_name TEXT)
RETURNS TEXT AS $$
DECLARE
    words TEXT[];
    code TEXT := '';
    word TEXT;
BEGIN
    -- Split school name into words
    words := string_to_array(trim(school_name), ' ');
    
    -- Take first letter of each word
    FOREACH word IN ARRAY words
    LOOP
        IF length(trim(word)) > 0 THEN
            code := code || upper(substring(trim(word) from 1 for 1));
        END IF;
    END LOOP;
    
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- 3. Create a function to generate unique employee ID
CREATE OR REPLACE FUNCTION generate_employee_id(school_id_param UUID)
RETURNS TEXT AS $$
DECLARE
    school_name TEXT;
    school_code TEXT;
    current_year TEXT;
    serial_number TEXT;
    employee_id TEXT;
    max_serial INTEGER;
BEGIN
    -- Get school name
    SELECT name INTO school_name 
    FROM schools 
    WHERE school_id = school_id_param;
    
    IF school_name IS NULL THEN
        RAISE EXCEPTION 'School not found for ID: %', school_id_param;
    END IF;
    
    -- Generate school code
    school_code := generate_school_code(school_name);
    
    -- Get current year (last 2 digits)
    current_year := to_char(CURRENT_DATE, 'YY');
    
    -- Find the highest serial number for this school and year
    SELECT COALESCE(MAX(
        CASE 
            WHEN employee_id ~ ('^' || school_code || '-' || current_year || '-[0-9]+$')
            THEN CAST(substring(employee_id from '([0-9]+)$') AS INTEGER)
            ELSE 0
        END
    ), 0) INTO max_serial
    FROM teachers 
    WHERE school_id = school_id_param;
    
    -- Generate next serial number
    serial_number := lpad((max_serial + 1)::TEXT, 3, '0');
    
    -- Construct employee ID
    employee_id := school_code || '-' || current_year || '-' || serial_number;
    
    RETURN employee_id;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger function to auto-generate employee ID
CREATE OR REPLACE FUNCTION trigger_generate_employee_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Only generate if employee_id is NULL or empty
    IF NEW.employee_id IS NULL OR NEW.employee_id = '' THEN
        NEW.employee_id := generate_employee_id(NEW.school_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create the trigger
DROP TRIGGER IF EXISTS auto_generate_employee_id ON teachers;
CREATE TRIGGER auto_generate_employee_id
    BEFORE INSERT ON teachers
    FOR EACH ROW
    EXECUTE FUNCTION trigger_generate_employee_id();

-- 6. Add employee_id column if it doesn't exist
ALTER TABLE teachers 
ADD COLUMN IF NOT EXISTS employee_id TEXT UNIQUE;

-- 7. Create index for better performance
CREATE INDEX IF NOT EXISTS idx_teachers_employee_id ON teachers(employee_id);
CREATE INDEX IF NOT EXISTS idx_teachers_school_employee ON teachers(school_id, employee_id);

-- 8. Update existing teachers with employee IDs if they don't have them
DO $$
DECLARE
    teacher_record RECORD;
    new_employee_id TEXT;
BEGIN
    FOR teacher_record IN 
        SELECT teacher_id, school_id 
        FROM teachers 
        WHERE employee_id IS NULL OR employee_id = ''
    LOOP
        new_employee_id := generate_employee_id(teacher_record.school_id);
        
        UPDATE teachers 
        SET employee_id = new_employee_id 
        WHERE teacher_id = teacher_record.teacher_id;
        
        RAISE NOTICE 'Generated Employee ID % for teacher %', new_employee_id, teacher_record.teacher_id;
    END LOOP;
END $$;

-- 9. Add constraint to ensure employee_id is always present
ALTER TABLE teachers 
ALTER COLUMN employee_id SET NOT NULL;

-- 10. Create a function to get employee ID for display
CREATE OR REPLACE FUNCTION get_employee_display_info(teacher_id_param UUID)
RETURNS TABLE(
    employee_id TEXT,
    name TEXT,
    school_code TEXT,
    year TEXT,
    serial_number TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.employee_id,
        t.name,
        substring(t.employee_id from '^([A-Z]+)') as school_code,
        substring(t.employee_id from '^[A-Z]+-([0-9]+)') as year,
        substring(t.employee_id from '([0-9]+)$') as serial_number
    FROM teachers t
    WHERE t.teacher_id = teacher_id_param;
END;
$$ LANGUAGE plpgsql;
