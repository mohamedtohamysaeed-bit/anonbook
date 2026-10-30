-- OPTIONAL: image/video storage inside Supabase, used only when IPFS (Pinata) is not working.
-- Run AFTER policies.sql (it uses public.wallet()). The bucket name must match NEXT_PUBLIC_STORAGE_BUCKET.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('anonbook-media', 'anonbook-media', true, 26214400, array['image/*', 'video/*'])
on conflict (id) do update
  set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "anonbook media read" on storage.objects;
create policy "anonbook media read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'anonbook-media');

-- Uploads only into a folder named after your own wallet address (the app does this automatically).
drop policy if exists "anonbook media upload own folder" on storage.objects;
create policy "anonbook media upload own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'anonbook-media' and (storage.foldername(name))[1] = public.wallet());
