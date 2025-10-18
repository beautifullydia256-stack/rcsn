-- Add location coordinates to schools table for teacher attendance verification
-- This allows schools to set their GPS coordinates and radius for location verification

-- Add location columns to schools table
ALTER TABLE schools 
ADD COLUMN IF NOT EXISTS location_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS location_longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS location_radius INTEGER DEFAULT 100, -- in meters
ADD COLUMN IF NOT EXISTS location_name TEXT DEFAULT 'School Location';

-- Add comments for documentation
COMMENT ON COLUMN schools.location_latitude IS 'School GPS latitude coordinate for location verification';
COMMENT ON COLUMN schools.location_longitude IS 'School GPS longitude coordinate for location verification';
COMMENT ON COLUMN schools.location_radius IS 'Acceptable radius in meters for location verification (default: 100m)';
COMMENT ON COLUMN schools.location_name IS 'Human-readable name for the school location';

-- Create index for location queries
CREATE INDEX IF NOT EXISTS idx_schools_location ON schools(location_latitude, location_longitude);

-- Update existing schools with default coordinates (Kampala, Uganda as example)
-- Schools can update these with their actual coordinates
UPDATE schools 
SET 
  location_latitude = 0.3476, -- Kampala latitude
  location_longitude = 32.5825, -- Kampala longitude
  location_radius = 200, -- 200m radius
  location_name = 'School Location'
WHERE location_latitude IS NULL OR location_longitude IS NULL;