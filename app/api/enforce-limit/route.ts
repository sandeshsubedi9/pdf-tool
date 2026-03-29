/**
 * POST /api/enforce-limit
 *
 * This is the GATE. Every time a user tries to process a PDF,
 * the frontend calls this endpoint FIRST (before hitting the
 * Python service).
 *
 * Usage flow:
 *   1. Frontend calls POST /api/enforce-limit
 *   2. This endpoint reads the HttpOnly cookie for device tracking
 *   3. Runs the rate-limit check (increments counter)
 *   4. Returns { allowed: true/false, remaining, resetAt }
 *   5. If allowed=true → frontend continues to call Python service
 *   6. If allowed=false → frontend shows the RateLimitModal
 *
 * Headers returned (industry standard):
 *   X-RateLimit-Limit     : max requests per window
 *   X-RateLimit-Remaining : requests remaining in the current window
 *   X-RateLimit-Reset     : Unix timestamp (seconds) when the window resets
 *   Retry-After           : seconds until the next request is allowed (on 429)
 */

import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, UserTier } from "@/lib/rate-limiter";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const COOKIE_NAME = "pdftool_did";

export async function POST(req: NextRequest) {
  // --- 1. Read device identifier from the HttpOnly cookie ----------
  const deviceId = req.cookies.get(COOKIE_NAME)?.value;

  if (!deviceId) {
    // No cookie means FingerprintProvider hasn't run yet (rare).
    // Deny the request gracefully — the client will reinitialise.
    return NextResponse.json(
      {
        allowed: false,
        reason: "session_not_initialized",
        message: "Please refresh the page and try again.",
      },
      { status: 403 }
    );
  }

  // --- 2. Determine the user tier ---------------------------------
  const session = await getServerSession(authOptions);
  
  let tier: UserTier = "anonymous";
  let key = `fp:${deviceId}`;

  if (session?.user) {
    const user = session.user as any;
    tier = user.isStudent ? "premium" : "registered";
    key = `uid:${user.id || user.email}`;
  }

  // --- 3. Run the rate-limit check (increments counter) -----------
  const result = checkRateLimit(key, tier);

  // Convenience header values
  const resetAtSeconds = Math.ceil(result.resetAt / 1000);
  const retryAfterSeconds = Math.max(
    0,
    Math.ceil((result.resetAt - Date.now()) / 1000)
  );

  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(resetAtSeconds),
  };

  // --- 4a. ALLOWED -----------------------------------------------
  if (result.allowed) {
    return NextResponse.json(
      {
        allowed: true,
        remaining: result.remaining,
        limit: result.limit,
        resetAt: result.resetAt,
      },
      { status: 200, headers }
    );
  }

  // --- 4b. RATE LIMITED (429 Too Many Requests) ------------------
  headers["Retry-After"] = String(retryAfterSeconds);

  return NextResponse.json(
    {
      allowed: false,
      reason: "rate_limit_exceeded",
      message: `You've used all ${result.limit} free conversions for this hour. Please wait ${formatDuration(retryAfterSeconds)} or sign up for more.`,
      remaining: 0,
      limit: result.limit,
      resetAt: result.resetAt,
      retryAfterSeconds,
    },
    { status: 429, headers }
  );
}

// Helper to format seconds into a human-readable string
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}
