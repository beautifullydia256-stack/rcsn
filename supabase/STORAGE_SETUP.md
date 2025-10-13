# Supabase Storage Setup for School Badges

## Create Storage Bucket

Run these steps in your Supabase Dashboard:

### 1. Create the `school-assets` bucket

1. Go to **Storage** in your Supabase dashboard
2. Click **New bucket**
3. Bucket name: `school-assets`
4. **Public bucket**: ✅ Yes (check this box)
5. Click **Create bucket**

### 2. Set Storage Policies

Go to **Storage** > **Policies** > **school-assets** and add these policies:

```sql
-- Allow authenticated users to upload to their school's folder
CREATE POLICY "Allow school uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'school-assets' AND
  (storage.foldername(name))[1] = 'school-badges'
);

-- Allow public read access to all school assets
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'school-assets');

-- Allow school admins to update their own badges
CREATE POLICY "Allow school admins to update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'school-assets' AND
  (storage.foldername(name))[1] = 'school-badges'
);

-- Allow school admins to delete their own badges
CREATE POLICY "Allow school admins to delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'school-assets' AND
  (storage.foldername(name))[1] = 'school-badges'
);
```

## Folder Structure

```
school-assets/
└── school-badges/
    ├── {school_id}-badge-{timestamp}.png
    ├── {school_id}-badge-{timestamp}.jpg
    └── ...
```

## How It Works

1. **Admin uploads badge** → File goes to `school-assets/school-badges/{school_id}-badge-{timestamp}.{ext}`
2. **Public URL generated** → Stored in `schools.logo_url`
3. **Badge displayed** → Fetched from `logo_url` in:
   - Report cards (all templates)
   - Headed papers
   - Exam results
   - Fee receipts
   - Timetables (PDF export)

## File Requirements

- **Formats**: PNG, JPG, JPEG, GIF, WebP
- **Max size**: 2MB
- **Recommended**: Square ratio (500x500px or 1000x1000px)
- **Transparency**: Supported (PNG recommended for transparent badges)

## Security

- ✅ Only authenticated users can upload
- ✅ Public can view (needed for reports, receipts)
- ✅ Files are school-specific (school_id in filename)
- ✅ Old badges remain accessible (for historical reports)

