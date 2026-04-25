-- Add created_by column
ALTER TABLE referral_codes 
ADD COLUMN IF NOT EXISTS created_by TEXT DEFAULT 'admin';

-- Add updated_at column
ALTER TABLE referral_codes 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_active ON referral_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_referral_codes_expires_at ON referral_codes(expires_at);