import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { CatalogSearchResult } from '@/data/catalog';
import type { LibraryEntry } from '@/data/library';
import { useAddVariant } from '@/data/mutations';
import { useCatalogSearch, useLibrary } from '@/data/queries';
import { CATEGORIES, categoryLabel, ownershipLabel, type ProductCategory } from '@/domain/library';
import { toAppError } from '@/lib/errors';
import { goBack } from '@/lib/navigation';
import { useRecentSearches } from '@/lib/recent-searches';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { colors, fonts, radius, space } from '@/theme/tokens';
import { Icon } from './icons';
import { statusText } from './ProductRow';
import { Bottle } from './shelf';
import { AppText, Button, Chips, EmptyState, ErrorState, IconButton, LoadingState, Notice, Screen, SearchField, TopBar } from './ui';

const TILE_HEIGHTS = [236, 196, 216, 206];

/**
 * Search the catalogue and add what you find: the Search tab, and the Add product page.
 * Results are a two-column photo board; each tile's button adds it, or shows where it
 * already is in your library.
 */
export function CatalogSearch({ modal = false }: { modal?: boolean }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ProductCategory | null>(null);
  const settled = useDebouncedValue(query.trim(), 250);
  const search = useCatalogSearch(settled, category);
  const library = useLibrary();
  const { recent, remember, forget } = useRecentSearches();
  const results = useMemo(() => search.data ?? [], [search.data]);
  const typing = query.trim() !== settled;

  // Which catalogue products are already in the library, and how.
  const inLibrary = useMemo(() => {
    const byProduct = new Map<string, LibraryEntry>();
    for (const e of library.data ?? []) if (e.productId && !byProduct.has(e.productId)) byProduct.set(e.productId, e);
    return byProduct;
  }, [library.data]);

  const addManually = () => router.push({ pathname: '/add/manual', params: query.trim() ? { name: query.trim() } : {} });
  const quickAdd = useAddVariant();
  // + adds a single-shade product straight away as Owned; with shades or sizes, pick one first.
  const add = (r: CatalogSearchResult) => {
    if (settled) remember(settled);
    if (r.defaultVariantId) quickAdd.mutate({ variantId: r.defaultVariantId, status: 'owned', notes: null });
    else router.push({ pathname: '/add/[productId]', params: { productId: r.productId } });
  };
  const open = (r: CatalogSearchResult) => {
    if (settled) remember(settled);
    const existing = inLibrary.get(r.productId);
    if (existing) router.push({ pathname: '/item/[id]', params: { id: existing.id } });
    else router.push({ pathname: '/add/[productId]', params: { productId: r.productId } });
  };

  const columns: CatalogSearchResult[][] = [[], []];
  results.forEach((r, i) => columns[i % 2]?.push(r));

  return (
    <Screen bottomInset={modal}>
      {modal ? <TopBar onBack={() => goBack()} icon="close" backLabel="Close" title="Add product" /> : null}
      <SearchField
        label="Search products and brands"
        placeholder="Search products and brands"
        value={query}
        onChangeText={setQuery}
        autoFocus={modal}
        onSubmitEditing={() => remember(query)}
        trailing={
          <Pressable
            onPress={addManually}
            accessibilityRole="button"
            accessibilityLabel="Add a product with your own photo"
            hitSlop={6}
            style={({ pressed }) => [styles.camera, pressed && styles.pressed]}
          >
            <Icon name="camera" size={24} />
          </Pressable>
        }
      />

      {!query && recent.length ? (
        <View style={styles.recent}>
          <AppText variant="section" accessibilityRole="header" style={styles.recentHead}>
            Recent searches
          </AppText>
          {recent.map((q) => (
            <View key={q} style={styles.recentRow}>
              <Icon name="clock" size={20} />
              <Pressable
                onPress={() => setQuery(q)}
                accessibilityRole="button"
                accessibilityLabel={`Search for ${q}`}
                style={({ pressed }) => [styles.recentText, pressed && styles.pressed]}
              >
                <Text style={styles.recentLabel} numberOfLines={1}>
                  {q}
                </Text>
              </Pressable>
              <IconButton icon="close" tone="plain" size={36} iconSize={16} onPress={() => forget(q)} accessibilityLabel={`Remove ${q}`} />
            </View>
          ))}
        </View>
      ) : null}

      <Chips
        scroll
        options={CATEGORIES.map((c) => ({ value: c, label: categoryLabel[c] }))}
        value={category}
        onChange={setCategory}
        onClear={() => setCategory(null)}
        accessibilityLabel="Category"
      />

      <Pressable
        onPress={addManually}
        accessibilityRole="button"
        style={({ pressed }) => [styles.manual, pressed && styles.pressed]}
      >
        <View style={styles.manualIcon}>
          <Icon name="camera" size={20} strokeWidth={2} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.manualTitle}>Can’t find it? Add it manually</Text>
          <AppText variant="bodySoft">With your own photo. Only you can see it.</AppText>
        </View>
        <Icon name="chevronRight" size={18} strokeWidth={2} />
      </Pressable>

      {search.isPending || (typing && !results.length) ? (
        <LoadingState label="Searching the catalogue" />
      ) : search.isError ? (
        <ErrorState message={toAppError(search.error).message} onRetry={() => search.refetch()} />
      ) : results.length === 0 ? (
        <EmptyState
          title={settled ? `No matches for “${settled}”` : 'Nothing in this category yet'}
          body="The catalogue is small for now. Anything you add manually stays private to you."
          action={<Button label="Add it manually" variant="secondary" onPress={addManually} />}
        />
      ) : (
        <View style={styles.results}>
          {quickAdd.isError ? <Notice>{toAppError(quickAdd.error).message}</Notice> : null}
          <Text style={styles.count}>
            {settled ? `${results.length} ${results.length === 1 ? 'result' : 'results'}` : 'In the catalogue'}
          </Text>
          <View style={styles.board}>
            {columns.map((col, c) => (
              <View key={c} style={styles.boardColumn}>
                {col.map((r, i) => (
                  <ResultTile
                    key={r.productId}
                    result={r}
                    height={TILE_HEIGHTS[(i * 2 + c) % TILE_HEIGHTS.length] ?? 210}
                    existing={inLibrary.get(r.productId)}
                    onPress={() => open(r)}
                    onAdd={() => add(r)}
                    adding={quickAdd.isPending && quickAdd.variables?.variantId === r.defaultVariantId}
                  />
                ))}
              </View>
            ))}
          </View>
        </View>
      )}
    </Screen>
  );
}

function ResultTile({
  result,
  height,
  existing,
  onPress,
  onAdd,
  adding,
}: {
  result: CatalogSearchResult;
  height: number;
  existing: LibraryEntry | undefined;
  onPress: () => void;
  onAdd: () => void;
  adding: boolean;
}) {
  const label = [result.brand, result.name, existing ? `in your library, ${ownershipLabel[existing.ownershipStatus]}` : null]
    .filter(Boolean)
    .join(', ');
  // The + sits beside the photo button, not inside it: a button can't contain a button.
  return (
    <View style={styles.tileWrap}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={existing ? 'Opens it in your library' : 'Opens the product'}
        style={({ pressed }) => [styles.tileWrap, pressed && styles.pressed]}
      >
        <View style={[styles.tile, { height }]}>
          <Bottle uri={result.imageUrl} category={result.category} name={result.name} scale={1.4} photoHeight={height - 34} />
          {existing ? (
            <View style={styles.tileStatus}>
              <Text style={styles.tileStatusLabel}>{statusText(existing)}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.tileText}>
          <AppText variant="name" numberOfLines={2}>
            {result.name}
          </AppText>
          <AppText variant="small" numberOfLines={1}>
            {existing ? `${result.brand} · in your library` : result.brand}
          </AppText>
        </View>
      </Pressable>
      {existing ? null : (
        <Pressable
          onPress={onAdd}
          disabled={adding}
          accessibilityRole="button"
          accessibilityLabel={`Add ${result.name} to your library`}
          accessibilityHint={result.defaultVariantId ? 'Adds it as Owned' : 'Choose a shade or size first'}
          hitSlop={6}
          style={({ pressed }) => [styles.tileAdd, { top: height - 50 }, pressed && styles.pressed]}
        >
          {adding ? <ActivityIndicator color={colors.ink} /> : <Icon name="plus" size={18} strokeWidth={2.6} />}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.55 },
  camera: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  recent: { gap: 2 },
  recentHead: { marginBottom: space.xs },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 44 },
  recentText: { flex: 1, minHeight: 44, justifyContent: 'center' },
  recentLabel: { fontFamily: fonts.regular, fontSize: 16, color: colors.ink },
  manual: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.xs },
  manualIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.chip, alignItems: 'center', justifyContent: 'center' },
  manualTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  results: { gap: space.md },
  count: { fontFamily: fonts.semibold, fontSize: 13, color: colors.inkSoft },
  board: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  boardColumn: { flex: 1, gap: space.lg },
  tileWrap: { gap: 6 },
  tile: { borderRadius: radius.lg, backgroundColor: colors.tile, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  tileAdd: {
    position: 'absolute',
    right: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.ground,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
  },
  tileStatus: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    height: 32,
    paddingHorizontal: space.md,
    borderRadius: 16,
    backgroundColor: colors.ground,
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
  },
  tileStatusLabel: { fontFamily: fonts.semibold, fontSize: 12, color: colors.ink },
  tileText: { gap: 1, paddingHorizontal: 2 },
});
