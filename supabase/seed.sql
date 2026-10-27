-- Beauty Shelf — development seed catalog.
-- Every brand and product below is FICTIONAL and owned by this project, created so the
-- app can be developed without licensing third-party product data or imagery.
-- No image URLs are seeded; the app renders its own placeholder art.

insert into public.brands (id, name) values
  ('b0000000-0000-4000-8000-000000000001', 'Atelier Rosé'),
  ('b0000000-0000-4000-8000-000000000002', 'Nordic Bloom'),
  ('b0000000-0000-4000-8000-000000000003', 'Velvet Hour'),
  ('b0000000-0000-4000-8000-000000000004', 'Saltwater Studio'),
  ('b0000000-0000-4000-8000-000000000005', 'Maison Cendre'),
  ('b0000000-0000-4000-8000-000000000006', 'Halcyon Hair'),
  ('b0000000-0000-4000-8000-000000000007', 'Dewlight')
on conflict (id) do nothing;

insert into public.products (id, brand_id, name, category, description) values
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'Satin Lip Colour', 'makeup', 'Creamy satin-finish lipstick.'),
  ('a0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'Soft Focus Blush', 'makeup', 'Finely milled powder blush.'),
  ('a0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000003', 'Second Skin Foundation', 'makeup', 'Light-coverage serum foundation.'),
  ('a0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000003', 'Midnight Lash Mascara', 'makeup', 'Lengthening tubing mascara.'),
  ('a0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000003', 'Brow Pomade', 'makeup', null),
  ('a0000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000002', 'Cloud Gel Cleanser', 'skincare', 'Low-foam gel cleanser.'),
  ('a0000000-0000-4000-8000-000000000007', 'b0000000-0000-4000-8000-000000000002', 'Barrier Cream', 'skincare', 'Rich moisturiser for dry skin.'),
  ('a0000000-0000-4000-8000-000000000008', 'b0000000-0000-4000-8000-000000000007', 'Daily Mineral Sunscreen SPF 50', 'skincare', null),
  ('a0000000-0000-4000-8000-000000000009', 'b0000000-0000-4000-8000-000000000007', 'Glow Drops Serum', 'skincare', null),
  ('a0000000-0000-4000-8000-000000000010', 'b0000000-0000-4000-8000-000000000005', 'Fig & Ash Eau de Parfum', 'fragrance', 'Green fig, cedar and smoke.'),
  ('a0000000-0000-4000-8000-000000000011', 'b0000000-0000-4000-8000-000000000005', 'Linen Morning Eau de Toilette', 'fragrance', null),
  ('a0000000-0000-4000-8000-000000000012', 'b0000000-0000-4000-8000-000000000006', 'Silk Repair Hair Mask', 'haircare', null),
  ('a0000000-0000-4000-8000-000000000013', 'b0000000-0000-4000-8000-000000000006', 'Sea Texture Spray', 'haircare', null),
  ('a0000000-0000-4000-8000-000000000014', 'b0000000-0000-4000-8000-000000000004', 'Salt Scrub', 'body', null),
  ('a0000000-0000-4000-8000-000000000015', 'b0000000-0000-4000-8000-000000000004', 'Kabuki Brush', 'tools', null)
on conflict (id) do nothing;

-- Shaded / sized products get named variants.
insert into public.product_variants (id, product_id, label, shade_name, size_label, sort_order) values
  ('c0000000-0000-4000-8000-000000000101', 'a0000000-0000-4000-8000-000000000001', 'Rosewood', 'Rosewood', null, 1),
  ('c0000000-0000-4000-8000-000000000102', 'a0000000-0000-4000-8000-000000000001', 'Cinema Red', 'Cinema Red', null, 2),
  ('c0000000-0000-4000-8000-000000000103', 'a0000000-0000-4000-8000-000000000001', 'Bare Petal', 'Bare Petal', null, 3),
  ('c0000000-0000-4000-8000-000000000201', 'a0000000-0000-4000-8000-000000000002', 'Apricot Haze', 'Apricot Haze', null, 1),
  ('c0000000-0000-4000-8000-000000000202', 'a0000000-0000-4000-8000-000000000002', 'Dusty Mauve', 'Dusty Mauve', null, 2),
  ('c0000000-0000-4000-8000-000000000301', 'a0000000-0000-4000-8000-000000000003', '1N Porcelain', '1N Porcelain', null, 1),
  ('c0000000-0000-4000-8000-000000000302', 'a0000000-0000-4000-8000-000000000003', '3W Honey', '3W Honey', null, 2),
  ('c0000000-0000-4000-8000-000000000303', 'a0000000-0000-4000-8000-000000000003', '5C Espresso', '5C Espresso', null, 3),
  ('c0000000-0000-4000-8000-000000000501', 'a0000000-0000-4000-8000-000000000005', 'Taupe', 'Taupe', null, 1),
  ('c0000000-0000-4000-8000-000000000502', 'a0000000-0000-4000-8000-000000000005', 'Soft Black', 'Soft Black', null, 2),
  ('c0000000-0000-4000-8000-000000001001', 'a0000000-0000-4000-8000-000000000010', '50 ml', null, '50 ml', 1),
  ('c0000000-0000-4000-8000-000000001002', 'a0000000-0000-4000-8000-000000000010', '100 ml', null, '100 ml', 2)
on conflict (id) do nothing;

-- Products without real variants get one default variant (DECISIONS.md D2).
insert into public.product_variants (product_id, is_default)
select p.id, true from public.products p
where not exists (select 1 from public.product_variants v where v.product_id = p.id)
on conflict do nothing;
