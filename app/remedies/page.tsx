"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  api,
  type AnnualRotation,
  type LalKitabDebt,
  type RemedyItem,
  type RemedySimpleText,
} from "@/lib/api";
import { REMEDIES_FALLBACK } from "@/data/remedies-fallback";
import SectionTitle from "@/components/SectionTitle";
import ChapterCard from "@/components/reports/blocks/ChapterCard";
import FactCard from "@/components/reports/blocks/FactCard";
import { useAuth } from "@/providers/auth-provider";
import { buildKey, cacheGet, cacheSet } from "@/lib/cache";
import FeatureGuard from "@/components/FeatureGuard";

/** Remedies only change on chart regeneration — explicitly purged then (see lib/cache.ts's purgeUserCache and its call site in app/profile/page.tsx / app/onboarding/page.tsx). 7 days is a generous-but-bounded SWR TTL, not a correctness mechanism. */
const SWR_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface RemediesData {
  remedies: RemedyItem[];
  debts: LalKitabDebt[];
  annual: AnnualRotation | null;
  simple: RemedySimpleText | null;
  simpleStatus: "ready" | "generating" | "unavailable";
}

/** How often to re-check while the plain-language layer is still generating,
 * and how many times before giving up. The page is fully readable throughout —
 * this only fills in the explanations — so it backs off rather than retrying
 * forever on a profile whose generation keeps failing. */
const POLL_INTERVAL_MS = 4000;
const MAX_POLLS = 6;

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

/**
 * A labelled list — the "Do this" / "Also try" / debt sub-lists. Each row is
 * led by a symbol rather than a plain disc so the two kinds of instruction are
 * distinguishable at a glance while scrolling: actions to perform vs optional
 * extras vs the evidence behind a debt.
 */
function LabelledList({
  label,
  items,
  marker = "•",
}: {
  label: string;
  items: string[];
  marker?: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mt-2.5">
      <span className="text-[10px] uppercase tracking-wider text-gold/70">{label}</span>
      <ul className="mt-1.5 space-y-1.5">
        {items.map((line) => (
          <li key={line} className="flex gap-2">
            <span aria-hidden="true" className="shrink-0 text-gold/50">
              {marker}
            </span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The technical half of a card: the astrology behind the remedy, in Lal
 * Kitab's own terms. Kept visually quieter than the action above it, but
 * always present rather than hidden behind a tap — the whole point of the
 * page is that the reader gets both halves.
 */
function TechnicalNote({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="mt-3 border-t border-gold/10 pt-2.5">
      <span className="text-[10px] uppercase tracking-wider text-muted">
        {t("remediesPage.whyThis")}
      </span>
      <div className="mt-1 space-y-1 text-xs leading-relaxed text-muted">{children}</div>
    </div>
  );
}

function PlanetCard({ item, simple }: { item: RemedyItem; simple?: string }) {
  const { t } = useTranslation();

  // The Lal Kitab house genuinely differs from the ascendant-based natal
  // house (Lal Kitab fixes Aries as the 1st), so show both rather than
  // pretending one number covers it — see RemedyItem.lalKitabHouse.
  const showBothHouses =
    item.lalKitabHouse !== undefined && item.lalKitabHouse !== item.natalHouse;

  return (
    <FactCard
      eyebrow={`${getEmoji(item.icon)} ${item.planet}`}
      // Not remedies[0] — that sentence repeats verbatim as the first "Do this"
      // bullet immediately below, which read as a duplicate on every card.
      title={t("remediesPage.houseLabel", { house: item.natalHouse })}
    >
      {simple && <p className="leading-relaxed">{simple}</p>}

      <LabelledList label={t("remediesPage.doThis")} items={item.remedies ?? []} marker="✓" />
      <LabelledList label={t("remediesPage.alsoTry")} items={item.totke ?? []} marker="✦" />

      <TechnicalNote>
        <p>
          {t("remediesPage.natalHouse")}: {item.natalHouse}
          {showBothHouses && (
            <>
              {" · "}
              {t("remediesPage.lalKitabHouse")}: {item.lalKitabHouse}
            </>
          )}
          {item.pakkaGhar !== undefined && (
            <>
              {" · "}
              {t("remediesPage.pakkaGharLabel")}: {item.pakkaGhar}
              {item.isInPakkaGhar ? " ✓" : ""}
            </>
          )}
        </p>
        {showBothHouses && <p className="italic">{t("remediesPage.houseSystemNote")}</p>}
        {item.displacement && <p>{item.displacement}</p>}
        {item.blindReason && (
          <p>
            <span className="text-gold/70">
              {item.blindness === "blind"
                ? t("remediesPage.blind")
                : t("remediesPage.halfBlind")}
              {": "}
            </span>
            {item.blindReason}
          </p>
        )}
      </TechnicalNote>
    </FactCard>
  );
}

/** Neutral, reassuring line for a section with nothing flagged — never skip
 * the section outright, so the reader knows it was checked. */
function EmptyNote({ text }: { text: string }) {
  return <p className="text-[13px] leading-relaxed text-muted">{text}</p>;
}

/**
 * Lal Kitab's year chart. Every planet advances one house per year of age, so
 * a placement's remedy changes as it rotates — this section is what makes the
 * page worth reopening after a birthday rather than a one-time read.
 *
 * Only the two planets the rotation actually singles out are shown, not all
 * nine again: the nine natal cards are above, and repeating them rotated
 * would double the page for little gain.
 */
function ThisYearSection({ annual }: { annual: AnnualRotation }) {
  const { t } = useTranslation();
  const byPlanet = new Map(annual.planets.map((p) => [p.planet, p]));
  const kismat = annual.kismatKaGrah ? byPlanet.get(annual.kismatKaGrah) : undefined;
  const dhokhe = annual.dhokheKaGrah ? byPlanet.get(annual.dhokheKaGrah) : undefined;

  return (
    <ChapterCard
      heading={`📅 ${t("remediesPage.thisYearHeading")}`}
      dek={t("remediesPage.thisYearDek", { age: annual.age })}
      accent="sky"
    >
      <FactCard eyebrow={`🧭 ${t("remediesPage.munthaEyebrow")}`} title={t("remediesPage.munthaTitle", { house: annual.muntha })}>
        {t("remediesPage.munthaBody")}
      </FactCard>

      {kismat && (
        <FactCard eyebrow={`🌟 ${t("remediesPage.kismat")}`} title={kismat.planet}>
          <p>
            {t("remediesPage.movedTo", {
              from: kismat.natalHouse,
              to: kismat.annualHouse,
            })}
          </p>
          <p className="mt-1">{t("remediesPage.kismatBody")}</p>
        </FactCard>
      )}

      {dhokhe && (
        <FactCard eyebrow={`⚠️ ${t("remediesPage.dhokhe")}`} title={dhokhe.planet}>
          <p>
            {t("remediesPage.movedTo", {
              from: dhokhe.natalHouse,
              to: dhokhe.annualHouse,
            })}
          </p>
          <p className="mt-1">{t("remediesPage.dhokheBody")}</p>
          <LabelledList label={t("remediesPage.priorityRemedy")} items={dhokhe.remedies} marker="✓" />
        </FactCard>
      )}

      {!kismat && !dhokhe && <EmptyNote text={t("remediesPage.thisYearNone")} />}
    </ChapterCard>
  );
}

function RemediesContent() {
  const { t, i18n } = useTranslation();
  const { user, activeProfile } = useAuth();
  const [data, setData] = useState<RemediesData>({
    remedies: [],
    debts: [],
    annual: null,
    simple: null,
    simpleStatus: "unavailable",
  });
  const [loading, setLoading] = useState(true);

  const language = i18n.language || "en";

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    // Stale-while-revalidate (see lib/cache.ts): a cache hit renders
    // instantly (skips the skeleton) while a background refetch below still
    // runs and reconciles state + cache once it resolves.
    //
    // Language is part of the key because `simple` comes back translated —
    // without it, switching language would serve the previous language's
    // explanations from cache.
    const cacheKey = user
      ? buildKey("remedies", user.id, `${activeProfile?.id ?? "primary"}:${language}`)
      : null;
    const cached = cacheKey ? cacheGet<RemediesData>(cacheKey) : null;
    if (cached) {
      setData(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    async function fetchRemedies(attempt: number) {
      try {
        const res = await api.remedies(language);
        const next: RemediesData = {
          remedies: res.remedies,
          debts: res.debts ?? [],
          annual: res.annual ?? null,
          simple: res.simple ?? null,
          simpleStatus: res.simpleStatus ?? "unavailable",
        };
        if (cancelled) return;
        setData(next);
        // Only cache a settled result. Caching a 'generating' payload would
        // pin the explanation-less version for the whole 7-day TTL.
        if (cacheKey && next.simpleStatus !== "generating") {
          cacheSet(cacheKey, next, Date.now() + SWR_TTL_MS);
        }
        if (next.simpleStatus === "generating" && attempt < MAX_POLLS) {
          timer = setTimeout(() => fetchRemedies(attempt + 1), POLL_INTERVAL_MS);
        }
      } catch {
        // Endpoint unreachable (network failure) — fall back to a static
        // list so the page always renders content, unless we already have a
        // cached (stale-but-real) list to keep showing instead.
        if (!cancelled && !cached) {
          setData({
            remedies: REMEDIES_FALLBACK,
            debts: [],
            annual: null,
            simple: null,
            simpleStatus: "unavailable",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchRemedies(0);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [activeProfile?.id, user?.id, language]);

  // Per-planet entries carry a natal house; the general/fallback ones (no
  // chart behind them) do not, and render as the old flat list.
  const planets = data.remedies.filter((r) => r.natalHouse !== undefined);
  const general = data.remedies.filter((r) => r.natalHouse === undefined);
  const strengths = planets.filter((r) => r.isInPakkaGhar);
  const obstructed = planets.filter((r) => r.blindness);

  return (
    <main className="min-h-screen pb-tab-safe" style={{ background: "var(--background)" }}>
      <div className="px-5 pt-10">
        <SectionTitle title={t("remediesPage.title")} subtitle={t("remediesPage.subtitle")} />

        <div className="mt-2 space-y-4">
          {loading ? (
            [...Array(4)].map((_, i) => <SkeletonCard key={i} />)
          ) : data.remedies.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
              {t("remediesPage.loadError")}
            </p>
          ) : (
            <>
              {data.simple?.intro && (
                <p
                  className="px-1 text-[13px] leading-relaxed"
                  style={{ color: "var(--text-muted)" }}
                >
                  {data.simple.intro}
                </p>
              )}
              {data.simpleStatus === "generating" && (
                <p className="px-1 text-[11px] italic" style={{ color: "var(--text-muted)" }}>
                  {t("remediesPage.explanationsComing")}
                </p>
              )}

              {planets.length > 0 && (
                <>
                  <ChapterCard
                    heading={`⚖️ ${t("remediesPage.debtsHeading")}`}
                    dek={t("remediesPage.debtsDek")}
                    accent="red"
                  >
                    {data.debts.length === 0 ? (
                      <EmptyNote text={t("remediesPage.debtsNone")} />
                    ) : (
                      data.debts.map((debt) => (
                        <FactCard key={debt.type} eyebrow={`⚖️ ${t("remediesPage.debtEyebrow")}`} title={debt.type}>
                          {data.simple?.debts?.[debt.type] && (
                            <p className="leading-relaxed">{data.simple.debts[debt.type]}</p>
                          )}
                          <LabelledList
                            label={t("remediesPage.debtIndicators")}
                            items={debt.indicators}
                            marker="◆"
                          />
                          <LabelledList
                            label={t("remediesPage.debtRemedies")}
                            items={debt.remedies}
                            marker="✓"
                          />
                        </FactCard>
                      ))
                    )}
                  </ChapterCard>

                  <ChapterCard
                    heading={`🪐 ${t("remediesPage.planetsHeading")}`}
                    dek={t("remediesPage.planetsDek")}
                    accent="gold"
                  >
                    {planets.map((item) => (
                      <PlanetCard
                        key={item.planet}
                        item={item}
                        simple={data.simple?.planets?.[item.planet]}
                      />
                    ))}
                  </ChapterCard>

                  <ChapterCard
                    heading={`✨ ${t("remediesPage.strengthsHeading")}`}
                    dek={t("remediesPage.strengthsDek")}
                    accent="emerald"
                  >
                    {strengths.length === 0 ? (
                      <EmptyNote text={t("remediesPage.strengthsNone")} />
                    ) : (
                      strengths.map((item) => (
                        <FactCard
                          key={item.planet}
                          eyebrow={`${getEmoji(item.icon)} ${item.planet}`}
                          title={`⭐ ${t("remediesPage.pakkaGharLabel")} · ${item.pakkaGhar}`}
                        >
                          {item.displacement}
                        </FactCard>
                      ))
                    )}
                  </ChapterCard>

                  <ChapterCard
                    heading={`⚠️ ${t("remediesPage.attentionHeading")}`}
                    dek={t("remediesPage.attentionDek")}
                    accent="amber"
                  >
                    {obstructed.length === 0 ? (
                      <EmptyNote text={t("remediesPage.attentionNone")} />
                    ) : (
                      obstructed.map((item) => (
                        <FactCard
                          key={item.planet}
                          eyebrow={`${getEmoji(item.icon)} ${item.planet}`}
                          title={
                            item.blindness === "blind"
                              ? t("remediesPage.blind")
                              : t("remediesPage.halfBlind")
                          }
                        >
                          {item.blindReason}
                        </FactCard>
                      ))
                    )}
                  </ChapterCard>

                  {data.annual && <ThisYearSection annual={data.annual} />}
                </>
              )}

              {general.length > 0 && (
                <ChapterCard
                  heading={t("remediesPage.planetsHeading")}
                  dek={t("remediesPage.planetsDek")}
                  accent="gold"
                >
                  {general.map((item) => (
                    <FactCard
                      key={item.title}
                      eyebrow={`${getEmoji(item.icon)} ${item.planet}`}
                      title={item.title}
                    >
                      {item.remedy}
                    </FactCard>
                  ))}
                </ChapterCard>
              )}

              <ChapterCard heading={`🧭 ${t("remediesPage.howToHeading")}`} accent="violet">
                <p className="text-[13px] leading-relaxed text-foreground/80">
                  {t("remediesPage.howToBody1")}
                </p>
                <p className="text-[13px] leading-relaxed text-muted">
                  {t("remediesPage.howToBody2")}
                </p>
              </ChapterCard>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default function RemediesPage() {
  return (
    <FeatureGuard featureKey="nav.remedies">
      <RemediesContent />
    </FeatureGuard>
  );
}
