import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { openItem } from '@/components/ProductRow';
import { PER_LEDGE, ShelfLedge, type ShelfProduct } from '@/components/shelf';
import { AppText, Button, ErrorState, IconButton, LoadingState, PageTitle, Screen } from '@/components/ui';
import type { LibraryEntry } from '@/data/library';
import { useLibrary, useShelf } from '@/data/queries';
import { OWNERSHIP_STATUSES, ownershipLabel, type OwnershipStatus } from '@/domain/library';
import { toAppError } from '@/lib/errors';
import { colors, fonts, space } from '@/theme/tokens';

/** Until the shelf is arranged, Home shows what's in use so it is never bare. */
const FALLBACK_COUNT = 6;

const describeEntry = (e: LibraryEntry) => [e.brand, e.name, e.variant].filter(Boolean).join(', ');

export default function HomeScreen() {
  const library = useLibrary();
  const shelf = useShelf();
  const data = useMemo(() => library.data ?? [], [library.data]);

  const counts = useMemo(() => {
    const c: Record<OwnershipStatus, number> = { owned: 0, wishlist: 0, finished: 0 };
    for (const e of data) c[e.ownershipStatus] += 1;
    return c;
  }, [data]);

  const { arranged, products } = useMemo(() => {
    const byId = new Map(data.map((e) => [e.id, e]));
    const toProduct = (e: LibraryEntry, note: string | null): ShelfProduct => ({
      key: e.id,
      uri: e.imageUrl,
      category: e.category,
      name: e.name,
      sub: e.variant,
      note,
      label: describeEntry(e),
      onPress: () => openItem(e.id),
    });
    const placed = (shelf.shelf?.items ?? []).flatMap((ref) => {
      const e = ref.libraryItemId ? byId.get(ref.libraryItemId) : undefined;
      return e ? [toProduct(e, ref.note)] : [];
    });
    if (placed.length) return { arranged: true, products: placed };
    const owned = data.filter((e) => e.ownershipStatus === 'owned');
    const using = owned.filter((e) => e.usageStatus === 'using');
    return { arranged: false, products: (using.length ? using : owned).slice(0, FALLBACK_COUNT).map((e) => toProduct(e, null)) };
  }, [data, shelf.shelf]);

  const ledges = ledgesOf(products);
  const editShelf = () => router.push('/shelf');

  return (
    <Screen>
      <PageTitle
        action={
          data.length ? (
            <IconButton icon="edit" onPress={editShelf} accessibilityLabel="Edit shelf" />
          ) : undefined
        }
      >
        {'My\nshelf'}
      </PageTitle>

      {library.isPending || shelf.isPending ? (
        <LoadingState label="Loading your shelf" />
      ) : library.isError ? (
        <ErrorState message={toAppError(library.error).message} onRetry={() => library.refetch()} />
      ) : data.length === 0 ? (
        <View style={styles.empty}>
          <AppText variant="bodySoft">
            Your shelf is empty. Add the products you own, want and finish, then arrange them here.
          </AppText>
          <Button label="Add product" onPress={() => router.push('/search')} />
        </View>
      ) : (
        <>
          <View style={styles.shelves} accessibilityLabel={arranged ? 'Your shelf' : 'Using now'}>
            {ledges.map((ledge, i) => (
              <ShelfLedge key={i} products={ledge} />
            ))}
          </View>
          {!arranged ? (
            <Pressable onPress={editShelf} accessibilityRole="button" style={({ pressed }) => pressed && styles.pressed}>
              <Text style={styles.hint}>arrange your shelf & write on the glass →</Text>
            </Pressable>
          ) : null}

          <View style={styles.counts}>
            {OWNERSHIP_STATUSES.map((s, i) => (
              <View key={s} style={styles.countItem}>
                {i > 0 ? (
                  <Text style={styles.dot} accessible={false}>
                    ·
                  </Text>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${counts[s]} ${ownershipLabel[s].toLowerCase()}. Opens your products.`}
                  onPress={() => router.navigate({ pathname: '/profile', params: { tab: 'products', view: s } })}
                  hitSlop={{ top: 12, bottom: 12, left: 4, right: 4 }}
                  style={({ pressed }) => pressed && styles.pressed}
                >
                  <Text style={[styles.count, s === 'finished' && styles.countSoft]}>
                    {counts[s]} {ownershipLabel[s].toLowerCase()}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

/** Fills ledges of four, balancing the last two so a ledge never holds a lone product unless it must. */
function ledgesOf<T>(items: readonly T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += PER_LEDGE) out.push(items.slice(i, i + PER_LEDGE));
  const last = out[out.length - 1];
  const prev = out[out.length - 2];
  if (last && prev && last.length === 1) last.unshift(prev.pop() as T);
  return out;
}

const styles = StyleSheet.create({
  shelves: { gap: space.lg, marginTop: -space.sm },
  empty: { gap: space.lg },
  hint: { fontFamily: fonts.hand, fontSize: 22, color: colors.inkSoft, transform: [{ rotate: '-1.5deg' }] },
  counts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    borderTopWidth: 1,
    borderColor: colors.ink,
    paddingTop: space.md + 2,
  },
  countItem: { flexDirection: 'row', alignItems: 'baseline' },
  dot: { fontFamily: fonts.regular, fontSize: 15, color: colors.inkMuted, marginHorizontal: 6 },
  count: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  countSoft: { fontFamily: fonts.regular, color: colors.inkSoft },
  pressed: { opacity: 0.5 },
});
