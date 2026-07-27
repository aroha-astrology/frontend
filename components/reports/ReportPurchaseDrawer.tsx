"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import PlaceAutocomplete from "@/components/PlaceAutocomplete";
import { useAuth } from "@/providers/auth-provider";
import { ApiError, type PlaceOfBirth } from "@/lib/api";
import { formatRupees, formatCount } from "@/lib/format";
import { purchasedMonthSet, currentMonthKey, canPreviewReport } from "@/lib/reports-logic";
import {
  reportsApi,
  type ReportCatalogueEntry,
  type PurchaseReportBody,
  type PurchaseReportResultRow,
  type PreviewReportBody,
} from "@/lib/reports-api";
import DiscountPrice from "./DiscountPrice";

interface ReportPurchaseDrawerProps {
  entry: ReportCatalogueEntry;
  onClose: () => void;
  /** Fires after a successful purchase — caller decides whether to navigate to the new report or just refetch the catalogue in place. */
  onPurchased: (rows: PurchaseReportResultRow[]) => void;
  /** Real "N generated" count for this report key, from reportsApi.stats() — omitted/undefined while stats are still loading, in which case nothing renders (never a fake placeholder). */
  generatedCount?: number;
}

/**
 * The purchase drawer for one catalogue entry — three modes based on the
 * report itself (see the spec's "backend contract" section):
 *   - simple one-time: price + two-step confirm (mirrors VastuPlanner's
 *     confirmSpend pattern)
 *   - Kundli Milan (`requiresPartner`): the same confirm flow, preceded by a
 *     partner birth-detail form (copied field-for-field from
 *     app/compatibility/page.tsx's person-2 input, since the partner is raw
 *     birth data, not a saved profile)
 *   - monthly: an implicit current-month-only purchase (no picker, no
 *     bundle pricing) — same confirm flow, with `months: [currentMonthKey()]`.
 *     If the current month is already purchased, the confirm flow is
 *     replaced by an "already purchased" state instead of round-tripping a
 *     duplicate purchase through a refund.
 */
export default function ReportPurchaseDrawer({ entry, onClose, onPurchased, generatedCount }: ReportPurchaseDrawerProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, activeProfile, refresh } = useAuth();

  const label = t(`reports.labels.${entry.key}`, entry.label);
  const balancePaise = user?.walletBalancePaise ?? 0;

  const mode: "simple" | "kundli_milan" | "monthly" = entry.requiresPartner
    ? "kundli_milan"
    : entry.isMonthly
      ? "monthly"
      : "simple";

  // ── Kundli Milan partner form ─────────────────────────────────────────
  const [partnerDob, setPartnerDob] = useState("");
  const [partnerTob, setPartnerTob] = useState("");
  const [resolvedPartnerPlace, setResolvedPartnerPlace] = useState<PlaceOfBirth | null>(null);
  const [partnerConsented, setPartnerConsented] = useState(false);
  const partnerValid = !!partnerDob && !!resolvedPartnerPlace && partnerConsented;

  // ── Monthly: current month only, no picker ────────────────────────────
  const alreadyPurchasedMonths = useMemo(() => purchasedMonthSet(entry.purchases), [entry.purchases]);
  const currentMonth = currentMonthKey();
  const currentMonthAlreadyPurchased = alreadyPurchasedMonths.has(currentMonth);
  const currentMonthPurchase = entry.purchases.find((p) => p.periodMonth === currentMonth) ?? null;

  // ── Price + confirm ────────────────────────────────────────────────────
  const costPaise = entry.pricePaise;
  const canSubmit =
    mode === "kundli_milan" ? partnerValid : mode === "monthly" ? !currentMonthAlreadyPurchased : true;
  const insufficient = canSubmit && balancePaise < costPaise;

  const [confirming, setConfirming] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── Preview (generate-and-blur) ────────────────────────────────────────
  // Never offered for a partner-required report — the backend 400s a preview
  // call for kundli_milan/match_report since there's no "the user's own free
  // report" to generate without partner birth data. Also gated on `canSubmit`
  // so it disappears in exactly the states where Buy itself is hidden (a
  // monthly report whose current month is already purchased) — nothing left
  // to preview there either.
  const showPreview = canPreviewReport(entry) && canSubmit;
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const handlePreview = async () => {
    setPreviewError(null);
    setPreviewing(true);
    try {
      const body: PreviewReportBody = { reportKey: entry.key };
      if (activeProfile && activeProfile.id !== "primary") body.birthProfileId = activeProfile.id;
      const res = await reportsApi.preview(body);
      onClose();
      router.push(`/reports/${res.id}`);
    } catch {
      setPreviewError(t("reports.purchase.previewError"));
      setPreviewing(false);
    }
  };

  const handlePurchase = async () => {
    setErrorMsg(null);
    setPurchasing(true);
    try {
      const body: PurchaseReportBody = { reportKey: entry.key };
      if (activeProfile && activeProfile.id !== "primary") body.birthProfileId = activeProfile.id;
      if (mode === "monthly") body.months = [currentMonthKey()];
      if (mode === "kundli_milan" && resolvedPartnerPlace) {
        body.partner = {
          dateOfBirth: partnerDob,
          timeOfBirth: partnerTob || "12:00",
          latitude: resolvedPartnerPlace.lat,
          longitude: resolvedPartnerPlace.lon,
          timezone: resolvedPartnerPlace.tz,
        };
      }
      const res = await reportsApi.purchase(body);
      await refresh();
      onPurchased(res.reports);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setErrorMsg(t("reports.purchase.notEnough", { cost: formatRupees(costPaise), amount: formatRupees(balancePaise) }));
      } else if (err instanceof ApiError && err.status === 403) {
        setErrorMsg(t("reports.purchase.disabledError"));
      } else {
        setErrorMsg(t("reports.purchase.unlockError"));
      }
      setConfirming(false);
    } finally {
      setPurchasing(false);
    }
  };

  const inputClass =
    "w-full h-12 rounded-2xl px-4 outline-none border text-sm focus:border-yellow-500/60 transition-colors";
  const style = { background: "var(--surface)", borderColor: "var(--border)", color: "var(--foreground)" };

  // "What this report covers" — an array per reportKey under i18n/resources.ts's
  // reports.covers.<key>. Falls back to an empty array (renders nothing) for a
  // catalogue key this client build doesn't have copy for yet, matching
  // lib/report-theme.ts's fail-open-to-neutral precedent for an unrecognized key.
  const covers = t(`reports.covers.${entry.key}`, { returnObjects: true }) as string[];
  const hasGeneratedCount = typeof generatedCount === "number" && Number.isFinite(generatedCount) && generatedCount > 0;

  return (
    <BottomSheetModal
      onClose={onClose}
      closeLabel={t("common.close")}
      header={
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{label}</p>
          <DiscountPrice
            pricePaise={entry.pricePaise}
            originalPricePaise={entry.originalPricePaise}
            priceLabel={formatRupees(entry.pricePaise)}
          />
        </div>
      }
    >
      <div className="flex flex-col gap-4 pb-1">
        {Array.isArray(covers) && covers.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-gold uppercase tracking-wider">{t("reports.coversTitle")}</p>
            <ul className="flex flex-col gap-2">
              {covers.map((line, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/85 leading-relaxed">
                  <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-gold shrink-0" aria-hidden="true" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {hasGeneratedCount && (
          <p className="text-[11px] text-muted text-center">
            {t("reports.statsCount", { count: formatCount(generatedCount) })}
          </p>
        )}

        {mode === "kundli_milan" && (
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold text-gold uppercase tracking-wider">{t("reports.purchase.partnerTitle")}</p>
            <div>
              <label className="text-xs text-muted ml-1 mb-1 block">{t("compatibilityPage.dob")}</label>
              <input
                type="date"
                value={partnerDob}
                onChange={(e) => setPartnerDob(e.target.value)}
                className={inputClass}
                style={style}
              />
            </div>
            <div>
              <label className="text-xs text-muted ml-1 mb-1 block">{t("compatibilityPage.tob")}</label>
              <input
                type="time"
                value={partnerTob}
                onChange={(e) => setPartnerTob(e.target.value)}
                className={inputClass}
                style={style}
              />
            </div>
            <PlaceAutocomplete
              placeholder={t("compatibilityPage.birthPlace")}
              inputClassName={inputClass}
              inputStyle={style}
              onSelect={(place) => setResolvedPartnerPlace(place)}
            />
            <label className="flex items-start gap-2.5 px-1 text-xs leading-relaxed cursor-pointer text-muted">
              <input
                type="checkbox"
                checked={partnerConsented}
                onChange={(e) => setPartnerConsented(e.target.checked)}
                className="mt-0.5 w-4 h-4 shrink-0 accent-yellow-500"
              />
              {t("reports.purchase.partnerConsent")}
            </label>
          </div>
        )}

        {mode === "monthly" && currentMonthAlreadyPurchased && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted text-center">{t("reports.purchase.alreadyPurchased")}</p>
            {currentMonthPurchase?.status === "ready" && (
              <Link
                href={`/reports/${currentMonthPurchase.id}`}
                className="w-full flex items-center justify-center rounded-2xl border border-gold/30 text-gold px-4 py-3 text-sm font-bold"
              >
                {t("reports.viewReport")}
              </Link>
            )}
            {currentMonthPurchase?.status === "generating" && (
              <p className="text-[11px] text-amber-400 text-center">{t("reports.generating")}</p>
            )}
          </div>
        )}

        {showPreview && (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handlePreview}
              disabled={previewing}
              className="w-full rounded-2xl border border-gold/30 text-gold px-4 py-3 text-sm font-bold disabled:opacity-50"
            >
              {previewing ? t("reports.purchase.processing") : t("reports.purchase.previewCta")}
            </button>
            {previewError && <p className="text-[11px] text-red-400 text-center">{previewError}</p>}
          </div>
        )}
      </div>

      {/* Sticky footer — balance / confirm, only once the mode-specific inputs are
          satisfied. Kept pinned to the bottom of BottomSheetModal's own scroll
          container (not the viewport) so it stays reachable once the covers list
          above pushes the drawer's content past the visible sheet height. */}
      {(canSubmit || errorMsg) && (
        <div className="sticky bottom-0 z-10 -mx-5 mt-4 border-t border-gold/10 bg-card/95 px-5 pt-4 backdrop-blur-xl">
          {canSubmit && (
            <div>
              {insufficient ? (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-amber-400 text-center">
                    {t("reports.purchase.notEnough", { cost: formatRupees(costPaise), amount: formatRupees(balancePaise) })}
                  </p>
                  <Link
                    href="/payment"
                    className="w-full flex items-center justify-center rounded-2xl bg-gold text-[#1a0e00] px-4 py-3 text-sm font-bold"
                  >
                    {t("reports.purchase.getCredits")}
                  </Link>
                </div>
              ) : confirming ? (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-foreground text-center">
                    {t("reports.purchase.confirmSpend", { cost: formatRupees(costPaise) })}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirming(false)}
                      disabled={purchasing}
                      className="flex-1 rounded-xl border border-gold/20 text-muted px-4 py-2.5 text-sm font-medium disabled:opacity-50"
                    >
                      {t("common.no")}
                    </button>
                    <button
                      type="button"
                      onClick={handlePurchase}
                      disabled={purchasing}
                      className="flex-1 rounded-xl bg-gold text-[#1a0e00] px-4 py-2.5 text-sm font-bold disabled:opacity-50"
                    >
                      {purchasing ? t("reports.purchase.processing") : t("reports.purchase.confirmYes")}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  className="w-full rounded-2xl bg-gold text-[#1a0e00] px-4 py-3 text-sm font-bold"
                >
                  {t("reports.buy")} · {formatRupees(costPaise)}
                </button>
              )}
            </div>
          )}

          {errorMsg && <p className="mt-2 text-[11px] text-red-400 text-center">{errorMsg}</p>}

          <div className="h-4" />
        </div>
      )}
    </BottomSheetModal>
  );
}
