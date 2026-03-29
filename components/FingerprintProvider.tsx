"use client";

/**
 * components/FingerprintProvider.tsx
 *
 * Invisible component that silently fingerprints the user
 * on first render and POSTs to /api/init-session to bake the
 * fingerprint into a secure HttpOnly cookie.
 *
 * Also exposes a React Context so any component in the tree can:
 *   - Read the current usage (remaining, resetAt)
 *   - Call `enforceLimit()` before a PDF operation
 *
 * Usage:
 *   Wrap your app with <FingerprintProvider> in layout.tsx, then
 *   in any page/component:
 *
 *   const { enforceLimit, remaining } = useRateLimit();
 *   const result = await enforceLimit();
 *   if (!result.allowed) { showModal(); return; }
 *   // proceed with PDF operation
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { getVisitorId } from "@/lib/fingerprint";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LimitStatus {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: number;         // Unix ms
  retryAfterSeconds?: number;
  message?: string;
  reason?: string;
}

interface RateLimitContextValue {
  /** Current known status (may be stale until refreshed) */
  status: LimitStatus | null;
  /** Whether the fingerprint + cookie init is still in progress */
  initializing: boolean;
  /**
   * Call this BEFORE every PDF operation.
   * Increments the counter on the server and returns whether the
   * operation is allowed.
   */
  enforceLimit: () => Promise<LimitStatus>;
  /** Refresh the display status without incrementing the counter */
  refreshStatus: () => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────────────────────

const RateLimitContext = createContext<RateLimitContextValue | null>(null);

export function useRateLimit(): RateLimitContextValue {
  const ctx = useContext(RateLimitContext);
  if (!ctx) {
    throw new Error("useRateLimit must be used inside <FingerprintProvider>");
  }
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function FingerprintProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<LimitStatus | null>(null);
  const [initializing, setInitializing] = useState(true);
  const initAttempted = useRef(false);

  // --- Step 1: Fingerprint the device and set the cookie ---
  useEffect(() => {
    if (initAttempted.current) return;
    initAttempted.current = true;

    (async () => {
      try {
        const visitorId = await getVisitorId();

        // POST to init-session — sets the HttpOnly cookie.
        // The server will IGNORE this if a cookie already exists,
        // so repeated visits don't reset the rate-limit window.
        await fetch("/api/init-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include", // Required so the cookie is sent/received
          body: JSON.stringify({ fingerprint: visitorId }),
        });

        // --- Step 2: Fetch the current usage status ---
        await refreshStatus();
      } catch (err) {
        console.warn("[FingerprintProvider] Init failed:", err);
      } finally {
        setInitializing(false);
      }
    })();
  }, []);

  // --- Refresh status (read-only, no counter increment) ----
  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/check-limit", {
        credentials: "include",
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data as LimitStatus);
      }
    } catch {
      // Silently ignore — status will remain null
    }
  }, []);

  // --- Enforce limit (increments counter) ------------------
  const enforceLimit = useCallback(async (): Promise<LimitStatus> => {
    try {
      const res = await fetch("/api/enforce-limit", {
        method: "POST",
        credentials: "include",
      });

      const data = (await res.json()) as LimitStatus;

      // Update local status to reflect the new counter value
      setStatus((prev) => ({
        ...prev,
        ...data,
      }));

      return data;
    } catch {
      // Network error — fail open (allow the request but log a warning)
      console.warn("[FingerprintProvider] enforceLimit network error — failing open");
      return {
        allowed: true,
        remaining: 0,
        limit: 3,
        resetAt: Date.now() + 60 * 60 * 1000,
        reason: "network_error",
      };
    }
  }, []);

  return (
    <RateLimitContext.Provider value={{ status, initializing, enforceLimit, refreshStatus }}>
      {children}
    </RateLimitContext.Provider>
  );
}
