-- Beauty Shelf — handwritten notes on the glass.
--
-- Each product placed on the shelf can carry a short note written on the glass above it
-- ("every day", "holy grail"). The note belongs to the placement, not the product: take
-- the product off the shelf and its note goes with it (DECISIONS.md D17).

alter table public.collection_items add column if not exists note text;

alter table public.collection_items drop constraint if exists collection_items_note_length;
alter table public.collection_items add constraint collection_items_note_length
  check (note is null or char_length(note) between 1 and 40);

grant update (note) on public.collection_items to authenticated;

-- ---------------------------------------------------------------------------
-- Save the whole shelf in one go: which products, in which order, and the note on each.
-- p_notes lines up with p_library_item_ids; empty or blank notes are stored as null.
-- ---------------------------------------------------------------------------
create or replace function public.save_shelf_layout(
  p_collection_id uuid, p_library_item_ids uuid[], p_notes text[], p_expected_version int
)
returns int
language plpgsql security invoker set search_path = public as $$
declare
  ids uuid[] := coalesce(p_library_item_ids, '{}');
  notes text[] := coalesce(p_notes, '{}');
  v int;
begin
  if cardinality(notes) <> cardinality(ids) then
    raise exception 'one note per product' using errcode = '22023';
  end if;
  v := save_shelf(p_collection_id, ids, p_expected_version);
  update collection_items ci set note = nullif(btrim(o.note), '')
    from unnest(ids, notes) as o(id, note)
   where ci.collection_id = p_collection_id and ci.library_item_id = o.id
     and ci.note is distinct from nullif(btrim(o.note), '');
  return v;
end $$;

revoke execute on function public.save_shelf_layout(uuid, uuid[], text[], int) from public, anon;
grant execute on function public.save_shelf_layout(uuid, uuid[], text[], int) to authenticated;
