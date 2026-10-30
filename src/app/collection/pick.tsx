import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { displayItems, LookArt, lookOf } from '@/components/collection-looks';
import { Icon } from '@/components/icons';
import { AppText, EmptyState, LoadingState, Notice, Screen, TopBar } from '@/components/ui';
import { useAddToCollection, useRemoveFromCollection } from '@/data/mutations';
import { useCollections, useLibrary } from '@/data/queries';
import { countLabel, memberOf, refFor } from '@/domain/collections';
import { toAppError } from '@/lib/errors';
import { goBack } from '@/lib/navigation';
import { colors, radius, space } from '@/theme/tokens';

/** "Save to…" from a product page: tick the collections this product belongs in. Each tap saves. */
export default function PickCollectionsScreen() {
  const { entry: entryId } = useLocalSearchParams<{ entry: string }>();
  const collections = useCollections();
  const library = useLibrary();
  const add = useAddToCollection();
  const take = useRemoveFromCollection();
  const entry = library.data?.find((e) => e.id === entryId);
  const back = () => goBack(entryId ? { pathname: '/item/[id]', params: { id: entryId } } : '/profile');
  // The shelf has its own editor; here: your collections, then the shopping list.
  const targets = (collections.data ?? []).filter((c) => c.type !== 'shelf');
  const busy = add.isPending || take.isPending;
  const failure = add.error ?? take.error;

  return (
    <Screen bottomInset>
      <TopBar onBack={back} icon="close" backLabel="Close" title="Save to collection" />
      {collections.isPending || library.isPending ? (
        <LoadingState />
      ) : !entry ? (
        <EmptyState title="This isn’t in your library" body="It may have been deleted on another device." />
      ) : (
        <>
          <AppText variant="bodySoft" style={styles.center} numberOfLines={2}>
            {entry.name}
          </AppText>
          <Pressable
            onPress={() => router.push({ pathname: '/collection/new', params: { entry: entry.id } })}
            accessibilityRole="button"
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <View style={[styles.art, styles.newArt]}>
              <Icon name="plus" size={26} strokeWidth={2} />
            </View>
            <AppText variant="label" style={styles.flex}>
              New collection
            </AppText>
            <Icon name="chevronRight" size={18} strokeWidth={2} />
          </Pressable>
          {failure ? <Notice>{toAppError(failure).message}</Notice> : null}
          {targets.map((c) => {
            const member = memberOf(c.items, entry);
            const ref = refFor(entry, c.type);
            return (
              <Pressable
                key={c.id}
                disabled={busy || (!member && !ref)}
                onPress={() => {
                  if (member) take.mutate([member.id]);
                  else if (ref) add.mutate({ collectionId: c.id, items: [ref] });
                }}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: Boolean(member), disabled: busy }}
                accessibilityLabel={`${c.name}, ${countLabel(c.type, c.items)}`}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <View style={styles.art} accessible={false}>
                  <View style={styles.artScale}>
                    <LookArt look={lookOf(c)} items={displayItems(c, library.data ?? [])} />
                  </View>
                </View>
                <View style={styles.flex}>
                  <AppText variant="label" numberOfLines={1}>
                    {c.name}
                  </AppText>
                  <AppText variant="small">{countLabel(c.type, c.items)}</AppText>
                </View>
                <View style={[styles.check, member && styles.checkOn]}>
                  {member ? <Icon name="check" size={16} color={colors.ground} strokeWidth={3} /> : null}
                </View>
              </Pressable>
            );
          })}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center', marginTop: -space.md },
  pressed: { opacity: 0.6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm, borderBottomWidth: 1, borderColor: colors.rule },
  art: { width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.tile, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end' },
  newArt: { justifyContent: 'center' },
  artScale: { width: 170, transform: [{ scale: 0.36 }], marginBottom: -58 },
  check: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: colors.fieldBorder, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.ink, borderColor: colors.ink },
});
