import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useMyReview, useRatingSummary, useReviews } from '@/data/queries';
import type { PublicReview } from '@/data/reviews';
import { whenLabel } from '@/domain/events';
import { colors, fonts, radius, space } from '@/theme/tokens';
import { Icon } from './icons';
import { AppText, Button, Section, TextAction } from './ui';

/** Five small stars, filled up to the rating; read as one value. */
export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <View style={styles.stars} accessible accessibilityRole="image" accessibilityLabel={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon key={n} name="star" size={size} filled={n <= Math.round(value)} />
      ))}
    </View>
  );
}

/** "★ 4.3 (128)" beside a product's name; nothing until someone has rated it. */
export function RatingLine({ productId }: { productId: string | null }) {
  const summary = useRatingSummary(productId);
  const s = summary.data;
  if (!s || !s.ratings || s.average === null) return null;
  return (
    <View style={styles.line} accessible accessibilityLabel={`Rated ${s.average} out of 5 by ${s.ratings} ${s.ratings === 1 ? 'person' : 'people'}`}>
      <Icon name="star" size={14} filled />
      <Text style={styles.lineValue}>{s.average.toFixed(1)}</Text>
      <Text style={styles.lineCount}>{`(${s.ratings})`}</Text>
    </View>
  );
}

const reviewHref = (productId: string, name: string, entryId?: string, rating?: number | null) => ({
  pathname: '/review/[productId]' as const,
  params: { productId, name, ...(entryId ? { entry: entryId } : {}), ...(rating ? { rating: String(rating) } : {}) },
});

/**
 * Your public rating and review for a catalogue product: what everyone sees with your
 * name. Until you share one, it says so — a rating you gave privately stays private.
 */
export function YourReview({
  productId,
  productName,
  entryId,
  privateRating,
}: {
  productId: string;
  productName: string;
  entryId?: string;
  privateRating: number | null;
}) {
  const mine = useMyReview(productId);
  const review = mine.data;
  const open = () => router.push(reviewHref(productId, productName, entryId, review?.rating ?? privateRating));

  return (
    <Section
      label="Your rating"
      right={
        <View style={styles.publicTag}>
          <Icon name="globe" size={14} strokeWidth={2} />
          <Text style={styles.publicLabel}>Public, with your name</Text>
        </View>
      }
    >
      {mine.isPending ? null : review ? (
        <View style={styles.mine}>
          <View style={styles.mineHead}>
            <Stars value={review.rating} size={18} />
            <TextAction label="Edit" onPress={open} />
          </View>
          {review.body ? <AppText variant="body">{review.body}</AppText> : null}
          <AppText variant="small">{`Shared ${whenLabel(review.updatedAt)}`}</AppText>
        </View>
      ) : (
        <View style={styles.prompt}>
          {privateRating ? (
            <>
              <View style={styles.mineHead}>
                <Stars value={privateRating} size={18} />
              </View>
              <AppText variant="bodySoft">Only you can see this rating. Share it so others can see it too.</AppText>
              <Button label="Share my rating" variant="secondary" onPress={open} />
            </>
          ) : (
            <>
              <AppText variant="bodySoft">Rate it for everyone. Your stars and review show with your name.</AppText>
              <Button label="Rate and review" variant="secondary" onPress={open} />
            </>
          )}
        </View>
      )}
    </Section>
  );
}

/** One written review, as anyone reads it. */
export function ReviewRow({ review }: { review: PublicReview }) {
  return (
    <View style={styles.review}>
      <View style={styles.reviewHead}>
        <View style={styles.avatar} accessible={false}>
          <Text style={styles.avatarLetter}>{review.authorName.trim().charAt(0).toUpperCase() || '·'}</Text>
        </View>
        <View style={styles.flex}>
          <Text style={styles.author}>{review.isMine ? `${review.authorName} (you)` : review.authorName}</Text>
          <Text style={styles.meta}>{whenLabel(review.updatedAt)}</Text>
        </View>
        <Stars value={review.rating} size={12} />
      </View>
      <AppText variant="body">{review.body}</AppText>
    </View>
  );
}

/** "From everyone": the average, how the stars spread, and the newest written reviews. */
export function FromEveryone({ productId, productName }: { productId: string; productName: string }) {
  const summary = useRatingSummary(productId);
  const reviews = useReviews(productId, 3);
  const s = summary.data;
  if (summary.isPending || !s) return null;

  return (
    <Section label="From everyone">
      {!s.ratings || s.average === null ? (
        <AppText variant="bodySoft">No ratings yet — be the first.</AppText>
      ) : (
        <>
          <View style={styles.summary}>
            <View style={styles.average}>
              <Text style={styles.averageValue}>{s.average.toFixed(1)}</Text>
              <Stars value={s.average} />
              <Text style={styles.meta}>
                {`${s.ratings} ${s.ratings === 1 ? 'rating' : 'ratings'}\n${s.reviews} ${s.reviews === 1 ? 'review' : 'reviews'}`}
              </Text>
            </View>
            <View style={styles.bars} accessible accessibilityLabel={s.histogram.map((n, i) => `${5 - i} stars: ${n}`).join(', ')}>
              {s.histogram.map((n, i) => {
                const most = Math.max(...s.histogram, 1);
                return (
                  <View key={i} style={styles.barRow}>
                    <Text style={styles.barLabel}>{5 - i}</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${Math.round((n / most) * 100)}%` }]} />
                    </View>
                    <Text style={styles.barCount}>{n}</Text>
                  </View>
                );
              })}
            </View>
          </View>
          {(reviews.data ?? []).map((r) => (
            <ReviewRow key={r.id} review={r} />
          ))}
          {s.reviews > 3 ? (
            <Button
              label={`See all ${s.reviews} reviews`}
              variant="secondary"
              onPress={() => router.push({ pathname: '/reviews/[productId]', params: { productId, name: productName } })}
            />
          ) : null}
        </>
      )}
    </Section>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stars: { flexDirection: 'row', gap: 1 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  lineValue: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  lineCount: { fontFamily: fonts.regular, fontSize: 14, color: colors.inkSoft },
  publicTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  publicLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.inkSoft },
  mine: { gap: space.sm, padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.tile },
  mineHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  prompt: { gap: space.md },
  summary: { flexDirection: 'row', gap: space.xl, alignItems: 'center', padding: space.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.rule },
  average: { width: 96, gap: 4 },
  averageValue: { fontFamily: fonts.semibold, fontSize: 40, lineHeight: 44, letterSpacing: -1, color: colors.ink },
  bars: { flex: 1, gap: 5 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  barLabel: { width: 10, fontFamily: fonts.regular, fontSize: 12, color: colors.inkSoft },
  barTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.chip, overflow: 'hidden' },
  barFill: { height: 6, backgroundColor: colors.ink },
  barCount: { width: 26, textAlign: 'right', fontFamily: fonts.regular, fontSize: 12, color: colors.inkSoft },
  review: { gap: space.sm, paddingVertical: space.md, borderBottomWidth: 1, borderColor: colors.rule },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.tile, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink },
  author: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  meta: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16, color: colors.inkSoft },
});
