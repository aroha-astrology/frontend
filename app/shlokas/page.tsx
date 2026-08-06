"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import IconButton from "@/components/ui/IconButton";
import FeatureGuard from "@/components/FeatureGuard";
import { useLanguage } from "@/providers/language-provider";
import { IMG_BASE, loadShlokas, pick, type Shloka } from "@/lib/shlokas";

/**
 * The Shlokas & Japs library — all 50 verses as a picture grid, filterable by
 * deity. Free: no unlock, no credit check, no wallet call anywhere on this
 * route. Reachable from the Home card (`home.shlokas`) and gated as a page by
 * `nav.shlokas`.
 */

function ShlokaGrid({ items }: { items: Shloka[] }) {
  const { lang } = useLanguage();
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((s) => (
        <Link
          key={s.slug}
          href={`/shlokas/${s.slug}`}
          className="rounded-2xl overflow-hidden border border-gold/20 bg-card active:scale-[0.98] transition-transform"
        >
          {/* 10:17 matches the source artwork's own ratio (~200x340), so
              object-cover has nothing to crop. The old 3:4 box sliced the top
              and bottom off every deity. See the detail page for the same fix. */}
          <div className="relative aspect-[10/17] bg-gold/5">
            <Image
              src={IMG_BASE + s.img}
              alt=""
              fill
              sizes="(max-width: 640px) 45vw, 200px"
              className="object-cover"
            />
          </div>
          <div className="p-3">
            <h3 className="text-sm font-display text-gold leading-tight line-clamp-2">
              {pick(s.title, lang)}
            </h3>
            <p className="text-[10px] text-muted mt-1 line-clamp-1">{pick(s.deity, lang)}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

function ShlokasLibrary() {
  const { t } = useTranslation();
  const { lang } = useLanguage();
  const router = useRouter();
  const [shlokas, setShlokas] = useState<Shloka[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [deity, setDeity] = useState<string | null>(null);

  useEffect(() => {
    loadShlokas().then(setShlokas).catch(() => setFailed(true));
  }, []);

  // Deity strings are free text ("Lord Shiva", "Goddess Durga"), so the filter
  // chips are derived from the data rather than a hardcoded list — a new
  // shloka with a new deity gets its chip for free.
  const deities = useMemo(() => {
    if (!shlokas) return [];
    return [...new Set(shlokas.map((s) => pick(s.deity, lang)))].sort();
  }, [shlokas, lang]);

  const visible = useMemo(() => {
    if (!shlokas) return [];
    return deity ? shlokas.filter((s) => pick(s.deity, lang) === deity) : shlokas;
  }, [shlokas, deity, lang]);

  return (
    <main className="min-h-screen pb-tab-safe" style={{ background: "var(--background)" }}>
      <div className="px-5 pt-4 max-w-lg mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <IconButton onClick={() => router.back()} aria-label={t("common.back")}>
            <ArrowLeft size={18} />
          </IconButton>
          <h1 className="text-lg font-display text-foreground flex-1 truncate">{t("shlokas.title")}</h1>
        </div>

        {failed && (
          <div className="flex flex-col items-center text-center gap-3 py-16">
            <AlertTriangle size={28} className="text-red-400" />
            <p className="text-sm text-muted max-w-xs">{t("shlokas.loadError")}</p>
          </div>
        )}

        {!shlokas && !failed && <p className="text-sm text-muted text-center py-16">{t("shlokas.loading")}</p>}

        {shlokas && (
          <>
            <p className="text-xs text-muted leading-relaxed">{t("shlokas.desc")}</p>

            <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-1">
              {[null, ...deities].map((d) => (
                <button
                  key={d ?? "__all"}
                  type="button"
                  onClick={() => setDeity(d)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs border transition-colors ${
                    deity === d
                      ? "border-gold bg-gold/10 text-gold"
                      : "border-gold/20 text-muted hover:border-gold/40"
                  }`}
                >
                  {d ?? t("shlokas.allDeities")}
                </button>
              ))}
            </div>

            <ShlokaGrid items={visible} />
          </>
        )}
      </div>
    </main>
  );
}

export default function ShlokasPage() {
  return (
    <FeatureGuard featureKey="nav.shlokas">
      <ShlokasLibrary />
    </FeatureGuard>
  );
}
