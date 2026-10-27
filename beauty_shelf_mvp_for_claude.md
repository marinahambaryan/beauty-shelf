# BEAUTY SHELF — MVP PRODUCT REQUIREMENTS & IMPLEMENTATION BRIEF

**Version:** 1.0 | **Date:** October 27, 2026 | **Audience:** Claude (product/design/engineering implementation)

## 0. Instructions for Claude

Treat this document as the product source of truth for an initial production-minded mobile MVP. **Do not build every feature in one pass.** First inspect the existing repository, summarize its state, propose a short milestone plan, and implement in vertical slices. If the repo is empty, scaffold it. Prefer a coherent, tested, polished core over speculative features. Do not silently expand scope. When requirements are ambiguous, make the smallest reversible decision, document it, and continue; ask only when a decision has material irreversible impact.

For each milestone: implement, add relevant tests, run typecheck/lint/tests, report changed files and remaining risks, then propose the next milestone. Avoid fake working buttons, misleading success states, placeholder remote data masquerading as live catalog content, and invented third-party APIs.

## 1. Product vision

Beauty Shelf is a personal beauty library for makeup, skincare, fragrance, and haircare. Inspired by the organizing and reviewing habits of Goodreads, but differentiated by **curated personal collections, aesthetically arranged shelves, mindful consumption, and a subtle nostalgic beauty-editorial personality**.

**Core promise:** Know what you own, remember what you loved, and curate your beauty world.

The app must deliver value for a single user with zero followers. It is not primarily an e-commerce marketplace, influencer feed, or ingredient-scoring app.

### Product principles

1. **Utility before decoration.** Large collections must remain practical to browse, search, and edit.
2. **Collection ≠ visual shelf.** Collections organize items; a shelf is an optional curated visual presentation of selected items.
3. **One canonical product, many personal experiences.** Catalog identity is separate from a user's ownership and usage history.
4. **Low-friction capture.** Catalog search first, manual fallback; no mandatory review or lengthy form.
5. **Editorial but restrained.** Minimal typography, warm neutrals, considered spacing, nostalgic 2010s beauty-magazine accents without clutter.
6. **Privacy by default.** MVP user data and collections are private; social publishing is future scope.

## 2. Target users and jobs to be done

**Primary:** Beauty enthusiasts with a growing makeup/skincare collection who want to organize it and remember product experiences.

**Secondary:** Mindful consumers tracking empties, repurchases, and planned purchases; users who enjoy curating aesthetic themed collections.

Core jobs:
- “I want to see what I own without rummaging through drawers.”
- “I want to remember which shade I bought and whether I liked it.”
- “I want a wishlist and a practical shopping list without duplicating products.”
- “I want to make a small, beautiful shelf of favorites without displaying all 150 products.”
- “I want to mark something finished and know whether I would buy it again.”

## 3. MVP boundaries

### Must ship (P0)
- Email/password authentication and session persistence (or equivalent supported Supabase auth); account deletion path.
- Product catalog: browse/search by brand/name, basic categories, product detail and variant/shade selection.
- Manual private product entry when missing; edit personal entries; optional photo upload.
- Add product to personal library with ownership state: **Owned**, **Wishlist**, **Finished**. For Owned, optional usage state **Unopened**, **Using**, **Paused**.
- Default library views: All Products, Owned, Wishlist, Finished; search, category filter, sorting.
- User-created **custom collections** with name, optional description/cover, add/remove items, manual ordering; products may belong to multiple collections.
- **Shopping List** as a special collection with quantities, checked/unchecked items and simple “mark purchased” flow; no checkout, pricing engine, or merchant integration.
- One **curated shelf** presentation: select items from the user's library, reorder via explicit edit mode and drag handles, save arrangement. The same collection also has an accessible list/grid mode.
- Lightweight personal product notes, 1–5 rating (optional), repurchase intent (Yes/No/Unsure), and finished date (optional).
- Basic profile/settings, sign out, empty/loading/error/offline states.

### Should ship if time permits (P1)
- Multiple curated shelves and cover styles.
- Simple personal stats: counts owned, finished, wishlist, and top-rated.
- Barcode scanning only after verifying a lawful, reliable product-data source.
- Submission of private manual products for moderated inclusion in public catalog.
- Import/export personal library as CSV.

### Explicitly not MVP (P2)
- Public profiles, follows, comments, social feeds, community reviews.
- AI recommendations, skin diagnostics, ingredient safety claims.
- Store integrations, live pricing, affiliate links, checkout, automated price tracking.
- Full Project Pan program, detailed inventory quantities and spending analytics.
- Monthly/yearly interactive magazine issues or AI-generated editorial recaps.
- Highly realistic 3D shelf physics, freeform placement, animations that impair accessibility.

## 4. Information architecture

**Bottom navigation (four destinations):**
1. **Home:** welcome, quick Add Product, current favorites/curated shelf preview, recent activity, library counts. Keep lightweight.
2. **Library:** All / Owned / Wishlist / Finished, search and filters, entry detail, add product.
3. **Collections:** user collections, Shopping List, curated shelves; create/manage.
4. **Profile:** personal stats (simple), settings, account.

Global primary action: **Add product** accessible from Home and Library; optionally contextually from collections. Search catalog and create manual entry are two paths into the same add flow.

Do not make every collection render as a decorative shelf. Default large collections to grid/list; shelf mode is curated and intentionally limited.

## 5. Collection model and UX

### Types

**A. System views (not editable collections):** All Products, Owned, Wishlist, Finished. Derived from library item state. Users cannot rename/delete them.

**B. Custom collection:** Named grouping such as “Everyday Makeup”, “Summer Favorites”, “Lip Combos”, “Products to Try”. Can contain owned, wishlisted, or finished items. Membership does not change item ownership status.

**C. Shopping List:** One default special collection, separate from Wishlist. Items may be catalog products or personal products. Supports checked state and desired quantity; “Purchased” should optionally create/update an Owned library entry and clear/check off the shopping item after confirmation. No payment integration.

**D. Curated shelf:** A presentation of a subset of library items, associated with a custom collection or a standalone named shelf. MVP: support one named shelf with a defined item limit (suggest 12 visible products), fixed layout slots and drag reordering; no arbitrary pixel positioning. Preserve list/grid fallback. If a product is removed from the library, remove or gracefully mark its shelf placement; never show a broken card.

### Creation and interaction

Collections tab → Create → choose **Collection** or **Curated Shelf**. Shopping List exists by default. Name required; description/cover optional. Choose products from searchable library; multi-select; save. In collection: add/remove, reorder, rename, delete collection (never delete underlying library items). Product may be in multiple collections.

### Shelf editor

- View mode and Edit mode are visually distinct.
- Edit: drag handles and long-press drag on mobile; visible placeholder and haptic feedback where supported; save/cancel; undo last move if feasible.
- Accessibility: provide Move left/right or Move earlier/later actions without drag; maintain logical reading order.
- Auto-scroll when dragging near edge; handle canceled gesture and interrupted session.
- Do not persist reorder until Save; Cancel restores original order.
- Respect shelf capacity; if full, show a clear message and offer replacement/removal, never silently drop an item.
- Product tap in view mode opens item detail; tap in edit mode selects/reorders without accidental navigation.
- A shelf should show a small, art-directed selection; users with many products should use library grid/list.

## 6. Product catalog and add-to-shelf UX

### Canonical catalog structure

- Brand → Product → Variant (shade, size, formulation as needed).
- Product has stable identity, category, name, brand, description (optional), image (optional).
- Variant has shade/size label and optional barcode; avoid conflating distinct shades or reformulations.
- Ratings and notes belong to a user's experience, not to the shared catalog record.

### Primary flow

1. Tap Add Product.
2. Search by product or brand. Debounced results, loading/error/empty states; never imply a result exists when it does not.
3. Select product and required variant when relevant.
4. Choose destination: Owned / Wishlist / Finished. Optional add to collection(s) and optional note; do not require a rating.
5. Confirm and show success with View in Library and Add Another.

### Manual fallback

- Always offer **Can't find it? Add manually** (not only on empty results).
- Required: brand (free text), product name, broad category. Optional: shade/size, image, notes.
- Mark as **Personal entry**; it is private and usable immediately in collections/shelves.
- Suggest potential matches when possible, but do not block saving.
- No automatic public catalog publishing.
- Manual entry may later be linked to a canonical product without deleting shelf/notes/history.

### Duplicate and repeated purchase policy

- One **library identity per user + product variant** in MVP; attempting to add an already-present item should open existing entry and offer status change/add-to-collection, not silently duplicate.
- Preserve meaningful repeat-purchase events in a future extensible structure, but MVP need not manage individual bottles.
- A Wishlist item moved to Owned should be a status transition, not a second item.
- Finished items can be moved back to Owned upon repurchase, while a completion event/history entry is retained where implemented.

## 7. Personal product experience

Entry detail includes product image/name/variant, status, optional usage state, rating (1–5), notes, repurchase intent, and optional finished date. Status updates are editable. No requirement to write a review to finish a product. Keep catalog fields read-only except on private manual entries. Separate deletion from “Finished”: deleting removes the library association and should require confirmation if it would erase user notes.

## 8. Mobile design direction

**Tone:** Minimalist, editorial, personal, quietly playful; subtle 2010s magazine nostalgia (issue labels, small serif accents, collage-like cover treatments), but avoid copying existing magazine branding.

- Warm ivory/off-white base, charcoal text, muted rose/taupe accents; maintain accessible contrast.
- Clean sans-serif for body/UI, expressive editorial serif only for headlines or covers.
- Real product imagery is the hero; consistent image containment, no cropped shade labels where avoidable.
- Generous spacing, readable type, large touch targets, clear selected states.
- Prefer bottom sheets for quick actions and full screens for complex editing.
- Support dynamic text sizes, screen readers, reduced motion, keyboard avoidance, safe areas, and empty states.
- **Magazine-inspired recap** is a later feature; MVP may use editorial-style headers and collection covers only.

## 9. Recommended implementation stack

- **Mobile:** Expo + React Native + TypeScript + Expo Router.
- **Backend:** Supabase Auth, PostgreSQL with Row Level Security, Storage for user-uploaded product photos.
- **Data fetching:** TanStack Query; use a small, consistent service/repository layer.
- **Forms:** React Hook Form + Zod validation.
- **State:** Local state for ephemeral UI; avoid global state unless shared state truly requires it.
- **UI:** Custom reusable design tokens/components. Select maintained Expo-compatible gesture and animation packages for drag interactions after confirming SDK compatibility.
- **Testing:** Unit tests for state transitions/data helpers; integration tests for RLS and collection membership; at least one smoke E2E flow if practical.

External product data is **not guaranteed**. Build a catalog provider interface and a small licensed/owned seed dataset for development. Research third-party API licensing, geographic coverage, variant quality, and image rights before importing at scale. Never scrape copyrighted product imagery without permission.

## 10. Proposed data model (logical, not final SQL)

- `profiles(id, display_name, created_at)`
- `brands(id, name, normalized_name)`
- `products(id, brand_id, name, category, description, image_url, catalog_status, created_at)`
- `product_variants(id, product_id, label, shade_name, size_label, barcode_nullable, image_url_nullable)`
- `personal_products(id, user_id, brand_name, name, category, variant_label, image_path_nullable, created_at)`
- `library_items(id, user_id, catalog_variant_id_nullable, personal_product_id_nullable, ownership_status, usage_status_nullable, rating_nullable, notes_nullable, repurchase_intent_nullable, finished_at_nullable, created_at, updated_at)`
- `collections(id, user_id, type, name, description_nullable, cover_path_nullable, created_at)` where type = `custom | shopping | shelf` (system views are derived)
- `collection_items(id, collection_id, library_item_id_nullable, catalog_variant_id_nullable, personal_product_id_nullable, sort_order, checked_nullable, desired_quantity_nullable, created_at)`
- `shelf_layouts(id, collection_id, layout_version, updated_at)` and `shelf_slots(id, shelf_layout_id, library_item_id, slot_index)`
- `product_events(id, library_item_id, event_type, occurred_at, metadata_json)` for optional future-proof history of finished/repurchased transitions.

**Schema invariants:**
- `library_items` references **exactly one** of catalog variant or personal product; enforce with CHECK constraint.
- One active library item per user/catalog variant; one per user/personal product. Use partial unique indexes where appropriate.
- Collection membership must be owned by the same user as collection; enforce via RLS and/or database functions, not client checks alone.
- Shopping items may reference products not yet in library; regular collection and shelf items should reference library entries.
- Shelf slot index unique within layout; enforce item limit in validated server-side mutation.
- Private image paths are scoped to user and protected by storage policies.
- All user-owned tables have RLS policies; users can read/write only their own data. Catalog is readable to authenticated users; catalog edits are privileged.
- Prefer soft archive or explicit deletion behavior for user data with predictable cascade rules.

Claude should refine this logical model into a normalized schema, migrations, constraints, and RLS policies before implementation. Do not assume client-only uniqueness checks are sufficient.

## 11. Core screens

1. Onboarding / Sign in / Sign up.
2. Home dashboard (quick add, curated shelf preview, counts, recent products).
3. Catalog search/results + manual-entry option.
4. Catalog product detail + variant picker.
5. Add-to-library sheet (status, optional collections).
6. Library browse (All/Owned/Wishlist/Finished, search/filter/sort).
7. Personal library item detail/editor.
8. Collections index (custom, shopping, curated shelf).
9. Create/edit custom collection + product picker.
10. Shopping List detail and mark-purchased action.
11. Shelf view + shelf edit mode.
12. Profile/settings.

## 12. Edge cases and expected behavior

- **No catalog result:** show manual-entry CTA; preserve typed query where useful.
- **Catalog search unavailable:** retry, explain network failure, allow manual entry.
- **Missing product image:** elegant placeholder; no broken layout.
- **Product without variants:** add directly; no meaningless variant selector.
- **Duplicate addition:** open existing library entry; no silent duplication.
- **Same product in several collections:** membership is independent; removing from one does not remove from others.
- **Delete collection:** confirmation; never delete its products from library.
- **Delete library item:** warn about effects on shelves/collections; transactional cleanup.
- **Shopping list item already owned:** allow it (repurchase) without changing ownership until purchase confirmed.
- **Shelf full:** explain limit; provide remove/replace action.
- **Interrupted drag:** revert unsaved edit and preserve persisted order.
- **Concurrent edits/multiple devices:** use updated_at/version conflict handling; avoid silent overwrites.
- **Offline:** cached library read where feasible; do not pretend remote writes succeeded. Show retry and unsaved state.
- **Slow photo upload:** progress, cancellation/error handling; no orphaned uploads where feasible.
- **Long names and RTL/non-Latin text:** wrapping/truncation, international input support.
- **Empty states:** useful guidance and direct actions rather than decorative blank screens.

## 13. Security, privacy and operational requirements

- Supabase RLS tested for cross-user reads/writes, including collection membership and storage.
- No service-role key in mobile client; use privileged server functions only when necessary.
- Validate user input at boundaries; cap image size/type, sanitize filenames and display content.
- Catalog and user-uploaded images must have legal usage rights.
- Account deletion should remove or schedule removal of user-owned data and uploads.
- Avoid unnecessary personal data and analytics. Add crash/error monitoring only with transparent privacy handling.
- Include migrations, seed data, `.env.example`, setup instructions, and reproducible development scripts.

## 14. Acceptance criteria — MVP release gate

- A new user can sign up, search a seeded catalog, choose a shade, and add it to Owned in under a few clear steps.
- A user can manually create a missing product and see it in Library immediately.
- A user cannot accidentally create duplicate library entries for the same catalog variant.
- A user can move a product between Wishlist, Owned, and Finished while retaining notes/rating.
- A user can create a custom collection and add the same product to multiple collections.
- Removing a product from a collection does not remove it from the library.
- Shopping List can contain products not owned, be checked off, and support a clear mark-purchased transition.
- A user can populate and reorder a curated shelf, save/cancel edits, and reopen to see the persisted order.
- A large library remains usable in list/grid without requiring shelf presentation.
- Cross-user access to private data is blocked by database/storage policies and verified by tests.
- Every core screen has appropriate loading, error, empty, and success states.
- App builds, typechecks, passes relevant tests, and runs on supported Expo targets.

## 15. Delivery plan for Claude

### Milestone 0 — Repository audit and foundation
Inspect existing code. Confirm Expo SDK compatibility, architecture, environment, scripts. Produce a brief implementation plan and list external dependencies/unknowns.

### Milestone 1 — Auth + schema + seed catalog
Set up Supabase migrations, RLS tests, auth, catalog models, seed products/variants, typed repositories.

### Milestone 2 — Search + manual add + personal library
Implement product search, variant selection, manual creation, add/status transitions, duplicate handling, library grid/list, detail editing.

### Milestone 3 — Collections + Shopping List
Implement custom collections, membership, multi-select picker, shopping list check/purchase flow, reliable deletion behavior.

### Milestone 4 — Curated shelf editor
Implement visual shelf, limited slots, edit mode, reorder, save/cancel, accessibility controls, list fallback.

### Milestone 5 — Polish + release hardening
Editorial design system, images, empty/error/offline handling, accessibility, RLS/security tests, performance, setup docs, end-to-end smoke tests.

**Definition of done for every milestone:** runnable implementation, no TypeScript errors, relevant tests passing, no unimplemented primary actions, clear changelog, and explicitly documented known limitations.

## 16. Suggested first prompt to Claude

> You are the lead product engineer for Beauty Shelf. Read `beauty_shelf_mvp_for_claude.md` as the source of truth. Start with Milestone 0 only: inspect the repository and report what exists, identify gaps against the MVP, propose a pragmatic implementation sequence and concrete architecture/data-model decisions, and flag any risky assumptions. Do not implement all milestones at once. If the repo is empty, propose a minimal Expo + TypeScript + Supabase scaffold. Keep the design minimalist, editorial, and mobile-first. Prioritize correct product identity, privacy/RLS, and a fast add-to-library flow over decorative features. Ask me only for blocking decisions.

## 17. Deferred roadmap (do not implement yet)

- Magazine-style monthly/yearly beauty recaps with curated covers and personal insights.
- Project Pan challenges, empties timeline, individual purchase units and repurchase analytics.
- Public collections, follows, reviews, discovery feed.
- Smart suggestions, ingredient metadata, barcode scanning where data licensing permits.
- More sophisticated shelf templates, collage customization, shareable editorial exports.

---

**Final scope rule:** The MVP is successful when one person can reliably build, maintain, and enjoy a private beauty library with useful collections and one beautiful curated shelf. Everything else is secondary.
