-- Test referral code validation step by step
-- This will help identify where the validation is failing

-- 1. First, let's see what referral codes exist
SELECT 
    id,
    code,
    type,
    is_active,
    expires_at,
    max_uses,
    use_count,
    affiliate_id,
    created_at
FROM referral_codes
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check if any codes are active
SELECT 
    COUNT(*) as total_codes,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_codes,
    COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_codes
FROM referral_codes;

-- 3. Test a specific code (replace 'YOUR_CODE_HERE' with actual code from dashboard)
-- This simulates the exact query the API uses
SELECT 
    rc.id,
    rc.code,
    rc.type,
    rc.is_active,
    rc.expires_at,
    rc.max_uses,
    rc.use_count,
    rc.affiliate_id,
    a.name as affiliate_name,
    a.status as affiliate_status,
    -- Validation checks
    CASE 
        WHEN rc.is_active = false THEN 'INACTIVE'
        WHEN rc.expires_at IS NOT NULL AND rc.expires_at < NOW() THEN 'EXPIRED'
        WHEN rc.max_uses IS NOT NULL AND rc.use_count >= rc.max_uses THEN 'MAX_USES_REACHED'
        ELSE 'VALID'
    END as validation_status
FROM referral_codes rc
LEFT JOIN affiliates a ON rc.affiliate_id = a.id
WHERE UPPER(TRIM(rc.code)) = UPPER(TRIM('YOUR_CODE_HERE'))  -- Replace with actual code
ORDER BY rc.created_at DESC;

-- 4. Check if affiliates table exists and is accessible
SELECT 
    COUNT(*) as affiliate_count,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_affiliates
FROM affiliates;

-- 5. Check for any RLS issues by testing with different roles
-- Test as service_role (should work)
SET ROLE service_role;
SELECT 'service_role access:' as test, COUNT(*) FROM referral_codes;
RESET ROLE;

-- Test as authenticated user (might be blocked by RLS)
SET ROLE authenticated;
SELECT 'authenticated access:' as test, COUNT(*) FROM referral_codes;
RESET ROLE;