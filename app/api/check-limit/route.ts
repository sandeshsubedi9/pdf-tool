/**
 * GET /api/check-limit
 *
 * Returns the current rate-limit status for the requesting device
 * WITHOUT incrementing the counter. Used by the UI to show the
 * "X conversions remaining this hour" badge.
 *
 * Response shape:
 * {
 *   allowed: boolean,
 *   remaining: number,
 *   limit: number,
 *   resetAt: number,       // Unix ms
 *   resetInSeconds: number  // Convenience field for countdown timers
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { getRemainingUsage, UserTier, LIMITS } from "@/lib/rate-limiter";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const COOKIE_NAME = "pdftool_did";

export async function GET(req: NextRequest) {
  const deviceId = req.cookies.get(COOKIE_NAME)?.value;

  const session = await getServerSession(authOptions);
  let tier: UserTier = "anonymous";
  let key = `fp:${deviceId}`;

  if (session?.user) {
    const user = session.user as any;
    tier = user.isStudent ? "premium" : "registered";
    key = `uid:${user.id || user.email}`;
  }

  // If there is no cookie yet and no session, the user hasn't been fingerprinted.
  // Return a "full tank" response — the session will be initialised
  // when FingerprintProvider runs on the client.
  if (!deviceId && tier === "anonymous") {
    return NextResponse.json({
      allowed: true,
      remaining: LIMITS.anonymous.max,
      limit: LIMITS.anonymous.max,
      resetAt: Date.now() + LIMITS.anonymous.windowMs,
      resetInSeconds: LIMITS.anonymous.windowMs / 1000,
    });
  }

  const result = getRemainingUsage(key, tier);

  const resetInSeconds = Math.max(
    0,
    Math.ceil((result.resetAt - Date.now()) / 1000)
  );

  return NextResponse.json({
    allowed: result.allowed,
    remaining: result.remaining,
    limit: result.limit,
    resetAt: result.resetAt,
    resetInSeconds,
  });
}
