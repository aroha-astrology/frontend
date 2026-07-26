"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import PlaceAutocomplete from "@/components/PlaceAutocomplete";
import { useAuth } from "@/providers/auth-provider";
import { ApiError, type PlaceOfBirth } from "@/lib/api";
import { formatRupees } from "@/lib/format";
import { purchasedMonthSet, currentMonthKey } from "@/lib/reports-logic";
import { reportsApi, type ReportCatalogueEntry, type PurchaseReportBody, type PurchaseReportResultRow } from "@/lib/reports-api";

interface ReportPurchaseDrawerProps {
  entry: ReportCatalogueEntry;
  onClose: () => void;
  /** Fires after a successful purchase — caller decides whether to navigate to the new report or just refetch the catalogue in place. */
  onPurchased: (rows: PurchaseReportResultRow[]) => void;
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
export default function ReportPurchaseDrawer({ entry, onClose, onPurchased }: ReportPurchaseDrawerProps) {
  const { t } = useTranslation();
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

  return (
    <BottomSheetModal
      onClose={onClose}
      closeLabel={t("common.close")}
      header={
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{label}</p>
          <p className="text-[11px] text-muted mt-0.5">{formatRupees(entry.pricePaise)}</p>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
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

        {/* Balance / confirm — only once the mode-specific inputs are satisfied. */}
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

        {errorMsg && <p className="text-[11px] text-red-400 text-center">{errorMsg}</p>}
      </div>
    </BottomSheetModal>
  );
}
