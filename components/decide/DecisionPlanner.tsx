"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Briefcase,
  CalendarSearch,
  Car,
  Flame,
  GraduationCap,
  Heart,
  Home,
  PenLine,
  Plane,
  Rocket,
  Scale,
  Store,
} from "lucide-react";
import ParticleBackground from "@/components/ParticleBackground";
import IconButton from "@/components/ui/IconButton";
import Card from "@/components/ui/Card";
import PlaceAutocomplete from "@/components/PlaceAutocomplete";
import { ApiError, type PlaceOfBirth } from "@/lib/api";
import { formatRupees } from "@/lib/format";
import { istToday, shortDate } from "@/lib/calendar-format";
import { categoryKey } from "@/lib/decision-format";
import {
  DECISION_CATEGORIES,
  MUHURTA_CATEGORIES,
  RANGE_OPTIONS,
  decisionsApi,
  type DecisionKind,
  type DecisionList,
  type DecisionResult,
} from "@/lib/decisions-api";
import { useAuth } from "@/providers/auth-provider";
import DecisionResultView from "./DecisionResultView";

const ICONS: Record<string, ReactNode> = {
  careerChange: <Briefcase size={18} />,
  property: <Home size={18} />,
  house: <Home size={18} />,
  marriage: <Heart size={18} />,
  businessLaunch: <Store size={18} />,
  relocation: <Plane size={18} />,
  travel: <Plane size={18} />,
  education: <GraduationCap size={18} />,
  vehicle: <Car size={18} />,
  agreement: <PenLine size={18} />,
  productLaunch: <Rocket size={18} />,
  puja: <Flame size={18} />,
};

type RunError = "funds" | "notReady" | "error";

/**
 * Decision Astrology (kind "decision", /decide) and Find My Date (kind
 * "muhurta", /find-date): pick a category, add a question or a place and a
 * range, pay once, get the scored result. `?id=` reopens a saved result for
 * free. Ships off — the pages are behind nav.decisions / panchang.findMyDate.
 */
export default function DecisionPlanner({ kind }: { kind: DecisionKind }) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { user, refresh } = useAuth();
  const ns = kind === "decision" ? "decide" : "findDate";
  const categories: readonly string[] = kind === "decision" ? DECISION_CATEGORIES : MUHURTA_CATEGORIES;

  const [list, setList] = useState<DecisionList | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [days, setDays] = useState<number>(kind === "decision" ? 90 : 60);
  const [place, setPlace] = useState<PlaceOfBirth | null>(user?.placeOfBirth ?? null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<RunError | null>(null);
  const [result, setResult] = useState<DecisionResult | null>(null);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (id) decisionsApi.get(id).then(setResult).catch(() => setError("error"));
  }, []);

  useEffect(() => {
    decisionsApi
      .list(kind)
      .then(setList)
      .catch(() => setList(null));
  }, [kind, result]);

  const price = list ? list.prices[kind] : null;

  async function run() {
    if (!category || running) return;
    if (kind === "muhurta" && !place) return;
    setRunning(true);
    setError(null);
    try {
      const from = istToday();
      const res =
        kind === "decision"
          ? await decisionsApi.decide({
              category: category as (typeof DECISION_CATEGORIES)[number],
              ...(question.trim() ? { question: question.trim() } : {}),
              from,
              days,
            })
          : await decisionsApi.findDate({
              category: category as (typeof MUHURTA_CATEGORIES)[number],
              place: place!,
              from,
              days,
            });
      setResult(res);
      window.history.replaceState({}, "", `?id=${res.id}`);
      void refresh();
    } catch (err) {
      const code = err instanceof ApiError ? err.message : "";
      setError(code === "INSUFFICIENT_CREDITS" ? "funds" : code === "CHART_NOT_READY" ? "notReady" : "error");
    } finally {
      setRunning(false);
    }
  }

  function startOver() {
    setResult(null);
    setError(null);
    window.history.replaceState({}, "", window.location.pathname);
  }

  const inputStyle = { background: "var(--surface)", borderColor: "var(--border)", color: "var(--foreground)" };

  return (
    <main className="cosmic-bg min-h-screen pb-tab-safe relative overflow-hidden text-foreground">
      <ParticleBackground />
      <div className="relative z-10 px-5 pt-8 max-w-lg mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <IconButton onClick={() => router.back()} aria-label={t("common.back")}>
            <ArrowLeft size={18} />
          </IconButton>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-display flex items-center gap-2">
              {kind === "decision" ? (
                <Scale size={18} className="text-gold" />
              ) : (
                <CalendarSearch size={18} className="text-gold" />
              )}
              {t(`${ns}.title`)}
            </h1>
            <p className="text-[11px] text-muted">{t(`${ns}.subtitle`)}</p>
          </div>
        </div>

        {result ? (
          <>
            <DecisionResultView result={result} />
            <button
              type="button"
              onClick={startOver}
              className="w-full h-11 rounded-full border text-sm font-medium"
              style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
            >
              {t("decide.change")}
            </button>
          </>
        ) : (
          <>
            <div>
              <p className="mb-2 text-sm font-medium text-foreground/90">{t(`${ns}.step1`)}</p>
              <div className="grid grid-cols-2 gap-2">
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    aria-pressed={category === c}
                    className={`flex items-center gap-2 rounded-2xl border px-3 py-3 text-left text-sm transition-colors ${
                      category === c ? "border-gold bg-gold/15 text-gold" : "border-gold/15 bg-surface/50 text-foreground/90"
                    }`}
                  >
                    <span className="shrink-0 text-gold">{ICONS[c]}</span>
                    <span className="leading-tight">{t(categoryKey(kind, c))}</span>
                  </button>
                ))}
              </div>
            </div>

            {category && (
              <Card className="p-4 border-gold/15 space-y-4">
                {kind === "decision" ? (
                  <label className="block space-y-1.5">
                    <span className="text-xs text-muted">{t("decide.questionLabel")}</span>
                    <textarea
                      value={question}
                      onChange={(e) => setQuestion(e.target.value.slice(0, 300))}
                      placeholder={t("decide.questionPlaceholder")}
                      rows={2}
                      className="w-full resize-none rounded-2xl border px-4 py-3 text-base outline-none focus:border-yellow-500/60"
                      style={inputStyle}
                    />
                  </label>
                ) : (
                  <div className="space-y-1.5">
                    <span className="text-xs text-muted">{t("findDate.placeLabel")}</span>
                    <PlaceAutocomplete
                      placeholder={t("findDate.placePlaceholder")}
                      defaultQuery={place?.name ?? ""}
                      worldwide={!user?.phoneE164}
                      inputClassName="w-full h-12 rounded-2xl px-4 outline-none border text-base focus:border-yellow-500/60"
                      inputStyle={inputStyle}
                      onSelect={setPlace}
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <span className="text-xs text-muted">{t("decide.rangeLabel")}</span>
                  <div className="flex gap-2">
                    {RANGE_OPTIONS.map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setDays(n)}
                        aria-pressed={days === n}
                        className={`flex-1 rounded-full border px-3 py-2 text-xs ${
                          days === n ? "border-gold bg-gold/15 text-gold" : "border-gold/15 text-foreground/80"
                        }`}
                      >
                        {t("decide.rangeDays", { count: n })}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void run()}
                  disabled={running || (kind === "muhurta" && !place)}
                  className="w-full h-12 rounded-full bg-yellow-500 text-black text-sm font-semibold disabled:opacity-40"
                >
                  {running ? t(`${ns}.running`) : t(`${ns}.run`)}
                </button>
                {list && (
                  <p className="text-center text-[11px] text-muted">
                    {list.pass ? t("decide.free") : price != null ? t("decide.price", { price: formatRupees(price) }) : null}
                  </p>
                )}
                {error && (
                  <p className="text-center text-xs text-rose-300">
                    {t(`decide.${error}`)}{" "}
                    {error === "funds" && (
                      <Link href="/payment" className="font-semibold text-gold underline">
                        {t("decide.addMoney")}
                      </Link>
                    )}
                  </p>
                )}
              </Card>
            )}

            {list && list.items.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-gold">{t("decide.saved")}</p>
                {list.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      window.history.replaceState({}, "", `?id=${item.id}`);
                      decisionsApi.get(item.id).then(setResult).catch(() => setError("error"));
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl border border-gold/10 bg-surface/50 px-3 py-2.5 text-left"
                  >
                    <span className="shrink-0 text-gold">{ICONS[item.category]}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-foreground">
                        {t(categoryKey(item.kind, item.category))}
                      </span>
                      <span className="block truncate text-[11px] text-muted">
                        {item.question ?? item.placeName ?? ""}
                        {" · "}
                        {t("decide.result.range", {
                          from: shortDate(item.from, i18n.language),
                          to: shortDate(item.to, i18n.language),
                        })}
                      </span>
                    </span>
                    <span className="text-xs font-medium text-gold">{t("decide.open")}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
