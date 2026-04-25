-- Create referral_codes table for storing referral codes and discount information
CREATE TABLE IF NOT EXISTS referral_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount', 'free_months')),
    discount_value NUMERIC NOT NULL,
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    target_audience TEXT DEFAULT 'all' CHECK (target_audience IN ('all', 'new_schools', 'existing_schools', 'premium_schools', 'beta_schools')),
    minimum_subscription_months INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by TEXT DEFAULT 'admin',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_active ON referral_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_referral_codes_expires_at ON referral_codes(expires_at);

-- Add RLS (Row Level Security) policies
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to read referral codes
CREATE POLICY "Allow authenticated users to read referral codes" ON referral_codes
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy to allow service role to manage referral codes
CREATE POLICY "Allow service role to manage referral codes" ON referral_codes
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Insert some sample referral codes for testing
INSERT INTO referral_codes (code, description, discount_type, discount_value, max_uses, expires_at, target_audience, minimum_subscription_months) VALUES
('WELCOME2024', 'Welcome discount for new schools', 'percentage', 20, 100, now() + interval '90 days', 'new_schools', 6),
('FREEMONTH', 'One month free for annual subscriptions', 'free_months', 1, NULL, NULL, 'all', 12)
ON CONFLICT (code) DO NOTHING;