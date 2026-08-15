"use client";

import { useEffect } from "react";
import "./globals.css";

/**
 * Catches errors thrown above the page segment — inside a provider or
 * component in app/layout.tsx itself (Auth/PostHog/Language/etc providers,
 * AuthGuard, TopBar). app/error.tsx can't see those since they sit outside
 * the segment it wraps. Next.js requires this to render its own <html>/
 * <body>, replacing the crashed root layout entirely, so — unlike
 * app/error.tsx — it cannot assume any provider (including i18n) survived;
 * this is the one screen in the app that's deliberately not translated.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          background: "#07060f",
          color: "#E1E2EB",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.5rem",
          fontFamily: "sans-serif",
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
          paddingLeft: "2rem",
          paddingRight: "2rem",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "1.125rem", color: "#dfb564" }}>Something went wrong</h1>
        <button
          onClick={reset}
          style={{
            padding: "0.5rem 1.25rem",
            borderRadius: "9999px",
            border: "1px solid rgba(223,181,100,0.4)",
            color: "#dfb564",
            background: "transparent",
            fontSize: "0.875rem",
          }}
        >
          Try Again
        </button>
      </body>
    </html>
  );
}
