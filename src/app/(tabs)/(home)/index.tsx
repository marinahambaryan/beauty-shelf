import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IndexRow, openItem } from '@/components/ProductRow';
import { Bottle, GlassShelf } from '@/components/shelf';
import { AppText, Button, ErrorState, LoadingState, Mast, PageTitle, PillAction, Screen, Section } from '@/components/ui';
import type { LibraryEntry } from '@/data/library';
import { useLibrary, useShelf } from '@/data/queries';
import { OWNERSHIP_STATUSES, ownershipLabel, type OwnershipStatus } from '@/domain/library';
import { toAppError } from '@/lib/errors';
import { catalogNo, colors, fonts, space, twoDigit, type } from '@/theme/tokens';

const PER_SHELF = 4;
const SHELVES = 2;

/**
 * What stands on Home's shelves: the curated shelf when it has products; until then,
 * what the person is using (or most recently owned), so Home is never bare.
 */
function pickShelf(library: readonly LibraryEntry[], shelfIds: readonly string[]) {
  const byId = new Map(library.map((e) => [e.id, e]));
  const curated = shelfIds.map((id) => byId.get(id)).filter((e): e is LibraryEntry => Boolean(e));
  if (curated.length) return { curated: true, items: curated.slice(0, PER_SHELF * SHELVES) };
  const owned = library.filter((e) => e.ownershipStatus === 'owned');
  const using = owned.filter((e) => e.usageStatus === 'using');
  return { curated: false, items: (using.length ? using : owned).slice(0, PER_SHELF * SHELVES) };
}

export default function HomeScreen() {
  const library = useLibrary();
  const shelf = useShelf();
  const data = useMemo(() => library.data ?? [], [library.data]);

  const counts = useMemo(() => {
    const c: Record<OwnershipStatus, number> = { owned: 0, wishlist: 0, finished: 0 };
    for (const e of data) c[e.ownershipStatus] += 1;
    return c;
  }, [data]);
  const display = useMemo(() => pickShelf(data, shelf.data ?? []), [data, shelf.data]);
  const rows = Array.from({ length: SHELVES }, (_, r) => display.items.slice(r * PER_SHELF, (r + 1) * PER_SHELF));

  return (
    <Screen>
      <Mast left="Beauty shelf" right={`No. ${catalogNo(data.length)} / Private`} />
      <PageTitle action={<PillAction label="+ Add" accessibilityLabel="Add product" onPress={() => router.push('/add')} />}>
        {'My\nshelf'}
      </PageTitle>

      {library.isPending ? (
        <LoadingState label="Loading your shelf" />
      ) : library.isError ? (
        <ErrorState message={toAppError(library.error).message} onRetry={() => library.refetch()} />
      ) : (
        <>
          <View
            style={styles.shelves}
            accessibilityLabel={display.curated ? 'On your shelf' : 'Using now'}
          >
            {rows.map((items, r) => (
              <GlassShelf key={r}>
                {items.map((e) => (
                  <Pressable
                    key={e.id}
                    onPress={() => openItem(e.id)}
                    accessibilityRole="button"
                    accessibilityLabel={[e.brand, e.name, e.variant].filter(Boolean).join(', ')}
                    style={({ pressed }) => pressed && styles.pressed}
                  >
                    <Bottle uri={e.imageUrl} category={e.category} name={e.name} sub={e.variant} photoHeight={104} />
                  </Pressable>
                ))}
              </GlassShelf>
            ))}
          </View>
          {!display.curated ? (
            display.items.length ? (
              <AppText variant="bodySoft">Showing what you’re using. Arranging your own shelf comes in a later update.</AppText>
            ) : (
              <View style={styles.empty}>
                <AppText variant="bodySoft">Your library is where everything you own, want and finish lives.</AppText>
                <Button label="Add product" onPress={() => router.push('/add')} />
              </View>
            )
          ) : null}

          <View style={styles.counts}>
            {OWNERSHIP_STATUSES.map((s) => (
              <Pressable
                key={s}
                style={({ pressed }) => [styles.count, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={`${ownershipLabel[s]}, ${counts[s]}. Opens Library.`}
                onPress={() => router.navigate({ pathname: '/library', params: { view: s } })}
              >
                <Text style={type.small}>[ {ownershipLabel[s]} ]</Text>
                <Text style={styles.countNumber}>{twoDigit(counts[s])}</Text>
              </Pressable>
            ))}
          </View>

          {data.length ? (
            <Section>
              <View>
                {data.slice(0, 3).map((e, i) => (
                  <IndexRow key={e.id} entry={e} n={i + 1} />
                ))}
              </View>
            </Section>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  shelves: { gap: 34, paddingTop: space.sm },
  counts: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: colors.ink,
    paddingTop: space.md,
  },
  count: { flex: 1, gap: space.xs, minHeight: 48 },
  countNumber: { ...type.title, fontFamily: fonts.displayMedium, fontVariant: ['tabular-nums'] },
  pressed: { opacity: 0.5 },
  empty: { gap: space.lg },
});
