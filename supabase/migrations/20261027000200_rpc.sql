-- Beauty Shelf — RPCs for multi-row mutations that must be atomic.
-- All are SECURITY INVOKER: RLS and column grants still apply, so a caller can never
-- touch another user's rows through these functions.

-- ---------------------------------------------------------------------------
-- Catalog search: every whitespace-separated term must match brand or product name.
-- ---------------------------------------------------------------------------
create or replace function public.search_catalog(
  p_query text,
  p_category public.product_category default null,
  p_limit int default 30,
  p_offset int default 0
)
returns table (
  product_id uuid, product_name text, brand_name text, category public.product_category,
  image_url text, variant_count int, default_variant_id uuid
)
language sql stable security invoker set search_path = public, extensions as $$
  with terms as (
    select array_agg('%' || replace(replace(replace(t, '\', '\\'), '%', '\%'), '_', '\_') || '%') as pats
    from unnest(regexp_split_to_array(lower(btrim(coalesce(p_query, ''))), '\s+')) t
    where t <> ''
  )
  select p.id, p.name, b.name, p.category, p.image_url,
         (select count(*)::int from product_variants v where v.product_id = p.id),
         (select v.id from product_variants v where v.product_id = p.id and v.is_default)
  from products p
  join brands b on b.id = p.brand_id, terms
  where p.catalog_status = 'active'
    and (p_category is null or p.category = p_category)
    and (terms.pats is null or p.search_text ilike all (terms.pats))
  order by b.name, p.name
  limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0);
$$;

-- ---------------------------------------------------------------------------
-- Add a catalog variant to the library. Never duplicates: if the user already has
-- this variant, returns the existing entry with created = false.
-- ---------------------------------------------------------------------------
create or replace function public.add_variant_to_library(
  p_variant_id uuid,
  p_status public.ownership_status,
  p_usage public.usage_status default null,
  p_notes text default null
)
returns table (library_item_id uuid, created boolean)
language plpgsql security invoker set search_path = public as $$
declare
  v_id uuid;
begin
  insert into library_items (catalog_variant_id, ownership_status, usage_status, notes)
  values (p_variant_id, p_status, p_usage, nullif(btrim(p_notes), ''))
  on conflict (user_id, catalog_variant_id) where catalog_variant_id is not null do nothing
  returning id into v_id;

  if v_id is not null then
    return query select v_id, true;
  else
    return query select li.id, false from library_items li
      where li.user_id = auth.uid() and li.catalog_variant_id = p_variant_id;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Manual entry: create a private product and its library entry in one transaction.
-- ---------------------------------------------------------------------------
create or replace function public.create_personal_product(
  p_brand_name text,
  p_name text,
  p_category public.product_category,
  p_status public.ownership_status,
  p_variant_label text default null,
  p_notes text default null,
  p_image_path text default null
)
returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  v_pp uuid;
  v_li uuid;
begin
  insert into personal_products (brand_name, name, category, variant_label, image_path)
  values (btrim(p_brand_name), btrim(p_name), p_category, nullif(btrim(p_variant_label), ''), p_image_path)
  returning id into v_pp;

  insert into library_items (personal_product_id, ownership_status, notes)
  values (v_pp, p_status, nullif(btrim(p_notes), ''))
  returning id into v_li;
  return v_li;
end $$;

-- ---------------------------------------------------------------------------
-- Optimistic concurrency helper: bump a collection's version iff it matches.
-- ---------------------------------------------------------------------------
create or replace function public.claim_collection_version(p_collection_id uuid, p_expected_version int)
returns public.collections
-- DEFINER because clients have no update grant on updated_at/version; ownership is
-- checked explicitly against auth.uid() so other users' collections stay invisible.
language plpgsql security definer set search_path = public as $$
declare
  c public.collections;
begin
  update collections set updated_at = now()
   where id = p_collection_id and user_id = auth.uid() and version = p_expected_version
  returning * into c;
  if c.id is null then
    if exists (select 1 from collections where id = p_collection_id and user_id = auth.uid()) then
      raise exception 'version_conflict' using errcode = 'P0001',
        hint = 'This collection changed on another device. Reload and try again.';
    end if;
    raise exception 'collection not found' using errcode = 'P0002';
  end if;
  return c;
end $$;

-- ---------------------------------------------------------------------------
-- Reorder a collection. p_item_ids must be exactly the collection's current items.
-- ---------------------------------------------------------------------------
create or replace function public.set_collection_order(
  p_collection_id uuid, p_item_ids uuid[], p_expected_version int
)
returns int
language plpgsql security invoker set search_path = public as $$
declare
  c public.collections;
begin
  c := claim_collection_version(p_collection_id, p_expected_version);

  if cardinality(p_item_ids) <> (select count(distinct x) from unnest(p_item_ids) x)
     or (select array_agg(id order by id) from collection_items where collection_id = c.id)
        is distinct from (select array_agg(x order by x) from unnest(p_item_ids) x) then
    raise exception 'item list does not match the collection' using errcode = '22023';
  end if;

  update collection_items ci set sort_order = o.ord - 1
    from unnest(p_item_ids) with ordinality o(id, ord)
   where ci.id = o.id and ci.collection_id = c.id;
  return c.version;
end $$;

-- ---------------------------------------------------------------------------
-- Save a curated shelf arrangement atomically: the array is the full ordered list
-- of library items that should be on the shelf (Save in the shelf editor).
-- ---------------------------------------------------------------------------
create or replace function public.save_shelf(
  p_collection_id uuid, p_library_item_ids uuid[], p_expected_version int
)
returns int
language plpgsql security invoker set search_path = public as $$
declare
  c public.collections;
  ids uuid[] := coalesce(p_library_item_ids, '{}');
begin
  c := claim_collection_version(p_collection_id, p_expected_version);
  if c.type <> 'shelf' then
    raise exception 'not a shelf' using errcode = '22023';
  end if;
  if cardinality(ids) > shelf_capacity() then
    raise exception 'shelf_full' using errcode = 'P0001', hint = 'A shelf holds up to 12 products.';
  end if;
  if cardinality(ids) <> (select count(distinct x) from unnest(ids) x) then
    raise exception 'duplicate items' using errcode = '22023';
  end if;

  delete from collection_items where collection_id = c.id and library_item_id <> all (ids);
  insert into collection_items (collection_id, library_item_id)
    select c.id, x from unnest(ids) x
     where not exists (select 1 from collection_items ci where ci.collection_id = c.id and ci.library_item_id = x);
  update collection_items ci set sort_order = o.ord - 1
    from unnest(ids) with ordinality o(id, ord)
   where ci.collection_id = c.id and ci.library_item_id = o.id;
  return c.version;
end $$;

-- product_events has no insert grant; this definer function writes a purchase event
-- only for a library item owned by the caller.
create or replace function public.log_purchase_event(p_library_item_id uuid, p_shopping_item_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into product_events (library_item_id, user_id, event_type, to_status, metadata)
  select li.id, li.user_id, 'purchased', li.ownership_status,
         jsonb_build_object('shopping_item_id', p_shopping_item_id)
    from library_items li
   where li.id = p_library_item_id and li.user_id = auth.uid();
end $$;

-- ---------------------------------------------------------------------------
-- Shopping list: mark an item purchased. Creates or updates the Owned library entry
-- (finished → owned is recorded as a repurchase), then checks off or removes the item.
-- ---------------------------------------------------------------------------
create or replace function public.mark_shopping_item_purchased(p_item_id uuid, p_remove boolean default false)
returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  it public.collection_items;
  v_li uuid;
begin
  select ci.* into it from collection_items ci
    join collections c on c.id = ci.collection_id and c.type = 'shopping'
   where ci.id = p_item_id
   for update of ci;
  if it.id is null then
    raise exception 'shopping item not found' using errcode = 'P0002';
  end if;

  if it.catalog_variant_id is not null then
    select li.id into v_li from library_items li
     where li.user_id = it.user_id and li.catalog_variant_id = it.catalog_variant_id;
    if v_li is null then
      insert into library_items (catalog_variant_id, ownership_status, usage_status)
      values (it.catalog_variant_id, 'owned', 'unopened') returning id into v_li;
    end if;
  else
    select li.id into v_li from library_items li where li.personal_product_id = it.personal_product_id;
    if v_li is null then
      insert into library_items (personal_product_id, ownership_status, usage_status)
      values (it.personal_product_id, 'owned', 'unopened') returning id into v_li;
    end if;
  end if;

  update library_items set ownership_status = 'owned',
         usage_status = case when ownership_status = 'owned' then usage_status else 'unopened' end
   where id = v_li and ownership_status <> 'owned';

  perform log_purchase_event(v_li, it.id);

  if p_remove then
    delete from collection_items where id = it.id;
  else
    update collection_items set checked = true where id = it.id;
  end if;
  return v_li;
end $$;

-- Functions are executable by PUBLIC by default (and Supabase also grants anon/authenticated).
-- Lock everything down, then open only the app's RPC surface to signed-in users.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.shelf_capacity() to authenticated;
grant execute on function
  public.search_catalog(text, public.product_category, int, int),
  public.add_variant_to_library(uuid, public.ownership_status, public.usage_status, text),
  public.create_personal_product(text, text, public.product_category, public.ownership_status, text, text, text),
  public.claim_collection_version(uuid, int),
  public.set_collection_order(uuid, uuid[], int),
  public.save_shelf(uuid, uuid[], int),
  public.mark_shopping_item_purchased(uuid, boolean),
  public.log_purchase_event(uuid, uuid)
to authenticated;
