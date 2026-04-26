-- Step 1: Temporarily disable the trigger to prevent infinite loop
DROP TRIGGER IF EXISTS sync_referral_use_count_trigger ON referral_codes;

-- Step 2: Fix the INTELLIGENT referral code to have proper type
UPDATE referral_codes 
SET type = 'ADMIN'
WHERE code = 'INTELLIGENT' AND type IS NULL;

-- Step 3: Recreate the trigger with better logic to prevent infinite loops
CREATE OR REPLACE FUNCTION sync_referral_use_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Only sync if the values are actually different to prevent infinite loops
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- If current_uses changed but use_count didn't, sync use_count
        IF NEW.current_uses IS DISTINCT FROM OLD.current_uses AND 
           NEW.use_count = COALESCE(OLD.use_count, 0) THEN
            NEW.use_count = NEW.current_uses;
        -- If use_count changed but current_uses didn't, sync current_uses  
        ELSIF NEW.use_count IS DISTINCT FROM OLD.use_count AND 
              NEW.current_uses = COALESCE(OLD.current_uses, 0) THEN
            NEW.current_uses = NEW.use_count;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Recreate the trigger (only for INSERT and UPDATE, not DELETE)
CREATE TRIGGER sync_referral_use_count_trigger
    BEFORE INSERT OR UPDATE ON referral_codes
    FOR EACH ROW
    EXECUTE FUNCTION sync_referral_use_count();