import { useEffect, useState } from 'react';

/** The value, once it has stopped changing for `delay` ms. Used so search doesn't query on every keystroke. */
export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return settled;
}
