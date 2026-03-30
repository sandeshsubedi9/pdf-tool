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
          background: "rgba(10, 10, 15, 0.4)",
          backdropFilter: "blur(12px)",
          zIndex: 9998,
          animation: "fadeIn 0.3s ease",
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
          background: "#ffffff",
          borderRadius: "28px",
          border: "1px solid rgba(0,0,0,0.06)",
          boxShadow: "0 40px 100px -20px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.02)",
          padding: "48px 40px",
          textAlign: "center",
          animation: "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
          fontFamily: "var(--font-inter), Inter, system-ui, sans-serif",
        }}
      >
        {/* Orange warning badge */}
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          background: "rgba(249, 115, 22, 0.08)",
          border: "1px solid rgba(249, 115, 22, 0.15)",
          padding: "8px 16px",
          borderRadius: "999px",
          marginBottom: "32px",
        }}>
          <span style={{ fontSize: "14px" }}>⚡</span>
          <span style={{ color: "#ea580c", fontWeight: 700, fontSize: "12px", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Usage Limit Reached
          </span>
        </div>

        {/* Countdown ring */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "32px" }}>
          <div style={{ position: "relative", width: 110, height: 110 }}>
            <svg width="110" height="110" viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
              {/* Track */}
              <circle cx="50" cy="50" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="7" />
              {/* Progress */}
              <circle
                cx="50" cy="50" r={radius}
                fill="none"
                stroke="url(#rlGrad)"
                strokeWidth="7"
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
              <span style={{ color: "#0f172a", fontWeight: 800, fontSize: "20px", letterSpacing: "-1px", fontVariantNumeric: "tabular-nums" }}>
                {formatted}
              </span>
              <span style={{ color: "#64748b", fontSize: "10px", fontWeight: 600, marginTop: "2px", textTransform: "uppercase", letterSpacing: "0.02em" }}>left</span>
            </div>
          </div>
        </div>

        {/* Title */}
        <h2 id="rl-title" style={{
          color: "#0f172a",
          fontSize: "26px",
          fontWeight: 800,
          margin: "0 0 12px",
          letterSpacing: "-0.8px",
          lineHeight: 1.2,
        }}>
          Free usage exhausted
        </h2>

        {/* Description */}
        <p style={{
          color: "#475569",
          fontSize: "15px",
          lineHeight: 1.6,
          marginBottom: "36px",
          padding: "0 10px",
        }}>
          To ensure high speed for everyone, we limit free tier to <strong style={{ color: "#0f172a" }}>3 files per hour</strong>.
          Resets in <strong style={{ color: "#f97316" }}>{minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`}</strong>.
        </p>

        {/* Divider */}
        <div style={{ height: 1, background: "#f1f5f9", marginBottom: "32px" }} />

        {/* CTA buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Primary: Sign up */}
          <button
            id="rl-signup-btn"
            onClick={() => window.location.href = "/signup"}
            style={{
              background: "#0f172a",
              color: "#fff",
              border: "none",
              borderRadius: "16px",
              padding: "16px 28px",
              fontSize: "15px",
              fontWeight: 700,
              cursor: "pointer",
              letterSpacing: "-0.2px",
              transition: "transform 0.2s, background 0.2s",
              boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.2), 0 8px 10px -6px rgba(15, 23, 42, 0.2)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.background = "#1e293b"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.background = "#0f172a"; }}
          >
            🎓 Get unlimited access with .edu email
          </button>

          {/* Secondary: Wait */}
          <button
            id="rl-wait-btn"
            onClick={onClose}
            style={{
              background: "#f8fafc",
              color: "#64748b",
              border: "1px solid #e2e8f0",
              borderRadius: "16px",
              padding: "15px 28px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "background 0.2s, color 0.2s, border-color 0.2s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.color = "#0f172a"; e.currentTarget.style.borderColor = "#cbd5e1"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.color = "#64748b"; e.currentTarget.style.borderColor = "#e2e8f0"; }}
          >
            I&apos;ll wait {formatted}
          </button>
        </div>

        {/* Footer note */}
        <p style={{ color: "#94a3b8", fontSize: "12px", marginTop: "28px", lineHeight: 1.5, fontWeight: 500 }}>
          Using a university or school email? You get <span style={{ color: "#64748b", fontWeight: 700 }}>unlimited free access</span> forever.
        </p>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translate(-50%, calc(-50% + 40px)); }
          to { opacity: 1; transform: translate(-50%, -50%); }
        }
      `}</style>
    </>
  );
}
