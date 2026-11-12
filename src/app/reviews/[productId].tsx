import { useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ReviewRow } from '@/components/reviews';
import { AppText, EmptyState, ErrorState, LoadingState, Screen, TopBar } from '@/components/ui';
import { useReviews } from '@/data/queries';
import { toAppError } from '@/lib/errors';
import { goBack } from '@/lib/navigation';
import { space } from '@/theme/tokens';

/** Every written review of a product, newest first (the latest 50). */
export default function AllReviewsScreen() {
  const params = useLocalSearchParams<{ productId: string; name?: string }>();
  const reviews = useReviews(params.productId, 50);

  return (
    <Screen bottomInset contentStyle={styles.content}>
      <TopBar onBack={() => goBack()} title="Reviews" />
      {params.name ? <AppText variant="heading">{params.name}</AppText> : null}
      {reviews.isPending ? (
        <LoadingState label="Loading reviews" />
      ) : reviews.isError ? (
        <ErrorState message={toAppError(reviews.error).message} onRetry={() => reviews.refetch()} />
      ) : !reviews.data?.length ? (
        <EmptyState title="No reviews yet" body="Be the first to say what you think." />
      ) : (
        reviews.data.map((r) => <ReviewRow key={r.id} review={r} />)
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({ content: { gap: space.sm } });
