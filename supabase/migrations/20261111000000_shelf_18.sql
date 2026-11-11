-- Beauty Shelf — Home v2, phase 2: one shelf of up to 18 products.
--
-- Home shows one shelf with up to three ledges. Products are packed by width, so small
-- makeup (lipsticks, pencils) fits about six to a ledge and bottles about four. The
-- capacity rises from 12 to 18; the guard trigger and save_shelf() already read
-- shelf_capacity(), so only it and the hint text change.
-- Several shelves per person stay in the schema (D20); the app shows one on Home.

create or replace function public.shelf_capacity()
returns int language sql immutable as $$ select 18 $$;

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
    raise exception 'shelf_full' using errcode = 'P0001',
      hint = format('A shelf holds up to %s products.', public.shelf_capacity());
  end if;
  return new;
end $$;

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
    raise exception 'shelf_full' using errcode = 'P0001',
      hint = format('A shelf holds up to %s products.', shelf_capacity());
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

-- Home's "Your recent activity" reads a person's latest events.
create index if not exists product_events_user_recent on public.product_events (user_id, occurred_at desc);
