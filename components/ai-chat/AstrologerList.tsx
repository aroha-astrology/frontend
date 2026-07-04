"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import Card from "@/components/ui/Card";
import { PERSONAS } from "@/lib/personas";
import type { ChatPersona } from "@/lib/swarm-api";

export default function AstrologerList({ onSelect }: { onSelect: (persona: ChatPersona) => void }) {
  const { t } = useTranslation();

  return (
    <main className="min-h-screen pb-32 px-5 pt-10" style={{ background: "var(--background)" }}>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gold font-display">{t("aiChatPage.listTitle")}</h1>
        <p className="text-sm text-muted mt-1">{t("aiChatPage.listSubtitle")}</p>
      </div>

      <div className="flex flex-col gap-3 max-w-lg mx-auto">
        {PERSONAS.map((persona, i) => (
          <motion.div
            key={persona.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.06 }}
          >
            <Card
              className="p-4 flex items-center gap-4 cursor-pointer hover:border-gold/50 transition-colors"
              onClick={() => onSelect(persona.key)}
            >
              <div className="w-12 h-12 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center text-2xl flex-shrink-0">
                {persona.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground truncate">{t(persona.nameKey)}</span>
                  <span className="flex items-center gap-0.5 text-xs text-gold flex-shrink-0">
                    <Star size={11} fill="currentColor" /> {persona.rating}
                  </span>
                </div>
                <p className="text-sm text-muted mt-0.5 truncate">{t(persona.specialtyKey)}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span className="text-[11px] text-muted">{t("aiChatPage.online")}</span>
                </div>
              </div>
              <span className="text-muted text-lg flex-shrink-0">›</span>
            </Card>
          </motion.div>
        ))}
      </div>
    </main>
  );
}
