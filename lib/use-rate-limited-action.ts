"use client";
/**
 * lib/use-rate-limited-action.ts
 *
 * Custom hook that wraps any async PDF action with rate-limit enforcement.
 * Usage in any page:
 *
 *   const { execute, limitResult, clearLimitResult } = useRateLimitedAction();
 *
 *   // Replace your existing handleXxx:
 *   const handleCompress = () => execute(async () => {
 *     const res = await compressPdf(file, selectedQuality);
 *     setResult(res);
 *   });
 *
 *   // In JSX:
 *   <RateLimitModal
 *     open={!!limitResult}
 *     resetAt={limitResult?.resetAt ?? 0}
 *     onClose={clearLimitResult}
 *   />
 *
 * That's it. No other changes needed in any page.
 */

import { useState, useCallback } from "react";
import { useRateLimit, LimitStatus } from "@/components/FingerprintProvider";

interface UseRateLimitedActionReturn {
  /**
   * Wrap your PDF operation in this.
   * If the user is over the limit, the action is NOT called and
   * `limitResult` is set so the modal will open.
   */
  execute: (action: () => Promise<void>) => Promise<void>;
  /** Non-null when the rate limit was hit. Pass to <RateLimitModal>. */
  limitResult: LimitStatus | null;
  /** Call this when the user closes the modal. */
  clearLimitResult: () => void;
}

export function useRateLimitedAction(): UseRateLimitedActionReturn {
  const { enforceLimit } = useRateLimit();
  const [limitResult, setLimitResult] = useState<LimitStatus | null>(null);

  const execute = useCallback(
    async (action: () => Promise<void>) => {
      const result = await enforceLimit();

      if (!result.allowed) {
        setLimitResult(result);
        return; // Do NOT proceed with the PDF operation
      }

      // Limit is fine — run the actual action
      await action();
    },
    [enforceLimit]
  );

  const clearLimitResult = useCallback(() => setLimitResult(null), []);

  return { execute, limitResult, clearLimitResult };
}
