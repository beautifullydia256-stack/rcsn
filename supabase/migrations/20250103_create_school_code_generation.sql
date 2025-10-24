-- Create function to generate unique school codes
-- Format: First letter of each word in school name (uppercase)
-- Examples: "Kampala High School" → "KHS", "Lakeview Grammar School" → "LGS"

CREATE OR REPLACE FUNCTION generate_unique_school_code(
  p_school_name TEXT,
  p_branch_name TEXT DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
  v_base_code TEXT;
  v_final_code TEXT;
  v_counter INT := 1;
  v_code_exists BOOLEAN;
  v_words TEXT[];
  v_word_count INT;
BEGIN
  -- Clean and split school name into words
  v_words := string_to_array(trim(regexp_replace(p_school_name, '\s+', ' ', 'g')), ' ');
  v_word_count := array_length(v_words, 1);
  
  -- Generate base code from first 2-3 words
  IF v_word_count >= 3 THEN
    -- Take first 3 words
    v_base_code := UPPER(
      SUBSTRING(v_words[1] FROM 1 FOR 1) ||
      SUBSTRING(v_words[2] FROM 1 FOR 1) ||
      SUBSTRING(v_words[3] FROM 1 FOR 1)
    );
  ELSIF v_word_count = 2 THEN
    -- Take first 2 words, add first letter of second word again
    v_base_code := UPPER(
      SUBSTRING(v_words[1] FROM 1 FOR 1) ||
      SUBSTRING(v_words[2] FROM 1 FOR 1) ||
      SUBSTRING(v_words[2] FROM 2 FOR 1)
    );
  ELSIF v_word_count = 1 THEN
    -- Single word: take first 3 letters
    v_base_code := UPPER(SUBSTRING(v_words[1] FROM 1 FOR 3));
  ELSE
    -- Fallback
    v_base_code := 'SCH';
  END IF;
  
  -- Add branch suffix if provided
  IF p_branch_name IS NOT NULL AND p_branch_name != '' THEN
    v_base_code := v_base_code || '-' || UPPER(SUBSTRING(trim(p_branch_name) FROM 1 FOR 2));
  END IF;
  
  -- Check if base code exists and find unique variant
  v_final_code := v_base_code;
  
  LOOP
    -- Check if code exists in schools table
    SELECT EXISTS(
      SELECT 1 FROM schools 
      WHERE school_code = v_final_code
    ) INTO v_code_exists;
    
    -- If code doesn't exist, we found our unique code
    IF NOT v_code_exists THEN
      EXIT;
    END IF;
    
    -- Code exists, try with number suffix
    v_counter := v_counter + 1;
    
    -- Remove branch suffix temporarily for numbering
    IF p_branch_name IS NOT NULL AND p_branch_name != '' THEN
      v_final_code := UPPER(
        SUBSTRING(v_words[1] FROM 1 FOR 1) ||
        SUBSTRING(v_words[2] FROM 1 FOR 1) ||
        SUBSTRING(v_words[3] FROM 1 FOR 1)
      ) || v_counter::TEXT || '-' || UPPER(SUBSTRING(trim(p_branch_name) FROM 1 FOR 2));
    ELSE
      v_final_code := v_base_code || v_counter::TEXT;
    END IF;
    
    -- Safety check to prevent infinite loop
    IF v_counter > 999 THEN
      v_final_code := v_base_code || '_' || EXTRACT(EPOCH FROM NOW())::TEXT;
      EXIT;
    END IF;
  END LOOP;
  
  RETURN v_final_code;
END;
$$ LANGUAGE plpgsql;
