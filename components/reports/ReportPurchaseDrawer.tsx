"use client";

import { useState } from "react";
import BirthTimeWindowSelect from "@/components/ui/BirthTimeWindowSelect";
import { BIRTH_TIME_WINDOWS, birthTimeWindowFor } from "@/lib/birth-time-window";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import PlaceAutocomplete from "@/components/PlaceAutocomplete";
import { useAuth } from "@/providers/auth-provider";
import { ApiError, type PlaceOfBirth } from "@/lib/api";
import { formatRupees, formatCount } from "@/lib/format";
import { currentMonthKey } from "@/lib/reports-logic";
import {
  reportsApi,
  type ReportCatalogueEntry,
  type PurchaseReportBody,
  type PurchaseReportResultRow,
} from "@/lib/reports-api";
import { REPORT_QUESTIONS } from "@/lib/report-questions";
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
  const { user, activeProfile, refresh } = useAuth();

  const label = t(`reports.labels.${entry.key}`, entry.label);
  const balancePaise = user?.walletBalancePaise ?? 0;

  // The spouse section is optional and never blocks purchase, so EVERY marriage buyer is asked.
  // It used to be gated on the account's relationshipStatus === "married", which hid it from most
  // buyers: that column is only ever written by onboarding step 7 and no screen can change it
  // afterwards, so a null / "prefer_not_to_say" / pre-onboarding account could never see it.
  const mode: "simple" | "kundli_milan" | "monthly" | "marriage_spouse" = entry.requiresPartner
    ? "kundli_milan"
    : entry.key === "marriage"
      ? "marriage_spouse"
      : entry.isMonthly
        ? "monthly"
        : "simple";

  // ── Kundli Milan partner form ─────────────────────────────────────────
  const [partnerDob, setPartnerDob] = useState("");
  const [partnerTob, setPartnerTob] = useState("");
  /** BIRTH_TIME_WINDOWS key when the exact time isn't known — see BirthTimeWindowSelect. */
  const [partnerTimeWindow, setPartnerTimeWindow] = useState("");
  const [resolvedPartnerPlace, setResolvedPartnerPlace] = useState<PlaceOfBirth | null>(null);
  const [partnerConsented, setPartnerConsented] = useState(false);
  const partnerValid = !!partnerDob && !!resolvedPartnerPlace && partnerConsented;

  // ── Marriage report's optional spouse-details section ────────────────
  const [spouseName, setSpouseName] = useState(entry.lastSpouseDetails?.name ?? "");
  const [spouseDob, setSpouseDob] = useState(entry.lastSpouseDetails?.dateOfBirth ?? "");
  const [spouseTob, setSpouseTob] = useState(entry.lastSpouseDetails?.timeOfBirth ?? "");
  const [spouseTimeWindow, setSpouseTimeWindow] = useState(
    entry.lastSpouseDetails?.timeAccuracy === "unknown"
      ? (birthTimeWindowFor(entry.lastSpouseDetails.timeOfBirth)?.key ?? "")
      : "",
  );
  const [resolvedSpousePlace, setResolvedSpousePlace] = useState<PlaceOfBirth | null>(
    entry.lastSpouseDetails
      ? {
          name: entry.lastSpouseDetails.placeLabel ?? "",
          lat: entry.lastSpouseDetails.latitude,
          lon: entry.lastSpouseDetails.longitude,
          tz: entry.lastSpouseDetails.timezone,
        }
      : null,
  );
  const [spouseConsented, setSpouseConsented] = useState(!!entry.lastSpouseDetails);
  // Optional and never blocks purchase: complete (dob+place+consent) or entirely empty are both
  // valid; a half-filled section is the only invalid state, since it can't build a real chart.
  // If the user said they are NOT married, treat the spouse section as intentionally empty/valid.
  const spouseSectionEmpty = !spouseDob && !resolvedSpousePlace;
  const spouseSectionComplete = !!spouseDob && !!resolvedSpousePlace && spouseConsented;
  const spouseSectionValid = spouseSectionEmpty || spouseSectionComplete;

  // ── Optional pre-purchase questionnaire (see lib/report-questions.ts) ─
  const questions = REPORT_QUESTIONS[entry.key] ?? [];
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const visibleQuestions = questions.filter(
    (q) => !q.showIf || answers[q.showIf.questionId] === q.showIf.value,
  );

  // ── Monthly: current month only, no picker ────────────────────────────
  // A `failed` row is deliberately NOT treated as already-purchased: the backend
  // reclaims and regenerates a failed row on a repeat purchase (see claimReportRow's
  // `claimable` guard), so blocking the buy here would strand the month forever.
  const currentMonth = currentMonthKey();
  const currentMonthPurchase = entry.purchases.find((p) => p.periodMonth === currentMonth) ?? null;
  const currentMonthAlreadyPurchased = !!currentMonthPurchase && currentMonthPurchase.status !== "failed";

  // ── Price + confirm ────────────────────────────────────────────────────
  const costPaise = entry.pricePaise;
  const canSubmit =
    mode === "kundli_milan"
      ? partnerValid
      : mode === "monthly"
        ? !currentMonthAlreadyPurchased
        : mode === "marriage_spouse"
          ? spouseSectionValid
          : true;
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
        // No silent noon fallback — either the time they gave, or the midpoint of
        // the window they picked, flagged so the report reads them at sign level.
        const w = BIRTH_TIME_WINDOWS.find((x) => x.key === partnerTimeWindow);
        body.partner = {
          dateOfBirth: partnerDob,
          timeOfBirth: w?.mid ?? partnerTob,
          ...(w ? { timeAccuracy: "unknown" as const } : {}),
          latitude: resolvedPartnerPlace.lat,
          longitude: resolvedPartnerPlace.lon,
          timezone: resolvedPartnerPlace.tz,
        };
      }
      if (mode === "marriage_spouse" && spouseSectionComplete && resolvedSpousePlace) {
        const w = BIRTH_TIME_WINDOWS.find((x) => x.key === spouseTimeWindow);
        body.partner = {
          dateOfBirth: spouseDob,
          timeOfBirth: w?.mid ?? spouseTob,
          ...(w ? { timeAccuracy: "unknown" as const } : {}),
          latitude: resolvedSpousePlace.lat,
          longitude: resolvedSpousePlace.lon,
          timezone: resolvedSpousePlace.tz,
          ...(spouseName.trim() ? { name: spouseName.trim() } : {}),
          ...(resolvedSpousePlace.name ? { placeLabel: resolvedSpousePlace.name } : {}),
        };
      }
      const visibleAnswerIds = new Set(visibleQuestions.map((q) => q.id));
      const filteredAnswers = Object.fromEntries(
        Object.entries(answers).filter(([id, v]) => visibleAnswerIds.has(id) && v.trim() !== ""),
      );
      if (Object.keys(filteredAnswers).length > 0) body.answers = filteredAnswers;
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
    "w-full h-12 rounded-2xl px-4 outline-none border text-base focus:border-yellow-500/60 transition-colors";
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

        {/* ── Step 1: "Are you married?" — shown first for the marriage report ── */}
        {visibleQuestions.length > 0 && (
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold text-gold uppercase tracking-wider">
              {t("reports.questions.title")}
            </p>
            {visibleQuestions.map((q) => (
              <div key={q.id} className="flex flex-col gap-1.5">
                <label className="text-xs text-muted ml-1">{t(q.labelKey)}</label>
                {q.type === "text" ? (
                  <input
                    type="text"
                    value={answers[q.id] ?? ""}
                    onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                    placeholder={t("reports.questions.textPlaceholder")}
                    className={inputClass}
                    style={style}
                  />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {q.options?.map((opt) => {
                      const selected = answers[q.id] === opt.value;
                      return (
                        <button
                          type="button"
                          key={opt.value}
                          onClick={() =>
                            setAnswers((a) => ({ ...a, [q.id]: selected ? "" : opt.value }))
                          }
                          className={`rounded-full px-3.5 py-2 text-xs font-medium border transition-colors ${
                            selected
                              ? "bg-gold text-[#1a0e00] border-gold"
                              : "border-gold/20 text-foreground/80"
                          }`}
                        >
                          {t(opt.labelKey)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Kundli Milan partner form ── */}
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
              {!partnerTimeWindow && (
                <input
                  type="time"
                  value={partnerTob}
                  onChange={(e) => setPartnerTob(e.target.value)}
                  className={inputClass}
                  style={style}
                />
              )}
              <BirthTimeWindowSelect
                value={partnerTimeWindow}
                onChange={setPartnerTimeWindow}
                className={`${inputClass} mt-1.5`}
              />
            </div>
            <PlaceAutocomplete
              placeholder={t("compatibilityPage.birthPlace")}
              inputClassName={inputClass}
              inputStyle={style}
              worldwide={!user?.phoneE164}
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

        {/* ── Marriage: spouse details — only if user answered "Yes, I'm married" ── */}
        {mode === "marriage_spouse" && answers["isMarried"] === "yes" && (
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold text-gold uppercase tracking-wider">{t("reports.purchase.spouseTitle")}</p>
            <p className="text-[11px] text-muted leading-relaxed">{t("reports.purchase.spouseHint")}</p>
            <div>
              <label className="text-xs text-muted ml-1 mb-1 block">{t("reports.purchase.spouseName")}</label>
              <input
                type="text"
                value={spouseName}
                onChange={(e) => setSpouseName(e.target.value)}
                className={inputClass}
                style={style}
              />
            </div>
            <div>
              <label className="text-xs text-muted ml-1 mb-1 block">{t("compatibilityPage.dob")}</label>
              <input
                type="date"
                value={spouseDob}
                onChange={(e) => setSpouseDob(e.target.value)}
                className={inputClass}
                style={style}
              />
            </div>
            <div>
              <label className="text-xs text-muted ml-1 mb-1 block">{t("compatibilityPage.tob")}</label>
              {!spouseTimeWindow && (
                <input
                  type="time"
                  value={spouseTob}
                  onChange={(e) => setSpouseTob(e.target.value)}
                  className={inputClass}
                  style={style}
                />
              )}
              <BirthTimeWindowSelect
                value={spouseTimeWindow}
                onChange={setSpouseTimeWindow}
                className={`${inputClass} mt-1.5`}
              />
            </div>
            <PlaceAutocomplete
              placeholder={t("compatibilityPage.birthPlace")}
              inputClassName={inputClass}
              inputStyle={style}
              worldwide={!user?.phoneE164}
              defaultQuery={entry.lastSpouseDetails?.placeLabel ?? ""}
              onSelect={(place) => setResolvedSpousePlace(place)}
            />
            <label className="flex items-start gap-2.5 px-1 text-xs leading-relaxed cursor-pointer text-muted">
              <input
                type="checkbox"
                checked={spouseConsented}
                onChange={(e) => setSpouseConsented(e.target.checked)}
                className="mt-0.5 w-4 h-4 shrink-0 accent-yellow-500"
              />
              {t("reports.purchase.spouseConsent")}
            </label>
          </div>
        )}

        {/* ── Monthly: already purchased state ── */}
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

        {/* ── "What this report covers" — shown below all inputs ── */}
        {Array.isArray(covers) && covers.length > 0 && (
          <div className="flex flex-col gap-2 pt-1">
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
