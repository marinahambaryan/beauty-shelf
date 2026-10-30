# Changelog

## 0.4.0 — Design: Shelf + Pinboard (30 Oct 2026)

### Changed
- New look: a Pinterest-simple black & white app around the glass shelves. Geist for everything, Caveat for handwriting on the glass; outlined search fields, pill buttons and chips, grey photo tiles.
- Floating tab bar with three icons: **Home**, **Search**, **Profile** (the separate Library and Collections tabs are gone).
- **Home**: "My shelf" on glass ledges with the notes written above products, a pencil button to edit the shelf, and the owned · wishlist · finished counts (each opens your products).
- **Search**: catalogue search with recent searches (kept on this device), category chips, "Can't find it? Add it manually", and a two-column photo board where each tile adds the product or shows its status if it's already yours.
- **Profile**: Products (3-column photo grid with All / Owned / Wishlist / Finished) and Collections (boards). Name and account moved to **Settings**.
- **Product page**: big photo card, "Add to shelf" toggle, status pill, usage and "buy again" chips, star rating.

### Added
- **Edit shelf**: choose what stands on the shelf (up to 12), move products earlier or later, write a short note on the glass above each, then Save (D17).
- Collection page (shelf shown as ledges, other collections as a grid).
- Migration `collection_items.note` and RPC `save_shelf_layout`; `react-native-svg`, `@expo-google-fonts/geist`, `@expo-google-fonts/caveat` (IBM Plex Mono and Inter Tight removed).
- Tests: 1 database test (notes per placement), 3 unit tests (recent searches).

## 0.3.1 — Catalogue images (29 Oct 2026)
- Five skincare products with packshots: Dr. Althea 345 Relief Cream, Purito Seoul Mighty Bamboo Panthenol Cream, Round Lab 1025 Dokdo Toner and Cleanser, Anua Azelaic Acid 10 Hyaluron Redness Soothing Serum.
- Public `catalog-images` bucket; image paths resolved against the configured Supabase URL (D16).
- Search results show a thumbnail. `npm run demo:user` adds the new products too.

## 0.3.0 — Milestone 2: adding products (28 Oct 2026)

### Added
- **Add product**: catalogue search (debounced, category filter) with "Can't find it? Add it manually" always visible.
- Product page with a shade/size picker (skipped for single-variant products), Owned / Wishlist / Finished and an optional note. Shades already in the library are marked, and adding one again opens the existing entry instead.
- **Add manually**: brand, name, shade or size, category, status, note and an optional photo (library or camera).
- **Library item editor**: status, usage, rating, "Would you buy it again?", finished date and notes, saved together with a version check; your own photo (add, change, remove); delete with a confirmation that says what's lost.
- Library cards, Home shelf bottles and Home index rows open the item; "+ Add" on Home and Library.
- Migration `library_items.photo_path`; `expo-image-picker` and `expo-image-manipulator`.
- Tests: 21 more unit tests (editing rules, form schemas, version-checked saves, photo upload and clean-up order), 3 more database tests (photo folder rule, version bump, stale save).

## 0.2.0 — Redesign and real catalogue (28 Oct 2026)
- Direction D "Apothecary" design on white; real 15-product seed catalogue without images (see D11, D13).

## 0.1.0 — Milestones 0 + 1 (27 Oct 2026)

### Added
- Expo SDK 58 app scaffold with Expo Router (`src/app`), typed routes, strict TypeScript, ESLint, Jest.
- Supabase schema: profiles, brands, products, product variants, personal products, library items, product events, collections, collection items.
- Invariants enforced in the database: exactly-one product reference, one library entry per user + variant, one Shopping List, one shelf (MVP), 12-slot shelf capacity, same-owner membership, usage state only when owned.
- RLS on every table, column-level grants, private photo bucket with per-user folder policies.
- RPCs: catalog search, duplicate-safe add, manual product creation, version-checked reorder, atomic shelf save, mark-purchased.
- Automatic profile + Shopping List provisioning on sign-up; append-only history events.
- Fictional seed catalog (7 brands, 15 products, shades and sizes).
- Email/password sign up, sign in, persisted session, sign out; profile display name; account deletion via Edge Function.
- Home (counts, recent items), Library (All/Owned/Wishlist/Finished, search, category filter, sort), Collections list, Profile — all reading live data with loading/error/empty states.
- Design tokens (ivory / charcoal / muted rose, editorial serif headlines) with verified AA contrast.
- 40 database tests, 14 unit tests.

### Known limitations
See `docs/PLAN.md` → Milestone 1.
