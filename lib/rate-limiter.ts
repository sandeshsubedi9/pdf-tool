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

  // Premium users instantly bypass DB checks exactly
  if (tier === "premium") {
    return { allowed: true, remaining: Infinity, resetAt: 0, limit: Infinity };
  }

  await connectToDatabase();
  const now = Date.now();
  const existing = await RateLimit.findOne({ key });

  // 1. No record, or the 1-hour window expired
  if (!existing || now >= existing.resetAt.getTime()) {
    const resetDate = new Date(now + cfg.windowMs);
    
    if (existing) {
      existing.count = 1;
      existing.resetAt = resetDate;
      await existing.save();
    } else {
      await RateLimit.create({ key, count: 1, resetAt: resetDate });
    }

    return {
      allowed: true,
      remaining: cfg.max - 1,
      resetAt: resetDate.getTime(),
      limit: cfg.max,
    };
  }

  // 2. Window is still active — Check count limit
  if (existing.count >= cfg.max) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt.getTime(),
      limit: cfg.max,
    };
  }

  // 3. Allowed — Increment count
  existing.count += 1;
  await existing.save();

  return {
    allowed: true,
    remaining: cfg.max - existing.count,
    resetAt: existing.resetAt.getTime(),
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
