// Supabase Edge Function: permanently deletes the calling user's account.
// 1) verifies the caller's JWT, 2) removes their files from the private photo bucket,
// 3) deletes the auth user — database rows cascade from auth.users (see migrations).
// Runs with the service role, which exists only in the Edge runtime, never in the app.
import { createClient } from 'npm:@supabase/supabase-js@2';

const BUCKET = 'product-photos';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const authHeader = req.headers.get('Authorization') ?? '';
  const url = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const asCaller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: userError } = await asCaller.auth.getUser();
  if (userError || !userData.user) return json({ error: 'unauthorized' }, 401);
  const userId = userData.user.id;

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // Remove every object under "<uid>/", paging through the folder.
  for (;;) {
    const { data: files, error } = await admin.storage.from(BUCKET).list(userId, { limit: 100 });
    if (error) return json({ error: 'storage_list_failed' }, 500);
    if (!files || files.length === 0) break;
    const { error: rmError } = await admin.storage.from(BUCKET).remove(files.map((f) => `${userId}/${f.name}`));
    if (rmError) return json({ error: 'storage_remove_failed' }, 500);
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) return json({ error: 'delete_failed' }, 500);
  return json({ ok: true }, 200);
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
