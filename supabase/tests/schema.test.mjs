import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  admin, as, createUser, expectDenied, FOUNDATION_HONEY, LIP_CINEMA_RED, LIP_ROSEWOOD,
} from './helpers.mjs';

let alice;
let bob;

before(async () => {
  alice = await createUser('alice');
  bob = await createUser('bob');
});
after(() => admin.end());

const addVariant = (q, variant, status = 'owned') =>
  q('select * from add_variant_to_library($1, $2)', [variant, status]).then((r) => r[0]);
const shoppingListId = (q) =>
  q("select id from collections where type = 'shopping'").then((r) => r[0].id);

describe('account bootstrap', () => {
  test('a new user gets a profile and exactly one Shopping List', async () => {
    const rows = await as(alice, (q) => q('select type, name from collections'));
    assert.deepEqual(rows, [{ type: 'shopping', name: 'Shopping List' }]);
    const profile = await as(alice, (q) => q('select id from profiles'));
    assert.equal(profile.length, 1);
  });

  test('users cannot create a second shopping list', async () => {
    await expectDenied(alice, (q) => q("insert into collections (type, name) values ('shopping', 'Another')"));
  });

  test('the shopping list cannot be deleted', async () => {
    await expectDenied(alice, (q) => q("delete from collections where type = 'shopping'"), /cannot be deleted/);
  });
});

describe('catalog', () => {
  test('signed-in users can search; multi-term queries match brand + name', async () => {
    const rows = await as(alice, (q) => q("select * from search_catalog('atelier lip')"));
    assert.equal(rows.length, 1);
    assert.equal(rows[0].product_name, 'Satin Lip Colour');
    assert.equal(rows[0].variant_count, 3);
    assert.equal(rows[0].default_variant_id, null);
  });

  test('products without shades expose a default variant', async () => {
    const [row] = await as(alice, (q) => q("select * from search_catalog('kabuki')"));
    assert.equal(row.variant_count, 1);
    assert.ok(row.default_variant_id);
  });

  test('LIKE wildcards in the query are treated literally', async () => {
    const rows = await as(alice, (q) => q("select * from search_catalog('%')"));
    assert.equal(rows.length, 0);
  });

  test('category filter', async () => {
    const rows = await as(alice, (q) => q("select * from search_catalog('', 'fragrance')"));
    assert.equal(rows.length, 2);
  });

  test('anonymous visitors cannot read the catalog or call RPCs', async () => {
    await expectDenied(null, (q) => q('select * from products'), /permission denied/);
    await expectDenied(null, (q) => q("select * from search_catalog('lip')"), /permission denied/);
  });

  test('users cannot modify the catalog', async () => {
    await expectDenied(alice, (q) => q("update products set name = 'x'"), /permission denied/);
    await expectDenied(alice, (q) => q("insert into brands (name) values ('Fake')"), /permission denied/);
  });
});

describe('library identity and duplicates', () => {
  test('adding the same variant twice returns the existing entry, never a duplicate', async () => {
    const first = await as(alice, (q) => addVariant(q, LIP_ROSEWOOD, 'wishlist'));
    const second = await as(alice, (q) => addVariant(q, LIP_ROSEWOOD, 'owned'));
    assert.equal(first.created, true);
    assert.equal(second.created, false);
    assert.equal(second.library_item_id, first.library_item_id);
    const rows = await as(alice, (q) =>
      q('select ownership_status from library_items where catalog_variant_id = $1', [LIP_ROSEWOOD]));
    assert.deepEqual(rows, [{ ownership_status: 'wishlist' }], 'existing status is not silently changed');
  });

  test('a direct duplicate insert is rejected by the database', async () => {
    await expectDenied(alice, (q) =>
      q("insert into library_items (catalog_variant_id, ownership_status) values ($1, 'owned')", [LIP_ROSEWOOD]),
      /duplicate key/);
  });

  test('different shades of the same product are different entries', async () => {
    const r = await as(alice, (q) => addVariant(q, LIP_CINEMA_RED));
    assert.equal(r.created, true);
  });

  test('two users can own the same variant independently', async () => {
    const r = await as(bob, (q) => addVariant(q, LIP_ROSEWOOD));
    assert.equal(r.created, true);
  });

  test('an entry must reference exactly one product', async () => {
    await expectDenied(alice, (q) => q("insert into library_items (ownership_status) values ('owned')"),
      /exactly_one_product/);
  });

  test('users cannot assign rows to someone else', async () => {
    await expectDenied(alice, (q) =>
      q("insert into library_items (user_id, catalog_variant_id, ownership_status) values ($1, $2, 'owned')",
        [bob, FOUNDATION_HONEY]),
      /permission denied/);
  });
});

describe('status transitions keep the personal experience', () => {
  test('wishlist → owned → finished → owned retains notes and rating and logs history', async () => {
    const id = await as(alice, async (q) => {
      const { library_item_id } = await addVariant(q, FOUNDATION_HONEY, 'wishlist');
      await q("update library_items set notes = 'Great in winter', rating = 4 where id = $1", [library_item_id]);
      await q("update library_items set ownership_status = 'owned', usage_status = 'using' where id = $1", [library_item_id]);
      await q("update library_items set ownership_status = 'finished', repurchase_intent = 'yes' where id = $1", [library_item_id]);
      return library_item_id;
    });

    const [finished] = await as(alice, (q) => q('select * from library_items where id = $1', [id]));
    assert.equal(finished.notes, 'Great in winter');
    assert.equal(finished.rating, 4);
    assert.equal(finished.usage_status, null, 'usage state only applies to owned items');
    assert.ok(finished.finished_at, 'finishing stamps a date');

    await as(alice, (q) => q("update library_items set ownership_status = 'owned' where id = $1", [id]));
    const events = await as(alice, (q) =>
      q('select event_type from product_events where library_item_id = $1 order by occurred_at, id', [id]));
    assert.deepEqual(events.map((e) => e.event_type).sort(),
      ['added', 'finished', 'repurchased', 'status_changed'].sort());
  });

  test('rating must be 1–5', async () => {
    await expectDenied(alice, (q) => q('update library_items set rating = 6'), /check constraint/);
  });

  test('every update bumps the version for conflict detection', async () => {
    const [before] = await as(alice, (q) => q('select id, version from library_items limit 1'));
    await as(alice, (q) => q("update library_items set notes = 'v' where id = $1", [before.id]));
    const [afterRow] = await as(alice, (q) => q('select version from library_items where id = $1', [before.id]));
    assert.equal(afterRow.version, before.version + 1);
  });

  test('history cannot be forged by the client', async () => {
    const [li] = await as(alice, (q) => q('select id from library_items limit 1'));
    await expectDenied(alice, (q) =>
      q("insert into product_events (library_item_id, user_id, event_type) values ($1, $2, 'finished')", [li.id, alice]),
      /permission denied/);
  });
});

describe('manual personal products', () => {
  test('creating a personal product makes it visible in the library immediately', async () => {
    const id = await as(alice, (q) =>
      q("select create_personal_product('Indie Brand', 'Tinted Balm', 'makeup', 'owned', 'Berry', 'From a market') as id")
        .then((r) => r[0].id));
    const [row] = await as(alice, (q) =>
      q(`select li.ownership_status, pp.brand_name, pp.variant_label from library_items li
         join personal_products pp on pp.id = li.personal_product_id where li.id = $1`, [id]));
    assert.deepEqual(row, { ownership_status: 'owned', brand_name: 'Indie Brand', variant_label: 'Berry' });
  });

  test('blank required fields are rejected', async () => {
    await expectDenied(alice, (q) => q("select create_personal_product('  ', 'X', 'makeup', 'owned')"), /check constraint/);
  });

  test('image paths must live in the owner\'s storage folder', async () => {
    await expectDenied(alice, (q) =>
      q("select create_personal_product('B', 'N', 'makeup', 'owned', null, null, $1)", [`${bob}/x.jpg`]),
      /check constraint/);
  });

  test('deleting the library entry removes the orphaned personal product', async () => {
    const id = await as(alice, (q) =>
      q("select create_personal_product('Temp', 'Temp', 'other', 'owned') as id").then((r) => r[0].id));
    const [{ personal_product_id: pp }] = await as(alice, (q) =>
      q('select personal_product_id from library_items where id = $1', [id]));
    await as(alice, (q) => q('delete from library_items where id = $1', [id]));
    const rows = await as(alice, (q) => q('select id from personal_products where id = $1', [pp]));
    assert.equal(rows.length, 0);
  });
});

describe('cross-user isolation (RLS)', () => {
  test('bob sees none of alice\'s private rows', async () => {
    for (const table of ['library_items', 'personal_products', 'product_events', 'collection_items', 'profiles']) {
      const rows = await as(bob, (q) => q(`select user_id from ${table === 'profiles' ? '(select id as user_id from profiles) p' : table}`));
      assert.ok(rows.every((r) => r.user_id === bob), `${table} leaked another user's rows`);
    }
    const cols = await as(bob, (q) => q('select user_id from collections'));
    assert.ok(cols.every((r) => r.user_id === bob));
  });

  test('bob cannot update or delete alice\'s entries (silently affects 0 rows)', async () => {
    const [li] = await as(alice, (q) => q('select id, notes from library_items limit 1'));
    await as(bob, (q) => q("update library_items set notes = 'hacked' where id = $1", [li.id]));
    await as(bob, (q) => q('delete from library_items where id = $1', [li.id]));
    const [still] = await as(alice, (q) => q('select notes from library_items where id = $1', [li.id]));
    assert.equal(still.notes, li.notes);
  });

  test('bob cannot add items to alice\'s collection', async () => {
    const aliceList = await as(alice, shoppingListId);
    await expectDenied(bob, (q) =>
      q('insert into collection_items (collection_id, catalog_variant_id) values ($1, $2)', [aliceList, LIP_ROSEWOOD]),
      /collection not found/);
  });

  test('bob cannot put alice\'s library item into his own collection', async () => {
    const [li] = await as(alice, (q) => q('select id from library_items limit 1'));
    await expectDenied(bob, async (q) => {
      const [c] = await q("insert into collections (type, name) values ('custom', 'Mine') returning id");
      await q('insert into collection_items (collection_id, library_item_id) values ($1, $2)', [c.id, li.id]);
    }, /library item not found/);
  });

  test('bob cannot attach alice\'s personal product to his library', async () => {
    const [pp] = await as(alice, (q) => q('select id from personal_products limit 1'));
    await expectDenied(bob, (q) =>
      q("insert into library_items (personal_product_id, ownership_status) values ($1, 'owned')", [pp.id]),
      /does not belong/);
  });

  test('bob cannot reorder or overwrite alice\'s shelf via RPC', async () => {
    const shelf = await as(alice, (q) =>
      q("insert into collections (type, name) values ('shelf', 'Vanity') returning id, version").then((r) => r[0]));
    await expectDenied(bob, (q) => q('select save_shelf($1, $2, $3)', [shelf.id, [], shelf.version]), /not found/);
  });
});

describe('custom collections', () => {
  test('one product in many collections; removal and deletion never touch the library', async () => {
    await as(bob, async (q) => {
      const [li] = await q('select id from library_items limit 1');
      const [a] = await q("insert into collections (type, name) values ('custom', 'Everyday') returning id");
      const [b] = await q("insert into collections (type, name) values ('custom', 'Summer') returning id");
      await q('insert into collection_items (collection_id, library_item_id) values ($1, $3), ($2, $3)', [a.id, b.id, li.id]);

      await q('delete from collection_items where collection_id = $1', [a.id]);
      assert.equal((await q('select 1 from collection_items where collection_id = $1', [b.id])).length, 1);

      await q('delete from collections where id = $1', [b.id]);
      assert.equal((await q('select 1 from library_items where id = $1', [li.id])).length, 1);
    });
  });

  test('the same item cannot be added to one collection twice', async () => {
    await expectDenied(bob, async (q) => {
      const [li] = await q('select id from library_items limit 1');
      const [c] = await q("insert into collections (type, name) values ('custom', 'Dupes') returning id");
      await q('insert into collection_items (collection_id, library_item_id) values ($1, $2)', [c.id, li.id]);
      await q('insert into collection_items (collection_id, library_item_id) values ($1, $2)', [c.id, li.id]);
    }, /duplicate key/);
  });

  test('custom collections only hold library entries', async () => {
    await expectDenied(bob, async (q) => {
      const [c] = await q("insert into collections (type, name) values ('custom', 'X') returning id");
      await q('insert into collection_items (collection_id, catalog_variant_id) values ($1, $2)', [c.id, LIP_ROSEWOOD]);
    }, /must reference a library entry/);
  });

  test('set_collection_order persists order and detects stale versions', async () => {
    await as(bob, async (q) => {
      const [c] = await q("insert into collections (type, name) values ('custom', 'Ordered') returning id, version");
      const lib = await q('select id from library_items order by created_at');
      for (const li of lib) await q('insert into collection_items (collection_id, library_item_id) values ($1, $2)', [c.id, li.id]);
      const items = await q('select id from collection_items where collection_id = $1 order by sort_order', [c.id]);
      const reversed = items.map((i) => i.id).reverse();
      await q('select set_collection_order($1, $2, $3)', [c.id, reversed, c.version]);
      const now = await q('select id from collection_items where collection_id = $1 order by sort_order', [c.id]);
      assert.deepEqual(now.map((i) => i.id), reversed);
    });
    await expectDenied(bob, async (q) => {
      const [c] = await q("select id from collections where name = 'Ordered'");
      const items = await q('select id from collection_items where collection_id = $1', [c.id]);
      await q('select set_collection_order($1, $2, 1)', [c.id, items.map((i) => i.id)]);
    }, /version_conflict/);
  });
});

describe('shopping list', () => {
  test('can hold unowned products, be checked off, and mark purchased creates an Owned entry', async () => {
    const u = await createUser('shopper');
    await as(u, async (q) => {
      const list = await shoppingListId(q);
      const [item] = await q(
        'insert into collection_items (collection_id, catalog_variant_id, desired_quantity) values ($1, $2, 2) returning *',
        [list, LIP_CINEMA_RED]);
      assert.equal(item.checked, false);
      assert.equal(item.desired_quantity, 2);
      assert.equal((await q('select 1 from library_items')).length, 0, 'listing does not change ownership');

      const [{ li }] = await q('select mark_shopping_item_purchased($1) as li', [item.id]);
      const [entry] = await q('select ownership_status, usage_status from library_items where id = $1', [li]);
      assert.deepEqual(entry, { ownership_status: 'owned', usage_status: 'unopened' });
      const [after] = await q('select checked from collection_items where id = $1', [item.id]);
      assert.equal(after.checked, true);
      const events = await q("select event_type from product_events where library_item_id = $1 and event_type = 'purchased'", [li]);
      assert.equal(events.length, 1);
    });
  });

  test('buying a finished product again is a repurchase on the same entry', async () => {
    const u = await createUser('repurchaser');
    await as(u, async (q) => {
      const { library_item_id: li } = await addVariant(q, LIP_ROSEWOOD, 'finished');
      await q("update library_items set notes = 'holy grail' where id = $1", [li]);
      const list = await shoppingListId(q);
      const [item] = await q('insert into collection_items (collection_id, catalog_variant_id) values ($1, $2) returning id', [list, LIP_ROSEWOOD]);
      const [{ id }] = await q('select mark_shopping_item_purchased($1, true) as id', [item.id]);
      assert.equal(id, li);
      const [entry] = await q('select ownership_status, notes from library_items where id = $1', [li]);
      assert.deepEqual(entry, { ownership_status: 'owned', notes: 'holy grail' });
      assert.equal((await q('select 1 from collection_items where id = $1', [item.id])).length, 0, 'removed when asked');
      const ev = await q("select 1 from product_events where library_item_id = $1 and event_type = 'repurchased'", [li]);
      assert.equal(ev.length, 1);
    });
  });

  test('shopping list items reference products, not library entries', async () => {
    await expectDenied(alice, async (q) => {
      const list = await shoppingListId(q);
      const [li] = await q('select id from library_items limit 1');
      await q('insert into collection_items (collection_id, library_item_id) values ($1, $2)', [list, li.id]);
    }, /reference products/);
  });
});

describe('curated shelf', () => {
  test('save_shelf persists order, enforces capacity, and rejects stale saves', async () => {
    const u = await createUser('curator');
    const variants = await as(u, (q) => q('select id from product_variants order by id limit 13'));
    const libIds = await as(u, async (q) => {
      const ids = [];
      for (const v of variants) ids.push((await addVariant(q, v.id)).library_item_id);
      return ids;
    });
    const shelf = await as(u, (q) =>
      q("insert into collections (type, name) values ('shelf', 'Vanity') returning id, version").then((r) => r[0]));

    const twelve = libIds.slice(0, 12).reverse();
    const v2 = await as(u, (q) => q('select save_shelf($1, $2, $3) as v', [shelf.id, twelve, shelf.version]).then((r) => r[0].v));
    const saved = await as(u, (q) =>
      q('select library_item_id from collection_items where collection_id = $1 order by sort_order', [shelf.id]));
    assert.deepEqual(saved.map((r) => r.library_item_id), twelve, 'reopening shows the saved order');

    await expectDenied(u, (q) => q('select save_shelf($1, $2, $3)', [shelf.id, libIds, v2]), /shelf_full/);
    await expectDenied(u, (q) =>
      q('insert into collection_items (collection_id, library_item_id) values ($1, $2)', [shelf.id, libIds[12]]),
      /shelf_full/);
    await expectDenied(u, (q) => q('select save_shelf($1, $2, $3)', [shelf.id, twelve.slice(1), shelf.version]),
      /version_conflict/);

    // Replace: drop one, add the 13th, at a specific position.
    const replaced = [libIds[12], ...twelve.slice(1)];
    await as(u, (q) => q('select save_shelf($1, $2, $3)', [shelf.id, replaced, v2]));
    const after = await as(u, (q) =>
      q('select library_item_id from collection_items where collection_id = $1 order by sort_order', [shelf.id]));
    assert.deepEqual(after.map((r) => r.library_item_id), replaced);

    // Deleting a library item removes its slot cleanly — no broken card.
    await as(u, (q) => q('delete from library_items where id = $1', [libIds[12]]));
    const count = await as(u, (q) => q('select count(*)::int as n from collection_items where collection_id = $1', [shelf.id]));
    assert.equal(count[0].n, 11);
  });

  test('one shelf per user in the MVP', async () => {
    const u = await createUser('twoshelves');
    await expectDenied(u, async (q) => {
      await q("insert into collections (type, name) values ('shelf', 'A')");
      await q("insert into collections (type, name) values ('shelf', 'B')");
    }, /duplicate key/);
  });
});

describe('storage policies', () => {
  test('users can only read and write inside their own folder', async () => {
    await as(alice, (q) => q("insert into storage.objects (bucket_id, name) values ('product-photos', $1)", [`${alice}/a.jpg`]));
    await expectDenied(bob, (q) =>
      q("insert into storage.objects (bucket_id, name) values ('product-photos', $1)", [`${alice}/evil.jpg`]),
      /row-level security/);
    const visible = await as(bob, (q) => q('select name from storage.objects'));
    assert.equal(visible.length, 0);
  });
});

describe('account deletion', () => {
  test('deleting the auth user removes all of their data, including the shopping list', async () => {
    const u = await createUser('leaver');
    await as(u, async (q) => {
      await addVariant(q, LIP_ROSEWOOD);
      await q("select create_personal_product('B', 'N', 'makeup', 'wishlist')");
      await q("insert into collections (type, name) values ('custom', 'C')");
    });
    await admin.query('delete from auth.users where id = $1', [u]);
    for (const t of ['library_items', 'personal_products', 'collections', 'collection_items', 'product_events']) {
      const { rows } = await admin.query(`select count(*)::int as n from ${t} where user_id = $1`, [u]);
      assert.equal(rows[0].n, 0, `${t} still has rows`);
    }
  });
});
