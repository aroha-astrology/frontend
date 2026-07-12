"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { MessageCircle } from "lucide-react";
import { matchmaking, type MatchmakingResponse, type BirthInput } from "@/lib/swarm-api";
import PlaceAutocomplete from "@/components/PlaceAutocomplete";
import type { PlaceOfBirth } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";
import { CHAT_PENDING_CONTEXT_KEY } from "@/lib/chat-handoff";

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
  const { t } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState<CompatForm>({
    boy: { ...emptyPerson },
    girl: { ...emptyPerson },
  });
  const [resolvedBoyPlace, setResolvedBoyPlace] = useState<PlaceOfBirth | null>(null);
  const [resolvedGirlPlace, setResolvedGirlPlace] = useState<PlaceOfBirth | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MatchmakingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Matchmaking involves a second person's birth data, often entered without
  // them present — require an explicit consent acknowledgement before submit.
  const [consented, setConsented] = useState(false);
  // "This is me" — prefill Person 1 from the signed-in user's saved birth
  // details instead of retyping them for every match check.
  const [useMyDetails, setUseMyDetails] = useState(false);
  const hasSavedBirthDetails = !!user?.dateOfBirth;

  const updatePerson = (who: "boy" | "girl", field: keyof PersonForm, value: string) => {
    setForm((prev) => ({
      ...prev,
      [who]: { ...prev[who], [field]: value },
    }));
  };

  const toggleUseMyDetails = (checked: boolean) => {
    setUseMyDetails(checked);
    if (checked && user) {
      setForm((prev) => ({
        ...prev,
        boy: {
          name: user.displayName ?? "",
          dob: user.dateOfBirth ?? "",
          time: (user.timeOfBirth ?? "").slice(0, 5),
          place: user.placeOfBirth?.name ?? "",
        },
      }));
      setResolvedBoyPlace(user.placeOfBirth ?? null);
    } else {
      setForm((prev) => ({ ...prev, boy: { ...emptyPerson } }));
      setResolvedBoyPlace(null);
    }
  };

  const check = async () => {
    if (!form.boy.name || !form.girl.name || !form.boy.dob || !form.girl.dob || !consented) return;
    if (!resolvedBoyPlace || !resolvedGirlPlace) {
      setError(t("common.selectPlaceFromList"));
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const person1: BirthInput = {
        date: form.boy.dob,
        time: form.boy.time || "12:00",
        latitude: resolvedBoyPlace.lat,
        longitude: resolvedBoyPlace.lon,
        timezone: resolvedBoyPlace.tz,
      };

      const person2: BirthInput = {
        date: form.girl.dob,
        time: form.girl.time || "12:00",
        latitude: resolvedGirlPlace.lat,
        longitude: resolvedGirlPlace.lon,
        timezone: resolvedGirlPlace.tz,
      };

      const response = await matchmaking(person1, person2);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("compatibilityPage.checkError"));
    } finally {
      setLoading(false);
    }
  };

  const totalScore = result?.totalScore ?? 0;
  const maxTotal = result?.maxScore ?? 36;
  const pct = maxTotal > 0 ? Math.round((totalScore / maxTotal) * 100) : 0;
  // Nadi (0/8) and Bhakoot (0/7) doshas are near-disqualifying red flags in
  // traditional matching — surface them before the total score. Prefer the
  // backend's computed flags; fall back to deriving from kutaDetails.
  const redFlags = (result?.kutaDetails ?? []).filter(
    (k) =>
      (k.name === "Nadi" && (result?.flags?.nadiDosha ?? k.obtained === 0)) ||
      (k.name === "Bhakoot" && (result?.flags?.bhakootDosha ?? k.obtained === 0)),
  );

  const verdictColor =
    pct >= 75 ? "text-green-400" : pct >= 50 ? "text-yellow-400" : "text-red-400";
  const verdictLabel =
    pct >= 75 ? t("compatibilityPage.excellentMatch") : pct >= 50 ? t("compatibilityPage.goodMatch") : t("compatibilityPage.needsAttention");

  const askAstrologer = () => {
    if (!result) return;
    const parts = [
      t("compatibilityPage.summary", { name1: form.boy.name, name2: form.girl.name, total: totalScore, max: maxTotal }),
      ...redFlags.map((k) => t("compatibilityPage.doshaFlag", { koota: k.name, max: k.maximum })),
      t("compatibilityPage.askAstrologerPrompt"),
    ];
    sessionStorage.setItem(CHAT_PENDING_CONTEXT_KEY, parts.join(" "));
    router.push("/ai-chat");
  };

  const inputClass =
    "w-full h-14 rounded-2xl px-4 outline-none border text-sm focus:border-yellow-500/60 transition-colors";
  const style = { background: "var(--surface)", borderColor: "var(--border)", color: "var(--foreground)" };

  const renderPersonFields = (who: "boy" | "girl", label: string, disabled = false) => (
    <div className="space-y-3">
      <p className="text-xs text-[var(--text-muted)] ml-1">{label}</p>
      <input
        placeholder={t("compatibilityPage.name")}
        value={form[who].name}
        onChange={(e) => updatePerson(who, "name", e.target.value)}
        disabled={disabled}
        className={cn(inputClass, disabled && "opacity-50 cursor-not-allowed")}
        style={style}
      />
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
          onSelect={(place) => {
            updatePerson(who, "place", place?.name ?? "");
            if (who === "boy") setResolvedBoyPlace(place);
            else setResolvedGirlPlace(place);
            if (place) setError(null);
          }}
        />
      )}
    </div>
  );

  return (
    <main className="min-h-screen pb-28" style={{ background: "var(--background)" }}>
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

        <div className="mt-8 space-y-4">
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
            {renderPersonFields("boy", t("compatibilityPage.person1"), useMyDetails)}
            {renderPersonFields("girl", t("compatibilityPage.person2"))}
          </div>

          <label className="flex items-start gap-2.5 px-1 text-xs leading-relaxed cursor-pointer" style={{ color: "var(--text-muted)" }}>
            <input
              type="checkbox"
              checked={consented}
              onChange={(e) => setConsented(e.target.checked)}
              className="mt-0.5 w-4 h-4 shrink-0 accent-yellow-500"
            />
            {t("compatibilityPage.consent")}
          </label>

          <button
            onClick={check}
            disabled={
              !form.boy.name || !form.girl.name || !form.boy.dob || !form.girl.dob ||
              !resolvedBoyPlace || !resolvedGirlPlace || !consented || loading
            }
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold disabled:opacity-40 transition-opacity"
          >
            {loading ? t("compatibilityPage.computing") : t("compatibilityPage.checkBtn")}
          </button>
        </div>

        {/* Error */}
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

        {/* Loading spinner */}
        {loading && (
          <div className="mt-8 flex justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
              className="w-10 h-10 rounded-full border-2 border-yellow-500 border-t-transparent"
            />
          </div>
        )}

        {/* Results */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 p-6 rounded-3xl border"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            {/* Dosha red flags come first — a practitioner would flag these before the total */}
            {redFlags.map((k) => (
              <div
                key={k.name}
                className="mb-4 p-3 rounded-xl border border-red-500/40 bg-red-500/10 text-red-400 text-sm"
              >
                ⚠ {t("compatibilityPage.doshaFlag", { koota: k.name, max: k.maximum })}{" "}
                {k.description ?? t("compatibilityPage.doshaFlagDefault")}
              </div>
            ))}

            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gold font-display">
                  {t("compatibilityPage.gunasScore", { total: totalScore, max: maxTotal })}
                </h2>
                <p className={`${verdictColor} text-sm font-medium mt-0.5`}>
                  {result.compatibility || verdictLabel}{" "}
                  {pct >= 50 && redFlags.length === 0 ? "✓" : ""}
                </p>
              </div>
              <div className="text-4xl">💍</div>
            </div>

            <div className="h-3 rounded-full" style={{ background: "var(--secondary)" }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 1, delay: 0.2 }}
                className="h-3 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full"
              />
            </div>

            {/* Koota scores */}
            <div className="mt-5 space-y-3 text-sm" style={{ color: "var(--text-muted)" }}>
              {result.kutaDetails.map((koota) => (
                <div key={koota.name} className="flex justify-between gap-3">
                  <span>{koota.name}</span>
                  <span className={`font-medium ${koota.obtained === 0 ? "text-red-400" : "text-gold"}`}>
                    {koota.obtained}/{koota.maximum}
                  </span>
                </div>
              ))}
            </div>

            {/* Mangal Dosha — checked independently of the 36-point Ashtakoota system */}
            {result.mangalDosha && (
              <div className="mt-4 flex flex-wrap justify-between items-center gap-x-2 gap-y-1 text-sm" style={{ color: "var(--text-muted)" }}>
                <span>{t("compatibilityPage.mangalDosha")}</span>
                <span className={`font-medium whitespace-nowrap ${result.mangalDosha.matched ? "text-emerald-400" : "text-amber-400"}`}>
                  {t("compatibilityPage.mangalDoshaStatus", {
                    p1: result.mangalDosha.person1 ? t("common.yes") : t("common.no"),
                    p2: result.mangalDosha.person2 ? t("common.yes") : t("common.no"),
                  })}
                </span>
              </div>
            )}

            <p className="mt-4 text-sm text-[var(--text-muted)] leading-relaxed">
              {t("compatibilityPage.summary", { name1: form.boy.name, name2: form.girl.name, total: totalScore, max: maxTotal })}
            </p>

            {result.recommendation && (
              <p className="mt-3 text-xs text-yellow-500 leading-relaxed">{result.recommendation}</p>
            )}

            <button
              onClick={askAstrologer}
              className="mt-5 w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-gold/30 bg-gold/5 text-gold text-sm font-semibold transition-all active:scale-[0.98] hover:bg-gold/10"
            >
              <MessageCircle size={16} />
              {t("kundli.house.askAstrologer")}
            </button>
          </motion.div>
        )}
      </div>
    </main>
  );
}
