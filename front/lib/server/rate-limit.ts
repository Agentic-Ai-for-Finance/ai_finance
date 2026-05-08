type WindowEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, WindowEntry>();

export type RateLimitResult = {
  ok: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
};

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { ok: true, limit, remaining: limit - 1, resetAt };
  }

  if (existing.count >= limit) {
    return { ok: false, limit, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { ok: true, limit, remaining: limit - existing.count, resetAt: existing.resetAt };
}
