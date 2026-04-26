-- First, let's see what triggers exist on referral_codes table
SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'referral_codes';

-- Drop the problematic trigger that's causing infinite recursion
DROP TRIGGER IF EXISTS sync_referral_use_count_trigger ON referral_codes;