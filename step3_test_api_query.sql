-- STEP 3: Test the exact query the API uses for validation
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
LEFT JOIN affiliates a ON rc.affiliate_id = a.id
WHERE rc.code = 'INTELLIGENT';