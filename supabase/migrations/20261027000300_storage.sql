-- Beauty Shelf — private storage for user-uploaded product photos and collection covers.
-- Object names must start with the owner's user id: "<uid>/<random>.jpg".

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-photos', 'product-photos', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "photos: owner reads" on storage.objects for select to authenticated
  using (bucket_id = 'product-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "photos: owner uploads" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "photos: owner updates" on storage.objects for update to authenticated
  using (bucket_id = 'product-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'product-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "photos: owner deletes" on storage.objects for delete to authenticated
  using (bucket_id = 'product-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
