-- Add branding and contact fields to schools table for headed paper
-- Run this migration in Supabase SQL editor

ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS motto TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS admin_email TEXT,
  ADD COLUMN IF NOT EXISTS admin_name TEXT;

-- Add helpful comment
COMMENT ON COLUMN schools.motto IS 'School motto/tagline for headed paper and reports';
COMMENT ON COLUMN schools.logo_url IS 'URL to school logo/badge image';
COMMENT ON COLUMN schools.website IS 'School website URL';
COMMENT ON COLUMN schools.contact_email IS 'Primary contact email for school';
COMMENT ON COLUMN schools.contact_phone IS 'Primary contact phone for school';

