import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { AppText, Button, Kicker, Notice, Rule, Screen, TextField } from '@/components/ui';
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
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen contentStyle={styles.content}>
        <View style={styles.masthead}>
          <Kicker>Issue No. 01</Kicker>
          <AppText variant="display">Beauty Shelf</AppText>
          <AppText variant="body" style={styles.tagline}>
            Know what you own, remember what you loved, and curate your beauty world.
          </AppText>
        </View>
        <Rule />
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
              returnKeyType="next"
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field, fieldState }) => (
            <TextField
              label="Password"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={() => onSubmit()}
            />
          )}
        />
        <Button label="Sign in" onPress={onSubmit} loading={formState.isSubmitting} />
        <Button label="New here? Create an account" variant="ghost" onPress={() => router.push('/sign-up')} />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center' },
  masthead: { gap: space.sm },
  tagline: { maxWidth: 340 },
});
