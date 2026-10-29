-- Beauty Shelf — catalogue product images.
--
-- A public, read-only bucket for catalogue packshots. products.image_url and
-- product_variants.image_url hold a path inside it ("catalog-images/<file>.webp"); the app
-- turns that into a full URL for whichever Supabase project it talks to, so the seed works
-- on a laptop, a phone on the same network, or a hosted project alike.
-- Nobody but the service role (seeding, admin uploads) can write here.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('catalog-images', 'catalog-images', true, 2097152, array['image/webp', 'image/png', 'image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
