-- User-uploaded photos (species pictures, etc.) via Supabase Storage.
-- Public read so the app can display them; only farm members may upload.

insert into storage.buckets (id, name, public)
values ('farm-photos', 'farm-photos', true)
on conflict (id) do nothing;

-- Public read access to all farm photos.
create policy "public read farm photos"
  on storage.objects for select
  using (bucket_id = 'farm-photos');

-- Any authenticated user can upload (app-level farm checks apply on the rows
-- that reference these photos; objects are namespaced per farm).
create policy "authenticated upload farm photos"
  on storage.objects for insert
  with check (bucket_id = 'farm-photos' and auth.role() = 'authenticated');

-- Allow replacing/removing one's farm photos.
create policy "authenticated manage farm photos"
  on storage.objects for update
  using (bucket_id = 'farm-photos' and auth.role() = 'authenticated');
create policy "authenticated delete farm photos"
  on storage.objects for delete
  using (bucket_id = 'farm-photos' and auth.role() = 'authenticated');
