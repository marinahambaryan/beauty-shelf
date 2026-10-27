# Changelog

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
