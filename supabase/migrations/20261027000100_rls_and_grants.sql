-- Beauty Shelf — row level security and column-level grants.
-- Principle: every user-owned row is visible/writable only by its owner; the catalog
-- is read-only to signed-in users; anon gets nothing.

alter table public.profiles          enable row level security;
alter table public.brands            enable row level security;
alter table public.products          enable row level security;
alter table public.product_variants  enable row level security;
alter table public.personal_products enable row level security;
alter table public.library_items     enable row level security;
alter table public.product_events    enable row level security;
alter table public.collections       enable row level security;
alter table public.collection_items  enable row level security;

-- Start from zero, then grant only what the app needs.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, public;
grant usage on schema public to authenticated;

-- Catalog: read-only.
grant select on public.brands, public.products, public.product_variants to authenticated;
drop policy if exists catalog_read on public.brands;
create policy catalog_read on public.brands           for select to authenticated using (true);
drop policy if exists catalog_read on public.products;
create policy catalog_read on public.products         for select to authenticated using (true);
drop policy if exists catalog_read on public.product_variants;
create policy catalog_read on public.product_variants for select to authenticated using (true);

-- Profiles.
grant select, update (display_name) on public.profiles to authenticated;
drop policy if exists own_profile_select on public.profiles;
create policy own_profile_select on public.profiles for select to authenticated
  using (id = (select auth.uid()));
drop policy if exists own_profile_update on public.profiles;
create policy own_profile_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Personal products.
grant select, delete on public.personal_products to authenticated;
grant insert (brand_name, name, category, variant_label, image_path) on public.personal_products to authenticated;
grant update (brand_name, name, category, variant_label, image_path) on public.personal_products to authenticated;
drop policy if exists own_rows on public.personal_products;
create policy own_rows on public.personal_products for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Library items. Identity columns are insert-only; experience columns are editable.
grant select, delete on public.library_items to authenticated;
grant insert (catalog_variant_id, personal_product_id, ownership_status, usage_status, rating, notes,
              repurchase_intent, finished_at) on public.library_items to authenticated;
grant update (ownership_status, usage_status, rating, notes, repurchase_intent, finished_at)
  on public.library_items to authenticated;
drop policy if exists own_rows on public.library_items;
create policy own_rows on public.library_items for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- History: read-only to the owner, written by trigger.
grant select on public.product_events to authenticated;
drop policy if exists own_rows_read on public.product_events;
create policy own_rows_read on public.product_events for select to authenticated
  using (user_id = (select auth.uid()));

-- Collections.
grant select, delete on public.collections to authenticated;
grant insert (type, name, description, cover_path) on public.collections to authenticated;
grant update (name, description, cover_path) on public.collections to authenticated;
drop policy if exists own_rows on public.collections;
create policy own_rows on public.collections for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- Users can only create custom collections and shelves; the shopping list is provisioned.
drop policy if exists no_user_created_shopping on public.collections;
create policy no_user_created_shopping on public.collections as restrictive for insert to authenticated
  with check (type <> 'shopping');

-- Collection items.
grant select, delete on public.collection_items to authenticated;
grant insert (collection_id, library_item_id, catalog_variant_id, personal_product_id, checked, desired_quantity)
  on public.collection_items to authenticated;
-- sort_order is written by set_collection_order / save_shelf (which add version checks).
grant update (checked, desired_quantity, sort_order) on public.collection_items to authenticated;
drop policy if exists own_rows on public.collection_items;
create policy own_rows on public.collection_items for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
