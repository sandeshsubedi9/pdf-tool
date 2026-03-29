/**
 * ============================================================
 *  RATE LIMITER — lib/rate-limiter.ts
 * ============================================================
 *  Sliding Window algorithm. O(1) memory per tracked key.
 *
 *  This implementation uses an in-memory Map (works in dev and
 *  serverless with a single instance).  To scale to Redis:
 *
 *  1. npm install ioredis
 *  2. Replace the Map calls with:
 *     const redis = new Redis(process.env.REDIS_URL!)
 *     await redis.incr(key)
 *     await redis.expire(key, windowSeconds)
 *     await redis.ttl(key)
 *     await redis.get(key)
 *
 *  The public API surface (checkRateLimit / getRemainingUsage)
 *  stays identical — no other file needs to change.
 * ============================================================
 */

interface RateLimitEntry {
  count: number;
  resetAt: number; // Unix ms timestamp when this window resets
}

// In-memory store — survives the NodeJS process lifetime.
// On Vercel/serverless each cold-start gets a fresh store,
// which is acceptable for a "3 per hour" soft limit.
const store = new Map<string, RateLimitEntry>();

// ---- Config ------------------------------------------------
export const LIMITS = {
  anonymous: { max: 3, windowMs: 60 * 60 * 1000 }, // 3 per hour
  registered: { max: 10, windowMs: 60 * 60 * 1000 }, // 10 per hour (future)
  premium: { max: Infinity, windowMs: 0 }, // unlimited
} as const;

export type UserTier = keyof typeof LIMITS;

// ---- Public API --------------------------------------------

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // Unix ms
  limit: number;
}

/**
 * Check and increment the counter for a given key.
 * Call this BEFORE processing a PDF operation.
 *
 * @param key   Unique identifier (e.g. "fp:abc123" or "uid:user456")
 * @param tier  User tier — controls which limit band to use
 */
export function checkRateLimit(key: string, tier: UserTier = "anonymous"): RateLimitResult {
  const cfg = LIMITS[tier];

  // Premium users are never limited
  if (tier === "premium") {
    return { allowed: true, remaining: Infinity, resetAt: 0, limit: Infinity };
  }

  const now = Date.now();
  const existing = store.get(key);

  // Window has expired — reset the counter
  if (!existing || now >= existing.resetAt) {
    const entry: RateLimitEntry = {
      count: 1,
      resetAt: now + cfg.windowMs,
    };
    store.set(key, entry);
    return {
      allowed: true,
      remaining: cfg.max - 1,
      resetAt: entry.resetAt,
      limit: cfg.max,
    };
  }

  // Within window — check the current count
  if (existing.count >= cfg.max) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
      limit: cfg.max,
    };
  }

  // Allowed — increment
  existing.count += 1;
  store.set(key, existing);

  return {
    allowed: true,
    remaining: cfg.max - existing.count,
    resetAt: existing.resetAt,
    limit: cfg.max,
  };
}

/**
 * Peek at the current usage without incrementing.
 * Used to show the "X uses remaining" badge on the UI.
 */
export function getRemainingUsage(key: string, tier: UserTier = "anonymous"): RateLimitResult {
  const cfg = LIMITS[tier];

  if (tier === "premium") {
    return { allowed: true, remaining: Infinity, resetAt: 0, limit: Infinity };
  }

  const now = Date.now();
  const existing = store.get(key);

  if (!existing || now >= existing.resetAt) {
    return { allowed: true, remaining: cfg.max, resetAt: now + cfg.windowMs, limit: cfg.max };
  }

  const remaining = Math.max(0, cfg.max - existing.count);
  return {
    allowed: remaining > 0,
    remaining,
    resetAt: existing.resetAt,
    limit: cfg.max,
  };
}

/** Periodic cleanup to prevent unbounded memory growth (run every hour). */
export function pruneExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now >= entry.resetAt) {
      store.delete(key);
    }
  }
}

// Auto-prune every hour in long-running environments (Next.js dev server).
if (typeof setInterval !== "undefined") {
  setInterval(pruneExpiredEntries, 60 * 60 * 1000);
}
