"use client";

/**
 * components/RateLimitModal.tsx
 *
 * Shown when a user has exhausted their free conversions.
 * Displays a countdown to when their limit resets.
 *
 * Usage:
 *   const [limitResult, setLimitResult] = useState<LimitStatus | null>(null);
 *
 *   // Before processing PDF:
 *   const result = await enforceLimit();
 *   if (!result.allowed) { setLimitResult(result); return; }
 *
 *   // In JSX:
 *   <RateLimitModal
 *     open={!!limitResult && !limitResult.allowed}
 *     resetAt={limitResult?.resetAt ?? 0}
 *     onClose={() => setLimitResult(null)}
 *   />
 */

import React, { useEffect, useState } from "react";

interface RateLimitModalProps {
  open: boolean;
  resetAt: number; // Unix ms
  onClose: () => void;
}

export function RateLimitModal({ open, resetAt, onClose }: RateLimitModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(0);

  // Live countdown
  useEffect(() => {
    if (!open) return;

    const update = () => {
      setSecondsLeft(Math.max(0, Math.ceil((resetAt - Date.now()) / 1000)));
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [open, resetAt]);

  if (!open) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  // Progress ring (animates as time passes)
  const totalSeconds = 60 * 60; // 1 hour window
  const progress = secondsLeft / totalSeconds; // 0..1 remaining
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(8px)",
          zIndex: 9998,
          animation: "fadeIn 0.2s ease",
        }}
      />

      {/* Modal card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rl-title"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 9999,
          width: "min(460px, 90vw)",
          background: "linear-gradient(145deg, #0f0f13 0%, #1a1a24 100%)",
          borderRadius: "24px",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
          padding: "40px 36px",
          textAlign: "center",
          animation: "slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
          fontFamily: "var(--font-inter), Inter, system-ui, sans-serif",
        }}
      >
        {/* Orange warning badge */}
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          background: "rgba(251, 146, 60, 0.12)",
          border: "1px solid rgba(251, 146, 60, 0.3)",
          padding: "6px 14px",
          borderRadius: "999px",
          marginBottom: "24px",
        }}>
          <span style={{ fontSize: "14px" }}>⚡</span>
          <span style={{ color: "#fb923c", fontWeight: 600, fontSize: "12px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Usage Limit Reached
          </span>
        </div>

        {/* Countdown ring */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px" }}>
          <div style={{ position: "relative", width: 100, height: 100 }}>
            <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
              {/* Track */}
              <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
              {/* Progress */}
              <circle
                cx="50" cy="50" r={radius}
                fill="none"
                stroke="url(#rlGrad)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                style={{ transition: "stroke-dashoffset 1s linear" }}
              />
              <defs>
                <linearGradient id="rlGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f97316" />
                  <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>
              </defs>
            </svg>
            {/* Timer text */}
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ color: "#ffffff", fontWeight: 700, fontSize: "18px", letterSpacing: "-0.5px", fontVariantNumeric: "tabular-nums" }}>
                {formatted}
              </span>
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "10px", marginTop: "2px" }}>remaining</span>
            </div>
          </div>
        </div>

        {/* Title */}
        <h2 id="rl-title" style={{
          color: "#ffffff",
          fontSize: "22px",
          fontWeight: 700,
          margin: "0 0 10px",
          letterSpacing: "-0.5px",
        }}>
          You&apos;ve used your free conversions
        </h2>

        {/* Description */}
        <p style={{
          color: "rgba(255,255,255,0.5)",
          fontSize: "14px",
          lineHeight: 1.6,
          marginBottom: "28px",
        }}>
          Our free tier includes <strong style={{ color: "rgba(255,255,255,0.75)" }}>3 conversions per hour</strong> to keep the service fast for everyone.
          Your limit resets in{" "}
          <strong style={{ color: "#fb923c" }}>{minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`}</strong>.
        </p>

        {/* Divider */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.06)", marginBottom: "24px" }} />

        {/* CTA buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {/* Primary: Sign up (placeholder — wire to your auth later) */}
          <button
            id="rl-signup-btn"
            onClick={() => alert("Auth system coming soon!")}
            style={{
              background: "linear-gradient(135deg, #f97316 0%, #ef4444 100%)",
              color: "#fff",
              border: "none",
              borderRadius: "12px",
              padding: "14px 24px",
              fontSize: "15px",
              fontWeight: 700,
              cursor: "pointer",
              letterSpacing: "-0.2px",
              transition: "opacity 0.15s, transform 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "translateY(0)"; }}
          >
            🎓 Get unlimited free access with .edu email
          </button>

          {/* Secondary: Wait */}
          <button
            id="rl-wait-btn"
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.6)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "12px",
              padding: "13px 24px",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "background 0.15s, color 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.85)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
          >
            I&apos;ll wait {formatted}
          </button>
        </div>

        {/* Footer note */}
        <p style={{ color: "rgba(255,255,255,0.25)", fontSize: "12px", marginTop: "20px", lineHeight: 1.5 }}>
          Using a university or school email? You get <em>unlimited free access</em> — forever.
        </p>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translate(-50%, calc(-50% + 20px)); }
          to { opacity: 1; transform: translate(-50%, -50%); }
        }
      `}</style>
    </>
  );
}
