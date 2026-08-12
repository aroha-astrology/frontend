"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, type AnnualRotation, type LalKitabDebt, type RemedyItem } from "@/lib/api";
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
}

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

/** A labelled bullet list — the "Do this" / "Also try" / debt sub-lists. */
function LabelledList({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-2">
      <span className="text-[10px] uppercase tracking-wider text-gold/70">{label}</span>
      <ul className="mt-1 list-disc space-y-1 pl-4 marker:text-gold/40">
        {items.map((line) => (
          <li key={line}>{line}</li>
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

function PlanetCard({ item }: { item: RemedyItem }) {
  const { t } = useTranslation();

  // The Lal Kitab house genuinely differs from the ascendant-based natal
  // house (Lal Kitab fixes Aries as the 1st), so show both rather than
  // pretending one number covers it — see RemedyItem.lalKitabHouse.
  const showBothHouses =
    item.lalKitabHouse !== undefined && item.lalKitabHouse !== item.natalHouse;

  return (
    <FactCard
      eyebrow={`${getEmoji(item.icon)} ${item.planet} · ${t("remediesPage.natalHouse")} ${item.natalHouse}`}
      title={item.remedies?.[0] ?? item.remedy}
    >
      <LabelledList label={t("remediesPage.doThis")} items={item.remedies ?? []} />
      <LabelledList label={t("remediesPage.alsoTry")} items={item.totke ?? []} />

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
              Pakka Ghar: {item.pakkaGhar}
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
      heading={t("remediesPage.thisYearHeading")}
      dek={t("remediesPage.thisYearDek", { age: annual.age })}
      accent="sky"
    >
      <FactCard eyebrow="MUNTHA" title={t("remediesPage.munthaTitle", { house: annual.muntha })}>
        {t("remediesPage.munthaBody")}
      </FactCard>

      {kismat && (
        <FactCard eyebrow={t("remediesPage.kismat")} title={kismat.planet}>
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
        <FactCard eyebrow={t("remediesPage.dhokhe")} title={dhokhe.planet}>
          <p>
            {t("remediesPage.movedTo", {
              from: dhokhe.natalHouse,
              to: dhokhe.annualHouse,
            })}
          </p>
          <p className="mt-1">{t("remediesPage.dhokheBody")}</p>
          <LabelledList label={t("remediesPage.priorityRemedy")} items={dhokhe.remedies} />
        </FactCard>
      )}

      {!kismat && !dhokhe && <EmptyNote text={t("remediesPage.thisYearNone")} />}
    </ChapterCard>
  );
}

function RemediesContent() {
  const { t } = useTranslation();
  const { user, activeProfile } = useAuth();
  const [data, setData] = useState<RemediesData>({ remedies: [], debts: [], annual: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // Stale-while-revalidate (see lib/cache.ts): a cache hit renders
    // instantly (skips the skeleton) while a background refetch below still
    // runs and reconciles state + cache once it resolves.
    const cacheKey = user ? buildKey("remedies", user.id, activeProfile?.id ?? "primary") : null;
    const cached = cacheKey ? cacheGet<RemediesData>(cacheKey) : null;
    if (cached) {
      setData(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    async function fetchRemedies() {
      try {
        const res = await api.remedies();
        const next = {
          remedies: res.remedies,
          debts: res.debts ?? [],
          annual: res.annual ?? null,
        };
        if (!cancelled) {
          setData(next);
          if (cacheKey) cacheSet(cacheKey, next, Date.now() + SWR_TTL_MS);
        }
      } catch {
        // Endpoint unreachable (network failure) — fall back to a static
        // list so the page always renders content, unless we already have a
        // cached (stale-but-real) list to keep showing instead.
        if (!cancelled && !cached)
          setData({ remedies: REMEDIES_FALLBACK, debts: [], annual: null });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchRemedies();
    return () => {
      cancelled = true;
    };
  }, [activeProfile?.id, user?.id]);

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
              {planets.length > 0 && (
                <>
                  <ChapterCard
                    heading={t("remediesPage.debtsHeading")}
                    dek={t("remediesPage.debtsDek")}
                    accent="red"
                  >
                    {data.debts.length === 0 ? (
                      <EmptyNote text={t("remediesPage.debtsNone")} />
                    ) : (
                      data.debts.map((debt) => (
                        <FactCard key={debt.type} eyebrow="RIN" title={debt.type}>
                          <LabelledList
                            label={t("remediesPage.debtIndicators")}
                            items={debt.indicators}
                          />
                          <LabelledList
                            label={t("remediesPage.debtRemedies")}
                            items={debt.remedies}
                          />
                        </FactCard>
                      ))
                    )}
                  </ChapterCard>

                  <ChapterCard
                    heading={t("remediesPage.planetsHeading")}
                    dek={t("remediesPage.planetsDek")}
                    accent="gold"
                  >
                    {planets.map((item) => (
                      <PlanetCard key={item.planet} item={item} />
                    ))}
                  </ChapterCard>

                  <ChapterCard
                    heading={t("remediesPage.strengthsHeading")}
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
                          title={`Pakka Ghar · ${item.pakkaGhar}`}
                        >
                          {item.displacement}
                        </FactCard>
                      ))
                    )}
                  </ChapterCard>

                  <ChapterCard
                    heading={t("remediesPage.attentionHeading")}
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

              <ChapterCard heading={t("remediesPage.howToHeading")} accent="violet">
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
