import { Stack } from 'expo-router';

import { tabStackOptions } from '@/components/stack-options';

export default function HomeStack() {
  return (
    <Stack screenOptions={tabStackOptions}>
      <Stack.Screen name="index" options={{ title: 'Home' }} />
    </Stack>
  );
}
