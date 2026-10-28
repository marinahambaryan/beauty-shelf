import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Button, EmptyState, ErrorState, LoadingState, Mast, PageTitle, TextAction, TextField, TopBar } from '@/components/ui';
import type { CatalogSearchResult } from '@/data/catalog';
import { useCatalogSearch } from '@/data/queries';
import { CATEGORIES, categoryLabel, type ProductCategory } from '@/domain/library';
import { toAppError } from '@/lib/errors';
import { goBack } from '@/lib/navigation';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { colors, fonts, space, twoDigit, type } from '@/theme/tokens';

/** Add product, step one: find it in the catalogue, or add it manually. */
export default function AddSearchScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ProductCategory | null>(null);
  const settled = useDebouncedValue(query.trim(), 250);
  const search = useCatalogSearch(settled, category);
  const results = search.data ?? [];
  const typing = query.trim() !== settled;

  const addManually = () => router.push({ pathname: '/add/manual', params: query.trim() ? { name: query.trim() } : {} });

  const header = (
    <View style={styles.header}>
      <TopBar onBack={() => goBack()} backLabel="Close" />
      <Mast left="Add product" right="Catalogue" />
      <PageTitle>{'Find a\nproduct'}</PageTitle>
      <TextField
        label="Search the catalogue"
        prefix="Search /"
        placeholder="brand or product"
        value={query}
        onChangeText={setQuery}
        autoFocus
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
        {[null, ...CATEGORIES].map((c) => {
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
      <View style={styles.manual}>
        <AppText variant="bodySoft">Can’t find it?</AppText>
        <TextAction label="Add it manually" onPress={addManually} />
      </View>
      {results.length ? (
        <View style={styles.resultsHead}>
          <AppText variant="label">{settled ? 'Matches' : 'In the catalogue'}</AppText>
          <AppText variant="label" style={styles.soft}>
            {twoDigit(results.length)}
          </AppText>
        </View>
      ) : null}
    </View>
  );

  return (
    <FlatList
      data={search.isSuccess ? results : []}
      keyExtractor={(r) => r.productId}
      renderItem={({ item }) => <ResultRow result={item} />}
      ListHeaderComponent={header}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      style={styles.list}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.xxxl }]}
      ListEmptyComponent={
        search.isPending || typing ? (
          <LoadingState label="Searching the catalogue" />
        ) : search.isError ? (
          <ErrorState message={toAppError(search.error).message} onRetry={() => search.refetch()} />
        ) : (
          <EmptyState
            title={settled ? `No matches for “${settled}”` : 'Nothing in this category yet'}
            body="The catalogue is small for now. Anything you add manually stays private to you."
            action={<Button label="Add manually" variant="secondary" onPress={addManually} />}
          />
        )
      }
    />
  );
}

/**
 * CHARLOTTE TILBURY                03 SHADES
 * Matte Revolution Lipstick
 */
function ResultRow({ result }: { result: CatalogSearchResult }) {
  const unit = result.category === 'makeup' || result.category === 'tools' ? 'shades' : 'sizes';
  const choices = result.defaultVariantId ? null : `${twoDigit(result.variantCount)} ${unit}`;
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/add/[productId]', params: { productId: result.productId } })}
      accessibilityRole="button"
      accessibilityLabel={[result.brand, result.name, categoryLabel[result.category], choices].filter(Boolean).join(', ')}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.rowText}>
        <AppText variant="small">{result.brand}</AppText>
        <AppText variant="name" numberOfLines={2}>
          {result.name}
        </AppText>
      </View>
      <AppText variant="small">{choices ?? categoryLabel[result.category]}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.ground },
  content: { paddingHorizontal: space.xl },
  header: { gap: space.lg, paddingBottom: space.sm },
  categories: { gap: space.md },
  category: { minHeight: 36, justifyContent: 'center' },
  selected: { color: colors.ink, fontFamily: fonts.monoMedium },
  manual: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap', marginTop: -space.sm },
  resultsHead: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: colors.ink, paddingBottom: space.sm },
  soft: { color: colors.inkSoft },
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderColor: colors.rule,
  },
  rowText: { flex: 1, gap: 3 },
  pressed: { opacity: 0.5 },
});
