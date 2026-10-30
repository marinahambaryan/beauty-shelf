-- Beauty Shelf — Milestone 3: how a collection looks.
--
-- Each collection is drawn like something real you keep products in: a mini glass shelf,
-- a pouch, a wire basket, or a plain photo board (D19). The look is only presentation;
-- membership, order and the shopping list work the same for every look.

do $$ begin
  create type public.collection_look as enum ('board', 'mini_shelf', 'pouch', 'basket');
exception when duplicate_object then null; end $$;

alter table public.collections add column if not exists look public.collection_look not null default 'board';

grant insert (look), update (look) on public.collections to authenticated;
