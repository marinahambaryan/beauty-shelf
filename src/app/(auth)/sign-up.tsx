import { zodResolver } from '@hookform/resolvers/zod';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';

import { AppText, Button, Kicker, Notice, Screen, TextField } from '@/components/ui';
import { signUpSchema, type SignUpInput } from '@/domain/validation';
import { toAppError } from '@/lib/errors';
import { requireSupabase } from '@/lib/supabase';

export default function SignUpScreen() {
  const [formError, setFormError] = useState<string | null>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: '', password: '', confirm: '' },
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setFormError(null);
    const { data, error } = await requireSupabase().auth.signUp({
      email,
      password,
      options: { emailRedirectTo: Linking.createURL('/') },
    });
    if (error) return setFormError(toAppError(error).message);
    // With email confirmation enabled there is no session yet — say so instead of pretending.
    if (!data.session) setAwaitingConfirmation(email);
  });

  if (awaitingConfirmation) {
    return (
      <Screen contentStyle={styles.content}>
        <Kicker>Almost there</Kicker>
        <AppText variant="title">Check your inbox</AppText>
        <AppText>
          We sent a confirmation link to {awaitingConfirmation}. Open it, then come back and sign in.
        </AppText>
        <Button label="Back to sign in" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen contentStyle={styles.content}>
        <Kicker>New subscriber</Kicker>
        <AppText variant="title">Create your account</AppText>
        <AppText variant="caption">Your library is private to you.</AppText>
        {formError ? <Notice>{formError}</Notice> : null}
        <Controller
          control={control}
          name="email"
          render={({ field, fieldState }) => (
            <TextField
              label="Email"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field, fieldState }) => (
            <TextField
              label="Password"
              hint="At least 8 characters."
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
            />
          )}
        />
        <Controller
          control={control}
          name="confirm"
          render={({ field, fieldState }) => (
            <TextField
              label="Confirm password"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              onSubmitEditing={() => onSubmit()}
            />
          )}
        />
        <Button label="Create account" onPress={onSubmit} loading={formState.isSubmitting} />
        <Button label="I already have an account" variant="ghost" onPress={() => router.back()} />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center' },
});
