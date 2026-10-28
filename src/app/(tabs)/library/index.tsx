import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProductCard } from '@/components/ProductRow';
import { BracketTabs, EmptyState, ErrorState, LoadingState, Mast, PageTitle, TextField } from '@/components/ui';
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
import { catalogNo, colors, fonts, space, type } from '@/theme/tokens';

const SORTS: LibrarySort[] = ['recent', 'name', 'brand', 'rating'];
const sortShort: Record<LibrarySort, string> = { recent: 'Recent', name: 'Name', brand: 'Brand', rating: 'Rating' };
const isView = (v: unknown): v is LibraryView => typeof v === 'string' && (LIBRARY_VIEWS as readonly string[]).includes(v);

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const library = useLibrary();
  const params = useLocalSearchParams<{ view?: string }>();
  const [view, setView] = useState<LibraryView>(isView(params.view) ? params.view : 'all');
  const [category, setCategory] = useState<ProductCategory | null>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<LibrarySort>('recent');

  // Home links here with ?view=owned etc.; follow it whenever it changes.
  const [seenParam, setSeenParam] = useState(params.view);
  if (params.view !== seenParam) {
    setSeenParam(params.view);
    if (isView(params.view)) setView(params.view);
  }

  const data = useMemo(() => library.data ?? [], [library.data]);
  const rows = useMemo(
    () =>
      sortLibrary(
        data.filter(
          (e) =>
            (view === 'all' || e.ownershipStatus === view) &&
            (!category || e.category === category) &&
            matchesQuery(e, query),
        ),
        sort,
      ),
    [data, view, category, query, sort],
  );
  // Only offer categories the library actually contains.
  const presentCategories = CATEGORIES.filter((c) => data.some((e) => e.category === c));
  const nextSort = () => setSort(SORTS[(SORTS.indexOf(sort) + 1) % SORTS.length] ?? 'recent');

  const header = (
    <View style={styles.header}>
      <Mast left="Library" right={`${catalogNo(data.length)} items`} />
      <PageTitle>{'Every-\nthing'}</PageTitle>
      <TextField
        label="Search your library"
        prefix="Search /"
        placeholder="brand, product, shade"
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
      <BracketTabs
        options={LIBRARY_VIEWS.map((v) => ({ value: v, label: libraryViewLabel[v] }))}
        value={view}
        onChange={setView}
      />
      <View style={styles.filters}>
        {presentCategories.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.flex} contentContainerStyle={styles.categories}>
            {[null, ...presentCategories].map((c) => {
              const selected = category === c;
              const label = c ? categoryLabel[c] : 'Every category';
              return (
                <Pressable
                  key={c ?? 'all'}
                  onPress={() => setCategory(c)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={label}
                  style={styles.category}
                >
                  <Text style={[type.small, selected && styles.selected]}>{selected ? `[${label}]` : label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : (
          <View style={styles.flex} />
        )}
        <Pressable
          onPress={nextSort}
          accessibilityRole="button"
          accessibilityLabel={`Sorted by ${librarySortLabel[sort]}. Change sort`}
          style={styles.category}
        >
          <Text style={type.small}>Sort / {sortShort[sort]}</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <FlatList
      data={library.isSuccess ? rows : []}
      keyExtractor={(e) => e.id}
      numColumns={2}
      renderItem={({ item, index }) => (
        <View style={styles.cell}>
          <ProductCard entry={item} n={index + 1} />
        </View>
      )}
      columnWrapperStyle={styles.columns}
      ItemSeparatorComponent={Gap}
      ListHeaderComponent={header}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      style={styles.list}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + space.xl }]}
      initialNumToRender={8}
      windowSize={7}
      refreshControl={
        <RefreshControl
          refreshing={library.isRefetching}
          onRefresh={() => {
            void library.refetch();
          }}
          tintColor={colors.inkSoft}
        />
      }
      ListEmptyComponent={
        library.isPending ? (
          <LoadingState label="Loading your library" />
        ) : library.isError ? (
          <ErrorState message={toAppError(library.error).message} onRetry={() => library.refetch()} />
        ) : data.length === 0 ? (
          <EmptyState
            title="Your library is empty"
            body="Your library is where everything you own, want and finish lives. Adding products arrives in the next update."
          />
        ) : query.trim() ? (
          <EmptyState title={`No matches for “${query.trim()}”`} body="Try another name, brand or shade." />
        ) : (
          <EmptyState title="Nothing here" body="Try another view or category." />
        )
      }
    />
  );
}

function Gap() {
  return <View style={styles.gap} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { flex: 1, backgroundColor: colors.ground },
  content: { paddingHorizontal: space.xl, paddingBottom: space.xxxl },
  header: { gap: space.lg, paddingBottom: space.md },
  filters: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: -space.sm },
  categories: { gap: space.md },
  category: { minHeight: 36, justifyContent: 'center' },
  selected: { color: colors.ink, fontFamily: fonts.monoMedium },
  columns: { gap: 10 },
  // A lone last card keeps its column width instead of stretching across.
  cell: { flex: 1, maxWidth: '50%' },
  gap: { height: 10 },
});
