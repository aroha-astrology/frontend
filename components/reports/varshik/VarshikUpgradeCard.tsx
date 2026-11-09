"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ApiError } from "@/lib/api";
import { formatRupees } from "@/lib/format";
import { reportsApi, type VarshikCatalogueTier, type VarshikTierSlug } from "@/lib/reports-api";
import { useAuth } from "@/providers/auth-provider";
import { tierPagesLabel } from "./VarshikTierSheet";

/**
 * Shown at the end of a Snapshot or Gold report: pay the difference to see the rest. The report is
 * already written in full, so the new pages open at once. The price is the gap between the two tiers
 * (less any Aroha Pass discount); the server works it out again and charges that, not this number.
 */
export default function VarshikUpgradeCard({
  reportId,
  current,
  onUpgraded,
}: {
  reportId: string;
  current: VarshikTierSlug;
  onUpgraded: (tier: VarshikTierSlug) => void;
}) {
  const { t } = useTranslation();
  const { refresh } = useAuth();
  const [tiers, setTiers] = useState<VarshikCatalogueTier[] | null>(null);
  const [passPct, setPassPct] = useState(0);
  const [busy, setBusy] = useState<VarshikTierSlug | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let off = false;
    reportsApi
      .catalogue()
      .then((r) => {
        const entry = r.reports.find((x) => x.key === "varshik_rashifal_2027");
        if (!off && entry?.tiers) {
          setTiers(entry.tiers);
          setPassPct(entry.passDiscountPct ?? 0);
        }
      })
      .catch(() => {
        /* no card without prices; the report itself is unaffected */
      });
    return () => {
      off = true;
    };
  }, []);

  const own = tiers?.find((x) => x.tierSlug === current);
  const higher = (tiers ?? []).filter((x) => own && x.sortOrder > own.sortOrder).sort((a, b) => a.sortOrder - b.sortOrder);
  if (!own || higher.length === 0) return null;

  async function upgrade(tier: VarshikTierSlug) {
    setBusy(tier);
    setError(null);
    try {
      await reportsApi.upgradeTier(reportId, tier);
      await refresh();
      onUpgraded(tier);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 409
          ? t("varshik.tiers.upgradeNoCredits", { defaultValue: "Not enough credits in your wallet for this upgrade." })
          : t("varshik.tiers.upgradeError", { defaultValue: "The upgrade did not go through. Nothing was charged. Please try again." }),
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="vk-panel flex min-w-0 flex-col gap-3 p-4" data-testid="varshik-upgrade">
      <div className="flex items-center gap-2">
        <Sparkles size={16} aria-hidden="true" style={{ color: "var(--gold)" }} />
        <h3 className="vk-h3 m-0">{t("varshik.tiers.upgradeTitle", { defaultValue: "See the rest of your year" })}</h3>
      </div>
      <p className="vk-body m-0 break-words">
        {t("varshik.tiers.upgradeBody", { defaultValue: "Your report is already written. Pay only the difference and the remaining pages open at once." })}
      </p>
      <div className="flex min-w-0 flex-col gap-2">
        {higher.map((tier) => {
          const pay = Math.round((Math.max(0, tier.pricePaise - own.pricePaise) * (100 - passPct)) / 100);
          return (
            <button
              key={tier.tierSlug}
              type="button"
              disabled={busy !== null}
              onClick={() => void upgrade(tier.tierSlug)}
              data-testid={`varshik-upgrade-${tier.tierSlug}`}
              className="flex w-full min-w-0 items-center justify-between gap-3 rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3 text-left disabled:opacity-60"
            >
              <span className="min-w-0">
                <span className="block break-words text-sm font-semibold text-foreground">{tier.displayName}</span>
                <span className="block text-xs text-muted">{tierPagesLabel(t, tier)}</span>
              </span>
              <span className="shrink-0 text-sm font-bold tabular-nums text-gold">
                {busy === tier.tierSlug ? "…" : t("varshik.tiers.upgradeFor", { defaultValue: "Upgrade for {{price}}", price: formatRupees(pay) })}
              </span>
            </button>
          );
        })}
      </div>
      {error ? (
        <p role="alert" className="m-0 text-sm text-red-400">
          {error}
        </p>
      ) : null}
    </section>
  );
}
