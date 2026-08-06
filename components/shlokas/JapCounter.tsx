"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { RotateCcw } from "lucide-react";

/**
 * Repetition counter for japa. Tapping the ring advances the count; the ring
 * fills over one mala (`target`, usually 108) and resets to empty on
 * completion while the total keeps climbing — that's how a physical mala
 * behaves, and it's why `count` and `inMala` are tracked separately rather
 * than one being derived by `%`.
 *
 * Counts live in localStorage keyed by slug, not on the server: there is no
 * shlokas backend module, and a jap count is a private practice record, not
 * account data. A user on two devices keeps two counts — acceptable, and
 * cheaper than a table plus a sync endpoint nobody asked for.
 */

const STORAGE_PREFIX = "aroha:jap:";

/** Circumference of the r=54 progress ring, precomputed for strokeDasharray. */
const RING = 2 * Math.PI * 54;

export default function JapCounter({ slug, target }: { slug: string; target: number }) {
  const { t } = useTranslation();
  const [count, setCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  // Read after mount, never during render — localStorage doesn't exist during
  // SSR, and seeding useState from it directly would hydrate-mismatch.
  useEffect(() => {
    const saved = Number(window.localStorage.getItem(STORAGE_PREFIX + slug));
    setCount(Number.isFinite(saved) && saved > 0 ? saved : 0);
    setLoaded(true);
  }, [slug]);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(STORAGE_PREFIX + slug, String(count));
    } catch {
      // Storage full or blocked — the counter still works for this session.
    }
  }, [slug, count, loaded]);

  const malas = Math.floor(count / target);
  const inMala = count % target;

  function tap() {
    setCount((c) => c + 1);
    // Fires only where supported (Android Chrome / the Capacitor WebView);
    // iOS Safari has no Vibration API and simply won't have the method.
    navigator.vibrate?.((count + 1) % target === 0 ? [40, 30, 40] : 8);
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={tap}
        aria-label={t("shlokas.tapToCount")}
        className="relative w-40 h-40 rounded-full active:scale-95 transition-transform"
      >
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle cx="60" cy="60" r="54" fill="none" strokeWidth="6" className="stroke-gold/15" />
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            className="stroke-gold transition-[stroke-dashoffset] duration-200"
            strokeDasharray={RING}
            strokeDashoffset={RING * (1 - inMala / target)}
          />
        </svg>
        <span className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-display text-gold tabular-nums">{inMala}</span>
          <span className="text-[10px] text-muted mt-0.5">/ {target}</span>
        </span>
      </button>

      <p className="text-xs text-muted text-center">
        {t("shlokas.tapToCount")}
        {/* `n`, not i18next's magic `count` — sidesteps plural-suffix key
            resolution across seven languages with different plural rules. */}
        {malas > 0 && <> · {t("shlokas.malasDone", { n: malas })}</>}
      </p>

      {count > 0 && (
        <button
          type="button"
          onClick={() => setCount(0)}
          className="flex items-center gap-1.5 text-xs text-muted hover:text-gold transition-colors"
        >
          <RotateCcw size={12} />
          {t("shlokas.resetCount")}
        </button>
      )}
    </div>
  );
}
