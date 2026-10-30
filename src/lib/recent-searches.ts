import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const KEY = 'beauty-shelf/recent-searches';
const MAX = 8;

/** Adds a search to the front of the list, without duplicates (ignoring case), keeping the newest few. */
export function pushRecent(list: readonly string[], query: string, max = MAX): string[] {
  const q = query.trim();
  if (!q) return [...list];
  return [q, ...list.filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, max);
}

/** Recent searches, kept on this device only. Storage failures just mean an empty list. */
export function useRecentSearches() {
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        const parsed: unknown = raw ? JSON.parse(raw) : [];
        if (alive && Array.isArray(parsed)) setRecent(parsed.filter((x): x is string => typeof x === 'string').slice(0, MAX));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const write = useCallback((next: string[]) => {
    setRecent(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  return {
    recent,
    remember: (query: string) => write(pushRecent(recent, query)),
    forget: (query: string) => write(recent.filter((x) => x !== query)),
  };
}
