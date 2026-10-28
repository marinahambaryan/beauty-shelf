import { Stack } from 'expo-router';

import { tabStackOptions } from '@/components/stack-options';

export default function CollectionsStack() {
  return (
    <Stack screenOptions={tabStackOptions}>
      <Stack.Screen name="index" options={{ title: 'Collections' }} />
    </Stack>
  );
}
