"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import PlaceAutocomplete from "@/components/PlaceAutocomplete";
import { useAuth } from "@/providers/auth-provider";
import { ApiError, type PlaceOfBirth } from "@/lib/api";
import { formatRupees } from "@/lib/format";
import {
  estimateBundleTotalPaise,
  purchasedMonthSet,
  nextMonths,
  formatPeriodMonth,
} from "@/lib/reports-logic";
import { reportsApi, type ReportCatalogueEntry, type PurchaseReportBody, type PurchaseReportResultRow } from "@/lib/reports-api";

const UPCOMING_MONTHS_COUNT = 12;

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
 *   - monthly: a next-12-months multi-select (already-purchased months
 *     shown locked) with a live estimated-total preview, then the same
 *     confirm flow with `months: string[]`
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

  // ── Monthly month picker ──────────────────────────────────────────────
  const alreadyPurchasedMonths = useMemo(() => purchasedMonthSet(entry.purchases), [entry.purchases]);
  const upcomingMonths = useMemo(() => nextMonths(UPCOMING_MONTHS_COUNT), []);
  const [selectedMonths, setSelectedMonths] = useState<Set<string>>(new Set());
  const toggleMonth = (m: string) => {
    if (alreadyPurchasedMonths.has(m)) return;
    setSelectedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m);
      else next.add(m);
      return next;
    });
  };

  // ── Price + confirm ────────────────────────────────────────────────────
  const costPaise = mode === "monthly" ? estimateBundleTotalPaise(selectedMonths.size, entry.pricePaise) : entry.pricePaise;
  const canSubmit =
    mode === "kundli_milan" ? partnerValid : mode === "monthly" ? selectedMonths.size > 0 : true;
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
      if (mode === "monthly") body.months = Array.from(selectedMonths);
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
          {mode !== "monthly" && <p className="text-[11px] text-muted mt-0.5">{formatRupees(entry.pricePaise)}</p>}
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

        {mode === "monthly" && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-gold uppercase tracking-wider">{t("reports.purchase.selectMonths")}</p>
            <p className="text-[11px] text-muted">{t("reports.purchase.monthsHint")}</p>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {upcomingMonths.map((m) => {
                const locked = alreadyPurchasedMonths.has(m);
                const selected = selectedMonths.has(m);
                return (
                  <button
                    type="button"
                    key={m}
                    disabled={locked}
                    onClick={() => toggleMonth(m)}
                    className={`rounded-xl border px-2 py-2.5 text-[11px] font-medium transition-colors ${
                      locked
                        ? "border-gold/10 text-muted/50 cursor-not-allowed"
                        : selected
                          ? "border-gold/50 bg-gold/10 text-gold"
                          : "border-gold/15 text-foreground/80 hover:border-gold/30"
                    }`}
                  >
                    {formatPeriodMonth(m)}
                    {locked && <span className="block text-[9px] mt-0.5">{t("reports.purchase.alreadyPurchased")}</span>}
                  </button>
                );
              })}
            </div>
            {selectedMonths.size > 0 && (
              <p className="text-xs text-foreground text-center mt-2">
                {t("reports.purchase.estimatedTotal", { amount: formatRupees(costPaise) })}
              </p>
            )}
            <p className="text-[10px] text-muted text-center">{t("reports.purchase.estimatedNote")}</p>
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
