# Beauty Shelf — Architecture & Data-Model Decisions

Each decision is the smallest reversible choice that satisfies the brief. "Reversal" says what it would take to undo it.

## D1 · Stack versions
Expo SDK 58 (React Native 0.88, React 19.3), Expo Router 58 with routes in `src/app`, TypeScript 6 strict + `noUncheckedIndexedAccess`, Supabase JS v2, TanStack Query v5, React Hook Form + Zod 4. Web uses `output: "single"` (SPA) because SDK 58 defaults to server rendering, which conflicts with AsyncStorage-backed sessions.
**Note:** the Expo Go app for SDK 58 may still be rolling out to stores; a development build (`npx expo run:ios|android` or EAS) is the reliable path.

## D2 · Every catalog product has at least one variant
Products without real shades/sizes get one `is_default` variant with a null label. Library identity is therefore always *user + variant*, the duplicate rule is one partial unique index, and the UI skips the picker when `variant_count = 1`.
*Reversal:* allow `library_items.catalog_product_id`; adds a second uniqueness path.

## D3 · Curated shelf = a collection of type `shelf`; slots = `collection_items.sort_order`
The brief's `shelf_layouts` / `shelf_slots` tables are collapsed. With fixed slots, no pixel positions and one shelf, a separate layout table adds joins without information. Capacity (12) is enforced by trigger and by `save_shelf()`, which replaces the arrangement atomically on Save. `collections.version` is the layout version.
*Reversal:* add `shelf_layouts` when templates or free placement arrive (P1/P2) and migrate `sort_order` into slot rows.

## D4 · One shelf per user (MVP)
Partial unique index `collections_one_shelf`. P1 "multiple shelves" = drop that index.

## D5 · What collection items point at
- Custom collections and the shelf → `library_item_id` only (they organise things you have a relationship with).
- Shopping List → `catalog_variant_id` or `personal_product_id` only, never a library item, so an entry survives library deletion and can hold things you don't own yet.
Enforced by CHECK (exactly one reference) + trigger (right kind per collection type).

## D6 · Concurrency: optimistic versions
`version int` on `library_items`, `personal_products`, `collections`, bumped by trigger on every update. Reorder/shelf RPCs take `p_expected_version` and raise `version_conflict`; the app maps that to "This changed on another device. Reload…". Direct row updates will use `.eq('version', v)` in Milestone 2.

## D7 · Status rules live in the database
Trigger `library_items_status_rules`: leaving *Owned* clears usage state; becoming *Finished* stamps `finished_at = today` if blank (user can edit/clear it). Notes, rating and repurchase intent are never touched by a transition. `src/domain/library.ts#statusPatch` mirrors this for optimistic UI only.

## D8 · History is append-only and server-written
`product_events` rows (`added`, `status_changed`, `finished`, `repurchased`, `purchased`) are written by trigger / a narrow definer function. Clients can read their own events but cannot insert. Satisfies "completion event retained" without a Project Pan model.

## D9 · Security model
- RLS on every table; catalog is read-only to `authenticated`; `anon` gets nothing (including RPCs).
- **Column-level grants**: identity columns (`user_id`, `catalog_variant_id`, `personal_product_id`, collection `type`) are insert-only or not writable at all; `version`/`updated_at` are trigger-owned.
- All RPCs are `SECURITY INVOKER` except two tiny definer helpers (`claim_collection_version`, `log_purchase_event`) that re-check `auth.uid()` explicitly, and the trigger that provisions profile + Shopping List.
- Storage: private bucket `product-photos`, 5 MB cap, image MIME allowlist, objects must live under `<uid>/`. DB rows also CHECK that `image_path` starts with the owner's id.
- Account deletion: an Edge Function (service role stays server-side) deletes the user's storage folder, then the auth user; every row cascades from `auth.users`. The Shopping List guard allows that cascade but blocks normal deletion.

## D10 · Deleting a library item
Hard delete with cascades: collection/shelf memberships disappear (no broken shelf card), history goes with it, and a personal product with no remaining references is cleaned up. Shopping-list entries survive. The UI must confirm when notes/rating would be lost (Milestone 2).

## D11 · Seed catalog is fictional
Seven invented brands / 15 products, no images, clearly labelled in `supabase/seed.sql`. Nothing licensed, scraped or impersonating real brands. A `CatalogProvider` interface (`src/data/catalog.ts`) lets a licensed source be added later without touching screens.

## D12 · Database tests run on plain PostgreSQL
`supabase/tests/shim/vanilla_postgres_shim.sql` recreates the roles, `auth.uid()` and storage tables the migrations depend on, so `npm run test:db` works in any CI with Postgres 15+. The same tests run unchanged against a local Supabase stack (`SKIP_DB_BUILD=1`). The shim must never be applied to a real project.

## D13 · Fonts and icons
System serif (Georgia / Android serif) for headlines and system sans for UI for now — no font downloads, no icon library. Tab icons are text glyphs. The final editorial typeface and icon set are a Milestone 5 decision.
