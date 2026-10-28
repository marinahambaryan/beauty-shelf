import { StyleSheet, View } from 'react-native';

import { GlassShelf } from '@/components/shelf';
import { ErrorState, LoadingState, Mast, PageTitle, Row, Screen, Section } from '@/components/ui';
import { useCollections } from '@/data/queries';
import { toAppError } from '@/lib/errors';
import { catalogNo, colors, radius, twoDigit } from '@/theme/tokens';

const SHELF_SLOTS = 12;
const PER_SHELF = 4;

const items = (n: number) => (n === 1 ? '01 item' : `${twoDigit(n)} items`);

export default function CollectionsScreen() {
  const collections = useCollections();
  const shelf = collections.data?.find((c) => c.type === 'shelf');
  const others = collections.data?.filter((c) => c.type !== 'shelf') ?? [];

  return (
    <Screen>
      <Mast left="Shelf & lists" right={`${catalogNo(others.length)} lists`} />
      <PageTitle>Collections</PageTitle>

      {collections.isPending ? (
        <LoadingState label="Loading collections" />
      ) : collections.isError ? (
        <ErrorState message={toAppError(collections.error).message} onRetry={() => collections.refetch()} />
      ) : (
        <>
          {shelf ? <ShelfPreview filled={Math.min(shelf.itemCount, SHELF_SLOTS)} /> : null}
          <Section
            label="Lists"
            footer="Making your own collections and arranging your shelf arrive in an upcoming update."
          >
            <View>
              {others.map((c) => (
                <Row key={c.id} title={c.name} detail={items(c.itemCount)} />
              ))}
            </View>
          </Section>
        </>
      )}
    </Screen>
  );
}

/** The shelf as it is: three glass shelves of four slots, filled in order. */
function ShelfPreview({ filled }: { filled: number }) {
  return (
    <Section label="Shelf" right={`${twoDigit(filled)} of ${SHELF_SLOTS}`}>
      <View style={styles.shelves} accessible accessibilityLabel={`Shelf, ${filled} of ${SHELF_SLOTS} slots filled`}>
        {[0, 1, 2].map((row) => (
          <GlassShelf key={row} height={64}>
            {Array.from({ length: PER_SHELF }, (_, i) => {
              const slot = row * PER_SHELF + i;
              return <View key={slot} style={[styles.slot, slot < filled ? styles.slotFilled : styles.slotEmpty]} />;
            })}
          </GlassShelf>
        ))}
      </View>
    </Section>
  );
}

const styles = StyleSheet.create({
  shelves: { gap: 22 },
  slot: { width: 44, height: 56, borderRadius: radius.sm },
  slotFilled: { backgroundColor: colors.paper, boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.08)' },
  slotEmpty: { borderWidth: 1, borderStyle: 'dashed', borderColor: colors.inkFaint },
});
