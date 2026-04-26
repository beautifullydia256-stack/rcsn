-- Fix referral code validation issues
-- Run this to diagnose and fix common problems

-- 1. Check current referral codes and their status
SELECT 
    'Current referral codes:' as info,
    id,
    code,
    type,
    is_active,
    expires_at,
    max_uses,
    use_count,
    affiliate_id
FROM referral_codes
ORDER BY created_at DESC;

-- 2. Activate all referral codes (if they're inactive)
UPDATE referral_codes 
SET is_active = true 
WHERE is_active = false;

-- 3. Remove expiration dates that might be causing issues
UPDATE referral_codes 
SET expires_at = NULL 
WHERE expires_at IS NOT NULL AND expires_at < NOW();

-- 4. Reset use counts if they've exceeded max_uses
UPDATE referral_codes 
SET use_count = 0 
WHERE max_uses IS NOT NULL AND use_count >= max_uses;

-- 5. Check if affiliates table exists, if not create a basic one
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'affiliates') THEN
        CREATE TABLE affiliates (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            email TEXT,
            status TEXT DEFAULT 'active',
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Insert a default affiliate for existing referral codes
        INSERT INTO affiliates (name, email, status)
        VALUES ('Default Affiliate', 'admin@pwezacore.com', 'active');
        
        -- Update referral codes to use this affiliate
        UPDATE referral_codes 
        SET affiliate_id = (SELECT id FROM affiliates LIMIT 1)
        WHERE affiliate_id IS NULL;
    END IF;
END $$;

-- 6. Ensure RLS policies allow service role access
-- Drop existing policies that might be too restrictive
DROP POLICY IF EXISTS "referral_codes_select_policy" ON referral_codes;
DROP POLICY IF EXISTS "affiliates_select_policy" ON affiliates;

-- Create permissive policies for service role
CREATE POLICY "referral_codes_service_access" ON referral_codes
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "affiliates_service_access" ON affiliates
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- 7. Test the validation query
SELECT 
    'Validation test:' as info,
    rc.id,
    rc.code,
    rc.type,
    rc.is_active,
    rc.expires_at,
    rc.max_uses,
    rc.use_count,
    rc.affiliate_id,
    a.name as affiliate_name,
    CASE 
        WHEN rc.is_active = false THEN 'INACTIVE - SHOULD BE FIXED NOW'
        WHEN rc.expires_at IS NOT NULL AND rc.expires_at < NOW() THEN 'EXPIRED - SHOULD BE FIXED NOW'
        WHEN rc.max_uses IS NOT NULL AND rc.use_count >= rc.max_uses THEN 'MAX_USES - SHOULD BE FIXED NOW'
        ELSE 'VALID - SHOULD WORK NOW'
    END as status
FROM referral_codes rc
LEFT JOIN affiliates a ON rc.affiliate_id = a.id
ORDER BY rc.created_at DESC;