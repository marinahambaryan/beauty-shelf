-- Beauty Shelf — Milestone 2: your own photo of any product in your library.
--
-- The catalog ships without images (D11), so a person can attach their own photo to any
-- library entry, catalog or personal. It lives in the private product-photos bucket, under
-- the owner's folder, exactly like personal product photos.

alter table public.library_items add column if not exists photo_path text;

alter table public.library_items drop constraint if exists library_items_photo_in_own_folder;
alter table public.library_items add constraint library_items_photo_in_own_folder
  check (photo_path is null or photo_path like user_id::text || '/%');

grant insert (photo_path), update (photo_path) on public.library_items to authenticated;
