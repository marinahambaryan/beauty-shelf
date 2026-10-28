import pg from 'pg';

// Matte Revolution Lipstick in Pillow Talk / Walk of No Shame; Double Wear in 1W2 Sand.
export const LIP_ROSEWOOD = 'c0000000-0000-4000-8000-000000000101';
export const LIP_CINEMA_RED = 'c0000000-0000-4000-8000-000000000102';
export const FOUNDATION_HONEY = 'c0000000-0000-4000-8000-000000000302';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set — run via scripts/db-test.sh');

export const admin = new pg.Pool({ connectionString: url, max: 4 });

/** Creates an auth user (as the superuser, like Supabase Auth would) and returns its id. */
export async function createUser(label) {
  const email = `${label}-${Math.random().toString(36).slice(2)}@test.local`;
  const { rows } = await admin.query('insert into auth.users (email) values ($1) returning id', [email]);
  return rows[0].id;
}

/**
 * Runs fn(query) inside a transaction as the given user, exactly as PostgREST does:
 * role "authenticated" with the JWT claims set. uid = null runs as "anon".
 * The transaction is committed so later steps can observe the result.
 */
export async function as(uid, fn) {
  const client = await admin.connect();
  try {
    await client.query('begin');
    await client.query(`set local role ${uid ? 'authenticated' : 'anon'}`);
    await client.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify(uid ? { sub: uid, role: 'authenticated' } : { role: 'anon' }),
    ]);
    const q = async (sql, params) => (await client.query(sql, params)).rows;
    const result = await fn(q);
    await client.query('commit');
    return result;
  } catch (e) {
    await client.query('rollback').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

/** Asserts that running fn as uid fails, optionally matching the message. */
export async function expectDenied(uid, fn, pattern) {
  let error;
  try {
    await as(uid, fn);
  } catch (e) {
    error = e;
  }
  if (!error) throw new Error(`expected failure${pattern ? ` matching ${pattern}` : ''}, but it succeeded`);
  if (pattern && !pattern.test(error.message)) {
    throw new Error(`expected error matching ${pattern}, got: ${error.message}`);
  }
  return error;
}
