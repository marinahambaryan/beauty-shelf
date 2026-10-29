-- Beauty Shelf — development seed catalog.
-- Real, widely sold products, entered by hand as plain facts: brand, product name,
-- category and the shade or size names the brands themselves publish. Nothing here is
-- licensed data or scraped.
-- Images: only the five skincare products at the end have one. Those packshots were
-- supplied by the app's owner for local development (supabase/catalog-images); they are
-- the brands' photos, so a public release needs the brands' permission or a licensed
-- source (DECISIONS.md D11, D16). Everything else shows the neutral placeholder.
-- Descriptions say what a product is, never what it does for skin or hair.
-- The UUIDs are stable: the database tests refer to some of them.

insert into public.brands (id, name) values
  ('b0000000-0000-4000-8000-000000000001', 'Charlotte Tilbury'),
  ('b0000000-0000-4000-8000-000000000002', 'Rare Beauty'),
  ('b0000000-0000-4000-8000-000000000003', 'Estée Lauder'),
  ('b0000000-0000-4000-8000-000000000004', 'Maybelline New York'),
  ('b0000000-0000-4000-8000-000000000005', 'Anastasia Beverly Hills'),
  ('b0000000-0000-4000-8000-000000000006', 'CeraVe'),
  ('b0000000-0000-4000-8000-000000000007', 'Kiehl''s'),
  ('b0000000-0000-4000-8000-000000000008', 'La Roche-Posay'),
  ('b0000000-0000-4000-8000-000000000009', 'Caudalie'),
  ('b0000000-0000-4000-8000-000000000010', 'Byredo'),
  ('b0000000-0000-4000-8000-000000000011', 'Diptyque'),
  ('b0000000-0000-4000-8000-000000000012', 'Olaplex'),
  ('b0000000-0000-4000-8000-000000000013', 'Bumble and bumble'),
  ('b0000000-0000-4000-8000-000000000014', 'Aesop'),
  ('b0000000-0000-4000-8000-000000000015', 'Shu Uemura'),
  ('b0000000-0000-4000-8000-000000000016', 'Dr. Althea'),
  ('b0000000-0000-4000-8000-000000000017', 'Purito Seoul'),
  ('b0000000-0000-4000-8000-000000000018', 'Round Lab'),
  ('b0000000-0000-4000-8000-000000000019', 'Anua')
on conflict (id) do nothing;

insert into public.products (id, brand_id, name, category, description) values
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'Matte Revolution Lipstick', 'makeup', 'Matte lipstick.'),
  ('a0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', 'Soft Pinch Liquid Blush', 'makeup', 'Liquid blush.'),
  ('a0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000003', 'Double Wear Stay-in-Place Foundation', 'makeup', 'Liquid foundation.'),
  ('a0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000004', 'Lash Sensational Mascara', 'makeup', 'Mascara.'),
  ('a0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000005', 'Dipbrow Pomade', 'makeup', 'Brow pomade.'),
  ('a0000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000006', 'Hydrating Facial Cleanser', 'skincare', 'Facial cleanser.'),
  ('a0000000-0000-4000-8000-000000000007', 'b0000000-0000-4000-8000-000000000007', 'Ultra Facial Cream', 'skincare', 'Face cream.'),
  ('a0000000-0000-4000-8000-000000000008', 'b0000000-0000-4000-8000-000000000008', 'Anthelios UVMune 400 Invisible Fluid SPF50+', 'skincare', 'Sunscreen fluid.'),
  ('a0000000-0000-4000-8000-000000000009', 'b0000000-0000-4000-8000-000000000009', 'Vinoperfect Radiance Serum', 'skincare', 'Face serum.'),
  ('a0000000-0000-4000-8000-000000000010', 'b0000000-0000-4000-8000-000000000010', 'Black Saffron Eau de Parfum', 'fragrance', 'Eau de parfum.'),
  ('a0000000-0000-4000-8000-000000000011', 'b0000000-0000-4000-8000-000000000011', 'Vetyverio Eau de Toilette', 'fragrance', 'Eau de toilette.'),
  ('a0000000-0000-4000-8000-000000000012', 'b0000000-0000-4000-8000-000000000012', 'No. 3 Hair Perfector', 'haircare', 'Pre-shampoo hair treatment.'),
  ('a0000000-0000-4000-8000-000000000013', 'b0000000-0000-4000-8000-000000000013', 'Surf Spray', 'haircare', 'Texturising hair spray.'),
  ('a0000000-0000-4000-8000-000000000014', 'b0000000-0000-4000-8000-000000000014', 'Resurrection Aromatique Hand Balm', 'body', 'Hand balm.'),
  ('a0000000-0000-4000-8000-000000000015', 'b0000000-0000-4000-8000-000000000015', 'Eyelash Curler', 'tools', 'Eyelash curler.')
on conflict (id) do nothing;

-- Products with a packshot. image_url is a path in the public catalog-images bucket.
insert into public.products (id, brand_id, name, category, description, image_url) values
  ('a0000000-0000-4000-8000-000000000016', 'b0000000-0000-4000-8000-000000000016', '345 Relief Cream', 'skincare', 'Face cream, 50 ml tube.', 'catalog-images/dr-althea-345-relief-cream.webp'),
  ('a0000000-0000-4000-8000-000000000017', 'b0000000-0000-4000-8000-000000000017', 'Mighty Bamboo Panthenol Cream', 'skincare', 'Face cream, 100 ml tube.', 'catalog-images/purito-mighty-bamboo-panthenol-cream.webp'),
  ('a0000000-0000-4000-8000-000000000018', 'b0000000-0000-4000-8000-000000000018', '1025 Dokdo Toner', 'skincare', 'Toner, 200 ml bottle.', 'catalog-images/round-lab-1025-dokdo-toner.webp'),
  ('a0000000-0000-4000-8000-000000000019', 'b0000000-0000-4000-8000-000000000018', '1025 Dokdo Cleanser', 'skincare', 'Foaming facial cleanser, 150 ml tube.', 'catalog-images/round-lab-1025-dokdo-cleanser.webp'),
  ('a0000000-0000-4000-8000-000000000020', 'b0000000-0000-4000-8000-000000000019', 'Azelaic Acid 10 Hyaluron Redness Soothing Serum', 'skincare', 'Face serum, 30 ml dropper bottle.', 'catalog-images/anua-azelaic-acid-10-hyaluron-serum.webp')
on conflict (id) do update set image_url = excluded.image_url;

-- Their single (default) variants get stable ids so scripts and tests can refer to them.
insert into public.product_variants (id, product_id, is_default) values
  ('c0000000-0000-4000-8000-000000001601', 'a0000000-0000-4000-8000-000000000016', true),
  ('c0000000-0000-4000-8000-000000001701', 'a0000000-0000-4000-8000-000000000017', true),
  ('c0000000-0000-4000-8000-000000001801', 'a0000000-0000-4000-8000-000000000018', true),
  ('c0000000-0000-4000-8000-000000001901', 'a0000000-0000-4000-8000-000000000019', true),
  ('c0000000-0000-4000-8000-000000002001', 'a0000000-0000-4000-8000-000000000020', true)
on conflict (id) do nothing;

-- Shaded / sized products get named variants (shade and size names as the brands publish them).
insert into public.product_variants (id, product_id, label, shade_name, size_label, sort_order) values
  ('c0000000-0000-4000-8000-000000000101', 'a0000000-0000-4000-8000-000000000001', 'Pillow Talk', 'Pillow Talk', null, 1),
  ('c0000000-0000-4000-8000-000000000102', 'a0000000-0000-4000-8000-000000000001', 'Walk of No Shame', 'Walk of No Shame', null, 2),
  ('c0000000-0000-4000-8000-000000000103', 'a0000000-0000-4000-8000-000000000001', 'The Queen', 'The Queen', null, 3),
  ('c0000000-0000-4000-8000-000000000201', 'a0000000-0000-4000-8000-000000000002', 'Joy', 'Joy', null, 1),
  ('c0000000-0000-4000-8000-000000000202', 'a0000000-0000-4000-8000-000000000002', 'Hope', 'Hope', null, 2),
  ('c0000000-0000-4000-8000-000000000301', 'a0000000-0000-4000-8000-000000000003', '1C1 Cool Bone', '1C1 Cool Bone', null, 1),
  ('c0000000-0000-4000-8000-000000000302', 'a0000000-0000-4000-8000-000000000003', '1W2 Sand', '1W2 Sand', null, 2),
  ('c0000000-0000-4000-8000-000000000303', 'a0000000-0000-4000-8000-000000000003', '4N1 Shell Beige', '4N1 Shell Beige', null, 3),
  ('c0000000-0000-4000-8000-000000000501', 'a0000000-0000-4000-8000-000000000005', 'Taupe', 'Taupe', null, 1),
  ('c0000000-0000-4000-8000-000000000502', 'a0000000-0000-4000-8000-000000000005', 'Dark Brown', 'Dark Brown', null, 2),
  ('c0000000-0000-4000-8000-000000001001', 'a0000000-0000-4000-8000-000000000010', '50 ml', null, '50 ml', 1),
  ('c0000000-0000-4000-8000-000000001002', 'a0000000-0000-4000-8000-000000000010', '100 ml', null, '100 ml', 2)
on conflict (id) do nothing;

-- Products without real variants get one default variant (DECISIONS.md D2).
insert into public.product_variants (product_id, is_default)
select p.id, true from public.products p
where not exists (select 1 from public.product_variants v where v.product_id = p.id)
on conflict do nothing;
