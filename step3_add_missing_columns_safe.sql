-- Add missing columns to referral_codes table (now that incompatible data is removed)

-- Add description column
ALTER TABLE referral_codes 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add discount_type column with proper constraint
ALTER TABLE referral_codes 
ADD COLUMN IF NOT EXISTS discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed_amount', 'free_months'));

-- Add discount_value column
ALTER TABLE referral_codes 
ADD COLUMN IF NOT EXISTS discount_value NUMERIC NOT NULL DEFAULT 0;