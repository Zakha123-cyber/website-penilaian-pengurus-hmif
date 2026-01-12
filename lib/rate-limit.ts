const WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 5;

// In-memory rate limit store (per-instance). For production, move to Redis.
const buckets: Map<string, number[]> = new Map();

export function rateLimit(key: string, opts?: { windowMs?: number; max?: number }) {
  const windowMs = opts?.windowMs ?? WINDOW_MS;
  const max = opts?.max ?? MAX_ATTEMPTS;
  const now = Date.now();

  const arr = buckets.get(key)?.filter((ts) => now - ts < windowMs) ?? [];
  if (arr.length >= max) {
    const retryAfter = Math.ceil((windowMs - (now - arr[0])) / 1000);
    return { ok: false, retryAfter };
  }

  arr.push(now);
  buckets.set(key, arr);
  return { ok: true, remaining: max - arr.length, retryAfter: 0 };
}
