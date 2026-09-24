"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";
import type { ChatExploreEvent } from "@/lib/swarm-api";
import { parseStructuredAnswer } from "@/lib/structured-answer";

/**
 * An Ask Aroha 2.0 reply (chat.structuredAnswers) as cards: the chart factors
 * behind the answer, what it means, and the timing. Parsed on every render, so
 * the cards fill in while the reply is still streaming.
 */
export default function StructuredAnswer({ text }: { text: string }) {
  const { t } = useTranslation();
  const a = parseStructuredAnswer(text);

  return (
    <div className="space-y-3" data-testid="structured-answer">
      {a.factors.length > 0 && (
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gold">{t("ask.factorsTitle")}</p>
          <ol className="space-y-1.5">
            {a.factors.map((f, i) => (
              <li
                key={i}
                className="flex gap-2.5 rounded-xl border px-3 py-2"
                style={{ borderColor: "var(--border)", background: "var(--background)" }}
              >
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gold/15 text-[10px] font-bold text-gold">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground">{f.title}</p>
                  {f.detail && <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-muted)]">{f.detail}</p>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
      {a.meaning && (
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-gold">{t("ask.meaning")}</p>
          <p className="leading-relaxed">{a.meaning}</p>
        </div>
      )}
      {a.timeline && (
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-gold">{t("ask.timeline")}</p>
          <p className="leading-relaxed">{a.timeline}</p>
        </div>
      )}
    </div>
  );
}

const LINK_HREF: Record<ChatExploreEvent["data"]["links"][number], (area: string) => string> = {
  timeline: (area) => `/timeline?area=${encodeURIComponent(area)}`,
  calendar: () => "/calendar",
  weather: () => "/weather",
  decide: () => "/decide",
};

/** "Explore further" links under a reply — the server only sends features that are on for this user. */
export function ExploreLinks({ explore }: { explore: ChatExploreEvent["data"] }) {
  const { t } = useTranslation();
  const links = explore.links.filter((l) => l in LINK_HREF);
  if (links.length === 0) return null;
  return (
    <div className="ml-9 mt-2" data-testid="explore-links">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{t("ask.explore")}</p>
      <div className="flex flex-wrap gap-1.5">
        {links.map((l) => (
          <Link
            key={l}
            href={LINK_HREF[l](explore.area)}
            className="inline-flex items-center gap-0.5 rounded-full border border-gold/25 px-3 py-1.5 text-xs text-gold/90 transition-colors hover:bg-gold/10"
          >
            {t(`ask.links.${l}`, { area: t(`why.areas.${explore.area}`) })}
            <ChevronRight size={12} />
          </Link>
        ))}
      </div>
    </div>
  );
}
