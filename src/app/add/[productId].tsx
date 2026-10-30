import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Bottle } from '@/components/shelf';
import {
  AppText,
  Button,
  Chips,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingState,
  Notice,
  Screen,
  Section,
  TextField,
  TopBar,
} from '@/components/ui';
import type { CatalogVariant } from '@/data/catalog';
import { useAddVariant } from '@/data/mutations';
import { useCatalogProduct, useLibrary } from '@/data/queries';
import {
  categoryLabel,
  OWNERSHIP_STATUSES,
  ownershipLabel,
  variantKind,
  type OwnershipStatus,
} from '@/domain/library';
import { noteSchema } from '@/domain/validation';
import { toAppError } from '@/lib/errors';
import { goBack } from '@/lib/navigation';
import { colors, radius, space } from '@/theme/tokens';

const variantName = (v: CatalogVariant) => v.label ?? v.shadeName ?? v.sizeLabel ?? 'Standard';

/** Add product, step two: pick the shade or size, choose Owned / Wishlist / Finished, add. */
export default function AddProductScreen() {
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const product = useCatalogProduct(productId);
  const library = useLibrary();
  const add = useAddVariant();

  const variants = useMemo(() => product.data?.variants ?? [], [product.data]);
  const single = variants.length === 1;
  const [picked, setPicked] = useState<string | null>(null);
  const variant = single ? variants[0] : variants.find((v) => v.id === picked);
  const [status, setStatus] = useState<OwnershipStatus>('owned');
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState<string>();
  const [needsChoice, setNeedsChoice] = useState(false);

  // Which of this product's shades/sizes are already in the library, and how.
  const owned = useMemo(() => {
    const byVariant = new Map<string, { id: string; status: OwnershipStatus }>();
    for (const e of library.data ?? []) if (e.variantId) byVariant.set(e.variantId, { id: e.id, status: e.ownershipStatus });
    return byVariant;
  }, [library.data]);
  const existing = variant ? owned.get(variant.id) : undefined;

  const openItem = (id: string, flag: 'added' | 'existing') =>
    router.replace({ pathname: '/item/[id]', params: { id, [flag]: '1' } });

  const submit = () => {
    if (!variant) return setNeedsChoice(true);
    const parsed = noteSchema.safeParse(note);
    if (!parsed.success) return setNoteError(parsed.error.issues[0]?.message);
    setNoteError(undefined);
    add.mutate(
      { variantId: variant.id, status, notes: parsed.data },
      { onSuccess: (r) => openItem(r.libraryItemId, r.created ? 'added' : 'existing') },
    );
  };

  if (product.isPending) {
    return (
      <Screen bottomInset>
        <TopBar onBack={() => goBack('/search')} />
        <LoadingState label="Loading product" />
      </Screen>
    );
  }
  if (product.isError || !product.data) {
    return (
      <Screen bottomInset>
        <TopBar onBack={() => goBack('/search')} />
        {product.isError ? (
          <ErrorState message={toAppError(product.error).message} onRetry={() => product.refetch()} />
        ) : (
          <EmptyState title="This product isn’t in the catalogue" body="It may have been removed. Search again, or add it manually." />
        )}
      </Screen>
    );
  }

  const p = product.data;
  const kind = variantKind(variants);
  const shown = variant ?? variants[0];

  return (
    <Screen bottomInset>
      <View style={styles.hero}>
        <View accessible={false} importantForAccessibility="no-hide-descendants">
          <Bottle
            uri={shown?.imageUrl ?? p.imageUrl}
            category={p.category}
            name={p.name}
            sub={shown && !single ? variantName(shown) : categoryLabel[p.category]}
            scale={2.4}
            photoHeight={300}
          />
        </View>
        <View style={styles.heroBack}>
          <IconButton icon="back" tone="white" size={40} iconSize={20} onPress={() => goBack('/search')} accessibilityLabel="Back" />
        </View>
      </View>
      <View style={styles.title}>
        <AppText variant="heading">{p.name}</AppText>
        <AppText variant="bodySoft">{[p.brand, categoryLabel[p.category]].filter(Boolean).join(' · ')}</AppText>
      </View>

      {!single ? (
        <Section label={kind} right={`${variants.length} ${kind === 'Shade' ? 'shades' : 'sizes'}`}>
          <View accessibilityRole="radiogroup" accessibilityLabel={kind}>
            {variants.map((v) => {
              const selected = v.id === picked;
              const have = owned.get(v.id);
              return (
                <Pressable
                  key={v.id}
                  onPress={() => {
                    setPicked(v.id);
                    setNeedsChoice(false);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={[variantName(v), have ? `In your library as ${ownershipLabel[have.status]}` : null]
                    .filter(Boolean)
                    .join(', ')}
                  style={({ pressed }) => [styles.choice, pressed && styles.pressed]}
                >
                  <View style={[styles.radio, selected && styles.radioOn]}>{selected ? <View style={styles.radioDot} /> : null}</View>
                  <AppText variant="label" style={styles.flex} numberOfLines={2}>
                    {variantName(v)}
                  </AppText>
                  {have ? (
                    <AppText variant="small" numberOfLines={1}>
                      {ownershipLabel[have.status]}
                    </AppText>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
          {needsChoice ? <Notice>{`Choose a ${kind.toLowerCase()} first.`}</Notice> : null}
        </Section>
      ) : null}

      {existing ? (
        <Section>
          <Notice tone="info">{`Already in your library as ${ownershipLabel[existing.status]}.`}</Notice>
          <Button label="Open it" variant="secondary" onPress={() => openItem(existing.id, 'existing')} />
        </Section>
      ) : (
        <>
          <Section label="Add to">
            <Chips
              options={OWNERSHIP_STATUSES.map((s) => ({ value: s, label: ownershipLabel[s] }))}
              value={status}
              onChange={setStatus}
              accessibilityLabel="Add to"
            />
          </Section>
          <TextField
            label="Note (optional)"
            placeholder="Where you got it, what you think so far"
            value={note}
            onChangeText={setNote}
            error={noteError}
            multiline
            maxLength={5000}
          />
          {add.isError ? <Notice>{toAppError(add.error).message}</Notice> : null}
          <Button label="Add to library" onPress={submit} loading={add.isPending} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  choice: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderBottomWidth: 1,
    borderColor: colors.rule,
  },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.fieldBorder, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.ink, borderWidth: 2 },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.ink },
  hero: {
    height: 380,
    borderRadius: radius.xl,
    backgroundColor: colors.tile,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: -space.md,
  },
  heroBack: { position: 'absolute', top: 12, left: 12 },
  title: { gap: space.xs, marginTop: -space.sm },
  pressed: { opacity: 0.5 },
});
