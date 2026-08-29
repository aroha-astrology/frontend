"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";
import Card from "@/components/ui/Card";
import LotusSilhouette from "@/components/LotusSilhouette";
import { useFeature } from "@/hooks/useFeature";
import { useLanguage } from "@/providers/language-provider";
import { tagMeta } from "@/components/shlokas/tag-meta";
import { IMG_BASE, loadShlokas, pick, type Shloka } from "@/lib/shlokas";

/**
 * The daily/tomorrow horoscope's AI-picked remedy mantra — one card inside
 * PersonalizedDetailModal, shared by Home's Today's Reading and the
 * /horoscope page (one edit, both surfaces). Looks up `remedy.slug` against
 * the same 50-shloka library /shlokas already reads (lib/shlokas.ts); a slug
 * that doesn't resolve there — cross-repo drift between the frontend's
 * shlokas.json and the backend's mirrored catalogue, see that file's header
 * comment — just renders nothing, the same fail-soft contract the backend's
 * own parser applies to a bad remedy.
 *
 * Gated on nav.shlokas as well as its own flag: the CTA below links into
 * /shlokas/mala, which is itself behind FeatureGuard featureKey="nav.shlokas"
 * — without that page enabled the button would dead-end.
 */
export default function HoroscopeRemedyCard({
  remedy,
}: {
  remedy: { slug: string; japCount: number; reason: string };
}) {
  const { t } = useTranslation();
  const { lang } = useLanguage();
  const { enabled: remedyEnabled } = useFeature("home.horoscopeRemedy");
  const { enabled: shlokasEnabled } = useFeature("nav.shlokas");
  const [shlokas, setShlokas] = useState<Shloka[] | null>(null);

  useEffect(() => {
    if (!remedyEnabled || !shlokasEnabled) return;
    loadShlokas()
      .then(setShlokas)
      .catch(() => setShlokas([]));
  }, [remedyEnabled, shlokasEnabled]);

  if (!remedyEnabled || !shlokasEnabled) return null;

  const shloka = shlokas?.find((s) => s.slug === remedy.slug);
  if (!shloka) return null;

  const meta = tagMeta(shloka.tags[0] ?? "");
  const Icon = meta.icon;

  return (
    <Card className="p-4 border-gold/15">
      <div className="flex items-center gap-2 text-gold text-xs font-medium uppercase tracking-wider mb-3">
        <Icon size={14} />
        {t("horoscope.remedy.title")}
      </div>

      <div className="flex gap-3">
        <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-gold/25 bg-gold/5 shrink-0">
          <Image src={IMG_BASE + shloka.img} alt="" fill sizes="56px" className="object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate">{pick(shloka.title, lang)}</p>
          <p className="font-devanagari text-sm text-gold/90 truncate mt-0.5">
            {shloka.sanskrit.split("\n")[0]}
          </p>
        </div>
      </div>

      <p className="text-sm text-foreground/90 leading-relaxed mt-3">{remedy.reason}</p>

      <Link
        href={`/shlokas/mala?slug=${shloka.slug}&target=${remedy.japCount}`}
        className="mt-3 flex items-center justify-center gap-1.5 w-full h-11 rounded-full bg-gold text-background text-sm font-semibold"
      >
        <LotusSilhouette className="h-4 w-4" opacity={0.9} />
        {t("horoscope.remedy.chantCta", { count: remedy.japCount })}
        <ChevronRight size={14} />
      </Link>
    </Card>
  );
}
