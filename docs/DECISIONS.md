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

## D11 · Seed catalog uses real products, without images
Fifteen real, widely sold products from fifteen brands (Charlotte Tilbury, Byredo, Diptyque, Kiehl's, Aesop…), entered by hand as plain facts: brand, product name, category and the shade/size names the brands publish (each checked against a retailer or brand page, 28 Oct 2026). No descriptions of efficacy. **No images are seeded**: brand and retailer product photos are copyrighted, so a product shows a neutral placeholder until it has a photo — the user's own (Milestone 2 upload) or a properly licensed source. Open Beauty Facts (photos under CC BY-SA, attribution required) is the candidate licensed source; its coverage of these brands is unverified. The `CatalogProvider` interface (`src/data/catalog.ts`) lets a source be added without touching screens. Seed UUIDs are stable because the database tests reference them.
*Reversal:* restore the fictional seed from git history.

## D12 · Database tests run on plain PostgreSQL
`supabase/tests/shim/vanilla_postgres_shim.sql` recreates the roles, `auth.uid()` and storage tables the migrations depend on, so `npm run test:db` works in any CI with Postgres 15+. The same tests run unchanged against a local Supabase stack (`SKIP_DB_BUILD=1`). The shim must never be applied to a real project.

## D13 · Visual design: Direction D, "Apothecary"
Chosen by the owner from the "Beauty Shelf — UI Directions" canvas (28 Oct 2026), on a white ground. IBM Plex Mono for labels and body, Inter Tight for the big titles (bundled with `@expo-google-fonts`, loaded before first render). No icon library: the tab bar is four mono words with the current one in brackets, drawn by `expo-router/ui` headless tabs on every platform — a deliberate trade of the system tab bar's native look for the design. Products without a photo are neutral containers with a paper label (`src/components/shelf.tsx`), never invented colours. Tokens live in `src/theme/tokens.ts`.
*Reversal:* swap `src/components/app-tabs.tsx` back to `NativeTabs`; tokens and fonts are isolated in `src/theme/`.

## D14 · Your own photo on any library entry
The catalogue has no images (D11), so Milestone 2 lets a person attach their own photo to any entry. Catalogue entries store it in a new `library_items.photo_path` column (migration `20261028000000_library_item_photos.sql`, same "must live in your own folder" CHECK as personal products); products added manually keep their one photo on `personal_products.image_path`. Photos are converted on the device to JPEG, at most 1600 px on the long edge (`expo-image-manipulator`), so HEIC and large originals never reach storage and the 5 MB cap is a safety net. They are shown through one batch of signed URLs per library load. A new photo is uploaded before the row changes and the old file is removed only after; deleting an entry removes its photos. Clean-up is best effort: a stray file costs storage in the person's own folder and goes with account deletion.
*Reversal:* drop the column; nothing else reads it.

## D15 · Editing is explicit and version-checked
The item editor keeps a draft and shows **Save changes** only when something changed. A save sends only the changed columns with `.eq('version', v)`; zero rows back means "changed on another device" (or deleted), shown with a Reload button while the person's edits stay on screen. Status changes follow the database rules: leaving Owned clears usage (said before saving), a Finished date is stamped if left blank. Adds never duplicate: picking a shade already in the library shows "Already in your library as Owned." with a link instead of an Add button.

## D16 · Catalogue images live in a public bucket, referenced by path
Catalogue packshots are files in a public, read-only `catalog-images` bucket (migration `20261029000000_catalog_images.sql`; local files in `supabase/catalog-images`, uploaded by `supabase seed buckets`). `products.image_url` stores the path (`catalog-images/x.webp`), not a host, and the app builds the full URL from its configured Supabase URL (`src/data/images.ts`), so the same seed works on the Mac, on a phone over the LAN, and on a hosted project. Full `https://` URLs from a future licensed source pass through untouched.
Images are prepared once: cropped to the product and their white studio background turned into transparency ("colour to alpha"), so they sit on the stone cards and glass shelves like objects rather than white tiles, then saved as WebP at most 900 px tall (12–70 KB each).
**Rights:** the five packshots added on 29 Oct 2026 (Dr. Althea, Purito Seoul, Round Lab ×2, Anua) were supplied by the owner for development. They are the brands' own photos; before a public release, get the brands' permission or replace them with a licensed source.

## D17 · Notes on the glass belong to the placement
The handwriting above a product on the shelf ("every day", "holy grail") is stored on the shelf placement, `collection_items.note` (≤ 40 characters), not on the product: it describes where the product stands, and taking a product off the shelf takes its note with it. Stamps on products (HOLY GRAIL, AGAIN ×2) are a separate, later feature that would live on the library entry. The editor saves products, order and notes in one version-checked call, `save_shelf_layout`, which wraps `save_shelf`; the first save creates the shelf. Reordering uses Move earlier / later buttons for now; drag and drop comes with the Milestone 4 shelf editor.
*Reversal:* drop the column and the function; `save_shelf` is unchanged.

## D18 · Three tabs, floating
Following the Shelf + Pinboard design, the app has three tabs — Home, Search, Profile — in a floating pill. Adding happens from Search (or the + next to your products); the library lives under Profile → Products, collections under Profile → Collections, and account settings on their own page. Someone else's profile is designed but not built: every library is still private.

## D19 · A collection has a look, chosen when it's made
Collections are drawn like the real things people keep products in — a mini glass shelf, a zip pouch, a wire basket — or as a plain photo board. The look is chosen on the New collection page (previewed with the person's own products) and can be changed from the collection's menu; it is only presentation and is stored as `collections.look` (enum, default `board`, migration `20261031000000_collection_looks.sql`). The curated shelf is always drawn as a shelf and the shopping list as a board. Adding to the shopping list stores the product (catalogue shade or manual product), not the library entry, so an item survives the entry moving to Finished or being deleted; "Bought it" goes through `mark_shopping_item_purchased`, which makes or updates the Owned entry.
*Reversal:* drop the column; every collection renders as a board.

## D20 · Several shelves, one shown on Home
The one-shelf rule (`collections_one_shelf`) is dropped (migration `20261101000000_multiple_shelves.sql`). Each shelf is a `shelf` collection with its own name, products (12 max, per shelf) and notes; the same product may stand on more than one shelf. Home shows one shelf at a time, chosen from the title; the choice is remembered per device (AsyncStorage) and falls back to the oldest shelf. The editor saves the layout first (`save_shelf_layout`) and then the name, each version-checked. Reordering is a drag on a handle (React Native's PanResponder, no gesture library) with fixed-height rows, plus Move earlier / later accessibility actions.
*Reversal:* recreate the unique index after merging extra shelves.

## D21 · Hosted project, builds and CI
The app runs against a hosted Supabase project (`beauty-shelf`, eu-central-1, closest to the owner) so it works away from the Mac's Wi-Fi and data survives local resets. Schema = the same migrations, applied in order; catalogue = `seed.sql`; the `delete-account` Edge Function is deployed with JWT verification on. Only public client values (URL, publishable key) are in the repo (`eas.json`); the service-role key never leaves Supabase. Builds use EAS profiles (`development`, `preview` = internal-distribution APK / ad-hoc iOS, `production`). GitHub Actions runs the app checks and the database tests on every push.
Known advisor warnings, accepted for now: seven trigger/helper functions without a fixed `search_path` (none are SECURITY DEFINER), and two SECURITY DEFINER functions callable by signed-in users (`claim_collection_version`, `log_purchase_event`) that check `auth.uid()` themselves.


## D22 · Admin console: no service key, and libraries stay private
The console is a separate Next.js project (`beauty-shelf-admin`) on the same Supabase project. Keeping to D21, it holds only the public URL and key: admins sign in as themselves, are listed in `public.admins`, and every read and write is an `admin_*` SECURITY DEFINER function that checks `is_admin()` first. Table grants don't change, so the catalogue stays read-only at table level. Suspending and deleting accounts need the service role, so they run in the `admin-users` Edge Function, which checks the caller; admins must lose admin access before either, and nobody can remove their own, so one admin always remains.
The app promises that manual products are "only you can see it", so admins don't browse `personal_products`. A person sends a product with `submit_personal_product`, which copies it into `catalog_submissions`. Approving creates a catalogue product or links to an existing variant, and sets `linked_variant_id`; the person's entry, notes and photo don't change. Their photo is readable by admins only while the submission waits (it's the person's, not licensed for the catalogue, D16). For an account, admins see email, dates and totals, not library contents or the display name. Every change is written to `admin_activity`, without emails.
In the app, a product added manually has a Catalogue section on its page: Send to catalogue says what is shared before anything leaves the library, then shows waiting, added, or not added with the reason. The section hides itself if the lookup fails, so the app keeps working on a database without this migration.
*Reversal:* remove `send-to-catalogue.tsx` from the item page, then drop the migration's tables and functions and the Edge Function.
