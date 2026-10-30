import { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View, type ViewStyle } from 'react-native';

import { PER_LEDGE, Bottle, ShelfLedge } from '@/components/shelf';
import {
  AppText,
  Button,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingState,
  Notice,
  Screen,
  Section,
  TextAction,
  TopBar,
} from '@/components/ui';
import { SHELF_CAPACITY, type ShelfPlacement } from '@/data/collections';
import type { LibraryEntry } from '@/data/library';
import { useSaveShelf } from '@/data/mutations';
import { useLibrary, useShelf } from '@/data/queries';
import { ownershipLabel } from '@/domain/library';
import { toAppError } from '@/lib/errors';
import { goBack } from '@/lib/navigation';
import { colors, fonts, radius, space } from '@/theme/tokens';

/** Handwriting on the glass stays short: a word or two, like a label. */
const SHELF_NOTE_MAX = 40;

/**
 * Edit shelf: choose what stands on the shelf, in which order, and what's written on the
 * glass above each product. Nothing is stored until Save.
 */
export default function ShelfEditorScreen() {
  const library = useLibrary();
  const shelf = useShelf();

  if (library.isPending || shelf.isPending) {
    return (
      <Screen bottomInset>
        <TopBar onBack={() => goBack()} icon="close" backLabel="Close" title="Edit shelf" />
        <LoadingState label="Loading your shelf" />
      </Screen>
    );
  }
  const error = library.error ?? shelf.error;
  if (error) {
    return (
      <Screen bottomInset>
        <TopBar onBack={() => goBack()} icon="close" backLabel="Close" title="Edit shelf" />
        <ErrorState
          message={toAppError(error).message}
          onRetry={() => {
            void library.refetch();
            void shelf.refetch();
          }}
        />
      </Screen>
    );
  }
  const stored = shelf.shelf;
  return (
    <Editor
      // A save here or on another device starts the editor fresh from what was stored.
      key={stored ? `${stored.id}:${stored.version}` : 'new'}
      library={library.data ?? []}
      shelf={stored ? { id: stored.id, version: stored.version } : null}
      initial={
        stored
          ? stored.items.flatMap((i) => (i.libraryItemId ? [{ libraryItemId: i.libraryItemId, note: i.note }] : []))
          : null
      }
      onReload={() => void shelf.refetch()}
    />
  );
}

function Editor({
  library,
  shelf,
  initial,
  onReload,
}: {
  library: readonly LibraryEntry[];
  shelf: { id: string; version: number } | null;
  /** null: never arranged — start from what Home shows (what's in use). */
  initial: ShelfPlacement[] | null;
  onReload: () => void;
}) {
  const byId = useMemo(() => new Map(library.map((e) => [e.id, e])), [library]);
  const [placements, setPlacements] = useState<ShelfPlacement[]>(() => {
    if (initial) return initial.filter((p) => byId.has(p.libraryItemId));
    const owned = library.filter((e) => e.ownershipStatus === 'owned');
    const using = owned.filter((e) => e.usageStatus === 'using');
    return (using.length ? using : owned).slice(0, 6).map((e) => ({ libraryItemId: e.id, note: null }));
  });
  const save = useSaveShelf();

  const original = JSON.stringify(initial ?? []);
  const dirty = JSON.stringify(placements.map((p) => ({ ...p, note: p.note?.trim() || null }))) !== original;
  const full = placements.length >= SHELF_CAPACITY;
  const placedIds = new Set(placements.map((p) => p.libraryItemId));
  // Owned products first: they are what actually stands on a shelf.
  const rest = library
    .filter((e) => !placedIds.has(e.id))
    .sort((a, b) => Number(b.ownershipStatus === 'owned') - Number(a.ownershipStatus === 'owned'));

  const move = (i: number, by: -1 | 1) =>
    setPlacements((ps) => {
      const next = [...ps];
      const [p] = next.splice(i, 1);
      if (p) next.splice(i + by, 0, p);
      return next;
    });
  const setNote = (i: number, note: string) => setPlacements((ps) => ps.map((p, j) => (j === i ? { ...p, note } : p)));
  const remove = (i: number) => setPlacements((ps) => ps.filter((_, j) => j !== i));
  const add = (id: string) => setPlacements((ps) => (ps.length >= SHELF_CAPACITY ? ps : [...ps, { libraryItemId: id, note: null }]));

  const onSave = () =>
    save.mutate(
      { shelf, placements: placements.map((p) => ({ ...p, note: p.note?.trim() || null })) },
      { onSuccess: () => goBack() },
    );
  const conflict = save.isError && toAppError(save.error).kind === 'conflict';

  const preview = placements.flatMap((p) => {
    const e = byId.get(p.libraryItemId);
    return e
      ? [{ key: e.id, uri: e.imageUrl, category: e.category, name: e.name, sub: e.variant, note: p.note?.trim() || null, label: e.name }]
      : [];
  });
  const ledges: (typeof preview)[] = [];
  for (let i = 0; i < preview.length; i += PER_LEDGE) ledges.push(preview.slice(i, i + PER_LEDGE));

  return (
    <Screen bottomInset>
      <TopBar
        onBack={() => goBack()}
        icon="close"
        backLabel="Close without saving"
        title="Edit shelf"
        right={<TextAction label="Save" onPress={onSave} disabled={!dirty || save.isPending || conflict} />}
      />

      {ledges.length ? (
        <View style={styles.preview} accessibilityLabel="Preview of your shelf">
          {ledges.map((l, i) => (
            <ShelfLedge key={i} products={l} />
          ))}
        </View>
      ) : (
        <EmptyState title="Nothing on the shelf" body="Add products from your library below." />
      )}

      {save.isError ? <Notice>{toAppError(save.error).message}</Notice> : null}
      {conflict ? <Button label="Reload shelf" variant="secondary" onPress={onReload} /> : null}

      <Section label="On the shelf" right={`${placements.length} of ${SHELF_CAPACITY}`}>
        <View>
          {placements.map((p, i) => {
            const e = byId.get(p.libraryItemId);
            if (!e) return null;
            return (
              <View key={p.libraryItemId} style={styles.placed}>
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
                <View style={styles.controls}>
                  <IconButton
                    icon="up"
                    size={34}
                    iconSize={18}
                    onPress={() => move(i, -1)}
                    disabled={i === 0}
                    accessibilityLabel={`Move ${e.name} earlier`}
                  />
                  <IconButton
                    icon="down"
                    size={34}
                    iconSize={18}
                    onPress={() => move(i, 1)}
                    disabled={i === placements.length - 1}
                    accessibilityLabel={`Move ${e.name} later`}
                  />
                  <IconButton
                    icon="close"
                    size={34}
                    iconSize={16}
                    tone="plain"
                    onPress={() => remove(i)}
                    accessibilityLabel={`Take ${e.name} off the shelf`}
                  />
                </View>
              </View>
            );
          })}
        </View>
      </Section>

      {rest.length ? (
        <Section label="From your library" footer={full ? 'Your shelf holds up to 12 products. Take one off to add another.' : undefined}>
          <View>
            {rest.map((e) => (
              <View key={e.id} style={styles.placed}>
                <Thumb entry={e} />
                <View style={styles.flex}>
                  <AppText variant="name" numberOfLines={1}>
                    {e.name}
                  </AppText>
                  <AppText variant="small" numberOfLines={1}>
                    {[e.brand, ownershipLabel[e.ownershipStatus]].filter(Boolean).join(' · ')}
                  </AppText>
                </View>
                <IconButton
                  icon="plus"
                  size={36}
                  iconSize={18}
                  onPress={() => add(e.id)}
                  disabled={full}
                  accessibilityLabel={`Put ${e.name} on the shelf`}
                />
              </View>
            ))}
          </View>
        </Section>
      ) : null}

      <Button label="Save shelf" onPress={onSave} loading={save.isPending} disabled={!dirty || conflict} />
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
  controls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
