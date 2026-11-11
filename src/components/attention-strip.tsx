import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useUpdateItem } from '@/data/mutations';
import type { AttentionCard } from '@/domain/attention';
import { toAppError } from '@/lib/errors';
import { dismissCard } from '@/lib/dismissed-cards';
import { colors, fonts, radius, space } from '@/theme/tokens';

/**
 * Home's "needs you" row: up to three cards that each ask one thing — mark it used up,
 * put it back on Want, say when you opened it. The main action saves straight away;
 * Later / Skip hides the card on this device until its situation changes.
 */
export function AttentionStrip({ cards, onStale }: { cards: readonly AttentionCard[]; onStale: () => void }) {
  const update = useUpdateItem();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!cards.length) return null;

  const act = (c: AttentionCard) => {
    setBusy(c.id);
    setError(null);
    update.mutate(
      { id: c.itemId, version: c.itemVersion, patch: c.action.patch },
      {
        onError: (e) => {
          setError(toAppError(e).message);
          onStale();
        },
        onSettled: () => setBusy(null),
      },
    );
  };

  return (
    <View style={styles.wrap} accessibilityLabel="Needs you">
      <Text style={styles.kicker} accessibilityRole="header">
        {`NEEDS YOU · ${cards.length}`}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {cards.map((c) => (
          <View key={c.id} style={[styles.card, cards.length === 1 && styles.cardWide]}>
            <Text style={styles.title}>{c.title}</Text>
            <Text style={styles.body}>{c.body}</Text>
            <View style={styles.actions}>
              <Pressable
                onPress={() => act(c)}
                disabled={busy !== null}
                accessibilityRole="button"
                accessibilityLabel={`${c.action.label}: ${c.title}`}
                style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
              >
                {busy === c.id ? (
                  <ActivityIndicator color={colors.ground} />
                ) : (
                  <Text style={styles.primaryLabel}>{c.action.label}</Text>
                )}
              </Pressable>
              <Pressable
                onPress={() => dismissCard(c.id)}
                accessibilityRole="button"
                accessibilityLabel={`${c.laterLabel}: ${c.title}`}
                style={({ pressed }) => [styles.later, pressed && styles.pressed]}
              >
                <Text style={styles.laterLabel}>{c.laterLabel}</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm, marginHorizontal: -space.xl },
  kicker: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 1, color: colors.inkSoft, paddingHorizontal: space.xl },
  row: { gap: space.md, paddingHorizontal: space.xl },
  card: {
    width: 270,
    borderWidth: 1.5,
    borderColor: colors.ink,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.xs,
  },
  cardWide: { width: 330 },
  title: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 21, color: colors.ink },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 19, color: colors.inkSoft },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm },
  primary: {
    minHeight: 44,
    paddingHorizontal: space.lg,
    borderRadius: 22,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ground },
  later: { minHeight: 44, paddingHorizontal: space.md, justifyContent: 'center' },
  laterLabel: { fontFamily: fonts.medium, fontSize: 14, color: colors.inkSoft },
  error: { fontFamily: fonts.regular, fontSize: 14, color: colors.danger, paddingHorizontal: space.xl },
  pressed: { opacity: 0.6 },
});
