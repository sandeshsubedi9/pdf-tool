"use client";

/**
 * components/UsageBadge.tsx
 *
 * A subtle pill that shows "X of 3 conversions left this hour".
 * Drop it into your Navbar or any pdf tool page header.
 *
 * Usage:
 *   import { UsageBadge } from "@/components/UsageBadge";
 *   <UsageBadge />
 */

import React, { useEffect, useState } from "react";
import { useRateLimit } from "@/components/FingerprintProvider";

export function UsageBadge() {
  const { status, initializing } = useRateLimit();
  const [visible, setVisible] = useState(false);

  // Fade in after a short delay so it doesn't flash on first render
  useEffect(() => {
    if (!initializing) {
      const t = setTimeout(() => setVisible(true), 400);
      return () => clearTimeout(t);
    }
  }, [initializing]);

  if (!visible || !status) return null;

  // Color scheme based on how many are left
  const { remaining, limit } = status;
  const pct = limit === Infinity ? 1 : remaining / limit;

  let color = "#22c55e";      // green - plenty left
  let bg = "rgba(34,197,94,0.10)";
  let border = "rgba(34,197,94,0.25)";

  if (pct <= 0) {
    color = "#ef4444";        // red - exhausted
    bg = "rgba(239,68,68,0.10)";
    border = "rgba(239,68,68,0.25)";
  } else if (pct <= 0.4) {
    color = "#f97316";        // orange - running low
    bg = "rgba(249,115,22,0.10)";
    border = "rgba(249,115,22,0.25)";
  }

  const label =
    limit === Infinity
      ? "Unlimited ✦"
      : remaining === 0
      ? "No conversions left"
      : `${remaining} of ${limit} free left`;

  return (
    <div
      title="Free conversions remaining this hour"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "4px 12px",
        borderRadius: "999px",
        background: bg,
        border: `1px solid ${border}`,
        color: color,
        fontSize: "12px",
        fontWeight: 600,
        letterSpacing: "0.02em",
        whiteSpace: "nowrap",
        userSelect: "none",
        transition: "opacity 0.3s",
        opacity: visible ? 1 : 0,
        cursor: "default",
      }}
    >
      {/* Dot indicator */}
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: color,
          display: "inline-block",
          flexShrink: 0,
          // Pulse animation when running low
          animation: pct <= 0.4 ? "usagePulse 2s ease-in-out infinite" : "none",
        }}
      />
      {label}

      <style>{`
        @keyframes usagePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );
}

