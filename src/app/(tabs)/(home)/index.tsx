import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { openItem } from '@/components/ProductRow';
import { ledgesOf, ShelfLedge, type ShelfProduct } from '@/components/shelf';
import { Icon } from '@/components/icons';
import { AppText, Button, ErrorState, IconButton, LoadingState, Screen } from '@/components/ui';
import type { LibraryEntry } from '@/data/library';
import { useLibrary, useShelf } from '@/data/queries';
import { OWNERSHIP_STATUSES, ownershipLabel, type OwnershipStatus } from '@/domain/library';
import { setCurrentShelf } from '@/lib/current-shelf';
import { toAppError } from '@/lib/errors';
import { colors, fonts, space } from '@/theme/tokens';

/** Until the shelf is arranged, Home shows what's in use so it is never bare. */
const FALLBACK_COUNT = 6;

const describeEntry = (e: LibraryEntry) => [e.brand, e.name, e.variant].filter(Boolean).join(', ');

export default function HomeScreen() {
  const library = useLibrary();
  const shelf = useShelf();
  const [switching, setSwitching] = useState(false);
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
  const editShelf = () =>
    router.push(shelf.shelf ? { pathname: '/shelf', params: { id: shelf.shelf.id } } : '/shelf');
  const name = shelf.shelf?.name ?? 'My shelf';

  return (
    <Screen>
      <View style={styles.titleRow}>
        <Pressable
          onPress={() => setSwitching((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={`${name}. Switch shelf`}
          accessibilityState={{ expanded: switching }}
          style={({ pressed }) => [styles.titleButton, pressed && styles.pressed]}
        >
          <AppText variant="display" style={styles.title}>
            {name.toLowerCase() === 'my shelf' ? 'My\nshelf' : name}
          </AppText>
          <View style={[styles.chevron, switching && styles.chevronOpen]}>
            <Icon name="chevronDown" size={22} strokeWidth={2.6} />
          </View>
        </Pressable>
        {data.length ? <IconButton icon="edit" onPress={editShelf} accessibilityLabel={`Edit ${name}`} /> : null}
      </View>

      {switching ? (
        <View style={styles.switcher} accessibilityRole="menu">
          {shelf.shelves.map((s) => {
            const selected = s.id === shelf.shelf?.id;
            return (
              <Pressable
                key={s.id}
                onPress={() => {
                  setCurrentShelf(s.id);
                  setSwitching(false);
                }}
                accessibilityRole="menuitem"
                accessibilityState={{ selected }}
                style={({ pressed }) => [styles.switchRow, pressed && styles.pressed]}
              >
                <Text style={[styles.switchName, selected && styles.switchSelected]} numberOfLines={1}>
                  {s.name}
                </Text>
                <Text style={styles.switchCount}>{s.itemCount}</Text>
                {selected ? <Icon name="check" size={18} strokeWidth={2.4} /> : <View style={styles.checkSpace} />}
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => {
              setSwitching(false);
              router.push({ pathname: '/shelf', params: { new: '1' } });
            }}
            accessibilityRole="menuitem"
            style={({ pressed }) => [styles.switchRow, styles.switchNew, pressed && styles.pressed]}
          >
            <Icon name="plus" size={18} strokeWidth={2.2} />
            <Text style={styles.switchName}>New shelf</Text>
          </Pressable>
        </View>
      ) : null}

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

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: space.md },
  titleButton: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, flexShrink: 1 },
  title: { flexShrink: 1 },
  chevron: { marginBottom: 8 },
  chevronOpen: { transform: [{ rotate: '180deg' }] },
  switcher: {
    marginTop: -space.sm,
    borderRadius: 18,
    padding: 6,
    backgroundColor: colors.ground,
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.14), 0 1px 3px rgba(0, 0, 0, 0.08)',
  },
  switchRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.md, borderRadius: 12 },
  switchNew: { borderTopWidth: 1, borderColor: colors.rule, borderRadius: 0, marginTop: 4 },
  switchName: { flex: 1, fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  switchSelected: { fontFamily: fonts.semibold },
  switchCount: { fontFamily: fonts.regular, fontSize: 14, color: colors.inkSoft },
  checkSpace: { width: 18 },
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
