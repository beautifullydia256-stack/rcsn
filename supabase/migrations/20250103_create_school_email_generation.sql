-- Create function to generate unique school-branded emails
-- Format: firstname + lastname@schoolCode.sch
-- School code: First letter of each word in school name (lowercase)
-- Uniqueness: If email exists, append number (2, 3, 4, etc.)

CREATE OR REPLACE FUNCTION generate_unique_school_email(
  p_first_name TEXT,
  p_last_name TEXT,
  p_school_id UUID
) RETURNS TEXT AS $$
DECLARE
  v_school_name TEXT;
  v_school_code TEXT;
  v_base_email TEXT;
  v_final_email TEXT;
  v_counter INT := 1;
  v_email_exists BOOLEAN;
BEGIN
  -- Get school name
  SELECT name INTO v_school_name
  FROM schools
  WHERE school_id = p_school_id;
  
  -- Generate school code (first letter of each word, lowercase)
  IF v_school_name IS NOT NULL THEN
    SELECT LOWER(
      STRING_AGG(
        SUBSTRING(word FROM 1 FOR 1), ''
        ORDER BY ordinality
      )
    )
    INTO v_school_code
    FROM unnest(string_to_array(trim(v_school_name), ' ')) WITH ORDINALITY AS t(word, ordinality)
    LIMIT 3; -- Take first 3 words only
    
    -- If less than 3 words, pad with additional letters from first word
    IF LENGTH(v_school_code) < 3 THEN
      v_school_code := v_school_code || SUBSTRING(v_school_name FROM LENGTH(v_school_code) + 1 FOR 3 - LENGTH(v_school_code));
    END IF;
  ELSE
    v_school_code := 'sch'; -- Default fallback
  END IF;
  
  -- Generate base email
  v_base_email := LOWER(TRIM(p_first_name) || TRIM(p_last_name)) || '@' || v_school_code || '.sch';
  
  -- Check if base email exists and find unique variant
  v_final_email := v_base_email;
  
  LOOP
    -- Check if email exists in users table
    SELECT EXISTS(
      SELECT 1 FROM users 
      WHERE email = v_final_email
    ) INTO v_email_exists;
    
    -- If email doesn't exist, we found our unique email
    IF NOT v_email_exists THEN
      EXIT;
    END IF;
    
    -- Email exists, try with number suffix
    v_counter := v_counter + 1;
    v_final_email := LOWER(TRIM(p_first_name) || TRIM(p_last_name)) || v_counter::TEXT || '@' || v_school_code || '.sch';
    
    -- Safety check to prevent infinite loop
    IF v_counter > 999 THEN
      v_final_email := LOWER(TRIM(p_first_name) || TRIM(p_last_name)) || '_' || EXTRACT(EPOCH FROM NOW())::TEXT || '@' || v_school_code || '.sch';
      EXIT;
    END IF;
  END LOOP;
  
  RETURN v_final_email;
END;
$$ LANGUAGE plpgsql;

