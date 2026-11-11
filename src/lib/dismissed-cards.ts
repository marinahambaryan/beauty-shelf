import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

const KEY = 'beauty-shelf/dismissed-cards';
/** Keep the list small: old situations never come back with the same id. */
const MAX = 200;

// Needs-attention cards dismissed on this device. One small store shared by every screen.
let dismissed: ReadonlySet<string> = new Set();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

AsyncStorage.getItem(KEY)
  .then((v) => {
    if (!v) return;
    const ids = JSON.parse(v) as unknown;
    if (Array.isArray(ids)) {
      dismissed = new Set([...ids.filter((x): x is string => typeof x === 'string'), ...dismissed]);
      emit();
    }
  })
  .catch(() => {});

export function dismissCard(id: string) {
  dismissed = new Set([...dismissed, id].slice(-MAX));
  emit();
  AsyncStorage.setItem(KEY, JSON.stringify([...dismissed])).catch(() => {});
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useDismissedCards() {
  return useSyncExternalStore(subscribe, () => dismissed, () => dismissed);
}
