import { Image } from 'expo-image';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { toAppError } from '@/lib/errors';
import { pickPhoto } from '@/lib/photo-picker';
import { colors, radius, space } from '@/theme/tokens';
import { AppText, Notice, TextAction } from './ui';

/**
 * A product photo card with its actions underneath: Choose photo · Take photo · Remove.
 * Shows `placeholder` (the neutral stand-in) when there is no photo yet.
 */
export function PhotoField({
  uri,
  onChange,
  busy = false,
  busyLabel = 'Uploading photo',
  placeholder,
  error,
  removable = true,
  height = 220,
  overlay,
}: {
  /** Height of the picture card. */
  height?: number;
  /** Drawn over the picture's corner, e.g. a back button on the product page. */
  overlay?: ReactNode;
  uri: string | null;
  /** False when the picture shown isn't the person's own (a catalogue image): no Remove. */
  removable?: boolean;
  /** A prepared JPEG's local URI, or null to remove the photo. */
  onChange: (uri: string | null) => void;
  busy?: boolean;
  busyLabel?: string;
  placeholder?: ReactNode;
  error?: string | null;
}) {
  const [pickError, setPickError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const working = busy || preparing;

  const choose = async (source: 'library' | 'camera') => {
    setPickError(null);
    setPreparing(true);
    try {
      const photo = await pickPhoto(source);
      if (photo) onChange(photo.uri);
    } catch (e) {
      setPickError(toAppError(e).message);
    } finally {
      setPreparing(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={[styles.frame, { height }]}>
        <View style={StyleSheet.absoluteFill} accessible accessibilityLabel={uri ? 'Photo' : 'No photo yet'} />
        {uri ? (
          <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="contain" transition={150} />
        ) : (
          (placeholder ?? <AppText variant="small">No photo yet</AppText>)
        )}
        {working ? (
          <View style={styles.busy} accessible accessibilityLabel={preparing ? 'Preparing photo' : busyLabel}>
            <ActivityIndicator color={colors.ink} />
            <AppText variant="small" style={styles.busyText}>
              {preparing ? 'Preparing photo' : busyLabel}
            </AppText>
          </View>
        ) : null}
        {overlay}
      </View>
      <View style={styles.actions}>
        <TextAction
          label={uri && removable ? 'Change photo' : 'Choose photo'}
          onPress={() => void choose('library')}
          disabled={working}
        />
        {process.env.EXPO_OS !== 'web' ? (
          <TextAction label="Take photo" onPress={() => void choose('camera')} disabled={working} />
        ) : null}
        {uri && removable ? <TextAction label="Remove" tone="danger" onPress={() => onChange(null)} disabled={working} /> : null}
      </View>
      {pickError || error ? <Notice>{pickError ?? error}</Notice> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  frame: {
    borderRadius: radius.xl,
    backgroundColor: colors.tile,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  busy: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
  },
  busyText: { color: colors.ink },
  actions: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.xl, paddingHorizontal: space.xs },
});
