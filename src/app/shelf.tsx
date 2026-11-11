import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, TextInput, View, type ViewStyle } from 'react-native';

import { DragList } from '@/components/drag-list';
import { Bottle, ledgesOf, ShelfLedge } from '@/components/shelf';
import {
  AppText,
  Button,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingState,
  Notice,
  Row,
  Screen,
  Section,
  TextAction,
  TextField,
  TopBar,
} from '@/components/ui';
import { SHELF_CAPACITY, type CollectionSummary, type ShelfPlacement } from '@/data/collections';
import type { LibraryEntry } from '@/data/library';
import { useDeleteCollection, useSaveShelf } from '@/data/mutations';
import { useLibrary, useShelf, useShelves } from '@/data/queries';
import { collectionNameSchema } from '@/domain/validation';
import { setCurrentShelf } from '@/lib/current-shelf';
import { toAppError } from '@/lib/errors';
import { goBack } from '@/lib/navigation';
import { colors, fonts, radius, space } from '@/theme/tokens';

/** Handwriting on the glass stays short: a word or two, like a label. */
const SHELF_NOTE_MAX = 40;
const ROW_HEIGHT = 76;

/**
 * Edit shelf: its name, what stands on it, in which order (drag the handles), and what's
 * written on the glass above each product. Nothing is stored until Save.
 * `/shelf` edits the shelf Home shows, `/shelf?id=…` a given shelf, `/shelf?new=1` a new one.
 */
export default function ShelfEditorScreen() {
  const params = useLocalSearchParams<{ id?: string; new?: string }>();
  const library = useLibrary();
  const shelves = useShelves();
  const current = useShelf();
  const creating = params.new === '1';

  const title = creating ? 'New shelf' : 'Edit shelf';
  if (library.isPending || shelves.isPending) {
    return (
      <Screen bottomInset>
        <TopBar onBack={() => goBack()} icon="close" backLabel="Close" title={title} />
        <LoadingState label="Loading your shelf" />
      </Screen>
    );
  }
  const error = library.error ?? shelves.error;
  if (error) {
    return (
      <Screen bottomInset>
        <TopBar onBack={() => goBack()} icon="close" backLabel="Close" title={title} />
        <ErrorState
          message={toAppError(error).message}
          onRetry={() => {
            void library.refetch();
            void shelves.refetch();
          }}
        />
      </Screen>
    );
  }
  const stored: CollectionSummary | null = creating
    ? null
    : params.id
      ? (shelves.shelves.find((s) => s.id === params.id) ?? null)
      : current.shelf;
  if (params.id && !stored) {
    return (
      <Screen bottomInset>
        <TopBar onBack={() => goBack()} icon="close" backLabel="Close" title={title} />
        <EmptyState title="This shelf isn’t here" body="It may have been deleted on another device." />
      </Screen>
    );
  }
  return (
    <Editor
      // A save here or on another device starts the editor fresh from what was stored.
      key={stored ? `${stored.id}:${stored.version}` : 'new'}
      title={title}
      library={library.data ?? []}
      shelf={stored ? { id: stored.id, version: stored.version, name: stored.name } : null}
      firstShelf={shelves.shelves.length === 0}
      otherShelves={shelves.shelves.filter((s) => s.id !== stored?.id)}
      initial={
        stored ? stored.items.flatMap((i) => (i.libraryItemId ? [{ libraryItemId: i.libraryItemId, note: i.note }] : [])) : null
      }
      onReload={() => void shelves.refetch()}
    />
  );
}

function Editor({
  title,
  library,
  shelf,
  firstShelf,
  otherShelves,
  initial,
  onReload,
}: {
  title: string;
  library: readonly LibraryEntry[];
  shelf: { id: string; version: number; name: string } | null;
  firstShelf: boolean;
  otherShelves: readonly CollectionSummary[];
  /** null: a shelf that doesn't exist yet. */
  initial: ShelfPlacement[] | null;
  onReload: () => void;
}) {
  const byId = useMemo(() => new Map(library.map((e) => [e.id, e])), [library]);
  const [name, setName] = useState(shelf?.name ?? (firstShelf ? 'My shelf' : ''));
  const [nameError, setNameError] = useState<string>();
  const [placements, setPlacements] = useState<ShelfPlacement[]>(() => {
    if (initial) return initial.filter((p) => byId.has(p.libraryItemId));
    if (!firstShelf) return [];
    // The very first shelf starts from what Home shows until then: what's in use.
    const owned = library.filter((e) => e.ownershipStatus === 'owned');
    const using = owned.filter((e) => e.usageStatus === 'using');
    return (using.length ? using : owned).slice(0, 6).map((e) => ({ libraryItemId: e.id, note: null }));
  });
  // Full shelf: the product waiting to swap in, until you pick which one it replaces.
  const [swapIn, setSwapIn] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const save = useSaveShelf();
  const remove = useDeleteCollection();

  const cleaned = placements.map((p) => ({ ...p, note: p.note?.trim() || null }));
  const dirty = JSON.stringify(cleaned) !== JSON.stringify(initial ?? []) || name.trim() !== (shelf?.name ?? '');
  const full = placements.length >= SHELF_CAPACITY;
  const placedIds = new Set(placements.map((p) => p.libraryItemId));
  // The shelf is what you use now, so you add from Have.
  const rest = library.filter((e) => !placedIds.has(e.id) && e.ownershipStatus === 'owned');

  const move = (from: number, to: number) =>
    setPlacements((ps) => {
      if (to < 0 || to >= ps.length) return ps;
      const next = [...ps];
      const [p] = next.splice(from, 1);
      if (p) next.splice(to, 0, p);
      return next;
    });
  const setNote = (i: number, note: string) => setPlacements((ps) => ps.map((p, j) => (j === i ? { ...p, note } : p)));
  const takeOff = (i: number) => setPlacements((ps) => ps.filter((_, j) => j !== i));
  const add = (id: string) => {
    if (full) return setSwapIn(id);
    setPlacements((ps) => [...ps, { libraryItemId: id, note: null }]);
  };
  const swap = (i: number) => {
    if (!swapIn) return;
    setPlacements((ps) => ps.map((p, j) => (j === i ? { libraryItemId: swapIn, note: null } : p)));
    setSwapIn(null);
  };

  const onSave = () => {
    const parsed = collectionNameSchema.safeParse(name);
    if (!parsed.success) return setNameError(parsed.error.issues[0]?.message);
    setNameError(undefined);
    save.mutate(
      { shelf, placements: cleaned, name: parsed.data },
      {
        onSuccess: (id) => {
          setCurrentShelf(id);
          goBack();
        },
      },
    );
  };
  const doDelete = () => {
    if (!shelf) return;
    remove.mutate(shelf.id, {
      onSuccess: () => {
        setCurrentShelf(otherShelves[0]?.id ?? null);
        goBack();
      },
    });
  };
  const askDelete = () => {
    if (process.env.EXPO_OS === 'web') return setConfirmDelete(true);
    Alert.alert(`Delete “${shelf?.name}”?`, 'The products stay in your library. Only the shelf and its notes go.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: doDelete },
    ]);
  };
  const conflict = save.isError && toAppError(save.error).kind === 'conflict';

  const preview = cleaned.flatMap((p) => {
    const e = byId.get(p.libraryItemId);
    return e ? [{ key: e.id, uri: e.imageUrl, category: e.category, name: e.name, sub: e.variant, note: p.note, label: e.name }] : [];
  });
  const ledges = ledgesOf(preview);
  const swapName = swapIn ? byId.get(swapIn)?.name : null;

  return (
    <Screen bottomInset scrollEnabled={!dragging}>
      <TopBar
        onBack={() => goBack()}
        icon="close"
        backLabel="Close without saving"
        title={title}
        right={<TextAction label="Save" onPress={onSave} disabled={!dirty || save.isPending || conflict} />}
      />

      <TextField
        label="Shelf name"
        placeholder="Bathroom, Vanity, Travel…"
        value={name}
        onChangeText={(v) => {
          setName(v);
          setNameError(undefined);
        }}
        error={nameError}
        maxLength={80}
        autoFocus={!shelf && !firstShelf}
      />

      {ledges.length ? (
        <View style={styles.preview} accessibilityLabel="Preview of your shelf">
          {ledges.map((l, i) => (
            <ShelfLedge key={i} products={l} />
          ))}
        </View>
      ) : (
        <EmptyState title="Nothing on the shelf" body="Add the products you use every day from Have, below." />
      )}

      {save.isError ? <Notice>{toAppError(save.error).message}</Notice> : null}
      {conflict ? <Button label="Reload shelf" variant="secondary" onPress={onReload} /> : null}

      <Section label="On the shelf" right={`${placements.length} of ${SHELF_CAPACITY}`}>
        {swapIn ? (
          <View style={styles.swapBar} accessibilityRole="alert">
            <AppText variant="body" style={styles.flex}>{`Your shelf is full. Tap the product ${swapName ?? 'it'} should replace.`}</AppText>
            <TextAction label="Cancel" onPress={() => setSwapIn(null)} />
          </View>
        ) : placements.length > 1 ? (
          <AppText variant="bodySoft">Drag the handles to change the order.</AppText>
        ) : null}
        <DragList
          items={placements}
          keyOf={(p) => p.libraryItemId}
          labelOf={(p) => byId.get(p.libraryItemId)?.name ?? 'product'}
          rowHeight={ROW_HEIGHT}
          onMove={move}
          onDragChange={setDragging}
          renderRow={(p, i) => {
            const e = byId.get(p.libraryItemId);
            if (!e) return null;
            return (
              <>
                <Thumb entry={e} />
                <View style={styles.flex}>
                  <AppText variant="name" numberOfLines={1}>
                    {e.name}
                  </AppText>
                  <TextInput
                    value={p.note ?? ''}
                    onChangeText={(v) => setNote(i, v)}
                    placeholder="write on the glass…"
                    placeholderTextColor={colors.inkMuted}
                    maxLength={SHELF_NOTE_MAX}
                    accessibilityLabel={`Note on the glass above ${e.name}`}
                    style={[styles.noteInput, webNoOutline]}
                    returnKeyType="done"
                  />
                </View>
                {swapIn ? (
                  <Button label="Replace" variant="secondary" onPress={() => swap(i)} />
                ) : (
                  <IconButton
                    icon="close"
                    size={34}
                    iconSize={16}
                    tone="plain"
                    onPress={() => takeOff(i)}
                    accessibilityLabel={`Take ${e.name} off the shelf`}
                  />
                )}
              </>
            );
          }}
        />
      </Section>

      {rest.length ? (
        <Section
          label="Add from Have"
          footer={full ? `Your shelf holds ${SHELF_CAPACITY} products. Adding one more swaps it for one already there.` : undefined}
        >
          <View>
            {rest.map((e) => (
              <View key={e.id} style={styles.placed}>
                <Thumb entry={e} />
                <View style={styles.flex}>
                  <AppText variant="name" numberOfLines={1}>
                    {e.name}
                  </AppText>
                  <AppText variant="small" numberOfLines={1}>
                    {e.brand}
                  </AppText>
                </View>
                <IconButton
                  icon="plus"
                  size={36}
                  iconSize={18}
                  tone={swapIn === e.id ? 'ink' : 'tile'}
                  selected={swapIn === e.id}
                  onPress={() => add(e.id)}
                  accessibilityLabel={full ? `Swap ${e.name} onto the shelf` : `Put ${e.name} on the shelf`}
                />
              </View>
            ))}
          </View>
        </Section>
      ) : null}

      <Button label="Save shelf" onPress={onSave} loading={save.isPending} disabled={!dirty || conflict} />

      {shelf ? (
        <Section>
          <Row title={remove.isPending ? 'Deleting…' : 'Delete this shelf'} tone="danger" onPress={remove.isPending ? undefined : askDelete} />
          {remove.isError ? <Notice>{toAppError(remove.error).message}</Notice> : null}
          {confirmDelete ? (
            <View style={styles.confirm} accessibilityRole="alert">
              <AppText variant="section">{`Delete “${shelf.name}”?`}</AppText>
              <AppText variant="body">The products stay in your library. Only the shelf and its notes go.</AppText>
              <Button label="Delete" variant="danger" onPress={doDelete} loading={remove.isPending} />
              <Button label="Cancel" variant="plain" onPress={() => setConfirmDelete(false)} disabled={remove.isPending} />
            </View>
          ) : null}
        </Section>
      ) : null}
    </Screen>
  );
}

function Thumb({ entry }: { entry: LibraryEntry }) {
  return (
    <View style={styles.thumb}>
      <Bottle uri={entry.imageUrl} category={entry.category} name={entry.name} scale={0.55} photoHeight={46} />
    </View>
  );
}

const webNoOutline = process.env.EXPO_OS === 'web' ? ({ outlineStyle: 'none' } as unknown as ViewStyle) : null;

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  preview: { gap: space.md },
  placed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
    borderBottomWidth: 1,
    borderColor: colors.rule,
  },
  thumb: {
    width: 52,
    height: 60,
    borderRadius: radius.md,
    backgroundColor: colors.tile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteInput: { fontFamily: fonts.hand, fontSize: 22, color: colors.ink, paddingVertical: 2, minHeight: 32 },
  swapBar: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.md, backgroundColor: colors.tile },
  confirm: { gap: space.md, padding: space.lg, borderRadius: radius.md, backgroundColor: colors.dangerWash },
});
