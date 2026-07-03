"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ScrollText } from "lucide-react";
import { LEGAL_DOCS, LEGAL_VERSION, LEGAL_UPDATED, type LegalDoc } from "@/lib/legal-content";

/**
 * Shared renderer for the /legal/* documents. Chrome is translated; the
 * legal body is the English governing text (see lib/legal-content.ts for why),
 * with a translated banner saying so.
 */
export default function LegalPage({ slug }: { slug: LegalDoc["slug"] }) {
  const { t } = useTranslation();
  const router = useRouter();
  const doc = LEGAL_DOCS[slug];

  const others = (Object.keys(LEGAL_DOCS) as LegalDoc["slug"][]).filter((s) => s !== slug);

  return (
    <main className="min-h-screen px-6 pt-6 pb-16 max-w-2xl mx-auto">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-[13px] text-muted mb-6 hover:text-foreground transition-colors"
      >
        <ChevronLeft size={15} /> {t("common.back")}
      </button>

      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-full border border-gold/40 flex items-center justify-center text-gold shrink-0">
          <ScrollText size={18} />
        </div>
        <h1 className="font-display text-[24px] text-foreground leading-tight">
          {t(`legal.${slug}`)}
        </h1>
      </div>

      <p className="text-[12px] text-muted mb-4">
        {t("legal.versionLine", { version: LEGAL_VERSION, date: LEGAL_UPDATED })}
      </p>

      <div className="rounded-xl border border-gold/15 bg-gold/5 px-4 py-3 mb-8">
        <p className="text-[12px] text-muted leading-relaxed">{t("legal.englishNote")}</p>
      </div>

      <article className="space-y-8">
        <p className="text-[14px] text-foreground/90 leading-relaxed">{doc.intro}</p>

        {doc.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="font-display text-[16px] text-gold mb-3">{section.heading}</h2>
            <div className="space-y-3">
              {section.paragraphs.map((p, i) => (
                <p key={i} className="text-[14px] text-foreground/85 leading-relaxed">
                  {p}
                </p>
              ))}
            </div>
          </section>
        ))}
      </article>

      <div className="mt-12 pt-6 border-t border-gold/10 flex flex-wrap gap-x-6 gap-y-2">
        {others.map((s) => (
          <Link
            key={s}
            href={`/legal/${s}`}
            className="text-[13px] text-gold/80 underline underline-offset-4 hover:text-gold transition-colors"
          >
            {t(`legal.${s}`)}
          </Link>
        ))}
      </div>
    </main>
  );
}
