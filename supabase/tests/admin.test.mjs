import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { admin, as, createUser, expectDenied, LIP_ROSEWOOD } from './helpers.mjs';

const DOKDO = 'a0000000-0000-4000-8000-000000000018';
let owner;
let helper;
let alice;
let bob;

const one = (rows) => Object.values(rows[0])[0];
const addManually = (uid, name = 'Tiny Balm', brand = 'Small Batch') =>
  as(uid, async (q) => {
    await q(`select create_personal_product($1, $2, 'skincare', 'owned')`, [brand, name]);
    return (await q('select id from personal_products where name = $1', [name]))[0].id;
  });
const submit = (uid, productId, note = null) =>
  as(uid, (q) => q('select submit_personal_product($1, $2)', [productId, note])).then(one);

before(async () => {
  // The plain-Postgres shim has a reduced auth.users; Supabase already has these columns.
  await admin.query('alter table auth.users add column if not exists last_sign_in_at timestamptz');
  await admin.query('alter table auth.users add column if not exists banned_until timestamptz');
  owner = await createUser('owner');
  helper = await createUser('helper');
  alice = await createUser('alice');
  bob = await createUser('bob');
  await admin.query('insert into public.admins (user_id) values ($1)', [owner]);
});
after(() => admin.end());

describe('admin access', () => {
  test('is_admin answers for the caller', async () => {
    assert.equal(await as(owner, (q) => q('select is_admin()')).then(one), true);
    assert.equal(await as(alice, (q) => q('select is_admin()')).then(one), false);
  });

  test('every admin function refuses people who are not admins', async () => {
    const { rows } = await admin.query(
      `select p.oid::regprocedure::text as sig, p.proname, pg_get_function_identity_arguments(p.oid) as args
       from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'admin\\_%'`,
    );
    assert.ok(rows.length >= 20);
    for (const { proname, args } of rows) {
      const nulls = args ? args.split(',').map(() => 'null').join(', ') : '';
      await expectDenied(alice, (q) => q(`select ${proname}(${nulls})`), /not_admin/);
    }
  });

  test('anon cannot run admin functions', async () => {
    await expectDenied(null, (q) => q('select admin_overview()'), /permission denied/);
    await expectDenied(null, (q) => q('select is_admin()'), /permission denied/);
  });

  test('internal helpers are out of reach even for signed-in people', async () => {
    await expectDenied(alice, (q) => q(`select record_admin_action('x', 'y', null, 'z')`), /permission denied/);
    await expectDenied(alice, (q) => q(`select ensure_brand('Nope')`), /permission denied/);
    await expectDenied(alice, (q) => q(`select lock_pending_submission(gen_random_uuid())`), /permission denied/);
  });

  test('nobody reaches the admin tables directly', async () => {
    await expectDenied(alice, (q) => q('select * from admins'), /permission denied/);
    await expectDenied(alice, (q) => q('select * from admin_activity'), /permission denied/);
    await expectDenied(alice, (q) => q('insert into admins (user_id) values (auth.uid())'), /permission denied/);
    await expectDenied(owner, (q) => q('delete from admin_activity'), /permission denied/);
  });

  test('the catalogue stays read-only to tables, even for admins', async () => {
    await expectDenied(owner, (q) => q(`update products set name = 'x'`), /permission denied/);
  });

  test('you can add an admin but cannot remove yourself', async () => {
    await as(owner, (q) => q('select admin_set_admin($1, true)', [helper]));
    assert.equal(await as(helper, (q) => q('select is_admin()')).then(one), true);
    await expectDenied(owner, (q) => q('select admin_set_admin($1, false)', [owner]), /cannot_remove_self/);
    await as(owner, (q) => q('select admin_set_admin($1, false)', [helper]));
    assert.equal(await as(helper, (q) => q('select is_admin()')).then(one), false);
  });
});

describe('privacy', () => {
  test('products added manually stay hidden until their owner sends them', async () => {
    await addManually(alice, 'Secret Serum');
    const queue = await as(owner, (q) => q(`select admin_list_submissions('pending')`)).then(one);
    assert.ok(!queue.rows.some((r) => r.name === 'Secret Serum'));
    const rows = await as(owner, (q) => q(`select * from personal_products where name = 'Secret Serum'`));
    assert.equal(rows.length, 0, 'admins get no special read on private tables');
  });

  test('user details carry counts, not library contents or the display name', async () => {
    await as(alice, (q) => q(`update profiles set display_name = 'Alice Private' where id = auth.uid()`));
    const u = await as(owner, (q) => q('select admin_get_user($1)', [alice])).then(one);
    assert.equal(u.library_count >= 1, true);
    assert.equal(JSON.stringify(u).includes('Secret Serum'), false);
    assert.equal(JSON.stringify(u).includes('Alice Private'), false);
    const list = await as(owner, (q) => q('select admin_list_users($1)', ['alice'])).then(one);
    assert.equal(JSON.stringify(list).includes('Alice Private'), false);
  });

  test('admins can read a submitted photo while it waits, and no other', async () => {
    const pp = await as(alice, async (q) => {
      const li = await q(`select create_personal_product('B', 'Photo Thing', 'skincare', 'owned', null, null, auth.uid() || '/a.jpg')`);
      return (await q(`select id from personal_products where name = 'Photo Thing'`))[0].id;
    });
    await admin.query(`insert into storage.objects (bucket_id, name) values
      ('product-photos', $1), ('product-photos', $2)`, [`${alice}/a.jpg`, `${alice}/private.jpg`]);
    const sub = await submit(alice, pp);
    const seen = await as(owner, (q) => q(`select name from storage.objects where bucket_id = 'product-photos'`));
    assert.deepEqual(seen.map((r) => r.name), [`${alice}/a.jpg`]);
    await as(owner, (q) => q('select admin_reject_submission($1)', [sub]));
    const after = await as(owner, (q) => q(`select name from storage.objects where bucket_id = 'product-photos'`));
    assert.deepEqual(after, []);
  });

  test('only admins can write catalogue images', async () => {
    const insert = (q) => q(`insert into storage.objects (bucket_id, name) values ('catalog-images', 'x-' || gen_random_uuid())`);
    await expectDenied(alice, insert, /row-level security/);
    await as(owner, insert);
  });
});

describe('submissions', () => {
  test('people can only send their own products, once at a time', async () => {
    const pp = await addManually(alice, 'Only Mine');
    await expectDenied(bob, (q) => q('select submit_personal_product($1)', [pp]), /product not found/);
    const first = await submit(alice, pp, 'Sold at my local shop');
    const again = await submit(alice, pp);
    assert.equal(first, again);
    const own = await as(alice, (q) => q('select name, note, status from catalog_submissions where id = $1', [first]));
    assert.deepEqual(own, [{ name: 'Only Mine', note: 'Sold at my local shop', status: 'pending' }]);
    assert.equal((await as(bob, (q) => q('select id from catalog_submissions where id = $1', [first]))).length, 0);
  });

  test('approving creates a catalogue product and links the person, keeping their entry', async () => {
    const pp = await addManually(alice, 'Glow Drops', 'Brand New Brand');
    const sub = await submit(alice, pp);
    const productId = await as(owner, (q) =>
      q(`select admin_approve_submission($1, 'Brand New Brand', 'Glow Drops', 'skincare', 'Face oil.')`, [sub])).then(one);

    const found = await as(alice, (q) => q(`select product_name, brand_name, default_variant_id from search_catalog('glow drops')`));
    assert.equal(found.length, 1);
    assert.equal(found[0].brand_name, 'Brand New Brand');
    const [mine] = await as(alice, (q) => q('select linked_variant_id from personal_products where id = $1', [pp]));
    assert.equal(mine.linked_variant_id, found[0].default_variant_id);
    const lib = await as(alice, (q) => q('select id from library_items where personal_product_id = $1', [pp]));
    assert.equal(lib.length, 1);
    const [done] = await as(alice, (q) => q('select status, product_id from catalog_submissions where id = $1', [sub]));
    assert.deepEqual(done, { status: 'approved', product_id: productId });
  });

  test('approving with a shade makes it a named variant', async () => {
    const pp = await addManually(alice, 'Shade Stick', 'Shade Co');
    const sub = await submit(alice, pp);
    const id = await as(owner, (q) =>
      q(`select admin_approve_submission($1, 'Shade Co', 'Shade Stick', 'makeup', null, 'Rosewood', 'shade')`, [sub])).then(one);
    const p = await as(owner, (q) => q('select admin_get_product($1)', [id])).then(one);
    assert.equal(p.variants.length, 1);
    assert.equal(p.variants[0].label, 'Rosewood');
    assert.equal(p.variants[0].shade_name, 'Rosewood');
    assert.equal(p.variants[0].is_default, false);
  });

  test('a duplicate product name is reported, and leaves the submission waiting', async () => {
    const pp = await addManually(alice, 'Dupe');
    const sub = await submit(alice, pp);
    await expectDenied(owner, (q) =>
      q(`select admin_approve_submission($1, 'Charlotte Tilbury', 'Matte Revolution Lipstick', 'makeup')`, [sub]), /product_exists/);
    const [s] = await as(alice, (q) => q('select status from catalog_submissions where id = $1', [sub]));
    assert.equal(s.status, 'pending');
  });

  test('linking to an existing shade, and similar products are suggested', async () => {
    const pp = await addManually(alice, 'Matte Revolution Lipstick Pillow Talk', 'Charlotte Tilbury');
    const sub = await submit(alice, pp);
    const detail = await as(owner, (q) => q('select admin_get_submission($1)', [sub])).then(one);
    assert.equal(detail.similar[0].name, 'Matte Revolution Lipstick');
    assert.ok(detail.similar[0].variants.some((v) => v.id === LIP_ROSEWOOD));
    await as(owner, (q) => q('select admin_link_submission($1, $2)', [sub, LIP_ROSEWOOD]));
    const [mine] = await as(alice, (q) => q('select linked_variant_id from personal_products where id = $1', [pp]));
    assert.equal(mine.linked_variant_id, LIP_ROSEWOOD);
  });

  test('rejecting records the reason for the person, and they can send it again', async () => {
    const pp = await addManually(alice, 'Try Again');
    const sub = await submit(alice, pp);
    await as(owner, (q) => q('select admin_reject_submission($1, $2)', [sub, 'Please add the full product name.']));
    const [s] = await as(alice, (q) => q('select status, review_note from catalog_submissions where id = $1', [sub]));
    assert.deepEqual(s, { status: 'rejected', review_note: 'Please add the full product name.' });
    await expectDenied(owner, (q) => q('select admin_reject_submission($1)', [sub]), /already_reviewed/);
    assert.notEqual(await submit(alice, pp), sub);
  });

  test('deleting the product withdraws the submission', async () => {
    const pp = await addManually(alice, 'Changed My Mind');
    const sub = await submit(alice, pp);
    await as(alice, (q) => q('delete from personal_products where id = $1', [pp]));
    assert.equal(await as(owner, (q) => q('select admin_get_submission($1)', [sub])).then(one), null);
  });

  test('deleting an account removes its submissions but keeps approved products', async () => {
    const carol = await createUser('carol');
    const pp = await addManually(carol, 'Kept Product', 'Kept Brand');
    const sub = await submit(carol, pp);
    const id = await as(owner, (q) => q(`select admin_approve_submission($1, 'Kept Brand', 'Kept Product', 'skincare')`, [sub])).then(one);
    await admin.query('delete from auth.users where id = $1', [carol]);
    assert.equal(await as(owner, (q) => q('select admin_get_submission($1)', [sub])).then(one), null);
    assert.equal((await as(owner, (q) => q('select admin_get_product($1)', [id])).then(one)).name, 'Kept Product');
  });

  test('twenty waiting is the limit', async () => {
    const dave = await createUser('dave');
    for (let i = 0; i < 20; i++) await submit(dave, await addManually(dave, `Thing ${i}`));
    const last = await addManually(dave, 'One Too Many');
    await expectDenied(dave, (q) => q('select submit_personal_product($1)', [last]), /too_many_pending/);
  });
});

describe('catalogue editing', () => {
  test('a new product gets a default variant, a brand when needed, and is searchable', async () => {
    const id = await as(owner, (q) => q(`select admin_save_product(null, 'New Label', 'First Cream', 'skincare', 'Face cream.')`)).then(one);
    const p = await as(owner, (q) => q('select admin_get_product($1)', [id])).then(one);
    assert.equal(p.brand_name, 'New Label');
    assert.equal(p.variants.length, 1);
    assert.equal(p.variants[0].is_default, true);
    assert.equal((await as(alice, (q) => q(`select * from search_catalog('first cream')`))).length, 1);
  });

  test('brand matching ignores case', async () => {
    await as(owner, (q) => q(`select admin_save_product(null, 'new label', 'Second Cream', 'skincare')`));
    const brands = await as(owner, (q) => q('select admin_list_brands()')).then(one);
    assert.equal(brands.filter((b) => b.name.toLowerCase() === 'new label').length, 1);
  });

  test('archiving hides a product from search and keeps it for libraries', async () => {
    const id = await as(owner, (q) => q(`select admin_save_product(null, 'New Label', 'Going Away', 'body')`)).then(one);
    await as(owner, (q) => q(`select admin_set_product_status($1, 'archived')`, [id]));
    assert.equal((await as(alice, (q) => q(`select * from search_catalog('going away')`))).length, 0);
    await as(owner, (q) => q(`select admin_set_product_status($1, 'active')`, [id]));
    assert.equal((await as(alice, (q) => q(`select * from search_catalog('going away')`))).length, 1);
  });

  test('an unnamed default must be named before adding shades', async () => {
    const id = await as(owner, (q) => q(`select admin_save_product(null, 'New Label', 'Tint', 'makeup')`)).then(one);
    await expectDenied(owner, (q) => q(`select admin_save_variant(null, $1, 'Sand')`, [id]), /unnamed_default/);
    const p = await as(owner, (q) => q('select admin_get_product($1)', [id])).then(one);
    await as(owner, (q) => q(`select admin_save_variant($1, $2, 'Original')`, [p.variants[0].id, id]));
    await as(owner, (q) => q(`select admin_save_variant(null, $1, 'Sand', 'shade', '1234567890123')`, [id]));
    const after = await as(owner, (q) => q('select admin_get_product($1)', [id])).then(one);
    assert.deepEqual(after.variants.map((v) => v.label), ['Original', 'Sand']);
  });

  test('variants in use cannot be deleted; the last one never can', async () => {
    await as(alice, (q) => q(`select add_variant_to_library($1, 'owned')`, [LIP_ROSEWOOD]));
    await expectDenied(owner, (q) => q('select admin_delete_variant($1)', [LIP_ROSEWOOD]), /variant_in_use/);
    const id = await as(owner, (q) => q(`select admin_save_product(null, 'New Label', 'Single', 'tools')`)).then(one);
    const p = await as(owner, (q) => q('select admin_get_product($1)', [id])).then(one);
    await expectDenied(owner, (q) => q('select admin_delete_variant($1)', [p.variants[0].id]), /last_variant/);
  });

  test('bad barcodes and duplicate names are reported plainly', async () => {
    const id = await as(owner, (q) => q(`select admin_save_product(null, 'New Label', 'Dup Shades', 'makeup', null, null, false)`)).then(one);
    await as(owner, (q) => q(`select admin_save_variant(null, $1, 'Sand')`, [id]));
    await expectDenied(owner, (q) => q(`select admin_save_variant(null, $1, 'sand')`, [id]), /variant_exists/);
    await expectDenied(owner, (q) => q(`select admin_save_variant(null, $1, 'Moss', 'shade', 'abc')`, [id]), /invalid_barcode/);
  });

  test('renaming a brand updates search; brands with products stay', async () => {
    const brandId = await as(owner, (q) => q(`select admin_save_brand(null, 'Old Name')`)).then(one);
    const id = await as(owner, (q) => q(`select admin_save_product(null, 'Old Name', 'Rename Me', 'body')`)).then(one);
    await as(owner, (q) => q(`select admin_save_brand($1, 'Fresh Name')`, [brandId]));
    assert.equal((await as(alice, (q) => q(`select * from search_catalog('fresh rename')`))).length, 1);
    await expectDenied(owner, (q) => q('select admin_delete_brand($1)', [brandId]), /brand_in_use/);
    assert.ok(id);
  });

  test('product search handles several words and special characters', async () => {
    const r = await as(owner, (q) => q(`select admin_list_products('tilbury matte')`)).then(one);
    assert.equal(r.total, 1);
    const none = await as(owner, (q) => q(`select admin_list_products('100%')`)).then(one);
    assert.equal(none.total, 0);
  });
});

describe('activity', () => {
  test('changes are recorded with who made them, without people\'s emails', async () => {
    const r = await as(owner, (q) => q('select admin_list_activity(100)')).then(one);
    assert.ok(r.total > 5);
    assert.ok(r.rows.some((a) => a.action === 'submission.rejected'));
    assert.ok(r.rows.every((a) => !a.summary.includes('@')));
    assert.equal(r.rows[0].actor.startsWith('owner-'), true);
  });

  test('only known account actions can be recorded', async () => {
    await expectDenied(owner, (q) => q(`select admin_record_user_action('made.up', $1)`, [alice]), /unknown action/);
  });
});
