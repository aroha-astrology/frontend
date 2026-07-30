"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import BrandLogo from "@/components/ui/BrandLogo";

const SLOW_THRESHOLD_MS = 8000;

/**
 * Shown while AuthGuard is waiting on Firebase's initial auth-state callback.
 * That window previously rendered nothing, which — against this app's
 * near-black theme background — is indistinguishable from a frozen app on
 * any cold start where auth resolution takes more than an instant (slow
 * network, WKWebView spinning up fresh each launch). This gives it a floor
 * (branded loader) and, past a timeout, a manual reload path instead of an
 * indefinite silent wait if resolution stalls entirely.
 */
export default function AuthLoadingScreen() {
  const { t } = useTranslation();
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_THRESHOLD_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 bg-background text-foreground px-8">
      <BrandLogo size={96} priority />
      {slow ? (
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-muted">{t("common.connectionSlow")}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2 rounded-full border border-gold/40 text-gold text-sm"
          >
            {t("common.tryAgain")}
          </button>
        </div>
      ) : (
        <div className="flex gap-1.5" aria-hidden>
          <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
          <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse [animation-delay:300ms]" />
        </div>
      )}
    </main>
  );
}
