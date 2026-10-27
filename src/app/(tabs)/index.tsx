import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ProductRow } from '@/components/ProductRow';
import { AppText, Button, EmptyState, ErrorState, Kicker, LoadingState, Rule, Screen } from '@/components/ui';
import { useLibrary, useLibraryCounts, useProfile } from '@/data/queries';
import { libraryViewLabel, OWNERSHIP_STATUSES } from '@/domain/library';
import { toAppError } from '@/lib/errors';
import { colors, radius, space } from '@/theme/tokens';

const issueLabel = (d: Date) =>
  `The ${d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })} issue`;

export default function HomeScreen() {
  const profile = useProfile();
  const counts = useLibraryCounts();
  const library = useLibrary();
  const name = profile.data?.displayName;

  return (
    <Screen>
      <Kicker>{issueLabel(new Date())}</Kicker>
      <AppText variant="display">{name ? `Hello, ${name}` : 'Your beauty world'}</AppText>
      <Rule />

      {counts.isPending ? (
        <LoadingState label="Loading your library counts" />
      ) : counts.isError ? (
        <ErrorState message={toAppError(counts.error).message} onRetry={() => counts.refetch()} />
      ) : (
        <View style={styles.tiles} accessibilityRole="summary">
          {OWNERSHIP_STATUSES.map((v) => (
            <View key={v} style={styles.tile} accessible accessibilityLabel={`${counts.data[v]} ${libraryViewLabel[v]}`}>
              <AppText variant="title">{counts.data[v]}</AppText>
              <AppText variant="caption">{libraryViewLabel[v]}</AppText>
            </View>
          ))}
        </View>
      )}

      <AppText variant="heading">Recently updated</AppText>
      {library.isPending ? (
        <LoadingState label="Loading recent products" />
      ) : library.isError ? (
        <ErrorState message={toAppError(library.error).message} onRetry={() => library.refetch()} />
      ) : library.data.length === 0 ? (
        <EmptyState
          kicker="Blank pages"
          title="Your library is empty"
          body="Products you own, want or have finished will appear here. Adding from the catalog arrives in the next build."
        />
      ) : (
        <View>
          {library.data.slice(0, 5).map((entry) => (
            <ProductRow key={entry.id} entry={entry} />
          ))}
          <Button label="See full library" variant="ghost" onPress={() => router.navigate('/library')} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: space.md },
  tile: {
    flex: 1,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.paperRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.rule,
    gap: space.xs,
  },
});
