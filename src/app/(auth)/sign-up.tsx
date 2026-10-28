import { zodResolver } from '@hookform/resolvers/zod';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { AuthFrame } from '@/components/auth-frame';
import { AppText, Button, Mast, Notice, PageTitle, PasswordField, TextField } from '@/components/ui';
import { signUpSchema, type SignUpInput } from '@/domain/validation';
import { toAppError } from '@/lib/errors';
import { requireSupabase } from '@/lib/supabase';
import { space } from '@/theme/tokens';

// Mirrors signUpSchema so iOS-generated strong passwords always pass validation.
const PASSWORD_RULES = 'minlength: 8; maxlength: 72;';

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
      <AuthFrame>
        <Mast left="Beauty shelf" right="New account" />
        <View style={styles.masthead}>
          <PageTitle>{'Check your\nemail'}</PageTitle>
          <AppText variant="body">
            We sent a confirmation link to {awaitingConfirmation}. Open it, then come back and sign in.
          </AppText>
        </View>
        <Button label="Back to sign in" variant="secondary" onPress={() => router.back()} />
      </AuthFrame>
    );
  }

  return (
    <AuthFrame>
      <Mast left="Beauty shelf" right="New account" />
      <View style={styles.masthead}>
        <PageTitle>{'New\naccount'}</PageTitle>
        <AppText variant="bodySoft">Your library is private to you.</AppText>
      </View>
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
            // "username" pairs this field with the new password so iOS offers a strong password and saves both.
            textContentType="username"
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field, fieldState }) => (
          <PasswordField
            label="Password"
            hint="At least 8 characters."
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            autoComplete="new-password"
            textContentType="newPassword"
            passwordRules={PASSWORD_RULES}
          />
        )}
      />
      <Controller
        control={control}
        name="confirm"
        render={({ field, fieldState }) => (
          <PasswordField
            label="Confirm password"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            autoComplete="new-password"
            textContentType="newPassword"
            passwordRules={PASSWORD_RULES}
            onSubmitEditing={() => onSubmit()}
          />
        )}
      />
      <View style={styles.actions}>
        <Button label="Create account" onPress={onSubmit} loading={formState.isSubmitting} />
        <Button label="I already have an account" variant="plain" onPress={() => router.back()} />
      </View>
    </AuthFrame>
  );
}

const styles = StyleSheet.create({
  masthead: { gap: space.md, marginBottom: space.md },
  actions: { gap: space.xs, marginTop: space.sm },
});
