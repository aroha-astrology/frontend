"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Loader2 } from "lucide-react";
import { api, type Astrologer } from "@/lib/api";
import IconButton from "@/components/ui/IconButton";
import Card from "@/components/ui/Card";
import StatusPill from "@/components/ui/StatusPill";
import AstrologerBookingDrawer from "@/components/astrologers/AstrologerBookingDrawer";
import { formatRupees } from "@/lib/format";

/**
 * No per-id GET endpoint exists for astrologers — fetch the full (small)
 * list via `listAstrologers()` and `.find()` the matching id client-side,
 * per the plan. Loading until the list resolves, then "not found" if the
 * id still isn't in it.
 */
export default function AstrologerDetailPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [astrologers, setAstrologers] = useState<Astrologer[] | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .listAstrologers()
      .then((list) => {
        if (!cancelled) setAstrologers(list);
      })
      .catch(() => {
        if (!cancelled) setAstrologers([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const astrologer = astrologers?.find((a) => a.id === id) ?? null;
  const initial = astrologer ? (astrologer.displayName || "?").trim().charAt(0).toUpperCase() : "?";

  return (
    <main className="min-h-screen pb-tab-safe bg-background">
      <div className="px-5 pt-8">
        <div className="flex items-center gap-3 mb-6">
          <IconButton onClick={() => router.back()} aria-label={t("common.back")}>
            <ArrowLeft size={18} />
          </IconButton>
          <h1 className="text-lg font-display text-foreground">{t("astrologers.detailTitle")}</h1>
        </div>

        {astrologers === null ? (
          <div className="flex justify-center py-16">
            <Loader2 size={24} className="animate-spin text-gold" />
          </div>
        ) : !astrologer ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-foreground font-semibold mb-1">{t("astrologers.notFoundTitle")}</p>
            <p className="text-xs text-muted mb-4">{t("astrologers.notFoundBody")}</p>
            <button
              onClick={() => router.push("/astrologers")}
              className="text-xs text-gold underline underline-offset-2"
            >
              {t("astrologers.backToDirectory")}
            </button>
          </Card>
        ) : (
          <>
            <Card className="p-6 mb-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-24 h-24 rounded-full overflow-hidden shrink-0">
                  {astrologer.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={astrologer.photoUrl}
                      alt={astrologer.displayName}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-gold/80 to-purple-600/60 flex items-center justify-center text-[#1a0e00] font-display text-3xl">
                      {initial}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-display text-foreground">{astrologer.displayName}</h2>
                    {astrologer.verified && <StatusPill tone="success" label={t("astrologers.verifiedBadge")} />}
                  </div>
                  <p className="text-lg font-semibold text-gold mt-1">
                    {formatRupees(astrologer.ratePaisePerSession)}
                  </p>
                </div>
              </div>

              <p className="text-sm text-foreground/90 leading-relaxed mb-4">
                {astrologer.bio || t("astrologers.noBio")}
              </p>

              {astrologer.specialties.length > 0 && (
                <div className="mb-4">
                  <p className="text-[10px] text-muted uppercase tracking-wider mb-1.5">
                    {t("astrologers.specialtiesLabel")}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {astrologer.specialties.map((s) => (
                      <span key={s} className="border border-gold/10 text-muted rounded-full text-[11px] px-2.5 py-1">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {astrologer.languages.length > 0 && (
                <div>
                  <p className="text-[10px] text-muted uppercase tracking-wider mb-1.5">
                    {t("astrologers.languagesLabel")}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {astrologer.languages.map((l) => (
                      <span key={l} className="border border-gold/10 text-muted rounded-full text-[11px] px-2.5 py-1">
                        {l}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            <button
              onClick={() => setIsDrawerOpen(true)}
              className="w-full py-4 rounded-2xl bg-gold text-[#1a0e00] text-base font-bold transition-all active:scale-[0.98]"
            >
              {t("astrologers.bookButton", { price: formatRupees(astrologer.ratePaisePerSession) })}
            </button>

            <AstrologerBookingDrawer
              astrologer={astrologer}
              isOpen={isDrawerOpen}
              onClose={() => setIsDrawerOpen(false)}
              onBooked={() => {}}
            />
          </>
        )}
      </div>
    </main>
  );
}
