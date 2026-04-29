"use client";

import { SessionProvider } from "next-auth/react";
import React from "react";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      // Only re-check session every 5 minutes — not on every window focus or page event.
      // This prevents the flood of GET /api/auth/session requests seen in the terminal.
      refetchInterval={5 * 60}
      refetchOnWindowFocus={false}
    >
      {children}
    </SessionProvider>
  );
}
