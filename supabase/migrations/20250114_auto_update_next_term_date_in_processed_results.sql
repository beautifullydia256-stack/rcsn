-- Migration: Auto-update next_term_begins_date in processed_primary_exam_results when schools.next_term_begins_date changes
-- This ensures that when admin updates the next term begins date, all processed results are automatically updated

-- Function to update next_term_begins_date in processed_primary_exam_results
CREATE OR REPLACE FUNCTION update_next_term_date_in_processed_results()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if next_term_begins_date actually changed
  IF OLD.next_term_begins_date IS DISTINCT FROM NEW.next_term_begins_date THEN
    -- Update all processed results for this school with the new next_term_begins_date
    UPDATE processed_primary_exam_results 
    SET next_term_begins_date = NEW.next_term_begins_date
    WHERE school_id = NEW.school_id;
    
    -- Log the update (optional - for debugging)
    RAISE NOTICE 'Updated next_term_begins_date for school % from % to %', 
      NEW.school_id, OLD.next_term_begins_date, NEW.next_term_begins_date;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on schools table
DROP TRIGGER IF EXISTS trigger_update_next_term_date_in_processed_results ON schools;
CREATE TRIGGER trigger_update_next_term_date_in_processed_results
  AFTER UPDATE ON schools
  FOR EACH ROW
  EXECUTE FUNCTION update_next_term_date_in_processed_results();

-- Test the trigger by updating an existing school's next_term_begins_date
-- This will automatically update all processed results for that school
-- (Uncomment the line below to test immediately)
-- UPDATE schools SET next_term_begins_date = '2025-02-15' WHERE school_id = (SELECT school_id FROM schools LIMIT 1);
