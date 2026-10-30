# Beauty Shelf — Milestone Plan & Status

_Last updated 27 Oct 2026._

## Milestone 0 — Audit (done)
- **Starting point:** no existing repository; only the MVP brief. Scaffolded from `create-expo-app` (blank TypeScript, SDK 58) and `supabase init`.
- **Environment constraints found:** Expo's online version API was unreachable from the build sandbox, so packages were pinned with Expo's offline SDK version map (`EXPO_OFFLINE=1 npx expo install`). Run `npx expo-doctor` once on a normal network to confirm.
- **Unknowns / external dependencies:**
  1. Hosted Supabase project (URL + anon key) — needed to run the app against real auth.
  2. A licensed product-data source — none chosen; the app runs on a fictional seed catalog until one is.
  3. Email delivery for sign-up confirmation in production (Supabase SMTP settings).
  4. Drag-and-drop library for the shelf editor — to be chosen in Milestone 4 after confirming SDK 58 compatibility of `react-native-gesture-handler` / `react-native-reanimated`.

## Milestone 1 — Auth + schema + seed (done)
| Area | Delivered |
|---|---|
| Schema | 9 tables, enums, CHECK + partial unique indexes for every invariant in brief §10 |
| Security | RLS on all tables, column-level grants, locked-down function execute, storage policies |
| Server logic | `search_catalog`, `add_variant_to_library`, `create_personal_product`, `set_collection_order`, `save_shelf`, `mark_shopping_item_purchased` |
| Seed | Fictional 7-brand / 15-product catalog with shades and sizes |
| App | Expo Router shell, email/password sign-up/in/out with persisted session, 4 tabs reading real data, profile name edit, account deletion (Edge Function) |
| Types | Generated from the migrated schema (`src/data/database.types.ts`) |
| Tests | 40 database tests (RLS isolation, duplicates, transitions, collections, shopping, shelf, storage, account deletion) + 14 unit tests |

**Known limitations**
- Not yet run against a live Supabase stack (no Docker in the build sandbox). The SQL is verified on PostgreSQL 16 with a Supabase-compatible shim; the Edge Function and the auth screens are type-checked and bundled but not exercised end to end.
- No add/edit flows yet — screens say so plainly rather than showing dead buttons.
- Offline: React Query caches reads in memory only; no persisted cache or connectivity banner yet (Milestone 5).

## Milestone 2 — Search + manual add + personal library (done)
1. Add Product flow: debounced catalog search (`search_catalog`), loading / error / empty states, "Can't find it? Add manually" always visible.
2. Product detail + variant picker; skip the picker for default-variant products.
3. Add-to-library sheet: Owned / Wishlist / Finished, optional note; duplicate → open existing entry with "change status".
4. Manual entry form (RHF + Zod), optional photo upload to `product-photos/<uid>/…` with size/type caps and progress.
5. Library item detail/editor: status, usage, rating, notes, repurchase intent, finished date; version-checked saves; delete with confirmation.
6. Tests: mutation hooks, form schemas, an integration test for the add flow.

## Design pass — Shelf + Pinboard (done, 30 Oct 2026)
Black & white Pinterest-style UI, floating three-tab bar, Home shelf with handwritten notes, Edit shelf (pick, Move earlier/later, notes, Save via `save_shelf_layout`), Search board, Profile with Products/Collections, Settings. See D17–D18.

## Milestone 3 — Collections + Shopping List (done, 31 Oct 2026)
Done: create/rename/delete with a look per collection (D19), multi-select add, Move earlier/later, Shopping List with quantity, ticks and Bought it, Save to collection from the product page.

Original scope:
Create/rename/delete custom collections, multi-select library picker, reorder (`set_collection_order`), Shopping List with quantity, check-off and "Mark purchased" confirmation (`mark_shopping_item_purchased`).

## Milestone 4 — Curated shelf editor (next)
Builds on Edit shelf: multiple shelves, long-press drag with placeholder + haptics, Move earlier/later accessibility actions, Save/Cancel (only Save calls `save_shelf`), full-shelf replace flow, list/grid fallback.

## Milestone 5 — Polish + hardening
Editorial typeface + icon set, image handling, offline cache persistence and connectivity state, accessibility pass (dynamic type, screen reader, reduced motion), performance on 500+ item libraries, Maestro or Detox smoke test, CI workflow running `npm run check` and `npm run test:db`.
