import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText, Button, Mast, Notice, PageTitle, Row, Screen, Section, TextField } from '@/components/ui';
import { deleteAccount, updateDisplayName } from '@/data/profile';
import { keys, useProfile } from '@/data/queries';
import { displayNameSchema } from '@/domain/validation';
import { useAuth, useUserId } from '@/lib/auth';
import { toAppError } from '@/lib/errors';
import { requireSupabase } from '@/lib/supabase';
import { colors, radius, space } from '@/theme/tokens';

const DELETE_TITLE = 'Delete your account?';
const DELETE_BODY = 'This permanently deletes your account, library, notes, collections and photos. This can’t be undone.';

export default function ProfileScreen() {
  const { session } = useAuth();
  const userId = useUserId();
  const queryClient = useQueryClient();
  const profile = useProfile();

  // null = untouched: show the stored name until the user starts editing.
  const [draft, setDraft] = useState<string | null>(null);
  const name = draft ?? profile.data?.displayName ?? '';
  const [nameError, setNameError] = useState<string | undefined>();
  const [saved, setSaved] = useState(false);

  const saveName = useMutation({
    mutationFn: (value: string | null) => updateDisplayName(requireSupabase(), userId, value),
    onSuccess: () => {
      setSaved(true);
      setDraft(null);
      return queryClient.invalidateQueries({ queryKey: keys.profile });
    },
  });

  const signOut = useMutation({
    mutationFn: async () => {
      const { error } = await requireSupabase().auth.signOut();
      if (error) throw error;
    },
    onSuccess: () => queryClient.clear(),
  });

  // Web has no native alert with buttons, so it confirms inline instead.
  const [confirmInline, setConfirmInline] = useState(false);
  const remove = useMutation({
    mutationFn: async () => {
      await deleteAccount(requireSupabase());
      await requireSupabase().auth.signOut({ scope: 'local' });
    },
    onSuccess: () => queryClient.clear(),
  });

  const askDelete = () => {
    if (process.env.EXPO_OS === 'web') return setConfirmInline(true);
    Alert.alert(DELETE_TITLE, DELETE_BODY, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove.mutate() },
    ]);
  };

  const onSaveName = () => {
    setSaved(false);
    const parsed = displayNameSchema.safeParse(name);
    if (!parsed.success) return setNameError(parsed.error.issues[0]?.message);
    setNameError(undefined);
    saveName.mutate(parsed.data);
  };

  const dirty = draft !== null && draft !== (profile.data?.displayName ?? '');

  return (
    <Screen>
      <Mast left="Profile" right="Private" />
      <PageTitle>{profile.data?.displayName?.trim() || 'Profile'}</PageTitle>

      <Section label="Your name" footer="Used to greet you on Home. Only you can see it.">
        <TextField
          label="Display name"
          placeholder="What should we call you?"
          value={name}
          onChangeText={(v) => {
            setDraft(v);
            setSaved(false);
          }}
          error={nameError}
          maxLength={60}
          editable={!profile.isPending}
          returnKeyType="done"
          onSubmitEditing={onSaveName}
        />
        {saveName.isError ? <Notice>{toAppError(saveName.error).message}</Notice> : null}
        {saved ? <Notice tone="info">Name saved</Notice> : null}
        {dirty ? <Button label="Save name" onPress={onSaveName} loading={saveName.isPending} /> : null}
      </Section>

      <Section label="Account" footer="Your library, notes and collections are private. Nothing is shared or published.">
        <View>
          <Row
            title={session?.user.email ?? 'Signed in'}
            asTyped
            accessibilityLabel={`Signed in as ${session?.user.email ?? 'unknown email'}`}
          />
          <Row title={signOut.isPending ? 'Signing out…' : 'Sign out'} onPress={() => signOut.mutate()} />
          <Row
            title={remove.isPending ? 'Deleting account…' : 'Delete account'}
            tone="danger"
            onPress={remove.isPending ? undefined : askDelete}
          />
        </View>
        {signOut.isError ? <Notice>{toAppError(signOut.error).message}</Notice> : null}
        {remove.isError ? <Notice>{toAppError(remove.error).message}</Notice> : null}
        {confirmInline ? (
          <View style={styles.confirm} accessibilityRole="alert">
            <AppText variant="label">{DELETE_TITLE}</AppText>
            <AppText variant="body">{DELETE_BODY}</AppText>
            <Button label="Delete" variant="danger" onPress={() => remove.mutate()} loading={remove.isPending} />
            <Button label="Cancel" variant="plain" onPress={() => setConfirmInline(false)} disabled={remove.isPending} />
          </View>
        ) : null}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  confirm: {
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.dangerWash,
  },
});
