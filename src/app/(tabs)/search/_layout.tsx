import { Stack } from 'expo-router';

import { tabStackOptions } from '@/components/stack-options';

export default function SearchStack() {
  return (
    <Stack screenOptions={tabStackOptions}>
      <Stack.Screen name="index" options={{ title: 'Search' }} />
    </Stack>
  );
}
