-- STEP 5: Test the corrected query using affiliate_id instead of id
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
    a.status as affiliate_status
FROM referral_codes rc
LEFT JOIN affiliates a ON rc.affiliate_id = a.affiliate_id
WHERE rc.code = 'INTELLIGENT';