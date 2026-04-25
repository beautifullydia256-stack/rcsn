-- Test inserting a sample referral code to make sure everything works now
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

-- Verify the insert worked
SELECT * FROM referral_codes WHERE code = 'TEST2024';