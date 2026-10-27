import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppText, Screen } from '@/components/ui';
import { AuthProvider, useAuth } from '@/lib/auth';
import { env } from '@/lib/env';
import { colors } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, staleTime: 30_000 },
          mutations: { retry: 0 }, // never silently replay a write
        },
      }),
  );

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {'missing' in env ? (
        <SetupRequired missing={env.missing} />
      ) : (
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </QueryClientProvider>
      )}
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { session, ready } = useAuth();

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);
  if (!ready) return null;

  const signedIn = Boolean(session);
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

function SetupRequired({ missing }: { missing: string[] }) {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);
  return (
    <Screen>
      <AppText variant="title">Setup needed</AppText>
      <AppText>
        Beauty Shelf can’t reach its backend because these environment variables are missing:
      </AppText>
      <AppText variant="caption">{missing.join('\n')}</AppText>
      <AppText>Copy .env.example to .env.local, fill in your Supabase URL and anon key, then restart Expo.</AppText>
    </Screen>
  );
}
