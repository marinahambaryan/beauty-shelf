import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { PhotoField } from '@/components/photo-field';
import { RatingInput } from '@/components/rating';
import { Bottle } from '@/components/shelf';
import {
  AppText,
  BracketTabs,
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  Mast,
  Notice,
  Row,
  Screen,
  Section,
  TextAction,
  TextField,
  TopBar,
} from '@/components/ui';
import { ownPhotoPath, type LibraryEntry } from '@/data/library';
import { useDeleteItem, useSetPhoto, useUpdateItem } from '@/data/mutations';
import { useLibraryItem } from '@/data/queries';
import {
  categoryLabel,
  itemPatch,
  OWNERSHIP_STATUSES,
  ownershipLabel,
  REPURCHASE_INTENTS,
  repurchaseLabel,
  todayISO,
  USAGE_STATUSES,
  usageLabel,
  type ItemDraft,
} from '@/domain/library';
import { finishedDateSchema, noteSchema } from '@/domain/validation';
import { toAppError } from '@/lib/errors';
import { goBack } from '@/lib/navigation';
import { colors, radius, space } from '@/theme/tokens';

/** The editor keeps text fields as typed; they are validated on save. */
type Form = Omit<ItemDraft, 'finishedAt' | 'notes'> & { finishedAt: string; notes: string };

const toForm = (e: LibraryEntry): Form => ({
  ownershipStatus: e.ownershipStatus,
  usageStatus: e.usageStatus,
  rating: e.rating,
  repurchaseIntent: e.repurchaseIntent,
  finishedAt: e.finishedAt ?? '',
  notes: e.notes ?? '',
});
const savedDraft = (e: LibraryEntry): ItemDraft => ({ ...toForm(e), finishedAt: e.finishedAt, notes: e.notes });

export default function ItemScreen() {
  const params = useLocalSearchParams<{ id: string; added?: string; existing?: string }>();
  const item = useLibraryItem(params.id);
  const entry = item.entry;
  // Lives here, not in the editor, so it survives the editor starting fresh after a save.
  const [notice, setNotice] = useState<string | null>(() =>
    params.added === '1' ? 'Added to library' : null,
  );

  if (item.isPending) {
    return (
      <Screen bottomInset>
        <TopBar onBack={() => goBack()} />
        <LoadingState label="Loading product" />
      </Screen>
    );
  }
  if (item.isError) {
    return (
      <Screen bottomInset>
        <TopBar onBack={() => goBack()} />
        <ErrorState message={toAppError(item.error).message} onRetry={() => item.refetch()} />
      </Screen>
    );
  }
  if (!entry) {
    return (
      <Screen bottomInset>
        <TopBar onBack={() => goBack()} />
        <EmptyState title="This isn’t in your library" body="It may have been deleted on another device." />
      </Screen>
    );
  }
  // Keyed by version: a save (here or elsewhere) starts the editor fresh from what was stored.
  return (
    <Editor
      key={`${entry.id}:${entry.version}`}
      entry={entry}
      notice={notice ?? (params.existing === '1' ? `Already in your library as ${ownershipLabel[entry.ownershipStatus]}.` : null)}
      onSaved={() => setNotice('Changes saved')}
      onReload={() => {
        setNotice(null);
        void item.refetch();
      }}
    />
  );
}

function Editor({
  entry,
  notice,
  onSaved,
  onReload,
}: {
  entry: LibraryEntry;
  notice: string | null;
  onSaved: () => void;
  onReload: () => void;
}) {
  const [form, setForm] = useState<Form>(() => toForm(entry));
  const [errors, setErrors] = useState<{ notes?: string; finishedAt?: string }>({});
  const [confirmInline, setConfirmInline] = useState(false);
  const update = useUpdateItem();
  const photo = useSetPhoto();
  const remove = useDeleteItem();

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));

  // Parse what's typed; invalid text counts as a change so Save stays visible to show the error.
  const notes = noteSchema.safeParse(form.notes);
  const finished = finishedDateSchema.safeParse(form.finishedAt);
  const draft: ItemDraft = {
    ...form,
    notes: notes.success ? notes.data : entry.notes,
    finishedAt: finished.success ? finished.data : entry.finishedAt,
  };
  const patch = itemPatch(savedDraft(entry), draft);
  const dirty = Object.keys(patch).length > 0 || !notes.success || !finished.success;
  const leavingOwned = entry.ownershipStatus === 'owned' && form.ownershipStatus !== 'owned' && entry.usageStatus;

  const save = () => {
    const nextErrors = {
      notes: notes.success ? undefined : notes.error.issues[0]?.message,
      finishedAt: finished.success ? undefined : finished.error.issues[0]?.message,
    };
    setErrors(nextErrors);
    if (nextErrors.notes || nextErrors.finishedAt) return;
    update.mutate({ id: entry.id, version: entry.version, patch }, { onSuccess: onSaved });
  };

  const hasExperience = Boolean(entry.notes || entry.rating);
  const deleteTitle = `Delete ${entry.name}?`;
  const deleteBody = hasExperience
    ? 'Your notes and rating will be deleted too. It will also leave your shelf and collections. Items on your shopping list stay.'
    : 'It will also leave your shelf and collections. Items on your shopping list stay.';
  const doDelete = () => remove.mutate(entry, { onSuccess: () => goBack() });
  const askDelete = () => {
    if (process.env.EXPO_OS === 'web') return setConfirmInline(true);
    Alert.alert(deleteTitle, deleteBody, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: doDelete },
    ]);
  };

  const conflict = update.isError && toAppError(update.error).kind === 'conflict';

  return (
    <Screen bottomInset>
      <TopBar onBack={() => goBack()} />
      <Mast left={entry.brand || 'Added manually'} right={entry.source === 'personal' ? 'Added manually' : categoryLabel[entry.category]} />
      <View style={styles.title}>
        <AppText variant="title">{entry.name}</AppText>
        {entry.variant ? <AppText variant="label" style={styles.soft}>{entry.variant}</AppText> : null}
      </View>

      {notice && !dirty ? <Notice tone="info">{notice}</Notice> : null}

      <PhotoField
        uri={entry.imageUrl}
        removable={Boolean(ownPhotoPath(entry))}
        onChange={(uri) => photo.mutate({ entry, uri })}
        busy={photo.isPending}
        busyLabel={photo.variables?.uri ? 'Uploading photo' : 'Removing photo'}
        error={photo.isError ? toAppError(photo.error).message : null}
        placeholder={<Bottle uri={null} category={entry.category} name={entry.name} sub={entry.variant} scale={1.6} />}
      />

      <Section label="Status">
        <BracketTabs
          options={OWNERSHIP_STATUSES.map((s) => ({ value: s, label: ownershipLabel[s] }))}
          value={form.ownershipStatus}
          onChange={(s) => set('ownershipStatus', s)}
          accessibilityLabel="Status"
        />
        {leavingOwned ? (
          <AppText variant="bodySoft">
            {`Moving to ${ownershipLabel[form.ownershipStatus]} clears its usage details. Notes and rating stay.`}
          </AppText>
        ) : null}
      </Section>

      {form.ownershipStatus === 'owned' ? (
        <Section label="Usage">
          <BracketTabs
            options={USAGE_STATUSES.map((u) => ({ value: u, label: usageLabel[u] }))}
            value={form.usageStatus}
            onChange={(u) => set('usageStatus', u)}
            onClear={() => set('usageStatus', null)}
            accessibilityLabel="Usage"
          />
        </Section>
      ) : null}

      {form.ownershipStatus === 'finished' ? (
        <TextField
          label="Finished on"
          placeholder="YYYY-MM-DD"
          value={form.finishedAt}
          onChangeText={(v) => set('finishedAt', v)}
          error={errors.finishedAt}
          hint={entry.ownershipStatus !== 'finished' ? 'Leave blank to use today.' : undefined}
          keyboardType="numbers-and-punctuation"
          autoCorrect={false}
          maxLength={10}
          trailing={
            form.finishedAt !== todayISO() ? (
              <TextAction label="Today" onPress={() => set('finishedAt', todayISO())} />
            ) : null
          }
        />
      ) : null}

      <Section label="Rating">
        <RatingInput value={form.rating} onChange={(r) => set('rating', r)} />
      </Section>

      <Section label="Would you buy it again?">
        <BracketTabs
          options={REPURCHASE_INTENTS.map((r) => ({ value: r, label: repurchaseLabel[r] }))}
          value={form.repurchaseIntent}
          onChange={(r) => set('repurchaseIntent', r)}
          onClear={() => set('repurchaseIntent', null)}
          spread={false}
          accessibilityLabel="Would you buy it again?"
        />
      </Section>

      <TextField
        label="Notes"
        placeholder="What you think, how you use it"
        value={form.notes}
        onChangeText={(v) => set('notes', v)}
        error={errors.notes}
        multiline
        maxLength={5000}
      />

      {update.isError ? <Notice>{toAppError(update.error).message}</Notice> : null}
      {conflict ? <Button label="Reload" variant="secondary" onPress={onReload} /> : null}
      {dirty && !conflict ? (
        <View style={styles.saveBar}>
          <Button label="Save changes" onPress={save} loading={update.isPending} />
          <Button
            label="Discard"
            variant="plain"
            onPress={() => {
              setForm(toForm(entry));
              setErrors({});
            }}
            disabled={update.isPending}
          />
        </View>
      ) : null}

      <Section label="Product">
        <View>
          <Row title="Category" detail={categoryLabel[entry.category]} />
          <Row title="Source" detail={entry.source === 'personal' ? 'Added manually' : 'Catalogue'} />
          <Row
            title={remove.isPending ? 'Deleting…' : 'Delete from library'}
            tone="danger"
            onPress={remove.isPending ? undefined : askDelete}
          />
        </View>
        {remove.isError ? <Notice>{toAppError(remove.error).message}</Notice> : null}
        {confirmInline ? (
          <View style={styles.confirm} accessibilityRole="alert">
            <AppText variant="label">{deleteTitle}</AppText>
            <AppText variant="body">{deleteBody}</AppText>
            <Button label="Delete" variant="danger" onPress={doDelete} loading={remove.isPending} />
            <Button label="Cancel" variant="plain" onPress={() => setConfirmInline(false)} disabled={remove.isPending} />
          </View>
        ) : null}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { gap: space.xs },
  soft: { color: colors.inkSoft },
  saveBar: { gap: space.xs },
  confirm: { gap: space.md, padding: space.lg, borderRadius: radius.md, backgroundColor: colors.dangerWash },
});
