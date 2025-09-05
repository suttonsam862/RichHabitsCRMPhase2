-- ========================================
-- Supabase Storage Setup for Logo Display Fix
-- Run this SQL in your Supabase SQL Editor
-- ========================================

-- 1. Create the 'app' storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'app',
  'app', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml'];

-- 2. Create RLS policy to allow public read access to all files in the 'app' bucket
CREATE POLICY "Public read access for app bucket" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'app');

-- 3. Create RLS policy to allow authenticated users to upload to their org folders
CREATE POLICY "Authenticated users can upload to their org folders" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'app' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = 'org'
);

-- 4. Create RLS policy to allow authenticated users to update their org files
CREATE POLICY "Authenticated users can update their org files" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'app' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = 'org'
);

-- 5. Create RLS policy to allow authenticated users to delete their org files
CREATE POLICY "Authenticated users can delete their org files" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'app' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = 'org'
);

-- 6. Enable RLS on the storage.objects table (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 7. Grant necessary permissions to anon role for public access
GRANT SELECT ON storage.objects TO anon;
GRANT SELECT ON storage.buckets TO anon;

-- ========================================
-- Verification Queries (Optional - run to check setup)
-- ========================================

-- Check if bucket was created successfully
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id = 'app';

-- Check if policies were created successfully
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage';

-- ========================================
-- Notes:
-- ========================================
-- - This creates a public bucket where anyone can read files
-- - Only authenticated users can upload/modify files in org/ folders
-- - Files will be publicly accessible at:
--   https://[YOUR_SUPABASE_URL]/storage/v1/object/public/app/org/[ORG_ID]/branding/[FILENAME]
-- - After running this SQL, restart your application to trigger bucket creation
-- ========================================