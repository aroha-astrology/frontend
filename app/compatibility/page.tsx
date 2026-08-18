"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { MessageCircle, BookUser, Loader2, AlertTriangle } from "lucide-react";
import PlaceAutocomplete from "@/components/PlaceAutocomplete";
import { ApiError, type PlaceOfBirth } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";
import { formatRupees } from "@/lib/format";
import { CHAT_PENDING_CONTEXT_KEY, type ChatPendingPayload } from "@/lib/chat-handoff";
import BirthProfilePickerSheet from "@/components/compatibility/BirthProfilePickerSheet";
import ProfileSwitchTrigger from "@/components/ui/ProfileSwitchTrigger";
import GeneratingSpinner from "@/components/ui/GeneratingSpinner";
import MatchReportCards from "@/components/compatibility/MatchReportCards";
import DosAndDontsCard from "@/components/compatibility/DosAndDontsCard";
import GunaKootaBreakdown from "@/components/reports/GunaKootaBreakdown";
import { useReport } from "@/hooks/useReport";
import { useReportCatalogue } from "@/hooks/useReportCatalogue";
import { reportsApi, type MatchReportScores, type PurchaseReportBody } from "@/lib/reports-api";
import type { Profile } from "@/lib/api";

interface PersonForm {
  name: string;
  dob: string;
  time: string;
  place: string;
}

interface CompatForm {
  boy: PersonForm;
  girl: PersonForm;
}

const emptyPerson: PersonForm = { name: "", dob: "", time: "", place: "" };

export default function CompatibilityPage() {
  const { t, i18n } = useTranslation();
  const { user, profiles, refresh } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState<CompatForm>({
    boy: { ...emptyPerson },
    girl: { ...emptyPerson },
  });
  const [resolvedBoyPlace, setResolvedBoyPlace] = useState<PlaceOfBirth | null>(null);
  const [resolvedGirlPlace, setResolvedGirlPlace] = useState<PlaceOfBirth | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Matchmaking involves a second person's birth data, often entered without
  // them present — require an explicit consent acknowledgement before submit.
  const [consented, setConsented] = useState(false);
  // "This is me" — prefill Person 1 from the signed-in user's saved birth
  // details instead of retyping them for every match check.
  const [useMyDetails, setUseMyDetails] = useState(false);
  const hasSavedBirthDetails = !!user?.dateOfBirth;

  // Per-side stored profile id — set when a profile is picked from the sheet
  // or via "This is me"; cleared when any field is manually edited afterward.
  // The purchased report always resolves ONE person from the account's own
  // saved profiles (birthProfileId) and treats the OTHER as raw partner birth
  // details — so picking a profile on one side clears the other side's id,
  // keeping exactly one side (or neither, before a pick) profile-linked.
  const [boyProfileId, setBoyProfileId] = useState<string | null>(null);
  const [girlProfileId, setGirlProfileId] = useState<string | null>(null);

  // Picker sheet open state
  const [boyPickerOpen, setBoyPickerOpen] = useState(false);
  const [girlPickerOpen, setGirlPickerOpen] = useState(false);

  // Purchase + poll state
  const [reportId, setReportId] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const { state: reportState, data: report, failedError } = useReport(reportId, i18n.language);
  const { reports: catalogue, refetch: refetchCatalogue } = useReportCatalogue();
  const matchReportEntry = catalogue?.find((r) => r.key === "match_report");
  const costPaise = matchReportEntry?.pricePaise ?? 5000;
  const balancePaise = user?.walletBalancePaise ?? 0;

  const updatePerson = (who: "boy" | "girl", field: keyof PersonForm, value: string) => {
    // Editing any field after a profile was picked clears the stored profileId —
    // the fields remain editable but we no longer treat this side as "still this profile".
    if (who === "boy") setBoyProfileId(null);
    else setGirlProfileId(null);

    setForm((prev) => ({
      ...prev,
      [who]: { ...prev[who], [field]: value },
    }));
  };

  /** Fill one side of the form from a saved Profile — clears the OTHER side's
   * profileId, since only one side can be "the account's own profile" for a
   * purchase (the other becomes the raw partner). */
  const applyProfile = (who: "boy" | "girl", profile: Profile) => {
    const fields: PersonForm = {
      name: profile.displayName ?? "",
      dob: profile.dateOfBirth ?? "",
      time: (profile.timeOfBirth ?? "").slice(0, 5),
      place: profile.placeOfBirth?.name ?? "",
    };
    setForm((prev) => ({ ...prev, [who]: fields }));
    if (who === "boy") {
      setResolvedBoyPlace(profile.placeOfBirth ?? null);
      setBoyProfileId(profile.id);
      setGirlProfileId(null);
    } else {
      setResolvedGirlPlace(profile.placeOfBirth ?? null);
      setGirlProfileId(profile.id);
      setBoyProfileId(null);
    }
  };

  const toggleUseMyDetails = (checked: boolean) => {
    setUseMyDetails(checked);
    if (checked && user) {
      // Fill the correct side based on the signed-in user's gender.
      // Female → Girl's Details; male/other/unset → Boy's Details (default).
      const who: "boy" | "girl" = user.gender === "female" ? "girl" : "boy";
      setForm((prev) => ({
        ...prev,
        [who]: {
          name: user.displayName ?? "",
          dob: user.dateOfBirth ?? "",
          time: (user.timeOfBirth ?? "").slice(0, 5),
          place: user.placeOfBirth?.name ?? "",
        },
      }));
      if (who === "boy") {
        setResolvedBoyPlace(user.placeOfBirth ?? null);
        const primaryProfile = profiles?.find((p) => p.isPrimary);
        setBoyProfileId(primaryProfile?.id ?? "primary");
        setGirlProfileId(null);
      } else {
        setResolvedGirlPlace(user.placeOfBirth ?? null);
        const primaryProfile = profiles?.find((p) => p.isPrimary);
        setGirlProfileId(primaryProfile?.id ?? "primary");
        setBoyProfileId(null);
      }
    } else {
      // Unchecked — clear the side that "This is me" had filled.
      const who: "boy" | "girl" = user?.gender === "female" ? "girl" : "boy";
      setForm((prev) => ({ ...prev, [who]: { ...emptyPerson } }));
      if (who === "boy") { setResolvedBoyPlace(null); setBoyProfileId(null); }
      else { setResolvedGirlPlace(null); setGirlProfileId(null); }
    }
  };

  // Exactly one side must be the account's own profile (primary or a saved
  // additional profile) — the purchase API resolves ONE chart from
  // birthProfileId and treats the other as raw partner birth details.
  const selfSide: "boy" | "girl" | null = boyProfileId ? "boy" : girlProfileId ? "girl" : null;
  const partnerSide: "boy" | "girl" | null = selfSide === "boy" ? "girl" : selfSide === "girl" ? "boy" : null;
  const selfSideProfileId = boyProfileId ?? girlProfileId;
  const resolvedPartnerPlace = partnerSide === "boy" ? resolvedBoyPlace : partnerSide === "girl" ? resolvedGirlPlace : null;

  const canSubmit =
    !!selfSide &&
    !!partnerSide &&
    !!form[partnerSide].dob &&
    !!resolvedPartnerPlace &&
    !!form.boy.name &&
    !!form.girl.name &&
    consented;
  const insufficient = canSubmit && balancePaise < costPaise;

  const purchase = async () => {
    if (!canSubmit || !partnerSide || !resolvedPartnerPlace) return;

    setPurchasing(true);
    setError(null);

    try {
      const body: PurchaseReportBody = {
        reportKey: "match_report",
        partner: {
          dateOfBirth: form[partnerSide].dob,
          timeOfBirth: form[partnerSide].time || "12:00",
          latitude: resolvedPartnerPlace.lat,
          longitude: resolvedPartnerPlace.lon,
          timezone: resolvedPartnerPlace.tz,
        },
      };
      if (selfSideProfileId && selfSideProfileId !== "primary") {
        body.birthProfileId = selfSideProfileId;
      }

      const res = await reportsApi.purchase(body);
      await refresh();
      refetchCatalogue();
      const row = res.reports[0];
      if (row) setReportId(row.id);
      setConfirming(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError(t("reports.purchase.notEnough", { cost: formatRupees(costPaise), amount: formatRupees(balancePaise) }));
      } else if (err instanceof ApiError && err.status === 403) {
        setError(t("reports.purchase.disabledError"));
      } else {
        setError(err instanceof Error ? err.message : t("compatibilityPage.checkError"));
      }
      setConfirming(false);
    } finally {
      setPurchasing(false);
    }
  };

  const scores = report?.status === "ready" ? (report.scores as unknown as MatchReportScores) : null;
  const sections = report?.status === "ready" ? report.sections : [];
  const areaCards = sections.slice(0, 8);
  const closingSections = sections.slice(8, 11);

  const askAstrologer = () => {
    if (!reportId) return;
    const payload: ChatPendingPayload = {
      message: t("compatibilityPage.askAstrologerPrompt"),
      matchReportId: reportId,
    };
    sessionStorage.setItem(CHAT_PENDING_CONTEXT_KEY, JSON.stringify(payload));
    router.push("/ai-chat");
  };

  const inputClass =
    "w-full h-14 rounded-2xl px-4 outline-none border text-base focus:border-yellow-500/60 transition-colors";
  const style = { background: "var(--surface)", borderColor: "var(--border)", color: "var(--foreground)" };

  const renderPersonFields = (who: "boy" | "girl", label: string, disabled = false) => (
    <div className="space-y-3">
      <p className="text-xs text-[var(--text-muted)] ml-1">{label}</p>
      {/* Name field with profile-picker icon button */}
      <div className="relative flex items-center gap-1.5">
        <input
          placeholder={t("compatibilityPage.name")}
          value={form[who].name}
          onChange={(e) => updatePerson(who, "name", e.target.value)}
          disabled={disabled}
          className={cn(inputClass, disabled && "opacity-50 cursor-not-allowed", "flex-1")}
          style={style}
        />
        {!disabled && (
          <button
            type="button"
            title={t("compatibilityPage.pickProfile")}
            onClick={() => who === "boy" ? setBoyPickerOpen(true) : setGirlPickerOpen(true)}
            className="w-10 h-10 rounded-xl flex items-center justify-center border border-gold/25 bg-gold/5 text-gold hover:bg-gold/15 transition-colors shrink-0"
          >
            <BookUser size={18} />
          </button>
        )}
      </div>
      <div>
        <label className="text-xs text-[var(--text-muted)] ml-1 mb-1 block">{t("compatibilityPage.dob")}</label>
        <input
          type="date"
          value={form[who].dob}
          onChange={(e) => updatePerson(who, "dob", e.target.value)}
          disabled={disabled}
          className={cn(inputClass, disabled && "opacity-50 cursor-not-allowed")}
          style={style}
        />
      </div>
      <div>
        <label className="text-xs text-[var(--text-muted)] ml-1 mb-1 block">{t("compatibilityPage.tob")}</label>
        <input
          type="time"
          value={form[who].time}
          onChange={(e) => updatePerson(who, "time", e.target.value)}
          disabled={disabled}
          className={cn(inputClass, disabled && "opacity-50 cursor-not-allowed")}
          style={style}
        />
      </div>
      {disabled ? (
        <input
          value={form[who].place}
          disabled
          readOnly
          className={cn(inputClass, "opacity-50 cursor-not-allowed")}
          style={style}
        />
      ) : (
        <PlaceAutocomplete
          placeholder={t("compatibilityPage.birthPlace")}
          inputClassName={inputClass}
          inputStyle={style}
          worldwide={!user?.phoneE164}
          onSelect={(place) => {
            setForm((prev) => ({ ...prev, [who]: { ...prev[who], place: place?.name ?? "" } }));
            if (who === "boy") setResolvedBoyPlace(place);
            else setResolvedGirlPlace(place);
            if (place) setError(null);
          }}
        />
      )}
    </div>
  );

  const showForm = reportState === "idle" || reportState === "error";
  // Once the catalogue has actually loaded, match_report existing-but-disabled means an admin
  // retired the paid Compatibility Match Report — every REPORT_CATALOGUE key always comes back
  // from GET /v1/reports regardless of `enabled` (see backend's getReportCatalogueForUser), so
  // `matchReportEntry` being present-but-disabled is the real signal, not merely absent. Fails
  // open (shows the form) while the catalogue is still loading or hasn't resolved an entry yet —
  // same fail-open convention as every other feature check in this app (see resolveFeature).
  const matchReportUnavailable = catalogue !== null && matchReportEntry !== undefined && !matchReportEntry.enabled;

  return (
    <main className="min-h-screen pb-tab-safe" style={{ background: "var(--background)" }}>
      <div className="px-5 pt-10">
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-3xl font-bold text-center text-gold font-display"
        >
          ❤️ {t("compatibilityPage.title")}
        </motion.h1>
        <p className="text-center text-sm text-[var(--text-muted)] mt-2">
          {t("compatibilityPage.subtitle")}
        </p>

        <ProfileSwitchTrigger className="mt-6 mb-2" />

        {showForm && matchReportUnavailable && (
          <div className="mt-8 flex flex-col items-center text-center gap-2 py-10">
            <AlertTriangle size={24} className="text-muted" />
            <p className="text-sm font-semibold text-foreground">{t("compatibilityPage.unavailableTitle")}</p>
            <p className="text-xs text-muted max-w-xs">{t("compatibilityPage.unavailableBody")}</p>
          </div>
        )}

        {showForm && !matchReportUnavailable && (
          <div className="mt-4 space-y-4">
            <label
              className={cn(
                "flex items-start gap-2.5 px-1 text-xs leading-relaxed",
                hasSavedBirthDetails ? "cursor-pointer" : "cursor-not-allowed",
              )}
              style={{ color: "var(--text-muted)" }}
            >
              <input
                type="checkbox"
                checked={useMyDetails}
                disabled={!hasSavedBirthDetails}
                onChange={(e) => toggleUseMyDetails(e.target.checked)}
                className="mt-0.5 w-4 h-4 shrink-0 accent-yellow-500 disabled:opacity-40"
              />
              <span>
                {t("compatibilityPage.useMyDetails")}
                {!hasSavedBirthDetails && (
                  <>
                    {" — "}
                    <Link href="/profile" className="text-gold underline underline-offset-2">
                      {t("compatibilityPage.useMyDetailsHint")}
                    </Link>
                  </>
                )}
              </span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              {renderPersonFields("boy", t("compatibilityPage.person1"), useMyDetails && user?.gender !== "female")}
              {renderPersonFields("girl", t("compatibilityPage.person2"), useMyDetails && user?.gender === "female")}
            </div>

            {!selfSide && (form.boy.dob || form.girl.dob) && (
              <p className="text-xs text-amber-400 px-1 leading-relaxed">
                {t("compatibilityPage.selectSelfSideHint")}
              </p>
            )}

            <label className="flex items-start gap-2.5 px-1 text-xs leading-relaxed cursor-pointer" style={{ color: "var(--text-muted)" }}>
              <input
                type="checkbox"
                checked={consented}
                onChange={(e) => setConsented(e.target.checked)}
                className="mt-0.5 w-4 h-4 shrink-0 accent-yellow-500"
              />
              {t("compatibilityPage.consent")}
            </label>

            {insufficient ? (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-amber-400 text-center">
                  {t("reports.purchase.notEnough", { cost: formatRupees(costPaise), amount: formatRupees(balancePaise) })}
                </p>
                <button
                  onClick={() => router.push("/payment")}
                  className="w-full h-14 rounded-2xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold"
                >
                  {t("reports.purchase.getCredits")}
                </button>
              </div>
            ) : confirming ? (
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirming(false)}
                  disabled={purchasing}
                  className="flex-1 h-14 rounded-2xl border border-gold/20 text-[var(--text-muted)] font-medium disabled:opacity-50"
                >
                  {t("common.no")}
                </button>
                <button
                  onClick={purchase}
                  disabled={purchasing}
                  className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold disabled:opacity-50"
                >
                  {purchasing ? t("reports.purchase.processing") : t("reports.purchase.confirmYes")}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirming(true)}
                disabled={!canSubmit}
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold disabled:opacity-40 transition-opacity"
              >
                {t("compatibilityPage.checkBtn")} · {formatRupees(costPaise)}
              </button>
            )}
          </div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 rounded-2xl border border-red-500/30 text-red-400 text-sm"
            style={{ background: "var(--surface)" }}
          >
            {error}
          </motion.div>
        )}

        {(reportState === "loading" || reportState === "generating") && (
          <>
            <GeneratingSpinner label={t("reports.view.generatingTitle")} size={40} className="py-16" />
            <p className="text-xs text-muted text-center -mt-2">{t("reports.view.generatingBody")}</p>
          </>
        )}

        {reportState === "failed" && (
          <div className="flex flex-col items-center text-center gap-3 py-16">
            <AlertTriangle size={28} className="text-red-400" />
            <p className="text-sm font-semibold text-foreground">{t("reports.view.failedTitle")}</p>
            <p className="text-xs text-muted max-w-xs">{t("reports.view.failedBody")}</p>
            <button
              onClick={() => setReportId(null)}
              className="mt-2 text-sm font-semibold text-gold underline underline-offset-4"
            >
              {t("reports.view.tryAgain")}
            </button>
          </div>
        )}

        {reportState === "ready" && scores && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 p-6 rounded-3xl border space-y-5"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <GunaKootaBreakdown entries={scores.gunaBreakdown} />

            <div className="p-3 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--background)" }}>
              <div className="flex flex-wrap justify-between items-center gap-x-2 gap-y-1 text-sm" style={{ color: "var(--text-muted)" }}>
                <span>{t("compatibilityPage.mangalDosha")}</span>
                <span className={`font-medium whitespace-nowrap ${scores.manglikStatus.person1 === scores.manglikStatus.person2 ? "text-emerald-400" : "text-amber-400"}`}>
                  {scores.manglikStatus.person1 === scores.manglikStatus.person2
                    ? t("compatibilityPage.mangalDoshaMatched")
                    : t("compatibilityPage.mangalDoshaMismatched")}
                </span>
              </div>
              {scores.manglikStatus.cancelled && (
                <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  {t("compatibilityPage.mangalDoshaCancelledNote")}
                </p>
              )}
            </div>

            <MatchReportCards sections={areaCards} riskFactors={scores.riskFactors} />
            <DosAndDontsCard closingSections={closingSections} />

            <button
              onClick={askAstrologer}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-gold/30 bg-gold/5 text-gold text-sm font-semibold transition-all active:scale-[0.98] hover:bg-gold/10"
            >
              <MessageCircle size={16} />
              {t("kundli.house.askAstrologer")}
            </button>
          </motion.div>
        )}

        {/* Saved reports — profile-scoped history, most recent first. */}
        {showForm && matchReportEntry && matchReportEntry.purchases.length > 0 && (
          <div className="mt-8">
            <p className="text-xs font-semibold text-gold uppercase tracking-wider mb-2 px-1">
              {t("compatibilityPage.savedReports")}
            </p>
            <div className="space-y-2">
              {matchReportEntry.purchases.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => setReportId(p.id)}
                  className="w-full flex items-center justify-between p-3 rounded-xl border text-left"
                  style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                >
                  <span className="text-sm text-foreground">
                    {t("compatibilityPage.savedReportLabel", { n: matchReportEntry.purchases.length - i })}
                  </span>
                  {p.status === "generating" && <Loader2 size={16} className="animate-spin text-gold" />}
                  {p.status === "failed" && <span className="text-xs text-red-400">{t("reports.view.failedTitle")}</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Profile picker sheets */}
      <BirthProfilePickerSheet
        open={boyPickerOpen}
        onClose={() => setBoyPickerOpen(false)}
        genderFilter="male"
        onSelect={(profile) => applyProfile("boy", profile)}
      />
      <BirthProfilePickerSheet
        open={girlPickerOpen}
        onClose={() => setGirlPickerOpen(false)}
        genderFilter="female"
        onSelect={(profile) => applyProfile("girl", profile)}
      />
    </main>
  );
}
