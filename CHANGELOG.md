# Changelog

## 0.8.0 — Send to the catalogue, admin console (2 Nov 2026)

### Added
- **Send to catalogue**: a product added manually can be sent for review from its page, with an optional note. The page says what is shared first, and shows when it's waiting, added or not added, with the reason. Notes, ratings and everything else in the library stay private.
- Admin console support (D22): migration for admins, submissions and the activity log, the `admin-users` Edge Function, and 30 database tests. The console itself is the separate `beauty-shelf-admin` project.

## 0.7.0 — Hosted project, builds, CI (31 Oct 2026)
- Hosted Supabase project `beauty-shelf` (Frankfurt) with all migrations, the catalogue and the delete-account function (D21).
- `eas.json` build profiles pointing at it; iOS export-compliance flag in `app.json`.
- GitHub Actions: typecheck, lint, unit and database tests on every push.
- The app signs out a saved login whose account no longer exists.

## 0.6.0 — Milestone 4: more shelves, drag to arrange (1 Nov 2026)

### Added
- **Several shelves**: tap the shelf's name on Home to switch shelves or start a **New shelf**. Each shelf has its own name, up to 12 products and its own notes; Home remembers which one you were looking at on this device (D20).
- **Drag to arrange**: in Edit shelf, drag a product by its handle (⋮⋮) to move it; the rest slide out of the way. Screen readers get Move earlier / Move later on the handle. A light tap of haptics on phones.
- **Full shelf**: adding a 13th product asks which product it replaces.
- **Rename and delete** a shelf from its editor (products stay in your library).
- Migration drops the one-shelf limit; `expo-haptics`. Tests: 1 database test (several shelves), 4 unit tests (drop position, which shelf Home shows).

## 0.5.0 — Milestone 3: collections and the Shopping List (31 Oct 2026)

### Added
- **New collection** (Profile → Collections → +): a name and a look — mini shelf, pouch, wire basket or board — previewed with your own products (D19).
- Collections are drawn in their look on your profile: mini shelves take a full row, pouches, baskets and boards sit two to a row.
- **Collection page**: the collection in its look, its products, **Add products** (pick several from your library at once), **Edit** to move products earlier/later or take them out, and a ••• menu to rename, change the look or delete (products stay in your library).
- **Shopping List**: tick things off, set how many (1–99), take things off, and **Bought it — add to library** puts the product in your library as Owned, then takes it off the list or keeps it ticked.
- **Save to collection** (+ on a product page): tick the collections and the shopping list the product belongs in, or start a new collection with it.
- Migration `collections.look`; tests: 2 database tests (looks, rename with version check, delete, membership, reorder, shopping items), 9 unit tests (collection rules, name check).

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
