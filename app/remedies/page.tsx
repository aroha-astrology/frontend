"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, type RemedyItem } from "@/lib/api";
import { REMEDIES_FALLBACK } from "@/data/remedies-fallback";
import SectionTitle from "@/components/SectionTitle";
import { useAuth } from "@/providers/auth-provider";
import { buildKey, cacheGet, cacheSet } from "@/lib/cache";

/** Remedies only change on chart regeneration — explicitly purged then (see lib/cache.ts's purgeUserCache and its call site in app/profile/page.tsx / app/onboarding/page.tsx). 7 days is a generous-but-bounded SWR TTL, not a correctness mechanism. */
const SWR_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Map icon names from the backend to emoji for display. */
const iconMap: Record<string, string> = {
  briefcase: "💼",
  heart: "💍",
  leaf: "🌿",
  coins: "💰",
  brain: "🧘",
  home: "🏠",
  sun: "☀️",
  moon: "🌙",
  flame: "🔥",
  "book-open": "📖",
  sparkles: "✨",
  diamond: "💎",
  shield: "🛡️",
  cloud: "☁️",
  eye: "👁️",
};

function getEmoji(icon: string): string {
  return iconMap[icon] ?? "🪔";
}

function SkeletonCard() {
  return (
    <div
      className="p-5 rounded-3xl border animate-pulse"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-full bg-gold/10" />
        <div className="h-4 w-32 rounded bg-gold/10" />
      </div>
      <div className="space-y-1.5">
        <div className="h-3 w-full rounded bg-gold/5" />
        <div className="h-3 w-4/5 rounded bg-gold/5" />
      </div>
    </div>
  );
}

export default function RemediesPage() {
  const { t } = useTranslation();
  const { user, activeProfile } = useAuth();
  const [remedies, setRemedies] = useState<RemedyItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // Stale-while-revalidate (see lib/cache.ts): a cache hit renders
    // instantly (skips the skeleton) while a background refetch below still
    // runs and reconciles state + cache once it resolves.
    const cacheKey = user ? buildKey("remedies", user.id, activeProfile?.id ?? "primary") : null;
    const cached = cacheKey ? cacheGet<RemedyItem[]>(cacheKey) : null;
    if (cached) {
      setRemedies(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    async function fetchRemedies() {
      try {
        const data = await api.remedies();
        if (!cancelled) {
          setRemedies(data.remedies);
          if (cacheKey) cacheSet(cacheKey, data.remedies, Date.now() + SWR_TTL_MS);
        }
      } catch {
        // Endpoint unreachable (network failure) — fall back to a static
        // list so the page always renders content, unless we already have a
        // cached (stale-but-real) list to keep showing instead.
        if (!cancelled && !cached) setRemedies(REMEDIES_FALLBACK);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchRemedies();
    return () => {
      cancelled = true;
    };
  }, [activeProfile?.id, user?.id]);

  return (
    <main className="min-h-screen pb-tab-safe" style={{ background: "var(--background)" }}>
      <div className="px-5 pt-10">
        <SectionTitle
          title={t("remediesPage.title")}
          subtitle={t("remediesPage.subtitle")}
        />

        <div className="mt-2 space-y-4">
          {loading ? (
            <>
              {[...Array(4)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </>
          ) : remedies.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
              {t("remediesPage.loadError")}
            </p>
          ) : (
            remedies.map((item) => (
              <div
                key={item.title}
                className="p-5 rounded-3xl border transition-colors"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{getEmoji(item.icon)}</span>
                  <h3 className="text-base font-semibold text-gold">{item.title}</h3>
                </div>
                {item.planet !== "General" && (
                  <p className="text-[10px] text-gold/60 mb-1 tracking-wide uppercase">
                    {item.planet}
                  </p>
                )}
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  {item.remedy}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
