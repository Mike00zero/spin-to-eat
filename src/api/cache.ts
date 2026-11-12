import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Small two-level cache for API responses:
 *  1. memory  – instant, lives until the app is closed
 *  2. disk    – AsyncStorage, survives app restarts
 * Concurrent requests for the same key share one in-flight fetch, failed fetches are
 * never cached, and if a refresh fails we fall back to the last (expired) copy so the
 * app still shows something when offline.
 */

type Entry<T> = { at: number; value: T };

const PREFIX = 'apicache:v1:'; // bump the version if the cached data's shape changes
const memory = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

async function readDisk<T>(key: string): Promise<Entry<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as Entry<T>) : null;
  } catch {
    return null;
  }
}

export async function cached<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
  { force = false }: { force?: boolean } = {},
): Promise<T> {
  const fresh = (e: Entry<unknown> | null | undefined): e is Entry<T> => !!e && Date.now() - e.at < ttlMs;

  if (!force) {
    const mem = memory.get(key);
    if (fresh(mem)) return mem.value;
    const pending = inflight.get(key);
    if (pending) return pending as Promise<T>;
  }

  const run = (async () => {
    const stored = memory.get(key) ?? (await readDisk<T>(key));
    if (!force && fresh(stored)) {
      memory.set(key, stored);
      return stored.value;
    }
    try {
      const value = await fetcher();
      const entry: Entry<T> = { at: Date.now(), value };
      memory.set(key, entry);
      AsyncStorage.setItem(PREFIX + key, JSON.stringify(entry)).catch(() => {});
      return value;
    } catch (e) {
      if (stored) return stored.value as T; // offline / API hiccup: stale beats nothing
      throw e;
    }
  })();

  inflight.set(key, run);
  try {
    return await run;
  } finally {
    if (inflight.get(key) === run) inflight.delete(key);
  }
}

/** Delete disk entries older than maxAgeMs so storage doesn't grow forever. Safe to call anytime. */
export async function pruneCache(maxAgeMs: number) {
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PREFIX));
    if (!keys.length) return;
    const pairs = await AsyncStorage.multiGet(keys);
    const now = Date.now();
    const old = pairs
      .filter(([, raw]) => {
        try {
          return !raw || now - (JSON.parse(raw) as Entry<unknown>).at > maxAgeMs;
        } catch {
          return true;
        }
      })
      .map(([k]) => k);
    if (old.length) await AsyncStorage.multiRemove(old);
  } catch {
    // best effort
  }
}
