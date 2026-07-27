"use client";

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import posthog from "posthog-js";

/**
 * There was previously no error boundary anywhere in the app, so any
 * uncaught render exception (bad API response shape, a null a component
 * didn't guard against, etc.) unmounted the entire page — against this
 * app's near-black theme background that reads as a dead black screen with
 * no way to recover short of force-quitting. This catches it and offers a
 * retry instead. Sits inside the root layout, so providers (i18n, auth,
 * posthog) are still mounted here — see app/global-error.tsx for the
 * layout-level equivalent, which can't assume that.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();

  useEffect(() => {
    console.error(error);
    if (posthog.__loaded) {
      posthog.capture("app_error_boundary", { message: error.message, digest: error.digest });
    }
  }, [error]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background text-foreground px-8 text-center">
      <h1 className="text-lg font-display text-gold">{t("common.somethingWentWrong")}</h1>
      <button
        onClick={reset}
        className="px-5 py-2 rounded-full border border-gold/40 text-gold text-sm"
      >
        {t("common.tryAgain")}
      </button>
    </main>
  );
}
