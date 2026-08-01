/*
# Storage policies for audio uploads

1. Security
- Allow authenticated users to upload, read, and delete files in the 'audio' bucket
- Files are scoped to their user_id folder
*/

CREATE POLICY "authenticated_read_audio" ON storage.objects FOR SELECT
  TO authenticated USING (bucket_id = 'audio');

CREATE POLICY "authenticated_upload_audio" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'audio');

CREATE POLICY "authenticated_update_audio" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'audio') WITH CHECK (bucket_id = 'audio');

CREATE POLICY "authenticated_delete_audio" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'audio');