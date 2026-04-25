-- Rename use_count to current_uses to match component expectations
ALTER TABLE referral_codes 
RENAME COLUMN use_count TO current_uses;

-- Add target_audience column
ALTER TABLE referral_codes 
ADD COLUMN IF NOT EXISTS target_audience TEXT DEFAULT 'all' CHECK (target_audience IN ('all', 'new_schools', 'existing_schools', 'premium_schools', 'beta_schools'));

-- Add minimum_subscription_months column
ALTER TABLE referral_codes 
ADD COLUMN IF NOT EXISTS minimum_subscription_months INTEGER DEFAULT 1;