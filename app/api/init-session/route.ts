/**
 * POST /api/init-session
 *
 * Called once by FingerprintProvider when the app loads.
 * Receives the FingerprintJS visitorId and bakes it into a
 * secure, HttpOnly cookie so the server can read it on every
 * subsequent PDF-processing request without any client-side
 * JS involvement.
 *
 * Cookie strategy:
 *  - HttpOnly  → JavaScript on the page cannot read OR delete it.
 *  - SameSite=Strict → immune to CSRF attacks.
 *  - Secure    → only sent over HTTPS in production.
 *  - Max-Age   → 1 year, so it persists across browser restarts.
 */

import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "pdftool_did"; // device-id
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year in seconds

// Validate that the fingerprint looks like what FingerprintJS produces
// (hex string, 32 chars). This prevents header injection / oversized payloads.
const FP_REGEX = /^[a-f0-9]{8,64}$/i;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const fingerprint: unknown = body?.fingerprint;

    // Strict validation
    if (
      typeof fingerprint !== "string" ||
      !FP_REGEX.test(fingerprint)
    ) {
      return NextResponse.json(
        { error: "Invalid fingerprint format." },
        { status: 400 }
      );
    }

    // Check if we already set a cookie for this device.
    // If so, do NOT overwrite it — keep the oldest fingerprint
    // so clearing the page-level JS storage does NOT reset the limit.
    const existingCookie = req.cookies.get(COOKIE_NAME)?.value;
    const cookieToSet = existingCookie ?? fingerprint;

    const res = NextResponse.json({ ok: true, deviceId: cookieToSet });

    res.cookies.set({
      name: COOKIE_NAME,
      value: cookieToSet,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });

    return res;
  } catch {
    return NextResponse.json(
      { error: "Bad request." },
      { status: 400 }
    );
  }
}
