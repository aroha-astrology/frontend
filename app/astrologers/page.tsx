"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";
import { api, type Astrologer } from "@/lib/api";
import SectionTitle from "@/components/SectionTitle";
import Card from "@/components/ui/Card";
import AstrologerCard from "@/components/astrologers/AstrologerCard";

/** Exact loading-skeleton pattern copied from `TodayReading.tsx`'s loading branch. */
function AstrologerCardSkeleton() {
  return (
    <Card className="p-5 border-gold/10 animate-pulse">
      <div className="h-4 w-32 rounded bg-gold/10 mb-3" />
      <div className="h-3 w-full rounded bg-gold/5 mb-1.5" />
      <div className="h-3 w-2/3 rounded bg-gold/5" />
    </Card>
  );
}

export default function AstrologersPage() {
  const { t } = useTranslation();
  const [astrologers, setAstrologers] = useState<Astrologer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .listAstrologers()
      .then(setAstrologers)
      .catch(() => setError(t("astrologers.loadError")))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main className="min-h-screen pb-tab-safe bg-background">
      <div className="px-5 pt-10">
        <SectionTitle title={t("astrologers.directoryTitle")} subtitle={t("astrologers.directorySubtitle")} />

        <Link
          href="/astrologers/bookings"
          className="inline-flex items-center gap-0.5 text-xs font-medium text-gold hover:text-gold-light transition-colors mb-4"
        >
          {t("astrologers.myBookings")}
          <ChevronRight size={14} />
        </Link>

        <div className="space-y-3">
          {loading ? (
            [...Array(4)].map((_, i) => <AstrologerCardSkeleton key={i} />)
          ) : error ? (
            <div className="flex flex-col items-center gap-2 py-8">
              <p className="text-[12px] text-red-400 text-center">{error}</p>
              <button onClick={load} className="text-[12px] text-gold underline underline-offset-2">
                {t("astrologers.retry")}
              </button>
            </div>
          ) : astrologers.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-sm text-muted">{t("astrologers.emptyState")}</p>
            </Card>
          ) : (
            astrologers.map((a) => <AstrologerCard key={a.id} astrologer={a} />)
          )}
        </div>
      </div>
    </main>
  );
}
