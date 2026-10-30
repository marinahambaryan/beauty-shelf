import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CollectionBoard, entriesOf } from '@/components/collection-board';
import { ProductTile } from '@/components/ProductRow';
import {
  AppText,
  Button,
  Chips,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingState,
  Screen,
  SearchField,
  UnderlineTabs,
} from '@/components/ui';
import { useCollections, useLibrary, useProfile } from '@/data/queries';
import { LIBRARY_VIEWS, libraryViewLabel, matchesQuery, sortLibrary, type LibraryView } from '@/domain/library';
import { useAuth } from '@/lib/auth';
import { toAppError } from '@/lib/errors';
import { colors, fonts, space } from '@/theme/tokens';

type Tab = 'products' | 'collections';
const TABS = [
  { value: 'products' as const, label: 'Products' },
  { value: 'collections' as const, label: 'Collections' },
];
const isView = (v: unknown): v is LibraryView => typeof v === 'string' && (LIBRARY_VIEWS as readonly string[]).includes(v);

/** Your profile: everything you've added, as a photo grid, and your collections as boards. */
export default function ProfileScreen() {
  const params = useLocalSearchParams<{ tab?: string; view?: string }>();
  const { session } = useAuth();
  const profile = useProfile();
  const library = useLibrary();
  const collections = useCollections();
  const [tab, setTab] = useState<Tab>(params.tab === 'collections' ? 'collections' : 'products');
  const [view, setView] = useState<LibraryView>(isView(params.view) ? params.view : 'all');
  const [query, setQuery] = useState('');

  // Home's counts link here with ?view=owned etc.; follow it whenever it changes.
  const [seen, setSeen] = useState(`${params.tab}:${params.view}`);
  if (`${params.tab}:${params.view}` !== seen) {
    setSeen(`${params.tab}:${params.view}`);
    if (params.tab === 'products' || params.tab === 'collections') setTab(params.tab);
    if (isView(params.view)) setView(params.view);
  }

  const name = profile.data?.displayName?.trim() || session?.user.email?.split('@')[0] || 'You';
  const data = useMemo(() => library.data ?? [], [library.data]);
  const products = useMemo(
    () => sortLibrary(data.filter((e) => (view === 'all' || e.ownershipStatus === view) && matchesQuery(e, query)), 'recent'),
    [data, view, query],
  );
  const boards = useMemo(
    () =>
      (collections.data ?? []).filter(
        (c) => !query.trim() || c.name.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [collections.data, query],
  );

  const rows: (typeof products)[] = [];
  for (let i = 0; i < products.length; i += 3) rows.push(products.slice(i, i + 3));
  const boardRows: (typeof boards)[] = [];
  for (let i = 0; i < boards.length; i += 2) boardRows.push(boards.slice(i, i + 2));

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.avatar} accessible={false}>
          <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.flex}>
          <AppText variant="title" style={styles.name} numberOfLines={1}>
            {name}
          </AppText>
          <AppText variant="bodySoft">{`${data.length} ${data.length === 1 ? 'product' : 'products'} · private`}</AppText>
        </View>
        <IconButton icon="settings" tone="plain" onPress={() => router.push('/settings')} accessibilityLabel="Settings" />
      </View>

      <UnderlineTabs options={TABS} value={tab} onChange={setTab} />

      <View style={styles.searchRow}>
        <View style={styles.flex}>
          <SearchField
            label={tab === 'products' ? 'Search your products' : 'Search your collections'}
            placeholder={tab === 'products' ? 'Search your products' : 'Search your collections'}
            value={query}
            onChangeText={setQuery}
          />
        </View>
        {tab === 'products' ? (
          <IconButton icon="plus" tone="plain" iconSize={28} onPress={() => router.push('/add')} accessibilityLabel="Add product" />
        ) : null}
      </View>

      {tab === 'products' ? (
        <>
          <Chips
            scroll
            options={LIBRARY_VIEWS.map((v) => ({ value: v, label: libraryViewLabel[v] }))}
            value={view}
            onChange={setView}
            accessibilityLabel="Show"
          />
          {library.isPending ? (
            <LoadingState label="Loading your products" />
          ) : library.isError ? (
            <ErrorState message={toAppError(library.error).message} onRetry={() => library.refetch()} />
          ) : data.length === 0 ? (
            <EmptyState
              title="Nothing here yet"
              body="Everything you own, want and finish lives here."
              action={<Button label="Add product" onPress={() => router.push('/add')} />}
            />
          ) : products.length === 0 ? (
            <EmptyState
              title={query.trim() ? `No matches for “${query.trim()}”` : 'Nothing here'}
              body={query.trim() ? 'Try another name, brand or shade.' : 'Try another filter.'}
            />
          ) : (
            <View style={styles.grid}>
              {rows.map((row, r) => (
                <View key={r} style={styles.gridRow}>
                  {row.map((e) => (
                    <ProductTile key={e.id} entry={e} />
                  ))}
                  {Array.from({ length: 3 - row.length }, (_, i) => (
                    <View key={`pad-${i}`} style={styles.flex} />
                  ))}
                </View>
              ))}
            </View>
          )}
        </>
      ) : collections.isPending ? (
        <LoadingState label="Loading collections" />
      ) : collections.isError ? (
        <ErrorState message={toAppError(collections.error).message} onRetry={() => collections.refetch()} />
      ) : boards.length === 0 ? (
        <EmptyState title="No collections yet" body="Your shelf and lists show up here. Making your own collections comes next." />
      ) : (
        <View style={styles.boards}>
          {boardRows.map((row, r) => (
            <View key={r} style={styles.boardRow}>
              {row.map((c) => (
                <CollectionBoard
                  key={c.id}
                  collection={c}
                  entries={entriesOf(c, data)}
                  onPress={() => router.push({ pathname: '/collection/[id]', params: { id: c.id } })}
                />
              ))}
              {row.length === 1 ? <View style={styles.flex} /> : null}
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: space.lg, gap: space.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md + 2 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#F2C3A2', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.medium, fontSize: 26, color: colors.ink },
  name: { fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  grid: { gap: 6 },
  gridRow: { flexDirection: 'row', gap: 6 },
  boards: { gap: space.lg },
  boardRow: { flexDirection: 'row', gap: 10 },
});
