import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { RatingInput } from '@/components/rating';
import { AppText, Button, LoadingState, Notice, Screen, Section, TextField, TopBar } from '@/components/ui';
import { useDeleteReview, useSaveReview, useUpdateItem } from '@/data/mutations';
import { useLibraryItem, useMyReview, useProfile } from '@/data/queries';
import type { MyReview } from '@/data/reviews';
import { displayNameSchema, reviewBodySchema } from '@/domain/validation';
import { toAppError } from '@/lib/errors';
import { goBack } from '@/lib/navigation';
import { colors, radius, space } from '@/theme/tokens';

/**
 * Rate and review a catalogue product for everyone. Says up front what becomes public
 * (stars, text, your name) and what doesn't (your library, status, notes, dates).
 */
export default function ReviewScreen() {
  const params = useLocalSearchParams<{ productId: string; name?: string; entry?: string; rating?: string }>();
  const mine = useMyReview(params.productId);
  const profile = useProfile();

  if (mine.isPending || profile.isPending) {
    return (
      <Screen bottomInset>
        <TopBar onBack={() => goBack()} icon="close" backLabel="Close" title="Your rating" />
        <LoadingState />
      </Screen>
    );
  }
  return (
    <ReviewForm
      key={mine.data ? `${mine.data.id}:${mine.data.version}` : 'new'}
      productId={params.productId}
      productName={params.name ?? 'this product'}
      entryId={params.entry}
      existing={mine.data ?? null}
      startRating={mine.data?.rating ?? (Number(params.rating) || null)}
      hasName={Boolean(profile.data?.displayName?.trim())}
    />
  );
}

function ReviewForm({
  productId,
  productName,
  entryId,
  existing,
  startRating,
  hasName,
}: {
  productId: string;
  productName: string;
  entryId?: string;
  existing: MyReview | null;
  startRating: number | null;
  hasName: boolean;
}) {
  const [rating, setRating] = useState<number | null>(startRating);
  const [body, setBody] = useState(existing?.body ?? '');
  const [name, setName] = useState('');
  const [errors, setErrors] = useState<{ body?: string; name?: string; rating?: string }>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const save = useSaveReview();
  const remove = useDeleteReview();
  const entry = useLibraryItem(entryId).entry;
  const updateItem = useUpdateItem();

  const post = () => {
    const text = reviewBodySchema.safeParse(body);
    const display = displayNameSchema.safeParse(name);
    const next = {
      rating: rating ? undefined : 'Choose 1 to 5 stars.',
      body: text.success ? undefined : text.error.issues[0]?.message,
      name: hasName ? undefined : display.success && display.data ? undefined : 'Add the name your reviews show.',
    };
    setErrors(next);
    if (next.rating || next.body || next.name || !rating || !text.success) return;
    save.mutate(
      {
        productId,
        rating,
        body: text.data,
        existing,
        displayName: hasName || !display.success ? undefined : (display.data ?? undefined),
      },
      {
        onSuccess: () => {
          // Keep your private rating in step, so "My rating" sorting matches what you shared.
          if (entry && entry.rating !== rating) updateItem.mutate({ id: entry.id, version: entry.version, patch: { rating } });
          goBack();
        },
      },
    );
  };

  const doDelete = () => existing && remove.mutate({ id: existing.id, productId }, { onSuccess: () => goBack() });
  const askDelete = () => {
    if (process.env.EXPO_OS === 'web') return setConfirmDelete(true);
    Alert.alert('Delete your review?', 'Your stars and text are removed for everyone. Your library stays as it is.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: doDelete },
    ]);
  };
  const failure = save.error ?? remove.error;

  return (
    <Screen bottomInset contentStyle={styles.content}>
      <TopBar onBack={() => goBack()} icon="close" backLabel="Close" title={existing ? 'Edit your review' : 'Rate and review'} />
      <AppText variant="heading">{productName}</AppText>

      <View style={styles.notice}>
        <AppText variant="body">Your stars, your review and your name are public.</AppText>
        <AppText variant="bodySoft">Your library, status, notes and dates stay private.</AppText>
      </View>

      <Section label="Your rating">
        <RatingInput value={rating} onChange={setRating} />
        {errors.rating ? <AppText variant="small" style={styles.error}>{errors.rating}</AppText> : null}
      </Section>

      <TextField
        label="Your review (optional)"
        placeholder="How it feels, how long it lasts, who it suits"
        value={body}
        onChangeText={setBody}
        error={errors.body}
        multiline
        maxLength={2000}
      />

      {!hasName ? (
        <TextField
          label="Your name on reviews"
          placeholder="e.g. Marina H."
          value={name}
          onChangeText={setName}
          error={errors.name}
          hint="Shown next to everything you review. You can change it in Settings."
          maxLength={60}
          autoComplete="name"
        />
      ) : null}

      {failure ? <Notice>{toAppError(failure).message}</Notice> : null}
      <Button label={existing ? 'Save review' : 'Post'} onPress={post} loading={save.isPending} disabled={remove.isPending} />

      {existing ? (
        confirmDelete ? (
          <View style={styles.confirm} accessibilityRole="alert">
            <AppText variant="label">Delete your review?</AppText>
            <AppText variant="body">Your stars and text are removed for everyone. Your library stays as it is.</AppText>
            <Button label="Delete" variant="danger" onPress={doDelete} loading={remove.isPending} />
            <Button label="Cancel" variant="plain" onPress={() => setConfirmDelete(false)} />
          </View>
        ) : (
          <Button label="Delete review" variant="plain" onPress={askDelete} disabled={save.isPending} />
        )
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.lg },
  notice: { gap: 2, padding: space.lg, borderRadius: radius.md, backgroundColor: colors.tile },
  error: { color: colors.danger },
  confirm: { gap: space.md, padding: space.lg, borderRadius: radius.md, backgroundColor: colors.dangerWash },
});
