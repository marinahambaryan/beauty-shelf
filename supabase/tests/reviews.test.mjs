import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { admin, as, createUser, expectDenied } from './helpers.mjs';

// Seeded catalogue products (seed.sql).
const LIPSTICK = 'a0000000-0000-4000-8000-000000000001';
const FOUNDATION = 'a0000000-0000-4000-8000-000000000003';

let alice;
let bob;
let carol;

const named = (uid, name) => as(uid, (q) => q('update profiles set display_name = $1 where id = auth.uid()', [name]));
const review = (uid, product, rating, body = null) =>
  as(uid, (q) => q('insert into product_reviews (product_id, rating, body) values ($1, $2, $3) returning *', [product, rating, body]))
    .then((r) => r[0]);
const page = (uid, product) => as(uid, (q) => q('select * from product_reviews_page($1)', [product]));
const summary = (uid, product) => as(uid, (q) => q('select * from product_rating_summary($1)', [product])).then((r) => r[0]);

before(async () => {
  alice = await createUser('rev-alice');
  bob = await createUser('rev-bob');
  carol = await createUser('rev-carol');
});
after(() => admin.end());

describe('public reviews', () => {
  test('posting needs a display name, and one review per person and product', async () => {
    await expectDenied(alice, (q) => q('insert into product_reviews (product_id, rating) values ($1, 5)', [LIPSTICK]),
      /display_name_required/);
    await named(alice, 'Alice');
    const r = await review(alice, LIPSTICK, 5, '  Lasts all day.  ');
    assert.equal(r.body, 'Lasts all day.', 'text is trimmed');
    await expectDenied(alice, (q) => q('insert into product_reviews (product_id, rating) values ($1, 4)', [LIPSTICK]),
      /product_reviews_one_per_person/);
  });

  test('everyone reads reviews with the name, never the author id or library', async () => {
    const rows = await page(bob, LIPSTICK);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].author_name, 'Alice');
    assert.equal(rows[0].is_mine, false);
    assert.deepEqual(Object.keys(rows[0]).sort(),
      ['author_name', 'body', 'created_at', 'id', 'is_mine', 'rating', 'updated_at']);
    const mine = await page(alice, LIPSTICK);
    assert.equal(mine[0].is_mine, true);
  });

  test('other people cannot read, change or delete your row in the table', async () => {
    const theirs = await as(bob, (q) => q('select * from product_reviews'));
    assert.equal(theirs.length, 0);
    const changed = await as(bob, (q) => q("update product_reviews set rating = 1 returning id"));
    assert.equal(changed.length, 0);
    const gone = await as(bob, (q) => q('delete from product_reviews returning id'));
    assert.equal(gone.length, 0);
    await expectDenied(bob, (q) =>
      q('insert into product_reviews (user_id, product_id, rating) values ($1, $2, 1)', [alice, FOUNDATION]),
      /permission denied/);
  });

  test('summary counts every rating; the list only shows written reviews', async () => {
    await named(bob, 'Bob');
    await named(carol, 'Carol');
    await review(bob, LIPSTICK, 4);
    await review(carol, LIPSTICK, 3, '   ');
    const s = await summary(carol, LIPSTICK);
    assert.equal(Number(s.average), 4);
    assert.equal(s.ratings, 3);
    assert.equal(s.reviews, 1);
    assert.deepEqual(s.histogram, [1, 1, 1, 0, 0]);
    assert.equal((await page(carol, LIPSTICK)).length, 1);
  });

  test('editing bumps the version; limits are enforced', async () => {
    const [before] = await as(alice, (q) => q('select id, version from product_reviews where product_id = $1', [LIPSTICK]));
    await as(alice, (q) => q("update product_reviews set rating = 4, body = 'Still great' where id = $1", [before.id]));
    const [row] = await as(alice, (q) => q('select rating, version from product_reviews where id = $1', [before.id]));
    assert.equal(row.rating, 4);
    assert.equal(row.version, before.version + 1);
    await expectDenied(alice, (q) => q('update product_reviews set rating = 6'), /check constraint/);
    await expectDenied(alice, (q) => q('update product_reviews set body = $1', ['x'.repeat(2001)]), /check constraint/);
    await expectDenied(alice, (q) => q('update product_reviews set user_id = $1', [bob]), /permission denied/);
  });

  test('anonymous visitors see nothing', async () => {
    await expectDenied(null, (q) => q('select * from product_reviews'), /permission denied/);
    await expectDenied(null, (q) => q('select * from product_rating_summary($1)', [LIPSTICK]), /permission denied/);
    await expectDenied(null, (q) => q('select * from product_reviews_page($1)', [LIPSTICK]), /permission denied/);
  });

  test('admins can list and remove reviews; others cannot', async () => {
    const mod = await createUser('rev-admin');
    await admin.query('insert into public.admins (user_id) values ($1)', [mod]);
    await expectDenied(bob, (q) => q('select * from admin_list_reviews()'), /not_admin|permission|admin/);
    const listed = await as(mod, (q) => q('select * from admin_list_reviews()'));
    const target = listed.find((r) => r.product_id === LIPSTICK);
    assert.ok(target);
    assert.equal('user_id' in target, false, 'the console shows the review, not who wrote it');
    await as(mod, (q) => q('select admin_delete_review($1)', [target.id]));
    assert.equal((await page(bob, LIPSTICK)).length, 0);
    const logged = await admin.query("select 1 from admin_activity where action = 'review.deleted' and target_id = $1", [target.id]);
    assert.equal(logged.rows.length, 1);
  });

  test('deleting an account removes its reviews', async () => {
    const dana = await createUser('rev-dana');
    await named(dana, 'Dana');
    await review(dana, FOUNDATION, 2, 'Too dark for me.');
    await admin.query('delete from auth.users where id = $1', [dana]);
    const s = await summary(bob, FOUNDATION);
    assert.equal(s.ratings, 0);
  });
});
