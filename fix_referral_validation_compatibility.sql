-- Fix referral_codes table to be compatible with validation logic

-- Add use_count column as an alias/copy of current_uses
ALTER TABLE referral_codes 
ADD COLUMN IF NOT EXISTS use_count INTEGER DEFAULT 0;

-- Update use_count to match current_uses for existing records
UPDATE referral_codes 
SET use_count = current_uses 
WHERE use_count != current_uses OR use_count IS NULL;

-- Create a trigger to keep use_count and current_uses in sync
CREATE OR REPLACE FUNCTION sync_referral_use_count()
RETURNS TRIGGER AS $$
BEGIN
  -- When current_uses is updated, update use_count
  IF TG_OP = 'UPDATE' AND OLD.current_uses != NEW.current_uses THEN
    NEW.use_count = NEW.current_uses;
  END IF;
  
  -- When use_count is updated, update current_uses
  IF TG_OP = 'UPDATE' AND OLD.use_count != NEW.use_count THEN
    NEW.current_uses = NEW.use_count;
  END IF;
  
  -- For inserts, ensure both are set
  IF TG_OP = 'INSERT' THEN
    NEW.use_count = COALESCE(NEW.current_uses, 0);
    NEW.current_uses = COALESCE(NEW.use_count, 0);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS sync_referral_use_count_trigger ON referral_codes;
CREATE TRIGGER sync_referral_use_count_trigger
  BEFORE INSERT OR UPDATE ON referral_codes
  FOR EACH ROW
  EXECUTE FUNCTION sync_referral_use_count();