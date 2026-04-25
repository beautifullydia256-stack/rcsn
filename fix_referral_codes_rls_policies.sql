-- Fix RLS policies for referral_codes table to allow owner access

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read referral codes" ON referral_codes;
DROP POLICY IF EXISTS "Allow service role to manage referral codes" ON referral_codes;

-- Create new policies that allow owner access
-- Policy to allow all authenticated users to read referral codes
CREATE POLICY "Allow authenticated users to read referral codes" ON referral_codes
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy to allow authenticated users to insert referral codes
CREATE POLICY "Allow authenticated users to insert referral codes" ON referral_codes
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy to allow authenticated users to update referral codes
CREATE POLICY "Allow authenticated users to update referral codes" ON referral_codes
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Policy to allow authenticated users to delete referral codes
CREATE POLICY "Allow authenticated users to delete referral codes" ON referral_codes
    FOR DELETE USING (auth.role() = 'authenticated');

-- Alternative: If you want to restrict to service role only, use this instead:
-- CREATE POLICY "Allow service role full access" ON referral_codes
--     FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');