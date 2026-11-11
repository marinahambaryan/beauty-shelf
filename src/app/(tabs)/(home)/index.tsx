import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { openItem } from '@/components/ProductRow';
import { ledgesOf, ShelfLedge, type ShelfProduct } from '@/components/shelf';
import { AppText, Button, ErrorState, IconButton, LoadingState, Screen } from '@/components/ui';
import type { LibraryEntry } from '@/data/library';
import { useLibrary, useRecentEvents, useShelf } from '@/data/queries';
import { describeEvent, whenLabel } from '@/domain/events';
import { OWNERSHIP_STATUSES, ownershipLabel, type OwnershipStatus } from '@/domain/library';
import { toAppError } from '@/lib/errors';
import { colors, fonts, radius, space } from '@/theme/tokens';

/** Until the shelf is arranged, Home shows what's in use so it is never bare. */
const FALLBACK_COUNT = 6;

const describeEntry = (e: LibraryEntry) => [e.brand, e.name, e.variant].filter(Boolean).join(', ');

/**
 * Home: your shelf — the products you use now, every category on one shelf — then
 * your recent activity and how many products you want, have and have used up.
 * Only your own data; a feed of other people waits until there are followers.
 */
export default function HomeScreen() {
  const library = useLibrary();
  const shelf = useShelf();
  const events = useRecentEvents();
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

  const activity = useMemo(() => {
    const names = new Map(data.map((e) => [e.id, e.name]));
    return (events.data ?? []).flatMap((ev) => {
      const name = names.get(ev.libraryItemId);
      return name ? [{ ...ev, text: describeEvent(ev, name), when: whenLabel(ev.at) }] : [];
    });
  }, [events.data, data]);

  const ledges = ledgesOf(products);
  const editShelf = () =>
    router.push(shelf.shelf ? { pathname: '/shelf', params: { id: shelf.shelf.id } } : '/shelf');
  const name = shelf.shelf?.name ?? 'My shelf';

  return (
    <Screen>
      <View style={styles.titleRow}>
        <AppText variant="display" style={styles.title} accessibilityRole="header">
          {name.toLowerCase() === 'my shelf' ? 'My\nshelf' : name}
        </AppText>
        {data.length ? <IconButton icon="edit" onPress={editShelf} accessibilityLabel={`Edit ${name}`} /> : null}
      </View>

      {library.isPending || shelf.isPending ? (
        <LoadingState label="Loading your shelf" />
      ) : library.isError ? (
        <ErrorState message={toAppError(library.error).message} onRetry={() => library.refetch()} />
      ) : data.length === 0 ? (
        <View style={styles.empty}>
          <AppText variant="title">Your shelf is empty</AppText>
          <AppText variant="bodySoft">Add the products you use every day. They’ll stand here, with your notes on the glass.</AppText>
          <Button label="Add your first product" onPress={() => router.push('/search')} />
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
              <Text style={styles.hint}>pick what you use every day & write on the glass →</Text>
            </Pressable>
          ) : null}

          {activity.length ? (
            <View style={styles.activity}>
              <AppText variant="section" accessibilityRole="header">
                Your recent activity
              </AppText>
              {activity.map((a) => (
                <Pressable
                  key={a.id}
                  onPress={() => openItem(a.libraryItemId)}
                  accessibilityRole="button"
                  accessibilityLabel={`${a.text}, ${a.when}`}
                  style={({ pressed }) => [styles.activityRow, pressed && styles.pressed]}
                >
                  <Text style={styles.activityText} numberOfLines={2}>
                    {a.text}
                  </Text>
                  <Text style={styles.activityWhen}>{a.when}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          <View style={styles.counts}>
            {OWNERSHIP_STATUSES.map((s) => (
              <Pressable
                key={s}
                accessibilityRole="button"
                accessibilityLabel={`${counts[s]} ${ownershipLabel[s].toLowerCase()}. Opens your products.`}
                onPress={() => router.navigate({ pathname: '/profile', params: { tab: 'products', view: s } })}
                style={({ pressed }) => [styles.countBox, pressed && styles.pressed]}
              >
                <Text style={styles.countNumber}>{counts[s]}</Text>
                <Text style={styles.countLabel}>{ownershipLabel[s].toLowerCase()}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: space.md },
  title: { flexShrink: 1 },
  shelves: { gap: space.lg, marginTop: -space.sm },
  empty: { gap: space.md },
  hint: { fontFamily: fonts.hand, fontSize: 22, color: colors.inkSoft, transform: [{ rotate: '-1.5deg' }] },
  activity: { gap: space.xs, marginTop: space.sm },
  activityRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderBottomWidth: 1,
    borderColor: colors.rule,
    paddingVertical: space.sm,
  },
  activityText: { flex: 1, fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.ink },
  activityWhen: { fontFamily: fonts.regular, fontSize: 13, color: colors.inkSoft },
  counts: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  countBox: {
    flex: 1,
    minHeight: 60,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.rule,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space.sm,
  },
  countNumber: { fontFamily: fonts.semibold, fontSize: 18, color: colors.ink },
  countLabel: { fontFamily: fonts.regular, fontSize: 13, color: colors.inkSoft },
  pressed: { opacity: 0.5 },
});
