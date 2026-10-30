import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppText, Screen } from '@/components/ui';
import { AuthProvider, useAuth } from '@/lib/auth';
import { env } from '@/lib/env';
import { fontAssets } from '@/theme/fonts';
import { colors } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Keeps native tab switches and stack transitions on the ground colour instead of flashing white.
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.ink,
    background: colors.ground,
    card: colors.ground,
    text: colors.ink,
    border: colors.rule,
  },
};

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
  // If the font fails to load, carry on with the system face rather than a blank app.
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const fontsReady = fontsLoaded || Boolean(fontError);

  return (
    <SafeAreaProvider>
      <ThemeProvider value={theme}>
        <StatusBar style="dark" />
        {!fontsReady ? null : 'missing' in env ? (
          <SetupRequired missing={env.missing} />
        ) : (
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <RootNavigator />
            </AuthProvider>
          </QueryClientProvider>
        )}
      </ThemeProvider>
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
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ground } }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="add/index" />
        <Stack.Screen name="add/[productId]" />
        <Stack.Screen name="add/manual" />
        <Stack.Screen name="item/[id]" />
        <Stack.Screen name="shelf" options={{ presentation: 'modal' }} />
        <Stack.Screen name="settings" />
        <Stack.Screen name="collection/[id]" />
        <Stack.Screen name="collection/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="collection/add" options={{ presentation: 'modal' }} />
        <Stack.Screen name="collection/pick" options={{ presentation: 'modal' }} />
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
    <Screen contentStyle={{ paddingTop: 64 }}>
      <AppText variant="title">Setup needed</AppText>
      <AppText>Beauty Shelf can’t reach its backend because these environment variables are missing:</AppText>
      <AppText variant="bodySoft" selectable>
        {missing.join('\n')}
      </AppText>
      <AppText>Copy .env.example to .env.local, add your Supabase URL and anon key, then restart Expo.</AppText>
    </Screen>
  );
}
