import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProductRow } from '@/components/ProductRow';
import { AppText, EmptyState, ErrorState, Kicker, LoadingState, TextField } from '@/components/ui';
import { useLibrary } from '@/data/queries';
import {
  CATEGORIES,
  categoryLabel,
  LIBRARY_VIEWS,
  libraryViewLabel,
  librarySortLabel,
  matchesQuery,
  sortLibrary,
  type LibrarySort,
  type LibraryView,
  type ProductCategory,
} from '@/domain/library';
import { toAppError } from '@/lib/errors';
import { colors, radius, space, touchTarget } from '@/theme/tokens';

const SORTS: LibrarySort[] = ['recent', 'name', 'brand', 'rating'];

export default function LibraryScreen() {
  const library = useLibrary();
  const [view, setView] = useState<LibraryView>('all');
  const [category, setCategory] = useState<ProductCategory | null>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<LibrarySort>('recent');

  const rows = useMemo(() => {
    const data = library.data ?? [];
    const filtered = data.filter(
      (e) =>
        (view === 'all' || e.ownershipStatus === view) &&
        (!category || e.category === category) &&
        matchesQuery(e, query),
    );
    return sortLibrary(filtered, sort);
  }, [library.data, view, category, query, sort]);

  const countFor = (v: LibraryView) =>
    (library.data ?? []).filter((e) => v === 'all' || e.ownershipStatus === v).length;

  const header = (
    <View style={styles.header}>
      <Kicker>Your library</Kicker>
      <AppText variant="display">Library</AppText>
      <ChipRow>
        {LIBRARY_VIEWS.map((v) => (
          <Chip key={v} label={`${libraryViewLabel[v]} ${library.data ? countFor(v) : ''}`.trim()} selected={view === v} onPress={() => setView(v)} />
        ))}
      </ChipRow>
      <TextField
        label="Search your library"
        placeholder="Brand, product or shade"
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        clearButtonMode="while-editing"
        returnKeyType="search"
      />
      <ChipRow>
        <Chip label="All categories" selected={!category} onPress={() => setCategory(null)} />
        {CATEGORIES.map((c) => (
          <Chip key={c} label={categoryLabel[c]} selected={category === c} onPress={() => setCategory(c)} />
        ))}
      </ChipRow>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Sort: ${librarySortLabel[sort]}. Double tap to change.`}
        onPress={() => setSort(SORTS[(SORTS.indexOf(sort) + 1) % SORTS.length] ?? 'recent')}
        style={styles.sort}
      >
        <AppText variant="caption">Sort · {librarySortLabel[sort]}</AppText>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <FlatList
        data={library.isSuccess ? rows : []}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => <ProductRow entry={item} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={header}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.content}
        initialNumToRender={12}
        windowSize={10}
        refreshControl={
          <RefreshControl refreshing={library.isRefetching} onRefresh={() => {
            void library.refetch();
          }} tintColor={colors.rose} />
        }
        ListEmptyComponent={
          library.isPending ? (
            <LoadingState label="Loading your library" />
          ) : library.isError ? (
            <ErrorState message={toAppError(library.error).message} onRetry={() => library.refetch()} />
          ) : (library.data?.length ?? 0) === 0 ? (
            <EmptyState
              title="Nothing here yet"
              body="Your owned, wishlisted and finished products will live here. Adding from the catalog arrives in the next build."
            />
          ) : (
            <EmptyState title="No matches" body="Try a different search, view or category." />
          )
        }
      />
    </SafeAreaView>
  );
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {children}
    </ScrollView>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <AppText variant="caption" style={selected ? styles.chipTextSelected : styles.chipText}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { paddingHorizontal: space.xl, paddingBottom: space.xxxl },
  header: { gap: space.md, paddingTop: space.xl, paddingBottom: space.md },
  chips: { gap: space.sm },
  chip: {
    minHeight: touchTarget - 8,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.rule,
    backgroundColor: colors.paperRaised,
  },
  chipSelected: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { color: colors.ink },
  chipTextSelected: { color: colors.onAccent, fontWeight: '600' },
  sort: { alignSelf: 'flex-start', minHeight: touchTarget - 8, justifyContent: 'center' },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.rule },
});
