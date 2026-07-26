/**
 * Minimal shared, subscribable store with single-flight fetching.
 *
 * Lets multiple component instances of a hook share one snapshot and, crucially,
 * one in-flight network request: concurrent callers of {@link SharedStore.run}
 * await the same promise instead of firing duplicate requests. Consume it from
 * a hook via {@link useSharedStore}.
 */

type Listener = () => void;

export type SharedStore<T> = {
  getSnapshot: () => T;
  subscribe: (listener: Listener) => () => void;
  setState: (next: T | ((prev: T) => T)) => void;
  /** Runs {@code fetcher} at most once concurrently; concurrent callers share the promise. */
  run: (fetcher: () => Promise<void>) => Promise<void>;
};

export function createSharedStore<T>(initial: T): SharedStore<T> {
  let state = initial;
  const listeners = new Set<Listener>();
  let inFlight: Promise<void> | null = null;

  const emit = () => listeners.forEach((listener) => listener());

  return {
    getSnapshot: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setState: (next) => {
      const value = next instanceof Function ? (next as (prev: T) => T)(state) : next;
      if (Object.is(value, state)) return;
      state = value;
      emit();
    },
    run: (fetcher) => {
      if (inFlight) return inFlight;
      inFlight = (async () => {
        try {
          await fetcher();
        } finally {
          inFlight = null;
        }
      })();
      return inFlight;
    },
  };
}
