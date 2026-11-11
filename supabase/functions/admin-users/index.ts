// Supabase Edge Function: account actions for the admin console, the ones that need the
// service role. 1) verifies the caller's JWT, 2) checks they are an admin, in the database,
// 3) suspends, restores or deletes the target account. Runs with the service role, which
// exists only in the Edge runtime, never in the console (D21, D22).
import { createClient } from 'npm:@supabase/supabase-js@2';

const BUCKET = 'product-photos';
// Supabase has no "forever" ban; a hundred years will do.
const SUSPEND_DURATION = '876000h';

type Action = 'suspend' | 'restore' | 'delete';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const authHeader = req.headers.get('Authorization') ?? '';
  const url = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const asCaller = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userError } = await asCaller.auth.getUser();
  if (userError || !userData.user) return json({ error: 'unauthorized' }, 401);

  const { data: isAdmin, error: adminError } = await asCaller.rpc('is_admin');
  if (adminError || isAdmin !== true) return json({ error: 'not_admin' }, 403);

  let body: { action?: Action; userId?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  const { action, userId } = body;
  if (!userId || !['suspend', 'restore', 'delete'].includes(action ?? '')) {
    return json({ error: 'bad_request' }, 400);
  }

  const { data: target, error: targetError } = await asCaller.rpc('admin_get_user', { p_id: userId });
  if (targetError) return json({ error: 'lookup_failed' }, 500);
  if (!target) return json({ error: 'not_found' }, 404);
  // Admins lose admin access first, so nobody can lock another admin out by accident.
  if (action !== 'restore' && target.is_admin) return json({ error: 'target_is_admin' }, 409);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  if (action === 'delete') {
    // Same order as delete-account: files first, then the user; rows cascade.
    for (;;) {
      const { data: files, error } = await admin.storage.from(BUCKET).list(userId, { limit: 100 });
      if (error) return json({ error: 'storage_list_failed' }, 500);
      if (!files || files.length === 0) break;
      const { error: rmError } = await admin.storage.from(BUCKET).remove(files.map((f) => `${userId}/${f.name}`));
      if (rmError) return json({ error: 'storage_remove_failed' }, 500);
    }
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) return json({ error: 'delete_failed' }, 500);
  } else {
    const { error } = await admin.auth.admin.updateUserById(userId, {
      ban_duration: action === 'suspend' ? SUSPEND_DURATION : 'none',
    });
    if (error) return json({ error: 'update_failed' }, 500);
  }

  // The account has changed whatever happens here, so a failed log entry isn't a failed action.
  const logged = { suspend: 'user.suspended', restore: 'user.restored', delete: 'user.deleted' }[action!];
  const { error: logError } = await asCaller.rpc('admin_record_user_action', { p_action: logged, p_user_id: userId });
  if (logError) console.error('admin-users: could not record activity', logError.message);

  return json({ ok: true }, 200);
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
