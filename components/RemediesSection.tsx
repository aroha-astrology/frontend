"use client";

import { Heart, Activity, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import Card from "@/components/ui/Card";

const remedies = [
  { icon: Heart, key: "remedies.love" },
  { icon: Sparkles, key: "remedies.career" },
  { icon: Activity, key: "remedies.health" },
  { icon: Sparkles, key: "remedies.peace" },
];

export default function RemediesSection() {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-4 gap-3">
      {remedies.map((remedy, i) => {
        const Icon = remedy.icon;
        return (
          <Card
            key={i}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="flex flex-col items-center p-3 rounded-2xl border-gold/10 hover:border-gold/30 cursor-pointer"
          >
            <div className="w-10 h-10 mb-2 flex items-center justify-center text-gold">
              <Icon size={24} strokeWidth={1.5} />
            </div>
            <p className="text-[10px] text-foreground/90 text-center whitespace-pre-line leading-tight font-medium">
              {t(remedy.key)}
            </p>
          </Card>
        );
      })}
    </div>
  );
}
