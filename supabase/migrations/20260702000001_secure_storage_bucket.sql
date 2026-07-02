-- Ensure basic authenticated-only policies for elevator_photos bucket
-- Dropping public access if any (usually none by default, but to be safe)
-- Note: We only allow authenticated users to interact with storage.

CREATE POLICY "Allow authenticated users to upload" 
  ON storage.objects FOR INSERT TO authenticated 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to select" 
  ON storage.objects FOR SELECT TO authenticated 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update" 
  ON storage.objects FOR UPDATE TO authenticated 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete" 
  ON storage.objects FOR DELETE TO authenticated 
  USING (auth.role() = 'authenticated');
