"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ArrowLeft, CalendarHeart, HeartHandshake, MessageCircle, Plus } from "lucide-react";
import ParticleBackground from "@/components/ParticleBackground";
import IconButton from "@/components/ui/IconButton";
import Card from "@/components/ui/Card";
import NewFeatureGuard from "@/components/NewFeatureGuard";
import FactorList from "@/components/why/FactorList";
import PassLock from "@/components/pass/PassLock";
import { RELATIONSHIP_KEYS } from "@/components/ProfileSwitcher";
import { ApiError } from "@/lib/api";
import { shortDate } from "@/lib/calendar-format";
import { bondsApi, PHASE_CLASS, type BondDetail, type BondSummary } from "@/lib/bonds-api";
import { isPassRequired } from "@/lib/pass-api";

/** "pass": Aroha Pass only, and this user has no Pass. */
type LoadError = "pass" | "notReady" | "error";

function planetName(t: (k: string) => string, planet: string | null): string {
  return planet ? t(`planetNames.${planet.toLowerCase()}`) : "—";
}

function BondView({ bond }: { bond: BondDetail }) {
  const { t, i18n } = useTranslation();
  const name = bond.name || t("bonds.unnamed");
  const extra = { name };
  const lang = i18n.language;

  if (!bond.ready || !bond.compatibility) {
    return (
      <Card className="p-4 border-gold/15">
        <p className="text-sm text-foreground/85">{t("bonds.needsBirthData", { name })}</p>
      </Card>
    );
  }

  const c = bond.compatibility;
  return (
    <div className="space-y-4" data-testid="bond-detail">
      <Card className="p-4 border-gold/15 space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-gold">
            {t(c.kind === "guna" ? "bonds.compat.guna" : "bonds.compat.harmony")}
          </p>
          <p className="text-xs text-muted">{t(`bonds.label.${c.label}`)}</p>
        </div>
        <p className="text-3xl font-display text-foreground">
          {c.kind === "guna" ? t("bonds.compat.outOf", { score: c.score, max: c.max }) : `${c.pct}%`}
        </p>
        <div className="space-y-1.5">
          {c.kootas.map((k) => (
            <div key={k.koota} className="flex items-center gap-2 text-xs">
              <span className="w-20 shrink-0 text-foreground/80">{t(`compatibilityPage.kootaLabel.${k.koota}`)}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                <span className="block h-full rounded-full bg-gold/80" style={{ width: `${(k.score / k.max) * 100}%` }} />
              </span>
              <span className="w-10 shrink-0 text-right text-muted">
                {k.score}/{k.max}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {bond.phaseDetail && (
        <Card className="p-4 border-gold/15 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-gold">{t("bonds.phase.title")}</p>
            <span className={`rounded-full border px-2 py-0.5 text-[11px] ${PHASE_CLASS[bond.phaseDetail.tone]}`}>
              {t(`bonds.phase.${bond.phaseDetail.tone}`)}
            </span>
          </div>
          <p className="text-sm text-foreground/90">{t(`bonds.phase.${bond.phaseDetail.tone}Line`)}</p>
          <p className="text-[11px] text-muted">
            {t("bonds.phase.lords", {
              mine: planetName(t, bond.phaseDetail.lords[0]),
              theirs: planetName(t, bond.phaseDetail.lords[1]),
              name,
            })}
          </p>
          {bond.phaseDetail.why.length > 0 && <FactorList factors={bond.phaseDetail.why} extra={extra} />}
        </Card>
      )}

      {bond.detail && (
        <>
          <Card className="p-4 border-gold/10 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-gold">{t("bonds.upcoming.title")}</p>
            {bond.detail.upcoming.length === 0 && <p className="text-xs text-muted">{t("bonds.upcoming.none")}</p>}
            {bond.detail.upcoming.map((w) => (
              <div key={`${w.start}-${w.tone}`} className="space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${w.tone === "good" ? "bg-emerald-500/80" : "bg-amber-500/80"}`}
                  />
                  <span className="flex-1 text-foreground/90">{t(`bonds.upcoming.${w.tone}`)}</span>
                  <span className="text-xs text-muted">
                    {shortDate(w.start, lang)} – {shortDate(w.end, lang)}
                  </span>
                </div>
                <p className="pl-4 text-[11px] text-muted">
                  {t("bonds.upcoming.lords", { maha: planetName(t, w.lords[0]), antar: planetName(t, w.lords[1]) })}
                </p>
                <div className="pl-4">
                  <FactorList factors={w.why} extra={extra} />
                </div>
              </div>
            ))}
          </Card>

          <Card className="p-4 border-gold/10 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-gold">{t("bonds.comm.title")}</p>
            <FactorList factors={bond.detail.communication} extra={extra} />
          </Card>

          <Card className="p-4 border-gold/10 space-y-2">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gold">
              <CalendarHeart size={14} />
              {t("bonds.dates.title")}
            </p>
            {bond.detail.dates.map((d) => (
              <div key={`${d.date}-${d.kind}`} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-foreground/90">{t(`bonds.dates.${d.kind}`, { name })}</span>
                <span className="text-xs text-muted">{shortDate(d.date, lang)}</span>
              </div>
            ))}
          </Card>
        </>
      )}

      <Link
        href={`/ai-chat?q=${encodeURIComponent(t("bonds.askQuestion", { name }))}`}
        className="flex items-center justify-center gap-1.5 text-xs font-medium text-gold"
      >
        <MessageCircle size={13} />
        {t("bonds.ask", { name })}
      </Link>
      <p className="pb-2 text-center text-[10px] text-muted">{t("bonds.guidance")}</p>
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

  const toError = (err: unknown): LoadError =>
    isPassRequired(err)
      ? "pass"
      : err instanceof ApiError && err.message === "CHART_NOT_READY"
        ? "notReady"
        : "error";

  useEffect(() => {
    setOpenId(new URLSearchParams(window.location.search).get("id"));
    bondsApi
      .list()
      .then((res) => setList(res.bonds))
      .catch((err: unknown) => setError(toError(err)));
  }, []);

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

  function open(id: string | null) {
    window.history.replaceState({}, "", id ? `?id=${id}` : window.location.pathname);
    setOpenId(id);
    if (!id) setBond(null);
  }

  const current = openId ? list?.find((b) => b.profileId === openId) : null;
  const title = openId && (current?.name || bond?.name) ? (current?.name ?? bond?.name)! : t("bonds.title");

  return (
    <main className="cosmic-bg min-h-screen pb-tab-safe relative overflow-hidden text-foreground">
      <ParticleBackground />
      <div className="relative z-10 px-5 pt-8 max-w-lg mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <IconButton onClick={() => (openId ? open(null) : router.back())} aria-label={t("common.back")}>
            <ArrowLeft size={18} />
          </IconButton>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-display flex items-center gap-2 truncate">
              <HeartHandshake size={18} className="text-gold shrink-0" />
              {title}
            </h1>
            <p className="text-[11px] text-muted">
              {openId && (current ?? bond)?.relationship
                ? t(RELATIONSHIP_KEYS[(current ?? bond)!.relationship!])
                : t("bonds.subtitle")}
            </p>
          </div>
        </div>

        {error === "pass" && <PassLock feature={t("bonds.title")} />}
        {error && error !== "pass" && <p className="py-10 text-center text-sm text-muted">{t(`bonds.${error}`)}</p>}
        {!error && !list && <p className="py-10 text-center text-sm text-muted">{t("bonds.loading")}</p>}

        {!error && openId && list && (bond ? <BondView bond={bond} /> : (
          <p className="py-10 text-center text-sm text-muted">{t("bonds.loading")}</p>
        ))}

        {!error && !openId && list && (
          <>
            {list.length === 0 && <p className="text-sm text-foreground/85">{t("bonds.empty")}</p>}
            <div className="space-y-2">
              {list.map((b) => (
                <button
                  key={b.profileId}
                  type="button"
                  onClick={() => open(b.profileId)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-gold/10 bg-surface/50 px-4 py-3 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{b.name || t("bonds.unnamed")}</span>
                    <span className="block text-[11px] text-muted">
                      {b.relationship ? t(RELATIONSHIP_KEYS[b.relationship]) : ""}
                    </span>
                  </span>
                  {b.compatibility && <span className="text-sm font-semibold text-gold">{b.compatibility.pct}%</span>}
                  {b.phase && (
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] ${PHASE_CLASS[b.phase]}`}>
                      {t(`bonds.phase.${b.phase}`)}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <Link
              href="/onboarding?mode=new-profile"
              className="flex h-11 w-full items-center justify-center gap-1.5 rounded-full border border-gold/30 text-sm font-medium text-gold"
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
