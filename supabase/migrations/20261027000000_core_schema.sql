-- Beauty Shelf — core schema (Milestone 1)
-- See docs/DECISIONS.md for the reasoning behind each deviation from the brief's logical model.

-- Supabase installs extensions into the "extensions" schema.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.product_category as enum
  ('makeup', 'skincare', 'fragrance', 'haircare', 'body', 'tools', 'other');
create type public.ownership_status as enum ('owned', 'wishlist', 'finished');
create type public.usage_status as enum ('unopened', 'using', 'paused');
create type public.repurchase_intent as enum ('yes', 'no', 'unsure');
create type public.collection_type as enum ('custom', 'shopping', 'shelf');
create type public.catalog_status as enum ('active', 'archived');
create type public.product_event_type as enum
  ('added', 'status_changed', 'finished', 'repurchased', 'purchased');

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------
create or replace function public.touch_row()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  new.version := old.version + 1;
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 1 and 60),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Canonical catalog (shared, read-only to users)
-- ---------------------------------------------------------------------------
create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  normalized_name text generated always as (lower(btrim(name))) stored,
  created_at timestamptz not null default now(),
  unique (normalized_name)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete restrict,
  name text not null check (char_length(name) between 1 and 200),
  category public.product_category not null,
  description text check (description is null or char_length(description) <= 2000),
  image_url text,
  catalog_status public.catalog_status not null default 'active',
  -- Denormalised search text: brand + product name, kept current by trigger.
  search_text text not null default '',
  created_at timestamptz not null default now(),
  unique (brand_id, name)
);

-- Every catalog product has >= 1 variant. Products without real shades/sizes get a
-- single variant with is_default = true and a null label, so library identity is
-- always "user + variant" (see DECISIONS.md D2).
create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete restrict,
  label text check (label is null or char_length(label) between 1 and 120),
  shade_name text,
  size_label text,
  barcode text check (barcode is null or barcode ~ '^[0-9]{8,14}$'),
  image_url text,
  is_default boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  check (is_default or label is not null)
);
create unique index product_variants_one_default on public.product_variants (product_id) where is_default;
create unique index product_variants_label_unique on public.product_variants (product_id, lower(label)) where label is not null;
create unique index product_variants_barcode_unique on public.product_variants (barcode) where barcode is not null;
create index product_variants_product on public.product_variants (product_id, sort_order);

create or replace function public.products_set_search_text()
returns trigger language plpgsql as $$
begin
  select lower(b.name || ' ' || new.name) into new.search_text from public.brands b where b.id = new.brand_id;
  return new;
end $$;
create trigger products_search_text before insert or update of name, brand_id on public.products
  for each row execute function public.products_set_search_text();
create index products_search_text_idx on public.products using gin (search_text extensions.gin_trgm_ops);
create index products_category_idx on public.products (category) where catalog_status = 'active';

-- ---------------------------------------------------------------------------
-- Personal (private, manual) products
-- ---------------------------------------------------------------------------
create table public.personal_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  brand_name text not null check (char_length(btrim(brand_name)) between 1 and 120),
  name text not null check (char_length(btrim(name)) between 1 and 200),
  category public.product_category not null,
  variant_label text check (variant_label is null or char_length(variant_label) <= 120),
  -- Storage path inside the private product-photos bucket; must live in the user's folder.
  image_path text,
  -- Future: link to a canonical variant without losing history (brief §6).
  linked_variant_id uuid references public.product_variants (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  check (image_path is null or image_path like user_id::text || '/%')
);
create index personal_products_user on public.personal_products (user_id);
create trigger personal_products_touch before update on public.personal_products
  for each row execute function public.touch_row();

-- ---------------------------------------------------------------------------
-- Library items: one user's experience of one product
-- ---------------------------------------------------------------------------
create table public.library_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  catalog_variant_id uuid references public.product_variants (id) on delete restrict,
  personal_product_id uuid references public.personal_products (id) on delete cascade,
  ownership_status public.ownership_status not null,
  usage_status public.usage_status,
  rating smallint check (rating between 1 and 5),
  notes text check (notes is null or char_length(notes) <= 5000),
  repurchase_intent public.repurchase_intent,
  finished_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  constraint library_items_exactly_one_product check (num_nonnulls(catalog_variant_id, personal_product_id) = 1),
  constraint library_items_usage_only_when_owned check (usage_status is null or ownership_status = 'owned')
);
create unique index library_items_user_variant on public.library_items (user_id, catalog_variant_id)
  where catalog_variant_id is not null;
create unique index library_items_personal on public.library_items (personal_product_id)
  where personal_product_id is not null;
create index library_items_user_status on public.library_items (user_id, ownership_status, updated_at desc);

-- Personal products may only be attached to library items of the same user.
create or replace function public.library_items_check_owner()
returns trigger language plpgsql as $$
begin
  if new.personal_product_id is not null and not exists (
    select 1 from public.personal_products p where p.id = new.personal_product_id and p.user_id = new.user_id
  ) then
    raise exception 'personal product does not belong to this user' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger library_items_owner before insert or update of user_id, personal_product_id
  on public.library_items for each row execute function public.library_items_check_owner();

-- Status-transition housekeeping: usage state only applies to owned items;
-- finishing stamps a date if none was given.
create or replace function public.library_items_status_rules()
returns trigger language plpgsql as $$
begin
  if new.ownership_status <> 'owned' then
    new.usage_status := null;
  end if;
  if new.ownership_status = 'finished'
     and (tg_op = 'INSERT' or old.ownership_status <> 'finished')
     and new.finished_at is null then
    new.finished_at := current_date;
  end if;
  return new;
end $$;
create trigger library_items_status_rules before insert or update of ownership_status
  on public.library_items for each row execute function public.library_items_status_rules();
create trigger library_items_touch before update on public.library_items
  for each row execute function public.touch_row();

-- ---------------------------------------------------------------------------
-- History events (append-only, written by trigger)
-- ---------------------------------------------------------------------------
create table public.product_events (
  id uuid primary key default gen_random_uuid(),
  library_item_id uuid not null references public.library_items (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  event_type public.product_event_type not null,
  from_status public.ownership_status,
  to_status public.ownership_status,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
create index product_events_item on public.product_events (library_item_id, occurred_at desc);

create or replace function public.library_items_log_event()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  ev public.product_event_type;
begin
  if tg_op = 'INSERT' then
    insert into public.product_events (library_item_id, user_id, event_type, to_status)
    values (new.id, new.user_id, 'added', new.ownership_status);
  elsif new.ownership_status is distinct from old.ownership_status then
    ev := case
      when new.ownership_status = 'finished' then 'finished'
      when old.ownership_status = 'finished' and new.ownership_status = 'owned' then 'repurchased'
      else 'status_changed'
    end;
    insert into public.product_events (library_item_id, user_id, event_type, from_status, to_status)
    values (new.id, new.user_id, ev, old.ownership_status, new.ownership_status);
  end if;
  return null;
end $$;
create trigger library_items_events after insert or update of ownership_status
  on public.library_items for each row execute function public.library_items_log_event();

-- Deleting the last library item for a personal product removes the orphaned
-- personal product unless the shopping list still points at it.
create or replace function public.library_items_cleanup_personal()
returns trigger language plpgsql as $$
begin
  if old.personal_product_id is not null then
    delete from public.personal_products p
    where p.id = old.personal_product_id
      and not exists (select 1 from public.collection_items ci where ci.personal_product_id = p.id);
  end if;
  return null;
end $$;

-- ---------------------------------------------------------------------------
-- Collections (custom, shopping list, curated shelf)
-- ---------------------------------------------------------------------------
create table public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type public.collection_type not null,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  description text check (description is null or char_length(description) <= 500),
  cover_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  check (cover_path is null or cover_path like user_id::text || '/%')
);
create index collections_user on public.collections (user_id, type);
-- Exactly one shopping list per user. One shelf per user in MVP (drop this index for P1 multi-shelf).
create unique index collections_one_shopping on public.collections (user_id) where type = 'shopping';
create unique index collections_one_shelf on public.collections (user_id) where type = 'shelf';
create trigger collections_touch before update on public.collections
  for each row execute function public.touch_row();

-- SECURITY DEFINER only so it can check auth.users during account-deletion cascades.
create or replace function public.collections_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and (new.type <> old.type or new.user_id <> old.user_id) then
    raise exception 'collection type and owner are immutable' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' and old.type = 'shopping'
     and exists (select 1 from auth.users u where u.id = old.user_id) then
    raise exception 'the shopping list cannot be deleted' using errcode = '42501';
  end if;
  return coalesce(new, old);
end $$;
create trigger collections_guard before update or delete on public.collections
  for each row execute function public.collections_guard();

create table public.collection_items (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Custom collections and shelves reference library entries.
  library_item_id uuid references public.library_items (id) on delete cascade,
  -- Shopping list references products directly (may not be in the library yet).
  catalog_variant_id uuid references public.product_variants (id) on delete restrict,
  personal_product_id uuid references public.personal_products (id) on delete cascade,
  sort_order int not null default 0,
  checked boolean,
  desired_quantity smallint check (desired_quantity is null or desired_quantity between 1 and 99),
  created_at timestamptz not null default now(),
  constraint collection_items_exactly_one check (num_nonnulls(library_item_id, catalog_variant_id, personal_product_id) = 1)
);
create unique index collection_items_lib on public.collection_items (collection_id, library_item_id) where library_item_id is not null;
create unique index collection_items_variant on public.collection_items (collection_id, catalog_variant_id) where catalog_variant_id is not null;
create unique index collection_items_personal on public.collection_items (collection_id, personal_product_id) where personal_product_id is not null;
create index collection_items_order on public.collection_items (collection_id, sort_order);
create index collection_items_library_item on public.collection_items (library_item_id);

create or replace function public.shelf_capacity()
returns int language sql immutable as $$ select 12 $$;

-- Validates membership on insert: same owner everywhere, the right reference kind
-- for the collection type, shelf capacity, and append-to-end ordering by default.
create or replace function public.collection_items_guard()
returns trigger language plpgsql as $$
declare
  c record;
  n int;
begin
  -- Lock the parent so concurrent inserts cannot overshoot the shelf capacity.
  select id, user_id, type into c from public.collections
   where id = new.collection_id for update;
  if c.id is null or c.user_id <> new.user_id then
    raise exception 'collection not found' using errcode = '42501';
  end if;

  if c.type = 'shopping' then
    if new.library_item_id is not null then
      raise exception 'shopping list items reference products, not library entries' using errcode = '23514';
    end if;
    new.checked := coalesce(new.checked, false);
    new.desired_quantity := coalesce(new.desired_quantity, 1);
  else
    if new.library_item_id is null then
      raise exception '% items must reference a library entry', c.type using errcode = '23514';
    end if;
    if new.checked is not null or new.desired_quantity is not null then
      raise exception 'checked/quantity only apply to the shopping list' using errcode = '23514';
    end if;
  end if;

  if new.library_item_id is not null and not exists (
    select 1 from public.library_items li where li.id = new.library_item_id and li.user_id = new.user_id
  ) then
    raise exception 'library item not found' using errcode = '42501';
  end if;
  if new.personal_product_id is not null and not exists (
    select 1 from public.personal_products p where p.id = new.personal_product_id and p.user_id = new.user_id
  ) then
    raise exception 'personal product not found' using errcode = '42501';
  end if;

  -- New members always append; reordering goes through set_collection_order / save_shelf.
  select count(*), coalesce(max(sort_order) + 1, 0) into n, new.sort_order
    from public.collection_items where collection_id = new.collection_id;
  if c.type = 'shelf' and n >= public.shelf_capacity() then
    raise exception 'shelf_full' using errcode = 'P0001', hint = 'A shelf holds up to 12 products.';
  end if;
  return new;
end $$;
create trigger collection_items_guard before insert on public.collection_items
  for each row execute function public.collection_items_guard();

create trigger library_items_cleanup_personal after delete on public.library_items
  for each row execute function public.library_items_cleanup_personal();

-- ---------------------------------------------------------------------------
-- New user bootstrap: profile + default Shopping List
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  insert into public.collections (user_id, type, name)
  values (new.id, 'shopping', 'Shopping List') on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
