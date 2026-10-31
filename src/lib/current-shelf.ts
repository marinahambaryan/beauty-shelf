import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import type { CollectionSummary } from '@/data/collections';

const KEY = 'beauty-shelf/current-shelf';

// Which shelf Home shows, remembered on this device. One small store shared by every screen.
let current: string | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

AsyncStorage.getItem(KEY)
  .then((v) => {
    if (v && !current) {
      current = v;
      emit();
    }
  })
  .catch(() => {});

export function setCurrentShelf(id: string | null) {
  current = id;
  emit();
  (id ? AsyncStorage.setItem(KEY, id) : AsyncStorage.removeItem(KEY)).catch(() => {});
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** The remembered shelf if it still exists, else the first one; null when there are none. */
export function pickShelf<T extends Pick<CollectionSummary, 'id'>>(shelves: readonly T[], remembered: string | null): T | null {
  return shelves.find((s) => s.id === remembered) ?? shelves[0] ?? null;
}

export function useCurrentShelfId() {
  return useSyncExternalStore(subscribe, () => current, () => current);
}
