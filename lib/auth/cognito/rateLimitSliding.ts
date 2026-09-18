/**
 * In-memory sliding-window rate limiting (singleton per Node process).
 * PM2 caveat: counts are per fork; scale-out is not coordinated.
 */

type BucketEntry = number[];

export function slidingWindowLimited(opts: {
  store: Map<string, BucketEntry>;
  key: string;
  max: number;
  windowMs: number;
}): boolean {
  const { store, key, max, windowMs } = opts;
  const now = Date.now();
  let arr = store.get(key) ?? [];
  arr = arr.filter((t) => now - t < windowMs);
  if (arr.length >= max) {
    store.set(key, arr);
    return false;
  }
  arr.push(now);
  store.set(key, arr);
  return true;
}
