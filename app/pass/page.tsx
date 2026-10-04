"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Crown, ExternalLink, MessageCircle } from "lucide-react";
import ParticleBackground from "@/components/ParticleBackground";
import IconButton from "@/components/ui/IconButton";
import Card from "@/components/ui/Card";
import PassBenefits from "@/components/pass/PassBenefits";
import { ApiError } from "@/lib/api";
import { formatRupees } from "@/lib/format";
import { shortDate } from "@/lib/calendar-format";
import {
  passApi,
  PLAY_SUBSCRIPTIONS_URL,
  type PassOffer,
  type PassStatus,
  type QuestionPack,
} from "@/lib/pass-api";
import { isNativeAndroid, isNativeIOS, PlayBilling } from "@/lib/play-billing";
import { installedAndroidBuild, PLAY_PASS_UPGRADE_BUILD, PLAY_SUBSCRIPTIONS_BUILD } from "@/lib/app-update";
import { PLAY_STORE_URL } from "@/lib/app-review";
import { useAuth } from "@/providers/auth-provider";

type ActionError = "funds" | "failed";
type Platform = "android" | "ios" | "web";

/** The user backed out of the Play purchase sheet — not an error. */
function isUserCancelled(err: unknown): boolean {
  return err !== null && typeof err === "object" && "code" in err && (err as { code?: string }).code === "1";
}

function StoreLink({ label }: { label: string }) {
  return (
    <a
      href={PLAY_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-gold"
    >
      {label}
      <ExternalLink size={14} />
    </a>
  );
}

/**
 * The Aroha Pass comes in three tiers (Silver, Gold, Platinum): more questions,
 * more of the Pass-only features and a bigger report discount at each step. It
 * is a Google Play subscription only: it is never paid from the wallet. Android
 * (app 1.13+) subscribes here, and app 1.14+ can move a subscriber up a tier;
 * older Android builds are asked to update; the web points to the Android app;
 * iOS gets a plain notice, since Apple's rules don't allow sending iPhone users
 * elsewhere to pay.
 */
function PassPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { user, refresh } = useAuth();
  const [status, setStatus] = useState<PassStatus | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ActionError | null>(null);
  const [platform, setPlatform] = useState<Platform | null>(null);
  // The installed Android build: 1.12 and older can't buy a subscription, 1.13 can't change tier.
  const [build, setBuild] = useState<number | null>(null);
  const [packNote, setPackNote] = useState<string | null>(null);

  useEffect(() => {
    passApi
      .status()
      .then(setStatus)
      .catch(() => setLoadError(true));
    void Promise.all([isNativeAndroid(), isNativeIOS()]).then(([android, ios]) =>
      setPlatform(android ? "android" : ios ? "ios" : "web"),
    );
    void installedAndroidBuild().then(setBuild);
  }, []);

  /** Runs a purchase; true when it went through. */
  const run = useCallback(
    async (action: () => Promise<PassStatus>): Promise<boolean> => {
      setBusy(true);
      setError(null);
      try {
        setStatus(await action());
        void refresh();
        return true;
      } catch (err) {
        if (!isUserCancelled(err)) {
          setError(err instanceof ApiError && err.message === "INSUFFICIENT_CREDITS" ? "funds" : "failed");
        }
        return false;
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  /** Subscribes to `offer`, or with `upgrade` swaps the subscription held now for it. */
  async function buyWithPlay(offer: PassOffer, upgrade: boolean) {
    await run(async () => {
      let oldPurchaseToken: string | undefined;
      if (upgrade) {
        const { purchases } = await PlayBilling.queryActiveSubscriptions();
        oldPurchaseToken = purchases.find((p) => p.productId === offer.play.productId)?.purchaseToken;
        // Nothing to swap on this Play account: buying now would start a second subscription.
        if (!oldPurchaseToken) throw new Error("No Play subscription to upgrade");
      }
      const purchase = await PlayBilling.purchaseProduct({
        productId: offer.play.productId,
        userId: user?.id,
        productType: "subs",
        basePlanId: offer.play.basePlanId,
        oldPurchaseToken,
      });
      return passApi.confirmPlay(purchase.productId, purchase.purchaseToken);
    });
  }

  async function restorePlay() {
    await run(async () => {
      const { purchases } = await PlayBilling.queryActiveSubscriptions();
      const productId = status?.offers[0]?.play.productId;
      let latest = await passApi.status();
      for (const p of purchases.filter((x) => x.productId === productId)) {
        latest = await passApi.confirmPlay(p.productId, p.purchaseToken);
      }
      return latest;
    });
  }

  async function buyPack(pack: QuestionPack, questions: number) {
    setPackNote(null);
    if (await run(() => passApi.buyPack(pack))) setPackNote(t("pass.packs.bought", { count: questions }));
  }

  const lang = i18n.language;
  const pass = status?.pass ?? null;
  const offers = status?.offers ?? [];
  const canSubscribe = platform === "android" && build != null && build >= PLAY_SUBSCRIPTIONS_BUILD;
  const canUpgrade = platform === "android" && build != null && build >= PLAY_PASS_UPGRADE_BUILD;
  // Where the user's own Pass sits among the tiers on offer; -1 without a tiered Pass.
  const ownIndex = pass?.tier ? offers.findIndex((o) => o.tier === pass.tier) : -1;
  // Only a Google Play Pass can be swapped for a higher one.
  const upgradable = pass?.source === "google_play" && ownIndex >= 0;
  const hasHigher = upgradable && ownIndex < offers.length - 1;
  const hasLower = upgradable && ownIndex > 0;

  return (
    <main className="cosmic-bg min-h-screen pb-tab-safe relative overflow-hidden text-foreground">
      <ParticleBackground />
      <div className="relative z-10 page-container pt-8 space-y-4 page-cols">
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
            {pass && (
              <Card className="p-5 border-gold/30 space-y-2" data-testid="pass-active">
                <p className="flex items-center gap-2 text-base font-semibold text-gold">
                  <Crown size={16} />
                  {pass.tier
                    ? t("pass.active.titleTier", { pass: t(`pass.tier.${pass.tier}`) })
                    : t("pass.active.title")}
                </p>
                {pass.source !== "group" && (
                  <p className="text-sm text-foreground/90">
                    {pass.source === "google_play" && pass.autoRenew
                      ? t("pass.active.renews", { date: shortDate(pass.periodEnd.slice(0, 10), lang) })
                      : t("pass.active.until", { date: shortDate(pass.periodEnd.slice(0, 10), lang) })}
                  </p>
                )}
                <p className="flex items-center gap-1.5 text-sm text-foreground/90">
                  <MessageCircle size={14} className="text-gold" />
                  {t("pass.active.questionsLeft", { count: pass.questionsLeft, total: pass.questionsPerPeriod })}
                </p>
                {pass.source === "google_play" ? (
                  <>
                    <p className="text-[11px] text-muted">
                      {t("pass.active.sourcePlay")} ·{" "}
                      {t(pass.autoRenew ? "pass.active.autoRenewOn" : "pass.active.autoRenewOff")}
                    </p>
                    <a
                      href={PLAY_SUBSCRIPTIONS_URL}
                      className="text-xs font-medium text-gold underline underline-offset-2"
                    >
                      {t("pass.active.manage")}
                    </a>
                  </>
                ) : (
                  <p className="text-[11px] text-muted">
                    {t(pass.source === "group" ? "pass.active.sourceGroup" : "pass.active.walletEnds")}
                  </p>
                )}
              </Card>
            )}

            {pass && (
              <Card className="p-4 border-gold/10 space-y-2" data-testid="pass-included">
                <p className="text-xs font-semibold uppercase tracking-wider text-gold">{t("pass.benefitsTitle")}</p>
                <PassBenefits benefits={pass} showMissing />
              </Card>
            )}

            {!pass && offers.length === 0 && status.enabled && (
              <p className="text-sm text-muted">{t("pass.notAvailable")}</p>
            )}

            {offers.length > 0 && (
              <div className="space-y-3 md:col-span-full" data-testid="pass-tiers">
                <p className="text-xs font-semibold uppercase tracking-wider text-gold">
                  {t(pass ? "pass.compareTitle" : "pass.chooseTitle")}
                </p>
                <div className="grid gap-3 md:grid-cols-3">
                  {offers.map((offer, i) => {
                    const own = i === ownIndex;
                    // Gold is the one to lead with while the user hasn't picked a Pass.
                    const recommended = !pass && offer.tier === "gold" && offers.length > 1;
                    return (
                      <Card
                        key={offer.tier}
                        className={`flex flex-col gap-3 p-5 ${own || recommended ? "border-gold/50" : "border-gold/15"}`}
                        data-testid={`pass-tier-${offer.tier}`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="flex items-center gap-1.5 text-sm font-semibold text-gold">
                              <Crown size={14} />
                              {t(`pass.tier.${offer.tier}`)}
                            </p>
                            {(own || recommended) && (
                              <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-semibold text-gold">
                                {t(own ? "pass.yourPass" : "pass.recommended")}
                              </span>
                            )}
                          </div>
                          <p className="text-2xl font-display text-foreground">
                            {t("pass.perMonth", { price: formatRupees(offer.pricePaise) })}
                          </p>
                        </div>
                        <PassBenefits benefits={offer} showMissing />
                        {!pass && canSubscribe && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void buyWithPlay(offer, false)}
                            className="mt-auto w-full h-12 rounded-full bg-yellow-500 text-black text-sm font-semibold disabled:opacity-40"
                          >
                            {t("pass.buyPlay")}
                          </button>
                        )}
                        {upgradable && i > ownIndex && canUpgrade && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void buyWithPlay(offer, true)}
                            className="mt-auto w-full h-12 rounded-full bg-yellow-500 text-black text-sm font-semibold disabled:opacity-40"
                          >
                            {t("pass.upgradeTo", { pass: t(`pass.tier.${offer.tier}`) })}
                          </button>
                        )}
                      </Card>
                    );
                  })}
                </div>

                {!pass && (
                  <div className="space-y-2 text-center">
                    {canSubscribe && (
                      <>
                        <p className="text-xs text-muted">{t("pass.renewNote")}</p>
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
                    {platform === "android" && !canSubscribe && (
                      <div className="space-y-2" data-testid="pass-update-app">
                        <p className="text-sm text-foreground/90">{t("pass.playNeedsUpdate")}</p>
                        <StoreLink label={t("pass.updateApp")} />
                      </div>
                    )}
                    {platform === "web" && (
                      <div className="space-y-2" data-testid="pass-android-only">
                        <p className="text-sm text-foreground/90">{t("pass.androidOnly")}</p>
                        <StoreLink label={t("pass.getAndroidApp")} />
                      </div>
                    )}
                    {platform === "ios" && <p className="text-sm text-foreground/90">{t("pass.iosSoon")}</p>}
                    <p className="text-[11px] text-muted">{t("pass.playOnly")}</p>
                  </div>
                )}

                {(hasHigher || hasLower) && (
                  <div className="space-y-2 text-center" data-testid="pass-change">
                    {hasHigher && canUpgrade && <p className="text-xs text-muted">{t("pass.upgradeNote")}</p>}
                    {hasHigher && platform === "android" && !canUpgrade && (
                      <div className="space-y-2">
                        <p className="text-sm text-foreground/90">{t("pass.upgradeNeedsUpdate")}</p>
                        <StoreLink label={t("pass.updateApp")} />
                      </div>
                    )}
                    {hasHigher && platform === "web" && (
                      <p className="text-sm text-foreground/90">{t("pass.upgradeAndroidOnly")}</p>
                    )}
                    {hasLower && <p className="text-[11px] text-muted">{t("pass.downgradeNote")}</p>}
                  </div>
                )}
              </div>
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
