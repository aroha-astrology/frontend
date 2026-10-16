"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ArrowLeft, CalendarHeart, ChevronRight, HeartHandshake, MessageCircle, Plus, RotateCcw } from "lucide-react";
import ParticleBackground from "@/components/ParticleBackground";
import IconButton from "@/components/ui/IconButton";
import Card from "@/components/ui/Card";
import NewFeatureGuard from "@/components/NewFeatureGuard";
import FactorList from "@/components/why/FactorList";
import PassLock from "@/components/pass/PassLock";
import PlanetIcon from "@/components/reports/PlanetIcon";
import ScoreRing from "@/components/bonds/ScoreRing";
import RelateGraph from "@/components/bonds/RelateGraph";
import PeriodsTimeline from "@/components/bonds/PeriodsTimeline";
import { CATEGORY_ICON, relationLabel } from "@/components/bonds/category";
import { ApiError } from "@/lib/api";
import { shortDate } from "@/lib/calendar-format";
import {
  bondsApi,
  BOND_CATEGORIES,
  CATEGORY_ART,
  categoryOf,
  PHASE_CLASS,
  type BondCategory,
  type BondDetail,
  type BondSummary,
  type PeriodTheme,
} from "@/lib/bonds-api";
import { isPassRequired } from "@/lib/pass-api";

/** "pass": Aroha Pass only, and this user has no Pass. */
type LoadError = "pass" | "notReady" | "error";
type Tab = "all" | BondCategory;

function planetName(t: (k: string) => string, planet: string | null): string {
  return planet ? t(`planetNames.${planet.toLowerCase()}`) : "—";
}

/** Grey blocks in the shape of what is loading. */
function Skeleton({ shape }: { shape: "list" | "detail" }) {
  const { t } = useTranslation();
  const blocks = shape === "list" ? ["h-16", "h-16", "h-16"] : ["h-44", "h-40", "h-72"];
  return (
    <div className="space-y-3 md:col-span-full" role="status" data-testid="bonds-skeleton">
      <span className="sr-only">{t("bonds.loading")}</span>
      {blocks.map((h, i) => (
        <div key={i} className={`${h} animate-pulse rounded-3xl border border-gold/10 bg-gold/5`} />
      ))}
    </div>
  );
}

/** One person's running period: the planet, and the house it is about. */
function PeriodRow({ who, theme, lord }: { who: string; theme: PeriodTheme | null | undefined; lord: string | null }) {
  const { t } = useTranslation();
  const planet = theme?.planet ?? lord;
  if (!planet) return null;
  return (
    <div className="flex items-center gap-2.5">
      <PlanetIcon planet={planet.toLowerCase()} size={28} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-foreground/90">
          {who} · {t("bonds.phase.period", { planet: planetName(t, planet) })}
        </p>
        {theme && <p className="text-xs text-muted">{t(`why.houses.${theme.house}`)}</p>}
      </div>
    </div>
  );
}

function BondView({ bond }: { bond: BondDetail }) {
  const { t, i18n } = useTranslation();
  const name = bond.name || t("bonds.unnamed");
  const extra = { name };
  const lang = i18n.language;

  if (!bond.ready || !bond.compatibility) {
    return (
      <Card className="p-4 border-gold/15 md:col-span-full">
        <p className="text-sm text-foreground/85">{t("bonds.needsBirthData", { name })}</p>
      </Card>
    );
  }

  const c = bond.compatibility;
  const phase = bond.phaseDetail;
  const [mine, theirs] = phase?.themes ?? [null, null];
  const mangal = bond.detail?.mangal;
  const mangalKey = !mangal ? null : mangal.status !== "oneSided" ? mangal.status : mangal.you ? "youOnly" : "themOnly";

  return (
    <div className="flex flex-col gap-4 md:col-span-full md:block md:columns-2 md:gap-6 md:[&>*]:mb-4 md:[&>*]:break-inside-avoid" data-testid="bond-detail">
      <Card className="p-4 border-gold/15 space-y-4">
        <div className="flex items-center gap-3">
          <ScoreRing pct={c.pct} size={88}>
            <span>
              <span className="block font-display text-xl leading-none text-foreground">{c.kind === "guna" ? c.score : `${c.pct}%`}</span>
              {c.kind === "guna" && <span className="block text-[10px] text-muted">/ {c.max}</span>}
            </span>
          </ScoreRing>
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gold">
              {t(c.kind === "guna" ? "bonds.compat.guna" : "bonds.compat.harmony")}
            </p>
            <p className="font-display text-lg leading-tight text-foreground">{t(`bonds.label.${c.label}`)}</p>
            <p className="text-xs text-muted">
              {c.kind === "guna" ? t("bonds.compat.outOf", { score: c.score, max: c.max }) : `${c.pct}%`}
            </p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={CATEGORY_ART[categoryOf(bond)]}
            alt=""
            aria-hidden
            className="h-14 w-14 shrink-0 rounded-2xl border border-gold/20 object-cover"
          />
        </div>
        <div className="space-y-1.5">
          {c.kootas.map((k) => (
            <div key={k.koota} className="flex items-center gap-2 text-xs">
              <span className="w-20 shrink-0 text-foreground/80">{t(`compatibilityPage.kootaLabel.${k.koota}`)}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-gold/10">
                <span className="block h-full rounded-full bg-gold/80" style={{ width: `${(k.score / k.max) * 100}%` }} />
              </span>
              <span className="w-10 shrink-0 text-right text-muted">
                {k.score}/{k.max}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {mangalKey && (
        <Card className="flex items-start gap-3 p-4 border-gold/10" data-testid="bond-mangal">
          <PlanetIcon planet="mars" size={28} />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-gold">{t("bonds.mangal.title")}</p>
            <p className="text-sm leading-snug text-foreground/90">{t(`bonds.mangal.${mangalKey}`, { name })}</p>
          </div>
        </Card>
      )}

      {phase && (
        <Card className="p-4 border-gold/15 space-y-3" data-testid="bond-phase">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-gold">{t("bonds.phase.title")}</p>
            <span className={`rounded-full border px-2 py-0.5 text-[11px] ${PHASE_CLASS[phase.tone]}`}>{t(`bonds.phase.${phase.tone}`)}</span>
          </div>
          <p className="text-sm text-foreground/90">{t(`bonds.phase.${phase.tone}Line`)}</p>
          <div className="space-y-2 rounded-2xl border border-gold/10 bg-gold/5 p-3">
            <PeriodRow who={t("bonds.phase.you")} theme={mine} lord={phase.lords[0]} />
            <PeriodRow who={name} theme={theirs} lord={phase.lords[1]} />
            {mine && theirs && (
              <p className="pt-1 text-xs leading-snug text-foreground/80">
                {t(mine.house === theirs.house ? "bonds.phase.sameTheme" : "bonds.phase.differentTheme")}
              </p>
            )}
          </div>
          {phase.why.length > 0 && <FactorList factors={phase.why} extra={extra} />}
        </Card>
      )}

      {bond.detail && (
        <>
          {bond.detail.relate && bond.detail.relate.length > 0 ? (
            <RelateGraph compatibility={c} meters={bond.detail.relate} />
          ) : (
            <Card className="p-4 border-gold/10 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-gold">{t("bonds.comm.title")}</p>
              <FactorList factors={bond.detail.communication} extra={extra} />
            </Card>
          )}

          <PeriodsTimeline
            windows={bond.detail.upcoming}
            shared={bond.detail.shared ?? []}
            horizon={bond.detail.horizon}
            name={name}
          />

          {bond.detail.dates.length > 0 && (
            <Card className="p-4 border-gold/10 space-y-2">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gold">
                <CalendarHeart size={14} />
                {t("bonds.dates.title")}
              </p>
              {bond.detail.dates.map((d) => (
                <div key={`${d.date}-${d.kind}`} className="flex items-start justify-between gap-3 text-sm">
                  <span className="min-w-0 text-foreground/90">{t(`bonds.dates.${d.kind}`, { name })}</span>
                  <span className="shrink-0 text-xs text-muted">{shortDate(d.date, lang)}</span>
                </div>
              ))}
            </Card>
          )}
        </>
      )}

      <div className="space-y-2">
        <Link
          href={`/ai-chat?q=${encodeURIComponent(t("bonds.askQuestion", { name }))}&profile=${bond.profileId}`}
          className="flex h-11 items-center justify-center gap-1.5 rounded-full border border-gold/30 text-sm font-medium text-gold"
        >
          <MessageCircle size={15} />
          {t("bonds.ask", { name })}
        </Link>
        <p className="pb-2 text-center text-[10px] text-muted">{t("bonds.guidance")}</p>
      </div>
    </div>
  );
}

function BondsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [list, setList] = useState<BondSummary[] | null>(null);
  const [error, setError] = useState<LoadError | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [bond, setBond] = useState<BondDetail | null>(null);
  const [tab, setTab] = useState<Tab>("all");

  const toError = (err: unknown): LoadError =>
    isPassRequired(err)
      ? "pass"
      : err instanceof ApiError && err.message === "CHART_NOT_READY"
        ? "notReady"
        : "error";

  const loadList = useCallback(() => {
    setError(null);
    bondsApi
      .list()
      .then((res) => setList(res.bonds))
      .catch((err: unknown) => setError(toError(err)));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setOpenId(params.get("id"));
    const wanted = params.get("tab");
    if (wanted && (BOND_CATEGORIES as readonly string[]).includes(wanted)) setTab(wanted as BondCategory);
    loadList();
  }, [loadList]);

  const loadBond = useCallback((id: string) => {
    setBond(null);
    bondsApi
      .get(id)
      .then(setBond)
      .catch((err: unknown) => setError(toError(err)));
  }, []);

  useEffect(() => {
    if (openId) loadBond(openId);
  }, [openId, loadBond]);

  /** Keeps the open person and the chosen tab in the address, so back and reload land in the same place. */
  function show(id: string | null, nextTab: Tab) {
    const params = new URLSearchParams();
    if (id) params.set("id", id);
    if (nextTab !== "all") params.set("tab", nextTab);
    const query = params.toString();
    window.history.replaceState({}, "", query ? `?${query}` : window.location.pathname);
    setOpenId(id);
    setTab(nextTab);
    if (!id) setBond(null);
  }

  function retry() {
    loadList();
    if (openId) loadBond(openId);
  }

  const current = openId ? list?.find((b) => b.profileId === openId) : null;
  const shown = current ?? bond;
  const title = openId && shown?.name ? shown.name : t("bonds.title");

  // A tab for each group that has people; no tabs at all while everyone is in one group.
  const groups = BOND_CATEGORIES.filter((c) => c !== "other" && list?.some((b) => categoryOf(b) === c));
  const tabs: Tab[] = groups.length > 1 || (groups.length === 1 && list?.some((b) => categoryOf(b) === "other")) ? ["all", ...groups] : [];
  const activeTab: Tab = tabs.includes(tab) ? tab : "all";
  const visible = (list ?? []).filter((b) => activeTab === "all" || categoryOf(b) === activeTab);
  const count = (c: Tab) => (c === "all" ? (list?.length ?? 0) : (list ?? []).filter((b) => categoryOf(b) === c).length);

  return (
    <main className="cosmic-bg min-h-screen pb-tab-safe relative overflow-hidden text-foreground">
      <ParticleBackground />
      <div className="relative z-10 page-container pt-8 space-y-4 page-cols">
        <div className="flex items-center gap-3">
          <IconButton onClick={() => (openId ? show(null, tab) : router.back())} aria-label={t("common.back")}>
            <ArrowLeft size={18} />
          </IconButton>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-display flex items-center gap-2 truncate">
              <HeartHandshake size={18} className="text-gold shrink-0" />
              <span className="truncate">{title}</span>
            </h1>
            <p className="text-[11px] text-muted">{openId && shown?.relationship ? relationLabel(t, shown) : t("bonds.subtitle")}</p>
          </div>
        </div>

        {error === "pass" && <PassLock feature={t("bonds.title")} need="bonds" className="md:col-span-full" />}
        {error && error !== "pass" && (
          <Card className="space-y-3 p-5 text-center border-gold/15 md:col-span-full" data-testid="bonds-error">
            <p className="text-sm text-foreground/85">{t(`bonds.${error}`)}</p>
            <button
              type="button"
              onClick={retry}
              className="mx-auto flex h-10 items-center gap-1.5 rounded-full border border-gold/30 px-5 text-sm font-medium text-gold"
            >
              <RotateCcw size={14} />
              {t("bonds.retry")}
            </button>
          </Card>
        )}
        {!error && !list && <Skeleton shape={openId ? "detail" : "list"} />}

        {!error && openId && list && (bond ? <BondView bond={bond} /> : <Skeleton shape="detail" />)}

        {!error && !openId && list && (
          <>
            {list.length === 0 && (
              <Card className="space-y-3 p-6 text-center border-gold/15 md:col-span-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={CATEGORY_ART.social} alt="" aria-hidden className="mx-auto h-24 w-36 rounded-2xl border border-gold/20 object-cover" />
                <p className="text-sm text-foreground/85">{t("bonds.empty")}</p>
              </Card>
            )}

            {tabs.length > 0 && (
              <div
                role="tablist"
                aria-label={t("bonds.title")}
                className="scrollbar-hide -mx-5 flex gap-2 overflow-x-auto px-5 md:col-span-full md:mx-0 md:px-0"
              >
                {tabs.map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === c}
                    onClick={() => show(null, c)}
                    data-testid={`bonds-tab-${c}`}
                    className={`flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors ${
                      activeTab === c ? "border-gold bg-gold text-black" : "border-gold/25 text-foreground/85"
                    }`}
                  >
                    {t(`bonds.tabs.${c}`)}
                    <span className={`text-[11px] ${activeTab === c ? "text-black/70" : "text-muted"}`}>{count(c)}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-2 page-grid md:col-span-full">
              {visible.map((b) => {
                const Icon = CATEGORY_ICON[categoryOf(b)];
                return (
                  <button
                    key={b.profileId}
                    type="button"
                    onClick={() => show(b.profileId, tab)}
                    data-testid="bond-row"
                    className="flex w-full items-center gap-3 rounded-2xl border border-gold/10 bg-surface/50 px-3.5 py-3 text-left transition-colors hover:border-gold/30"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold/10 text-gold">
                      <Icon size={17} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">{b.name || t("bonds.unnamed")}</span>
                      <span className="block truncate text-[11px] text-muted">{relationLabel(t, b)}</span>
                    </span>
                    {(b.compatibility || b.phase) && (
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        {b.compatibility && <span className="text-sm font-semibold leading-none text-gold">{b.compatibility.pct}%</span>}
                        {b.phase && (
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] ${PHASE_CLASS[b.phase]}`}>
                            {t(`bonds.phase.${b.phase}`)}
                          </span>
                        )}
                      </span>
                    )}
                    <ChevronRight size={15} className="shrink-0 text-muted" />
                  </button>
                );
              })}
            </div>
            <Link
              href="/onboarding?mode=new-profile"
              className="flex h-11 w-full items-center justify-center gap-1.5 rounded-full border border-gold/30 text-sm font-medium text-gold md:col-span-full md:mx-auto md:max-w-sm"
            >
              <Plus size={16} />
              {t("bonds.add")}
            </Link>
          </>
        )}
      </div>
    </main>
  );
}

export default function BondsRoute() {
  return (
    <NewFeatureGuard featureKey="nav.bonds">
      <BondsPage />
    </NewFeatureGuard>
  );
}
