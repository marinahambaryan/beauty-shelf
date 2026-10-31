import * as Haptics from 'expo-haptics';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, PanResponder, StyleSheet, View } from 'react-native';

import { colors, space } from '@/theme/tokens';
import { Icon } from './icons';

/** Where a dragged row lands: its start index moved by whole rows, kept inside the list. */
export function dropIndex(from: number, dy: number, rowHeight: number, count: number) {
  return Math.max(0, Math.min(count - 1, from + Math.round(dy / rowHeight)));
}

const buzz = () => {
  if (process.env.EXPO_OS !== 'web') Haptics.selectionAsync().catch(() => {});
};

/**
 * A list you reorder by dragging each row's handle. Rows have a fixed height so the drop
 * position is simple to work out; the others slide out of the way while you drag. The
 * handle also carries Move earlier / later actions for screen readers.
 */
export function DragList<T>({
  items,
  keyOf,
  labelOf,
  rowHeight,
  renderRow,
  onMove,
  onDragChange,
}: {
  items: readonly T[];
  keyOf: (item: T) => string;
  labelOf: (item: T) => string;
  rowHeight: number;
  renderRow: (item: T, index: number) => ReactNode;
  onMove: (from: number, to: number) => void;
  /** Lets the page stop scrolling while a row is held. */
  onDragChange?: (dragging: boolean) => void;
}) {
  const [drag, setDrag] = useState<{ from: number; to: number } | null>(null);
  const [dy] = useState(() => new Animated.Value(0));

  return (
    <View style={{ height: rowHeight * items.length }}>
      {items.map((item, index) => {
        const dragging = drag?.from === index;
        // While dragging, rows between the start and the target slide one row up or down.
        let shift = 0;
        if (drag && !dragging) {
          if (drag.from < index && index <= drag.to) shift = -rowHeight;
          if (drag.to <= index && index < drag.from) shift = rowHeight;
        }
        return (
          <Animated.View
            key={keyOf(item)}
            style={[
              styles.row,
              { top: index * rowHeight + shift, height: rowHeight },
              dragging && styles.lifted,
              dragging && { transform: [{ translateY: dy }] },
            ]}
          >
            <View style={styles.content}>{renderRow(item, index)}</View>
            <Handle
              label={labelOf(item)}
              index={index}
              count={items.length}
              rowHeight={rowHeight}
              dy={dy}
              onStart={() => {
                buzz();
                onDragChange?.(true);
                setDrag({ from: index, to: index });
              }}
              onHover={(to) =>
                setDrag((d) => {
                  if (!d || d.to === to) return d;
                  buzz();
                  return { ...d, to };
                })
              }
              onEnd={(to) => {
                onDragChange?.(false);
                setDrag(null);
                dy.setValue(0);
                if (to !== index) onMove(index, to);
              }}
              onStep={(by) => onMove(index, index + by)}
            />
          </Animated.View>
        );
      })}
    </View>
  );
}

function Handle({
  label,
  index,
  count,
  rowHeight,
  dy,
  onStart,
  onHover,
  onEnd,
  onStep,
}: {
  label: string;
  index: number;
  count: number;
  rowHeight: number;
  dy: Animated.Value;
  onStart: () => void;
  onHover: (to: number) => void;
  onEnd: (to: number) => void;
  onStep: (by: -1 | 1) => void;
}) {
  // The responder lives for the row's lifetime; read the latest props through a ref.
  const props = useRef({ index, count, rowHeight, onStart, onHover, onEnd });
  useLayoutEffect(() => {
    props.current = { index, count, rowHeight, onStart, onHover, onEnd };
  });
  // The handlers only read the ref when the handle is touched, never during render.
  // eslint-disable-next-line react-hooks/refs
  const [responder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => props.current.onStart(),
      onPanResponderMove: (_e, g) => {
        dy.setValue(g.dy);
        const p = props.current;
        p.onHover(dropIndex(p.index, g.dy, p.rowHeight, p.count));
      },
      onPanResponderRelease: (_e, g) => {
        const p = props.current;
        p.onEnd(dropIndex(p.index, g.dy, p.rowHeight, p.count));
      },
      onPanResponderTerminate: () => props.current.onEnd(props.current.index),
    }),
  );

  const actions = [
    ...(index > 0 ? [{ name: 'moveEarlier', label: 'Move earlier' }] : []),
    ...(index < count - 1 ? [{ name: 'moveLater', label: 'Move later' }] : []),
  ];
  return (
    <View
      {...responder.panHandlers}
      style={styles.handle}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={`Reorder ${label}`}
      accessibilityHint="Drag up or down to move it"
      accessibilityValue={{ text: `${index + 1} of ${count}` }}
      accessibilityActions={actions}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'moveEarlier' || e.nativeEvent.actionName === 'decrement') onStep(-1);
        if (e.nativeEvent.actionName === 'moveLater' || e.nativeEvent.actionName === 'increment') onStep(1);
      }}
    >
      <Icon name="grip" size={22} color={colors.inkMuted} strokeWidth={2} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.ground,
    borderBottomWidth: 1,
    borderColor: colors.rule,
  },
  lifted: {
    zIndex: 10,
    borderRadius: 12,
    borderBottomWidth: 0,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.16)',
  },
  content: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingLeft: space.xs },
  // A wide, tall grab area: easy to find with a thumb.
  handle: { width: 44, height: 56, alignItems: 'center', justifyContent: 'center' },
});
