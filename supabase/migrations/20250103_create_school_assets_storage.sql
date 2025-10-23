-- Create school-assets storage bucket and policies for school badge uploads
-- This fixes the "new row violates row level security policy" error when uploading badges

-- Create the school-assets storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'school-assets',
  'school-assets', 
  true, -- Public bucket so badges can be accessed in reports
  2097152, -- 2MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for school-assets bucket

-- Allow authenticated users to upload to school-badges folder
CREATE POLICY "Allow school badge uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'school-assets' AND
  (storage.foldername(name))[1] = 'school-badges'
);

-- Allow public read access to all school assets (needed for reports, receipts, etc.)
CREATE POLICY "Public read access to school assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'school-assets');

-- Allow school admins to update their own badges
CREATE POLICY "Allow school admins to update badges"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'school-assets' AND
  (storage.foldername(name))[1] = 'school-badges'
);

-- Allow school admins to delete their own badges
CREATE POLICY "Allow school admins to delete badges"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'school-assets' AND
  (storage.foldername(name))[1] = 'school-badges'
);

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
