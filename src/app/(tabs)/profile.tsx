import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Kicker, Notice, Rule, Screen, TextField } from '@/components/ui';
import { deleteAccount, updateDisplayName } from '@/data/profile';
import { keys, useProfile } from '@/data/queries';
import { displayNameSchema } from '@/domain/validation';
import { useAuth, useUserId } from '@/lib/auth';
import { toAppError } from '@/lib/errors';
import { requireSupabase } from '@/lib/supabase';
import { colors, radius, space } from '@/theme/tokens';

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

  const [confirmDelete, setConfirmDelete] = useState(false);
  const remove = useMutation({
    mutationFn: async () => {
      await deleteAccount(requireSupabase());
      await requireSupabase().auth.signOut({ scope: 'local' });
    },
    onSuccess: () => queryClient.clear(),
  });

  const onSaveName = () => {
    setSaved(false);
    const parsed = displayNameSchema.safeParse(name);
    if (!parsed.success) return setNameError(parsed.error.issues[0]?.message);
    setNameError(undefined);
    saveName.mutate(parsed.data);
  };

  return (
    <Screen>
      <Kicker>Masthead</Kicker>
      <AppText variant="display">Profile</AppText>
      <AppText variant="caption">Signed in as {session?.user.email}</AppText>
      <Rule />

      <TextField
        label="Display name"
        placeholder="How should we greet you?"
        value={name}
        onChangeText={(v) => {
          setDraft(v);
          setSaved(false);
        }}
        error={nameError}
        maxLength={60}
        editable={!profile.isPending}
      />
      {saveName.isError ? <Notice>{toAppError(saveName.error).message}</Notice> : null}
      {saved ? <Notice tone="info">Saved.</Notice> : null}
      <Button label="Save name" variant="secondary" onPress={onSaveName} loading={saveName.isPending} />

      <Rule />
      <AppText variant="heading">Privacy</AppText>
      <AppText variant="caption">
        Your library, notes and collections are private. Nothing is shared or published.
      </AppText>

      {signOut.isError ? <Notice>{toAppError(signOut.error).message}</Notice> : null}
      <Button label="Sign out" variant="secondary" onPress={() => signOut.mutate()} loading={signOut.isPending} />

      <Rule />
      <View style={styles.danger}>
        <AppText variant="heading">Delete account</AppText>
        <AppText variant="caption">
          Permanently deletes your account, library, notes, collections and uploaded photos. This cannot be undone.
        </AppText>
        {remove.isError ? <Notice>{toAppError(remove.error).message}</Notice> : null}
        {confirmDelete ? (
          <>
            <AppText variant="body">Are you sure? Everything will be erased.</AppText>
            <Button label="Permanently delete my account" variant="danger" onPress={() => remove.mutate()} loading={remove.isPending} />
            <Button label="Keep my account" variant="ghost" onPress={() => setConfirmDelete(false)} disabled={remove.isPending} />
          </>
        ) : (
          <Button label="Delete account…" variant="ghost" onPress={() => setConfirmDelete(true)} />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  danger: {
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.dangerTint,
  },
});
