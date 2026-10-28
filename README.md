# Beauty Shelf

A private beauty library for makeup, skincare, fragrance and haircare — know what you own, remember what you loved, and curate one beautiful shelf.

Expo (SDK 58) + React Native + TypeScript · Supabase (Auth, Postgres + RLS, Storage) · TanStack Query · React Hook Form + Zod.

- Product brief: `beauty_shelf_mvp_for_claude.md` (source of truth)
- Plan and status: [`docs/PLAN.md`](docs/PLAN.md)
- Why things are the way they are: [`docs/DECISIONS.md`](docs/DECISIONS.md)

## Setup

Prerequisites: Node 20+, the Supabase CLI (installed as a dev dependency via `npx supabase`), Docker for the local Supabase stack.

**Quick start** (Docker/OrbStack must be running):
```bash
./scripts/setup-local.sh    # installs, starts Supabase, migrates + seeds, writes .env.local, runs all tests
npm start                   # then press i / a / w
```

Manual equivalent:
```bash
npm install
npx supabase start          # local Postgres, Auth, Storage, Studio
npx supabase db reset       # applies supabase/migrations + supabase/seed.sql
cp .env.example .env.local  # paste the API URL and anon key printed by `supabase start`
npm start
```

Native modules are SDK 58 builds; if Expo Go for SDK 58 isn't available on your device yet, use a development build: `npx expo run:ios` or `npx expo run:android`.

Local auth has email confirmation turned off (`supabase/config.toml`). In a hosted project, enable it and configure SMTP; the sign-up screen already handles the "check your inbox" state.

### Account deletion
Deploy the Edge Function so the in-app "Delete account" works:
```bash
npx supabase functions deploy delete-account
```
Locally, `npx supabase functions serve` runs it.

## Scripts

| Command | What it does |
|---|---|
| `npm run check` | typecheck + lint + unit tests |
| `npm run test:db` | builds a throwaway Postgres DB from the migrations + seed and runs the RLS / constraint / RPC suite |
| `npm run db:types` | regenerates `src/data/database.types.ts` from the local Supabase schema |

`npm run test:db` defaults to `postgresql://postgres:postgres@localhost:5432/postgres` (override with `TEST_DB_ADMIN_URL`). Against a running local Supabase instead:
```bash
npx supabase db reset
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55322/postgres SKIP_DB_BUILD=1 npm run test:db
```

## Layout

```
src/app/            routes (Expo Router): (auth) sign in/up, (tabs) Home · Library · Collections · Profile
src/components/     design-system primitives and product rows
src/data/           Supabase repositories, query hooks, generated DB types
src/domain/         pure logic (status rules, sorting, search matching, validation) + unit tests
src/theme/          design tokens
supabase/migrations schema, RLS + grants, RPCs, storage policies
supabase/tests      database tests (node:test) + plain-Postgres shim
supabase/functions  delete-account Edge Function
```

## Data notes
The seed catalog is entirely fictional and contains no imagery. Do not import third-party product data or images without confirming licensing (brief §9).
