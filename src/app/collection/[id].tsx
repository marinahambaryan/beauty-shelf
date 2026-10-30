import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { entriesOf } from '@/components/collection-board';
import { describe, openItem, ProductTile } from '@/components/ProductRow';
import { PER_LEDGE, ShelfLedge } from '@/components/shelf';
import { AppText, EmptyState, ErrorState, IconButton, LoadingState, Screen, TopBar } from '@/components/ui';
import { useCollections, useLibrary } from '@/data/queries';
import { toAppError } from '@/lib/errors';
import { goBack } from '@/lib/navigation';
import { space } from '@/theme/tokens';

/** One collection: the shelf as glass ledges, any other collection as a photo grid. */
export default function CollectionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const collections = useCollections();
  const library = useLibrary();
  const collection = collections.data?.find((c) => c.id === id);
  const entries = useMemo(
    () => (collection ? entriesOf(collection, library.data ?? []) : []),
    [collection, library.data],
  );
  const back = () => goBack({ pathname: '/profile', params: { tab: 'collections' } });

  if (collections.isPending || library.isPending) {
    return (
      <Screen bottomInset>
        <TopBar onBack={back} />
        <LoadingState label="Loading collection" />
      </Screen>
    );
  }
  const error = collections.error ?? library.error;
  if (error || !collection) {
    return (
      <Screen bottomInset>
        <TopBar onBack={back} />
        {error ? (
          <ErrorState message={toAppError(error).message} onRetry={() => void collections.refetch()} />
        ) : (
          <EmptyState title="This collection isn’t here" body="It may have been deleted on another device." />
        )}
      </Screen>
    );
  }

  const isShelf = collection.type === 'shelf';
  const missing = collection.itemCount - entries.length;
  const rows: (typeof entries)[] = [];
  const per = isShelf ? PER_LEDGE : 3;
  for (let i = 0; i < entries.length; i += per) rows.push(entries.slice(i, i + per));
  const notes = new Map(collection.items.map((i) => [i.libraryItemId, i.note]));

  return (
    <Screen bottomInset>
      <TopBar
        onBack={back}
        title={collection.name}
        right={isShelf ? <IconButton icon="edit" onPress={() => router.push('/shelf')} accessibilityLabel="Edit shelf" /> : undefined}
      />
      <AppText variant="bodySoft" style={styles.center}>
        {collection.itemCount === 1 ? '1 product' : `${collection.itemCount} products`}
      </AppText>

      {entries.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          body={isShelf ? 'Tap the pencil to choose what stands on your shelf.' : 'Adding to collections comes in the next update.'}
        />
      ) : isShelf ? (
        <View style={styles.shelves}>
          {rows.map((ledge, i) => (
            <ShelfLedge
              key={i}
              products={ledge.map((e) => ({
                key: e.id,
                uri: e.imageUrl,
                category: e.category,
                name: e.name,
                sub: e.variant,
                note: notes.get(e.id) ?? null,
                label: describe(e),
                onPress: () => openItem(e.id),
              }))}
            />
          ))}
        </View>
      ) : (
        <View style={styles.grid}>
          {rows.map((row, r) => (
            <View key={r} style={styles.gridRow}>
              {row.map((e) => (
                <ProductTile key={e.id} entry={e} />
              ))}
              {Array.from({ length: 3 - row.length }, (_, i) => (
                <View key={`pad-${i}`} style={styles.flex} />
              ))}
            </View>
          ))}
        </View>
      )}
      {missing > 0 ? (
        <AppText variant="bodySoft">
          {missing === 1 ? '1 more product isn’t in your library yet.' : `${missing} more products aren’t in your library yet.`}
        </AppText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center', marginTop: -space.md },
  shelves: { gap: space.lg },
  grid: { gap: 6 },
  gridRow: { flexDirection: 'row', gap: 6 },
});
