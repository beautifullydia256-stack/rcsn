-- Verify the referral_codes table structure after all changes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'referral_codes' 
ORDER BY ordinal_position;

-- Test inserting a sample referral code to make sure everything works
INSERT INTO referral_codes (
    code, 
    description, 
    discount_type, 
    discount_value, 
    max_uses, 
    expires_at, 
    target_audience, 
    minimum_subscription_months
) VALUES (
    'TEST2024', 
    'Test referral code', 
    'percentage', 
    10, 
    50, 
    now() + interval '30 days', 
    'all', 
    1
);