-- Beauty Shelf — Milestone 4: more than one shelf.
--
-- The MVP allowed one curated shelf per person (collections_one_shelf). Now a person can
-- keep several — a bathroom shelf, a vanity, a travel shelf — each with its own name,
-- products (up to 12) and notes on the glass (D20).

drop index if exists public.collections_one_shelf;
