/**
 * lib/fingerprint.ts
 *
 * Thin wrapper around @fingerprintjs/fingerprintjs.
 * Loads the library lazily (client-side only) and caches
 * the result in module-level memory so it is only computed once
 * per browser session — even if multiple components use it.
 */

import { type GetResult } from "@fingerprintjs/fingerprintjs";

let cachedVisitorId: string | null = null;

/**
 * Returns the FingerprintJS visitorId (a stable 32-char hex string).
 * Safe to call multiple times — subsequent calls return the cached value.
 */
export async function getVisitorId(): Promise<string> {
  // Return cached value immediately if available
  if (cachedVisitorId) return cachedVisitorId;

  try {
    // Dynamic import ensures this never runs during SSR
    const FingerprintJS = (await import("@fingerprintjs/fingerprintjs")).default;
    const fp = await FingerprintJS.load();
    const result: GetResult = await fp.get();
    cachedVisitorId = result.visitorId;
    return cachedVisitorId;
  } catch (err) {
    console.warn("[fingerprint] Could not generate visitorId:", err);
    // Fallback: generate a random UUID and store it in sessionStorage.
    // This is weaker but ensures the gate still works even if FingerprintJS
    // fails (e.g., ad-blocker blocks the library).
    const fallback = generateFallbackId();
    cachedVisitorId = fallback;
    return fallback;
  }
}

function generateFallbackId(): string {
  // Check if we already stored a fallback in sessionStorage
  if (typeof window !== "undefined") {
    const stored = sessionStorage.getItem("pdfmaya_fid");
    if (stored) return stored;

    const id = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    sessionStorage.setItem("pdfmaya_fid", id);
    return id;
  }
  return "fallback000000000000000000000000";
}
