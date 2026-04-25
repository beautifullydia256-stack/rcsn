-- Add missing columns to referral_codes table to match the React component expectations

-- Add description column
ALTER TABLE referral_codes 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add discount_type column (rename from 'type' if needed)
ALTER TABLE referral_codes 
ADD COLUMN IF NOT EXISTS discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed_amount', 'free_months'));

-- Add discount_value column
ALTER TABLE referral_codes 
ADD COLUMN IF NOT EXISTS discount_value NUMERIC NOT NULL DEFAULT 0;

-- Rename use_count to current_uses to match component expectations
ALTER TABLE referral_codes 
RENAME COLUMN use_count TO current_uses;

-- Add target_audience column
ALTER TABLE referral_codes 
ADD COLUMN IF NOT EXISTS target_audience TEXT DEFAULT 'all' CHECK (target_audience IN ('all', 'new_schools', 'existing_schools', 'premium_schools', 'beta_schools'));

-- Add minimum_subscription_months column
ALTER TABLE referral_codes 
ADD COLUMN IF NOT EXISTS minimum_subscription_months INTEGER DEFAULT 1;

-- Add created_by column
ALTER TABLE referral_codes 
ADD COLUMN IF NOT EXISTS created_by TEXT DEFAULT 'admin';

-- Add updated_at column
ALTER TABLE referral_codes 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Copy data from 'type' column to 'discount_type' column if 'type' exists
UPDATE referral_codes 
SET discount_type = type 
WHERE discount_type IS NULL AND type IS NOT NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_active ON referral_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_referral_codes_expires_at ON referral_codes(expires_at);

-- Enable RLS if not already enabled
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Allow authenticated users to read referral codes" ON referral_codes;
DROP POLICY IF EXISTS "Allow service role to manage referral codes" ON referral_codes;

-- Policy to allow authenticated users to read referral codes
CREATE POLICY "Allow authenticated users to read referral codes" ON referral_codes
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy to allow service role to manage referral codes  
CREATE POLICY "Allow service role to manage referral codes" ON referral_codes
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');