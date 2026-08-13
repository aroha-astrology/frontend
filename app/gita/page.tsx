"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import IconButton from "@/components/ui/IconButton";
import FeatureGuard from "@/components/FeatureGuard";
import { CATEGORY_GLOSS, CATEGORY_ORDER, TAG_GLOSS, loadGitaVerses, type GitaVerse } from "@/lib/gita";

/**
 * Bhagavad Gita browse — 701 verses, filterable by category and by need-tag
 * ("for anxiety", "for grief"). A separate feature from the Shlokas & Japs
 * library: much larger (701 vs 50), Sanskrit-only (no per-language fields),
 * content fetched live from the backend rather than a frontend public/ asset.
 * Free — no unlock, no credit check.
 */

function VerseRow({ v }: { v: GitaVerse }) {
  return (
    <Link
      href={`/gita/${v.id}`}
      className="block rounded-2xl border border-gold/20 bg-card p-4 active:scale-[0.98] transition-transform"
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-sm font-display text-gold">
          {v.chapter}.{v.verse}
        </span>
        {v.tags.length > 0 && (
          <span className="text-[10px] text-muted truncate">
            {v.tags.map((t) => TAG_GLOSS[t] ?? t).join(" · ")}
          </span>
        )}
      </div>
      <p className="text-sm text-foreground/90 leading-relaxed line-clamp-2">{v.sanskrit}</p>
    </Link>
  );
}

function GitaBrowse() {
  const { t } = useTranslation();
  const router = useRouter();
  const [verses, setVerses] = useState<GitaVerse[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const [tag, setTag] = useState<string | null>(null);

  useEffect(() => {
    loadGitaVerses()
      .then(setVerses)
      .catch(() => setFailed(true));
  }, []);

  const tags = useMemo(() => {
    if (!verses) return [];
    return [...new Set(verses.flatMap((v) => v.tags))].sort();
  }, [verses]);

  const visible = useMemo(() => {
    if (!verses) return [];
    return verses.filter((v) => (!category || v.mainCategory === category) && (!tag || v.tags.includes(tag)));
  }, [verses, category, tag]);

  return (
    <main className="min-h-screen pb-tab-safe" style={{ background: "var(--background)" }}>
      <div className="px-5 pt-4 max-w-lg mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <IconButton onClick={() => router.back()} aria-label={t("common.back")}>
            <ArrowLeft size={18} />
          </IconButton>
          <h1 className="text-lg font-display text-foreground flex-1 truncate">{t("gita.title")}</h1>
        </div>

        {failed && (
          <div className="flex flex-col items-center text-center gap-3 py-16">
            <AlertTriangle size={28} className="text-red-400" />
            <p className="text-sm text-muted max-w-xs">{t("gita.loadError")}</p>
          </div>
        )}

        {!verses && !failed && <p className="text-sm text-muted text-center py-16">{t("gita.loading")}</p>}

        {verses && (
          <>
            <p className="text-xs text-muted leading-relaxed">{t("gita.desc")}</p>

            <div>
              <p className="text-[10px] text-muted mb-1.5">{t("gita.byCategory")}</p>
              <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-1">
                {[null, ...CATEGORY_ORDER].map((c) => (
                  <button
                    key={c ?? "__all"}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs border transition-colors ${
                      category === c
                        ? "border-gold bg-gold/10 text-gold"
                        : "border-gold/20 text-muted hover:border-gold/40"
                    }`}
                  >
                    {c ?? t("gita.allCategories")}
                    {c && CATEGORY_GLOSS[c] && <span className="opacity-70"> · {CATEGORY_GLOSS[c]}</span>}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] text-muted mb-1.5">{t("gita.byNeed")}</p>
              <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-1">
                {[null, ...tags].map((tg) => (
                  <button
                    key={tg ?? "__all"}
                    type="button"
                    onClick={() => setTag(tg)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs border transition-colors ${
                      tag === tg
                        ? "border-gold bg-gold/10 text-gold"
                        : "border-gold/20 text-muted hover:border-gold/40"
                    }`}
                  >
                    {tg ? (TAG_GLOSS[tg] ?? tg) : t("gita.allNeeds")}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-[10px] text-muted">{t("gita.verseCount", { n: visible.length })}</p>

            <div className="space-y-2">
              {visible.map((v) => (
                <VerseRow key={v.id} v={v} />
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default function GitaPage() {
  return (
    <FeatureGuard featureKey="nav.gita">
      <GitaBrowse />
    </FeatureGuard>
  );
}
