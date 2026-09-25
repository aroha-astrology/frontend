"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Check, Crown, MessageCircle } from "lucide-react";
import ParticleBackground from "@/components/ParticleBackground";
import IconButton from "@/components/ui/IconButton";
import Card from "@/components/ui/Card";
import { ApiError } from "@/lib/api";
import { formatRupees } from "@/lib/format";
import { shortDate } from "@/lib/calendar-format";
import { passApi, PLAY_SUBSCRIPTIONS_URL, type PassStatus, type QuestionPack } from "@/lib/pass-api";
import { isNativeAndroid, PlayBilling } from "@/lib/play-billing";
import { useAuth } from "@/providers/auth-provider";

type ActionError = "funds" | "failed";

function PassPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { user, refresh } = useAuth();
  const [status, setStatus] = useState<PassStatus | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [autoRenew, setAutoRenew] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ActionError | null>(null);
  const [android, setAndroid] = useState(false);
  const [packNote, setPackNote] = useState<string | null>(null);

  useEffect(() => {
    passApi
      .status()
      .then(setStatus)
      .catch(() => setLoadError(true));
    void isNativeAndroid().then(setAndroid);
  }, []);

  const run = useCallback(
    async (action: () => Promise<PassStatus>) => {
      setBusy(true);
      setError(null);
      try {
        setStatus(await action());
        void refresh();
      } catch (err) {
        setError(err instanceof ApiError && err.message === "INSUFFICIENT_CREDITS" ? "funds" : "failed");
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  async function subscribeWithPlay() {
    const play = status?.offer?.play;
    if (!play) return;
    await run(async () => {
      const purchase = await PlayBilling.purchaseProduct({
        productId: play.productId,
        userId: user?.id,
        productType: "subs",
        basePlanId: play.basePlanId,
      });
      return passApi.confirmPlay(purchase.productId, purchase.purchaseToken);
    });
  }

  async function restorePlay() {
    await run(async () => {
      const { purchases } = await PlayBilling.queryActiveSubscriptions();
      let latest = await passApi.status();
      for (const p of purchases.filter((x) => x.productId === status?.offer?.play?.productId)) {
        latest = await passApi.confirmPlay(p.productId, p.purchaseToken);
      }
      return latest;
    });
  }

  async function buyPack(pack: QuestionPack, questions: number) {
    setPackNote(null);
    await run(() => passApi.buyPack(pack));
    setPackNote(t("pass.packs.bought", { count: questions }));
  }

  const lang = i18n.language;
  const b = status?.benefits;

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
              <Crown size={18} className="text-gold" />
              {t("pass.title")}
            </h1>
            <p className="text-[11px] text-muted">{t("pass.subtitle")}</p>
          </div>
        </div>

        {loadError && <p className="py-10 text-center text-sm text-muted">{t("pass.error")}</p>}
        {!loadError && !status && <p className="py-10 text-center text-sm text-muted">{t("pass.loading")}</p>}

        {status && (
          <>
            {status.pass ? (
              <Card className="p-5 border-gold/30 space-y-2" data-testid="pass-active">
                <p className="flex items-center gap-2 text-base font-semibold text-gold">
                  <Crown size={16} />
                  {t("pass.active.title")}
                </p>
                <p className="text-sm text-foreground/90">
                  {status.pass.autoRenew
                    ? t("pass.active.renews", { date: shortDate(status.pass.periodEnd.slice(0, 10), lang) })
                    : t("pass.active.until", { date: shortDate(status.pass.periodEnd.slice(0, 10), lang) })}
                </p>
                <p className="flex items-center gap-1.5 text-sm text-foreground/90">
                  <MessageCircle size={14} className="text-gold" />
                  {t("pass.active.questionsLeft", {
                    count: status.pass.questionsLeft,
                    total: status.benefits.questionsPerPeriod,
                  })}
                </p>
                <p className="text-[11px] text-muted">
                  {t(status.pass.source === "google_play" ? "pass.active.sourcePlay" : "pass.active.sourceWallet")} ·{" "}
                  {t(status.pass.autoRenew ? "pass.active.autoRenewOn" : "pass.active.autoRenewOff")}
                </p>
                {status.pass.source === "google_play" ? (
                  <a href={PLAY_SUBSCRIPTIONS_URL} className="text-xs font-medium text-gold underline underline-offset-2">
                    {t("pass.active.manage")}
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void run(() => passApi.setAutoRenew(!status.pass!.autoRenew))}
                    className="text-xs font-medium text-gold underline underline-offset-2 disabled:opacity-40"
                  >
                    {t(status.pass.autoRenew ? "pass.active.turnOff" : "pass.active.turnOn")}
                  </button>
                )}
              </Card>
            ) : status.offer ? (
              <Card className="p-5 border-gold/30 space-y-4" data-testid="pass-offer">
                <p className="text-2xl font-display text-foreground">
                  {t("pass.perMonth", { price: formatRupees(status.offer.pricePaise) })}
                </p>
                <label className="flex items-center gap-2 text-sm text-foreground/85">
                  <input
                    type="checkbox"
                    checked={autoRenew}
                    onChange={(e) => setAutoRenew(e.target.checked)}
                    className="h-4 w-4 accent-yellow-500"
                  />
                  {t("pass.autoRenew")}
                </label>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void run(() => passApi.buyWallet(autoRenew))}
                  className="w-full h-12 rounded-full bg-yellow-500 text-black text-sm font-semibold disabled:opacity-40"
                >
                  {t("pass.buyWallet", { price: formatRupees(status.offer.pricePaise) })}
                </button>
                {android && status.offer.play && (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void subscribeWithPlay()}
                      className="w-full h-12 rounded-full border border-gold/40 text-sm font-semibold text-gold disabled:opacity-40"
                    >
                      {t("pass.buyPlay")}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void restorePlay()}
                      className="mx-auto block text-[11px] text-muted underline underline-offset-2"
                    >
                      {t("pass.restore")}
                    </button>
                  </>
                )}
              </Card>
            ) : (
              status.enabled && <p className="text-sm text-muted">{t("pass.notAvailable")}</p>
            )}

            {error && (
              <p className="text-center text-xs text-rose-300">
                {t(error === "funds" ? "pass.funds" : "pass.failed")}{" "}
                {error === "funds" && (
                  <Link href="/payment" className="font-semibold text-gold underline">
                    {t("pass.addMoney")}
                  </Link>
                )}
              </p>
            )}

            {b && status.enabled && (
              <Card className="p-4 border-gold/10 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-gold">{t("pass.benefitsTitle")}</p>
                <ul className="space-y-1.5 text-sm text-foreground/90">
                  {[
                    t("pass.benefits.questions", { count: b.questionsPerPeriod }),
                    t("pass.benefits.timeline"),
                    t("pass.benefits.bonds"),
                    t("pass.benefits.decisions"),
                    t("pass.benefits.birthTime"),
                    t("pass.benefits.reports", { pct: b.reportDiscountPct }),
                  ].map((line) => (
                    <li key={line} className="flex gap-2">
                      <Check size={14} className="mt-0.5 shrink-0 text-emerald-400" />
                      {line}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {status.packs.length > 0 && (
              <div className="space-y-2 pb-4" data-testid="question-packs">
                <p className="text-xs font-semibold uppercase tracking-wider text-gold">{t("pass.packs.title")}</p>
                <p className="text-[11px] text-muted">{t("pass.packs.subtitle")}</p>
                {status.questionCredits > 0 && (
                  <p className="text-sm text-foreground/90">{t("pass.packs.credits", { count: status.questionCredits })}</p>
                )}
                {status.packs.map((p) => (
                  <Card key={p.pack} className="flex items-center justify-between gap-3 p-4 border-gold/10">
                    <span className="text-sm font-medium text-foreground">{t("pass.packs.questions", { count: p.questions })}</span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void buyPack(p.pack, p.questions)}
                      className="rounded-full bg-gold/20 px-4 py-2 text-xs font-semibold text-gold disabled:opacity-40"
                    >
                      {t("pass.packs.buy", { price: formatRupees(p.pricePaise) })}
                    </button>
                  </Card>
                ))}
                {packNote && <p className="text-center text-xs text-emerald-400">{packNote}</p>}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

/** The page opens for the Pass or for Question Packs alone; the server says which parts are on. */
export default function PassRoute() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const packKeys = ["paid.questionPackSmall", "paid.questionPackMedium", "paid.questionPackLarge"];
  const anyOn =
    user?.features?.["nav.arohaPass"]?.enabled === true || packKeys.some((k) => user?.features?.[k]?.enabled === true);
  useEffect(() => {
    if (!loading && !anyOn) router.replace("/");
  }, [loading, anyOn, router]);
  if (loading || !anyOn) return null;
  return <PassPage />;
}

