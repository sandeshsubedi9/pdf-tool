import connectToDatabase from "@/lib/db";
import { RateLimit } from "@/lib/models/RateLimit";

/**
 * ============================================================
 *  RATE LIMITER (MongoDB Edition) — lib/rate-limiter.ts
 * ============================================================
 *  Uses MongoDB to permanently track usage limits.
 *  Fast, robust, survives server restarts cleanly, and
 *  eliminates the need to pay for a 3rd party Redis host.
 * ============================================================
 */

export const LIMITS = {
  anonymous: { max: 3, windowMs: 60 * 60 * 1000 },   // 3 per hour
  registered: { max: 10, windowMs: 60 * 60 * 1000 }, // 10 per hour
  premium: { max: Infinity, windowMs: 0 },          // unlimited
} as const;

export type UserTier = keyof typeof LIMITS;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // Unix ms
  limit: number;
}

/**
 * Check and increment the counter for a given key in MongoDB.
 * Call this BEFORE processing a PDF operation.
 */
export async function checkRateLimit(key: string, tier: UserTier = "anonymous"): Promise<RateLimitResult> {
  const cfg = LIMITS[tier];

  // Premium users instantly bypass DB checks
  if (tier === "premium") {
    return { allowed: true, remaining: Infinity, resetAt: 0, limit: Infinity };
  }

  await connectToDatabase();
  const now = Date.now();
  const windowMs = cfg.windowMs;

  /*
   * Implementation of Sliding Window in MongoDB:
   * 1. Try to find an existing record that HAS NOT EXPIRED.
   * 2. If it exists and count < max -> Increment count and EXTEND resetAt (Sliding).
   * 3. If it doesn't exist or IS EXPIRED -> Upsert with count: 1 and new resetAt.
   */

  // First, find current state to see if it's expired
  let existing = await RateLimit.findOne({ key });

  if (!existing || now >= existing.resetAt.getTime()) {
    // expired or new: Reset/Create
    const resetDate = new Date(now + windowMs);
    const updated = await RateLimit.findOneAndUpdate(
      { key },
      { 
        $set: { 
          count: 1, 
          resetAt: resetDate 
        } 
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return {
      allowed: true,
      remaining: cfg.max - 1,
      resetAt: updated.resetAt.getTime(),
      limit: cfg.max,
    };
  }

  // Record is active. Check limit.
  if (existing.count >= cfg.max) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt.getTime(),
      limit: cfg.max,
    };
  }

  // Not at limit yet. Atomic increment and sliding timer reset.
  const updated = await RateLimit.findOneAndUpdate(
    { key, count: { $lt: cfg.max }, resetAt: { $gt: new Date(now) } },
    { 
      $inc: { count: 1 }, 
      $set: { resetAt: new Date(now + windowMs) } 
    },
    { new: true }
  );

  // If 'updated' is null here, it means between our 'findOne' and 'findOneAndUpdate',
  // another request pushed it over the limit or it expired.
  if (!updated) {
    // Re-fetch to be sure of the state
    return checkRateLimit(key, tier);
  }

  return {
    allowed: true,
    remaining: Math.max(0, cfg.max - updated.count),
    resetAt: updated.resetAt.getTime(),
    limit: cfg.max,
  };
}


/**
 * Peek at the current usage without incrementing.
 * Used to conditionally render the "X uses remaining" UI badge.
 */
export async function getRemainingUsage(key: string, tier: UserTier = "anonymous"): Promise<RateLimitResult> {
  const cfg = LIMITS[tier];

  if (tier === "premium") {
    return { allowed: true, remaining: Infinity, resetAt: 0, limit: Infinity };
  }

  await connectToDatabase();
  const now = Date.now();
  const existing = await RateLimit.findOne({ key });

  if (!existing || now >= existing.resetAt.getTime()) {
    return { allowed: true, remaining: cfg.max, resetAt: now + cfg.windowMs, limit: cfg.max };
  }

  const remaining = Math.max(0, cfg.max - existing.count);
  return {
    allowed: remaining > 0,
    remaining,
    resetAt: existing.resetAt.getTime(),
    limit: cfg.max,
  };
}
