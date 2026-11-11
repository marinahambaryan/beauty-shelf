import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { AuthFrame } from '@/components/auth-frame';
import { AppText, Button, Notice, PageTitle, PasswordField, TextField } from '@/components/ui';
import { signInSchema, type SignInInput } from '@/domain/validation';
import { toAppError } from '@/lib/errors';
import { requireSupabase } from '@/lib/supabase';
import { space } from '@/theme/tokens';

export default function SignInScreen() {
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const { error } = await requireSupabase().auth.signInWithPassword(values);
    // On success the auth listener swaps the navigator to the signed-in area.
    if (error) setFormError(toAppError(error).message);
  });

  return (
    <AuthFrame>
      <View style={styles.masthead}>
        <PageTitle>{'Beauty\nshelf'}</PageTitle>
        <AppText variant="bodySoft" style={styles.tagline}>
          Keep track of what you own, what you want and what you’ve used up.
        </AppText>
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
            textContentType="username"
            returnKeyType="next"
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field, fieldState }) => (
          <PasswordField
            label="Password"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={() => onSubmit()}
          />
        )}
      />
      <View style={styles.actions}>
        <Button label="Sign in" onPress={onSubmit} loading={formState.isSubmitting} />
        <Button label="Create an account" variant="plain" onPress={() => router.push('/sign-up')} />
      </View>
    </AuthFrame>
  );
}

const styles = StyleSheet.create({
  masthead: { gap: space.md, marginBottom: space.md },
  tagline: { maxWidth: 320 },
  actions: { gap: space.xs, marginTop: space.sm },
});
