import { StyleSheet, View } from 'react-native';

import { AppText, EmptyState, ErrorState, Kicker, LoadingState, Rule, Screen } from '@/components/ui';
import type { CollectionSummary } from '@/data/collections';
import { useCollections } from '@/data/queries';
import { toAppError } from '@/lib/errors';
import { colors, radius, space } from '@/theme/tokens';

const typeLabel: Record<CollectionSummary['type'], string> = {
  shelf: 'Curated shelf',
  shopping: 'Shopping list',
  custom: 'Collection',
};

export default function CollectionsScreen() {
  const collections = useCollections();

  return (
    <Screen>
      <Kicker>Curate</Kicker>
      <AppText variant="display">Collections</AppText>
      <Rule />
      {collections.isPending ? (
        <LoadingState label="Loading collections" />
      ) : collections.isError ? (
        <ErrorState message={toAppError(collections.error).message} onRetry={() => collections.refetch()} />
      ) : collections.data.length === 0 ? (
        <EmptyState title="No collections yet" body="Your Shopping List will appear here once your account is ready." />
      ) : (
        <View style={styles.list}>
          {collections.data.map((c) => (
            <View
              key={c.id}
              style={styles.card}
              accessible
              accessibilityLabel={`${c.name}, ${typeLabel[c.type]}, ${c.itemCount} items`}
            >
              <AppText variant="kicker">{typeLabel[c.type]}</AppText>
              <AppText variant="title">{c.name}</AppText>
              <AppText variant="caption">
                {c.itemCount === 1 ? '1 item' : `${c.itemCount} items`}
              </AppText>
            </View>
          ))}
          <AppText variant="caption" style={styles.note}>
            Creating collections and your curated shelf arrives in an upcoming build.
          </AppText>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.md },
  card: {
    padding: space.xl,
    gap: space.xs,
    borderRadius: radius.lg,
    backgroundColor: colors.paperRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.rule,
  },
  note: { textAlign: 'center', marginTop: space.md },
});
