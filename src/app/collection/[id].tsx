import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { displayItems, LookArt, type DisplayItem } from '@/components/collection-looks';
import { Icon } from '@/components/icons';
import { LookPicker } from '@/components/look-picker';
import { describe, openItem, ProductTile } from '@/components/ProductRow';
import { Bottle, ledgesOf, ShelfLedge } from '@/components/shelf';
import {
  AppText,
  Button,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingState,
  Notice,
  Row,
  Screen,
  TextAction,
  TextField,
  TopBar,
} from '@/components/ui';
import type { CollectionSummary } from '@/data/collections';
import type { LibraryEntry } from '@/data/library';
import {
  useDeleteCollection,
  useMarkPurchased,
  useRemoveFromCollection,
  useSetCollectionOrder,
  useUpdateCollection,
  useUpdateShoppingItem,
} from '@/data/mutations';
import { useCollections, useLibrary } from '@/data/queries';
import { countLabel, moved } from '@/domain/collections';
import { collectionNameSchema } from '@/domain/validation';
import { toAppError } from '@/lib/errors';
import { goBack } from '@/lib/navigation';
import { colors, fonts, radius, space } from '@/theme/tokens';

const backToCollections = () => goBack({ pathname: '/profile', params: { tab: 'collections' } });

/** One collection: the shelf as glass ledges, the shopping list as a checklist, anything else as a grid in its look. */
export default function CollectionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const collections = useCollections();
  const library = useLibrary();
  const collection = collections.data?.find((c) => c.id === id);

  if (collections.isPending || library.isPending) {
    return (
      <Screen bottomInset>
        <TopBar onBack={backToCollections} />
        <LoadingState label="Loading collection" />
      </Screen>
    );
  }
  const error = collections.error ?? library.error;
  if (error || !collection) {
    return (
      <Screen bottomInset>
        <TopBar onBack={backToCollections} />
        {error ? (
          <ErrorState message={toAppError(error).message} onRetry={() => void collections.refetch()} />
        ) : (
          <EmptyState title="This collection isn’t here" body="It may have been deleted on another device." />
        )}
      </Screen>
    );
  }
  return <Detail collection={collection} library={library.data ?? []} />;
}

type Panel = null | 'menu' | 'rename' | 'look' | 'delete';

function Detail({ collection, library }: { collection: CollectionSummary; library: readonly LibraryEntry[] }) {
  const items = displayItems(collection, library);
  const isShelf = collection.type === 'shelf';
  const isShopping = collection.type === 'shopping';
  const isCustom = collection.type === 'custom';
  const [panel, setPanel] = useState<Panel>(null);
  const [editing, setEditing] = useState(false);

  const update = useUpdateCollection();
  const remove = useDeleteCollection();
  const order = useSetCollectionOrder();
  const take = useRemoveFromCollection();
  const failure = [update, remove, order, take].find((m) => m.isError)?.error;

  const addProducts = () => router.push({ pathname: '/collection/add', params: { id: collection.id } });
  const move = (index: number, by: -1 | 1) =>
    order.mutate({ id: collection.id, version: collection.version, itemIds: moved(items.map((i) => i.key), index, by) });

  return (
    <Screen bottomInset>
      <TopBar
        onBack={backToCollections}
        title={collection.name}
        right={
          isShelf ? (
            <IconButton icon="edit" onPress={() => router.push({ pathname: '/shelf', params: { id: collection.id } })} accessibilityLabel="Edit shelf" />
          ) : isCustom ? (
            <IconButton
              icon="more"
              tone={panel ? 'ink' : 'tile'}
              onPress={() => setPanel(panel ? null : 'menu')}
              accessibilityLabel="Collection options"
              selected={Boolean(panel)}
            />
          ) : undefined
        }
      />
      <AppText variant="bodySoft" style={styles.center}>
        {countLabel(collection.type, collection.items)}
      </AppText>

      {panel === 'menu' ? (
        <View style={styles.menu}>
          <Row title="Rename" onPress={() => setPanel('rename')} />
          <Row title="Change look" onPress={() => setPanel('look')} />
          <Row title="Delete collection" tone="danger" onPress={() => setPanel('delete')} />
        </View>
      ) : panel === 'rename' ? (
        <RenamePanel
          name={collection.name}
          saving={update.isPending}
          onCancel={() => setPanel(null)}
          onSave={(name) =>
            update.mutate({ id: collection.id, version: collection.version, patch: { name } }, { onSuccess: () => setPanel(null) })
          }
        />
      ) : panel === 'look' ? (
        <View style={styles.panel}>
          <LookPicker
            value={collection.look}
            onChange={(look) =>
              update.mutate({ id: collection.id, version: collection.version, patch: { look } }, { onSuccess: () => setPanel(null) })
            }
            sample={items.flatMap((i) => (i.entry ? [i.entry] : [])).concat(library.filter((e) => e.ownershipStatus === 'owned'))}
          />
          <Button label="Cancel" variant="plain" onPress={() => setPanel(null)} />
        </View>
      ) : panel === 'delete' ? (
        <View style={styles.confirm} accessibilityRole="alert">
          <AppText variant="section">{`Delete “${collection.name}”?`}</AppText>
          <AppText variant="body">The products stay in your library. Only the collection goes.</AppText>
          <Button label="Delete" variant="danger" loading={remove.isPending} onPress={() => remove.mutate(collection.id, { onSuccess: backToCollections })} />
          <Button label="Cancel" variant="plain" onPress={() => setPanel(null)} disabled={remove.isPending} />
        </View>
      ) : null}

      {failure ? <Notice>{toAppError(failure).message}</Notice> : null}

      {isCustom && items.length && !editing ? (
        <View style={[styles.hero, collection.look === 'mini_shelf' && styles.heroWide]}>
          <LookArt look={collection.look} items={items} />
        </View>
      ) : null}

      {items.length === 0 ? (
        <EmptyState
          title={isShopping ? 'Nothing to buy' : 'Nothing here yet'}
          body={
            isShelf
              ? 'Tap the pencil to choose what stands on your shelf.'
              : isShopping
                ? 'Add products you want to buy from your library, or from a product page.'
                : 'Add products from your library.'
          }
          action={isShelf ? undefined : <Button label="Add products" onPress={addProducts} />}
        />
      ) : isShelf ? (
        <ShelfView collection={collection} items={items} />
      ) : isShopping ? (
        <ShoppingList items={items} />
      ) : editing ? (
        <View>
          {items.map((it, i) => (
            <View key={it.key} style={styles.editRow}>
              <Thumb item={it} />
              <AppText variant="name" style={styles.flex} numberOfLines={2}>
                {it.name}
              </AppText>
              <IconButton icon="up" size={34} iconSize={18} onPress={() => move(i, -1)} disabled={i === 0 || order.isPending} accessibilityLabel={`Move ${it.name} earlier`} />
              <IconButton
                icon="down"
                size={34}
                iconSize={18}
                onPress={() => move(i, 1)}
                disabled={i === items.length - 1 || order.isPending}
                accessibilityLabel={`Move ${it.name} later`}
              />
              <IconButton icon="close" tone="plain" size={34} iconSize={16} onPress={() => take.mutate([it.key])} accessibilityLabel={`Take ${it.name} out`} />
            </View>
          ))}
        </View>
      ) : (
        <Grid items={items} />
      )}

      {!isShelf && items.length ? (
        <View style={styles.actions}>
          <View style={styles.flex}>
            <Button label="Add products" variant="secondary" onPress={addProducts} />
          </View>
          {isCustom ? <TextAction label={editing ? 'Done' : 'Edit'} onPress={() => setEditing((e) => !e)} /> : null}
        </View>
      ) : null}
    </Screen>
  );
}

function RenamePanel({ name, saving, onSave, onCancel }: { name: string; saving: boolean; onSave: (name: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState(name);
  const [error, setError] = useState<string>();
  const save = () => {
    const parsed = collectionNameSchema.safeParse(value);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message);
    onSave(parsed.data);
  };
  return (
    <View style={styles.panel}>
      <TextField label="Name" value={value} onChangeText={setValue} error={error} maxLength={80} autoFocus returnKeyType="done" onSubmitEditing={save} />
      <Button label="Save name" onPress={save} loading={saving} />
      <Button label="Cancel" variant="plain" onPress={onCancel} disabled={saving} />
    </View>
  );
}

function ShelfView({ collection, items }: { collection: CollectionSummary; items: DisplayItem[] }) {
  const notes = new Map(collection.items.map((i) => [i.id, i.note]));
  const ledges = ledgesOf(items);
  return (
    <View style={styles.shelves}>
      {ledges.map((ledge, i) => (
        <ShelfLedge
          key={i}
          products={ledge.map((it) => ({
            key: it.key,
            uri: it.uri,
            category: it.category,
            name: it.name,
            sub: it.variant,
            note: notes.get(it.key) ?? null,
            label: it.entry ? describe(it.entry) : it.name,
            onPress: it.entry ? () => openItem(it.entry!.id) : undefined,
          }))}
        />
      ))}
    </View>
  );
}

function Grid({ items }: { items: DisplayItem[] }) {
  const rows: DisplayItem[][] = [];
  for (let i = 0; i < items.length; i += 3) rows.push(items.slice(i, i + 3));
  return (
    <View style={styles.grid}>
      {rows.map((row, r) => (
        <View key={r} style={styles.gridRow}>
          {row.map((it) => (it.entry ? <ProductTile key={it.key} entry={it.entry} /> : <View key={it.key} style={styles.tile}><Thumb item={it} big /></View>))}
          {Array.from({ length: 3 - row.length }, (_, i) => (
            <View key={`pad-${i}`} style={styles.flex} />
          ))}
        </View>
      ))}
    </View>
  );
}

/**
 * The shopping list: tick things off as they go in the basket, set how many, and once
 * bought, put them in your library as Owned.
 */
function ShoppingList({ items }: { items: DisplayItem[] }) {
  const update = useUpdateShoppingItem();
  const take = useRemoveFromCollection();
  const purchase = useMarkPurchased();
  const [confirming, setConfirming] = useState<string | null>(null);
  // Unticked first: what's still to buy stays at the top.
  const sorted = [...items].sort((a, b) => Number(Boolean(a.checked)) - Number(Boolean(b.checked)));

  return (
    <View>
      {[update, take, purchase].map((m, i) => (m.isError ? <Notice key={i}>{toAppError(m.error).message}</Notice> : null))}
      {sorted.map((it) => {
        const qty = it.quantity ?? 1;
        const owned = it.entry?.ownershipStatus === 'owned';
        return (
          <View key={it.key} style={styles.shopRow}>
            <View style={styles.shopMain}>
              <Pressable
                onPress={() => update.mutate({ id: it.key, checked: !it.checked })}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: Boolean(it.checked) }}
                accessibilityLabel={`${it.name}${qty > 1 ? `, ${qty}` : ''}`}
                hitSlop={8}
                style={[styles.check, it.checked && styles.checkOn]}
              >
                {it.checked ? <Icon name="check" size={16} color={colors.ground} strokeWidth={3} /> : null}
              </Pressable>
              <Thumb item={it} />
              <Pressable
                style={styles.flex}
                onPress={it.entry ? () => openItem(it.entry!.id) : undefined}
                disabled={!it.entry}
                accessibilityRole={it.entry ? 'link' : undefined}
              >
                <Text style={[styles.shopName, it.checked && styles.struck]} numberOfLines={2}>
                  {it.name}
                </Text>
                <AppText variant="small" numberOfLines={1}>
                  {[it.brand, it.variant, owned ? 'You have one' : null].filter(Boolean).join(' · ')}
                </AppText>
              </Pressable>
              <View style={styles.stepper}>
                <IconButton
                  icon={qty <= 1 ? 'trash' : 'minus'}
                  size={30}
                  iconSize={15}
                  onPress={() => (qty <= 1 ? take.mutate([it.key]) : update.mutate({ id: it.key, quantity: qty - 1 }))}
                  accessibilityLabel={qty <= 1 ? `Remove ${it.name} from the list` : `One fewer ${it.name}`}
                />
                <Text style={styles.qty} accessibilityLabel={`Quantity ${qty}`}>
                  {qty}
                </Text>
                <IconButton
                  icon="plus"
                  size={30}
                  iconSize={15}
                  onPress={() => update.mutate({ id: it.key, quantity: Math.min(99, qty + 1) })}
                  disabled={qty >= 99}
                  accessibilityLabel={`One more ${it.name}`}
                />
              </View>
            </View>
            {it.checked && confirming !== it.key ? (
              <View style={styles.bought}>
                <TextAction label="Bought it — add to library" onPress={() => setConfirming(it.key)} />
              </View>
            ) : null}
            {confirming === it.key ? (
              <View style={styles.confirm} accessibilityRole="alert">
                <AppText variant="body">{`${it.name} goes into your library as Owned.`}</AppText>
                <Button
                  label="Add and take off the list"
                  loading={purchase.isPending && purchase.variables?.remove === true}
                  disabled={purchase.isPending}
                  onPress={() => purchase.mutate({ itemId: it.key, remove: true }, { onSuccess: () => setConfirming(null) })}
                />
                <Button
                  label="Add and keep it ticked"
                  variant="secondary"
                  loading={purchase.isPending && purchase.variables?.remove === false}
                  disabled={purchase.isPending}
                  onPress={() => purchase.mutate({ itemId: it.key, remove: false }, { onSuccess: () => setConfirming(null) })}
                />
                <Button label="Cancel" variant="plain" onPress={() => setConfirming(null)} disabled={purchase.isPending} />
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function Thumb({ item, big = false }: { item: DisplayItem; big?: boolean }) {
  return (
    <View style={big ? styles.thumbBig : styles.thumb}>
      <Bottle uri={item.uri} category={item.category} name={item.name} scale={big ? 0.9 : 0.55} photoHeight={big ? 120 : 46} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center', marginTop: -space.md },
  menu: { borderRadius: radius.lg, backgroundColor: colors.ground, paddingHorizontal: space.lg, boxShadow: '0 10px 30px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08)' },
  panel: { gap: space.md },
  confirm: { gap: space.md, padding: space.lg, borderRadius: radius.md, backgroundColor: colors.tile, marginTop: space.sm },
  hero: { alignSelf: 'center', width: 220 },
  heroWide: { alignSelf: 'stretch', width: '100%' },
  shelves: { gap: space.lg },
  grid: { gap: 6 },
  gridRow: { flexDirection: 'row', gap: 6 },
  tile: { flex: 1, height: 150, borderRadius: radius.md + 2, backgroundColor: colors.tile, alignItems: 'center', justifyContent: 'center' },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm, borderBottomWidth: 1, borderColor: colors.rule },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  thumb: { width: 48, height: 56, borderRadius: radius.md, backgroundColor: colors.tile, alignItems: 'center', justifyContent: 'center' },
  thumbBig: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  shopRow: { paddingVertical: space.sm, borderBottomWidth: 1, borderColor: colors.rule },
  shopMain: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  check: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: colors.fieldBorder, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  shopName: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 18, color: colors.ink },
  struck: { textDecorationLine: 'line-through', color: colors.inkSoft },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qty: { fontFamily: fonts.semibold, fontSize: 15, minWidth: 18, textAlign: 'center', color: colors.ink },
  bought: { paddingLeft: 38 + space.sm },
});
