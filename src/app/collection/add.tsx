import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icons';
import { Bottle } from '@/components/shelf';
import { AppText, Button, Chips, EmptyState, LoadingState, Notice, Screen, SearchField, TopBar } from '@/components/ui';
import type { NewItem } from '@/data/collections';
import type { LibraryEntry } from '@/data/library';
import { useAddToCollection } from '@/data/mutations';
import { useCollections, useLibrary } from '@/data/queries';
import { memberOf, refFor } from '@/domain/collections';
import { LIBRARY_VIEWS, libraryViewLabel, matchesQuery, ownershipLabel, type LibraryView } from '@/domain/library';
import { toAppError } from '@/lib/errors';
import { goBack } from '@/lib/navigation';
import { colors, radius, space } from '@/theme/tokens';

/** Add products to a collection: pick any number from your library, then add them together. */
export default function AddToCollectionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const collections = useCollections();
  const library = useLibrary();
  const add = useAddToCollection();
  const collection = collections.data?.find((c) => c.id === id);
  const isShopping = collection?.type === 'shopping';
  const [query, setQuery] = useState('');
  // The shopping list starts on the wishlist: that's usually what's next to buy.
  const [view, setView] = useState<LibraryView | null>(null);
  const shownView = view ?? (isShopping ? 'wishlist' : 'all');
  const [picked, setPicked] = useState<string[]>([]);

  const candidates = useMemo(() => {
    if (!collection) return [];
    return (library.data ?? []).filter(
      (e) =>
        !memberOf(collection.items, e) &&
        refFor(e, collection.type) !== null &&
        (shownView === 'all' || e.ownershipStatus === shownView) &&
        matchesQuery(e, query),
    );
  }, [collection, library.data, shownView, query]);

  const back = () => goBack(id ? { pathname: '/collection/[id]', params: { id } } : '/profile');
  const toggle = (e: LibraryEntry) => setPicked((p) => (p.includes(e.id) ? p.filter((x) => x !== e.id) : [...p, e.id]));
  const submit = () => {
    if (!collection) return;
    const byId = new Map((library.data ?? []).map((e) => [e.id, e]));
    const items = picked.flatMap((pid) => {
      const e = byId.get(pid);
      const ref = e ? refFor(e, collection.type) : null;
      return ref ? [ref] : ([] as NewItem[]);
    });
    add.mutate({ collectionId: collection.id, items }, { onSuccess: back });
  };

  if (collections.isPending || library.isPending) {
    return (
      <Screen bottomInset>
        <TopBar onBack={back} icon="close" backLabel="Close" title="Add products" />
        <LoadingState />
      </Screen>
    );
  }
  if (!collection) {
    return (
      <Screen bottomInset>
        <TopBar onBack={back} icon="close" backLabel="Close" title="Add products" />
        <EmptyState title="This collection isn’t here" body="It may have been deleted on another device." />
      </Screen>
    );
  }

  return (
    <View style={styles.flex}>
      <Screen bottomInset contentStyle={{ paddingBottom: insets.bottom + 110 }}>
        <TopBar onBack={back} icon="close" backLabel="Close" title={`Add to ${collection.name}`} />
        <SearchField label="Search your products" placeholder="Search your products" value={query} onChangeText={setQuery} />
        <Chips
          scroll
          options={LIBRARY_VIEWS.map((v) => ({ value: v, label: libraryViewLabel[v] }))}
          value={shownView}
          onChange={setView}
          accessibilityLabel="Show"
        />
        {candidates.length === 0 ? (
          <EmptyState
            title="Nothing to add"
            body={query.trim() ? 'Try another name, brand or shade.' : 'Everything here is already in this collection.'}
          />
        ) : (
          <View>
            {candidates.map((e) => {
              const selected = picked.includes(e.id);
              return (
                <Pressable
                  key={e.id}
                  onPress={() => toggle(e)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={[e.name, e.brand, ownershipLabel[e.ownershipStatus]].filter(Boolean).join(', ')}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                >
                  <View style={styles.thumb}>
                    <Bottle uri={e.imageUrl} category={e.category} name={e.name} scale={0.55} photoHeight={46} />
                  </View>
                  <View style={styles.flex}>
                    <AppText variant="name" numberOfLines={2}>
                      {e.name}
                    </AppText>
                    <AppText variant="small" numberOfLines={1}>
                      {[e.brand, ownershipLabel[e.ownershipStatus]].filter(Boolean).join(' · ')}
                    </AppText>
                  </View>
                  <View style={[styles.check, selected && styles.checkOn]}>
                    {selected ? <Icon name="check" size={16} color={colors.ground} strokeWidth={3} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
        {add.isError ? <Notice>{toAppError(add.error).message}</Notice> : null}
      </Screen>
      <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
        <Button
          label={picked.length ? `Add ${picked.length === 1 ? '1 product' : `${picked.length} products`}` : 'Choose products'}
          onPress={submit}
          disabled={!picked.length}
          loading={add.isPending}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.ground },
  pressed: { opacity: 0.6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm, borderBottomWidth: 1, borderColor: colors.rule },
  thumb: { width: 48, height: 56, borderRadius: radius.md, backgroundColor: colors.tile, alignItems: 'center', justifyContent: 'center' },
  check: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: colors.fieldBorder, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    backgroundColor: colors.ground,
    borderTopWidth: 1,
    borderColor: colors.rule,
  },
});
