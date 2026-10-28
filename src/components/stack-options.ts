import type { ComponentProps } from 'react';
import type { Stack } from 'expo-router';

import { colors } from '@/theme/tokens';

type StackOptions = NonNullable<ComponentProps<typeof Stack>['screenOptions']>;

/** Each tab keeps a stack for pushed screens, but pages draw their own mast and title. */
export const tabStackOptions: StackOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: colors.ground },
};
