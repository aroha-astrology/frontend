"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Keyboard, Mic, Sparkles } from "lucide-react";
import Card from "@/components/ui/Card";
import { useFeature, useNewFeature } from "@/hooks/useFeature";
import { formatRupees } from "@/lib/format";

const SAMPLES = ["ask.card.q1", "ask.card.q2", "ask.card.q3"] as const;

/**
 * Home's "Ask Aroha" card (home.askAroha, ships off). Sample questions only
 * pre-fill the chat box (`?q=`); nothing is sent, and so nothing charged,
 * until the user presses send. "Talk to Aroha" appears with chat.voiceMode.
 */
export default function AskArohaCard() {
  const { t } = useTranslation();
  const { enabled } = useNewFeature("home.askAroha");
  const { enabled: voiceOn } = useNewFeature("chat.voiceMode");
  const { enabled: chatOn } = useFeature("nav.askAI");
  const pricePaise = useFeature("paid.chat").pricePaise ?? 2000;

  if (!enabled || !chatOn) return null;

  return (
    <Card className="p-5 border-gold/15" data-testid="ask-aroha-card">
      <p className="flex items-center gap-2 text-gold text-xs font-medium uppercase tracking-wider mb-1">
        <Sparkles size={14} />
        {t("ask.card.title")}
      </p>
      <p className="text-sm text-foreground/85">{t("ask.card.subtitle")}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {SAMPLES.map((key) => (
          <Link
            key={key}
            href={`/ai-chat?q=${encodeURIComponent(t(key))}`}
            className="rounded-full border border-gold/25 px-3 py-1.5 text-xs text-gold/90 transition-colors hover:bg-gold/10"
          >
            {t(key)}
          </Link>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <Link
          href="/ai-chat"
          className="flex-1 h-11 rounded-full border flex items-center justify-center gap-1.5 text-sm font-medium"
          style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
        >
          <Keyboard size={16} />
          {t("ask.card.type")}
        </Link>
        {voiceOn && (
          <Link
            href="/ai-chat?voice=1"
            className="flex-1 h-11 rounded-full bg-yellow-500 text-black flex items-center justify-center gap-1.5 text-sm font-semibold"
          >
            <Mic size={16} />
            {t("ask.card.talk")}
          </Link>
        )}
      </div>
      <p className="mt-2 text-center text-[10px] text-muted">{t("ask.card.price", { amount: formatRupees(pricePaise) })}</p>
    </Card>
  );
}
