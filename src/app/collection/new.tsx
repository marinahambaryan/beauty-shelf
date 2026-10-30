import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { LookPicker } from '@/components/look-picker';
import { Button, Notice, Screen, Section, TextField, TopBar } from '@/components/ui';
import type { CollectionLook } from '@/data/collections';
import { addToCollection } from '@/data/collections';
import { useCreateCollection } from '@/data/mutations';
import { useLibrary } from '@/data/queries';
import { refFor } from '@/domain/collections';
import { collectionNameSchema } from '@/domain/validation';
import { toAppError } from '@/lib/errors';
import { goBack } from '@/lib/navigation';
import { requireSupabase } from '@/lib/supabase';

/**
 * New collection: a name and how it looks. Opened from a product page (?entry=…), the
 * product goes straight in.
 */
export default function NewCollectionScreen() {
  const { entry: entryId } = useLocalSearchParams<{ entry?: string }>();
  const library = useLibrary();
  const create = useCreateCollection();
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string>();
  const [look, setLook] = useState<CollectionLook>('pouch');
  const [addError, setAddError] = useState<string | null>(null);

  const entries = library.data ?? [];
  const entry = entryId ? entries.find((e) => e.id === entryId) : undefined;
  // Preview the looks with this product first, then whatever's in use.
  const sample = [...(entry ? [entry] : []), ...entries.filter((e) => e.id !== entryId && e.ownershipStatus === 'owned')];

  const submit = () => {
    const parsed = collectionNameSchema.safeParse(name);
    if (!parsed.success) return setNameError(parsed.error.issues[0]?.message);
    setNameError(undefined);
    create.mutate(
      { name: parsed.data, look },
      {
        onSuccess: async (id) => {
          const ref = entry ? refFor(entry, 'custom') : null;
          if (ref) {
            try {
              await addToCollection(requireSupabase(), id, [ref]);
            } catch (e) {
              setAddError(toAppError(e).message);
            }
          }
          router.replace({ pathname: '/collection/[id]', params: { id } });
        },
      },
    );
  };

  return (
    <Screen bottomInset>
      <TopBar onBack={() => goBack({ pathname: '/profile', params: { tab: 'collections' } })} icon="close" backLabel="Close" title="New collection" />
      <TextField
        label="Name"
        placeholder="Travel kit, Morning routine, Minis…"
        value={name}
        onChangeText={(v) => {
          setName(v);
          setNameError(undefined);
        }}
        error={nameError}
        maxLength={80}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={submit}
      />
      <Section label="How it looks" footer="You can change this later.">
        <LookPicker value={look} onChange={setLook} sample={sample} />
      </Section>
      {create.isError ? <Notice>{toAppError(create.error).message}</Notice> : null}
      {addError ? <Notice>{addError}</Notice> : null}
      <Button label={entry ? `Create and add ${entry.name}` : 'Create collection'} onPress={submit} loading={create.isPending} />
    </Screen>
  );
}
