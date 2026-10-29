#!/usr/bin/env node
// Creates (or reuses) a demo account on the LOCAL Supabase stack and fills its library
// with a few catalogue products, so the app has something to show straight away.
//
//   npm run demo:user
//
// Uses only the public anon key from .env.local and the normal sign-up API, exactly like
// the app does. Local email confirmation is off (supabase/config.toml), so the account
// works immediately. Safe to re-run: it signs in if the account already exists, and
// adding a product twice never duplicates it.
import { readFileSync } from 'node:fs';

const EMAIL = 'demo@beautyshelf.local';
const PASSWORD = 'ShelfDemo2026';
const NAME = 'Demo';

// [variant id, status, usage, note]: ids are the stable ones in supabase/seed.sql.
const ITEMS = [
  ['c0000000-0000-4000-8000-000000000101', 'owned', 'using', 'My everyday shade.'], // Matte Revolution — Pillow Talk
  ['c0000000-0000-4000-8000-000000000201', 'owned', 'using', null], // Soft Pinch — Joy
  ['c0000000-0000-4000-8000-000000001001', 'owned', 'unopened', null], // Black Saffron — 50 ml
  ['c0000000-0000-4000-8000-000000000302', 'wishlist', null, 'Try in store first.'], // Double Wear — 1W2 Sand
  ['c0000000-0000-4000-8000-000000000501', 'finished', null, null], // Dipbrow — Taupe
];

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => /^\s*EXPO_PUBLIC_\w+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);
const url = env.EXPO_PUBLIC_SUPABASE_URL;
const anon = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anon) {
  console.error('✗ .env.local is missing the Supabase URL or anon key. Run `npm run setup` first.');
  process.exit(1);
}

async function call(path, body, token = anon) {
  const res = await fetch(`${url}${path}`, {
    method: 'POST',
    headers: { apikey: anon, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  return { ok: res.ok, status: res.status, data };
}

try {
  let session = await call('/auth/v1/signup', { email: EMAIL, password: PASSWORD });
  if (!session.ok || !session.data?.access_token) {
    // Already registered (or signup returned no session): sign in instead.
    session = await call('/auth/v1/token?grant_type=password', { email: EMAIL, password: PASSWORD });
  }
  const token = session.data?.access_token;
  if (!token) {
    console.error('✗ Could not create or sign in the demo account:', session.status, session.data);
    process.exit(1);
  }
  const userId = session.data.user.id;

  const profile = await fetch(`${url}/rest/v1/profiles?id=eq.${userId}`, {
    method: 'PATCH',
    headers: { apikey: anon, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ display_name: NAME }),
  });
  if (!profile.ok) console.warn('! Could not set the display name:', profile.status);

  let added = 0;
  for (const [variant, status, usage, note] of ITEMS) {
    const r = await call(
      '/rest/v1/rpc/add_variant_to_library',
      { p_variant_id: variant, p_status: status, p_usage: usage, p_notes: note },
      token,
    );
    if (!r.ok) console.warn('! Could not add', variant, r.status, r.data);
    else if (r.data?.[0]?.created) added += 1;
  }

  console.log(`\n✓ Demo account ready (${added} products added, ${ITEMS.length - added} already there)\n`);
  console.log(`  Email:     ${EMAIL}`);
  console.log(`  Password:  ${PASSWORD}\n`);
} catch (error) {
  console.error(`✗ Can't reach Supabase at ${url}. Is the local stack running? (npx supabase start)`);
  console.error(' ', error instanceof Error ? error.message : error);
  process.exit(1);
}
