"use client";

import { useTranslation } from "react-i18next";
import { PenLine, LayoutTemplate, ImagePlus, ChevronRight, Sparkles } from "lucide-react";
import type { TemplateId } from "@/lib/vastu/templates";
import { Sheet } from "./ui";

const TEMPLATES: { id: Exclude<TemplateId, "blank">; rooms: string }[] = [
  { id: "1bhk", rooms: "🛋️ 🍳 🛌 🚿" },
  { id: "2bhk", rooms: "🛋️ 🍳 🛌 🛏️ 🍽️ 🚿" },
  { id: "3bhk", rooms: "🛋️ 🍳 🛌 🛏️ 🧒 🍽️ 🚿 📦" },
];

/** First visit (or "New home"): how do you want to start? */
export default function StartSheet({ open, onClose, onPick, onTrace, canClose }: {
  open: boolean;
  onClose: () => void;
  onPick: (t: TemplateId | "demo") => void;
  onTrace?: () => void;
  /** First visit can't be dismissed without choosing — there is no plan yet. */
  canClose: boolean;
}) {
  const { t } = useTranslation();
  const option = (icon: React.ReactNode, title: string, body: string, onClick: () => void, testId: string) => (
    <button onClick={onClick} data-testid={testId} className="w-full flex items-center gap-3 rounded-2xl border border-gold/15 bg-surface px-4 py-3.5 text-left hover:border-gold/45 active:scale-[0.99] transition-all">
      <span className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/25 text-gold flex items-center justify-center shrink-0">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="block text-[11.5px] text-muted">{body}</span>
      </span>
      <ChevronRight size={16} className="text-muted" />
    </button>
  );

  return (
    <Sheet open={open} onClose={canClose ? onClose : () => onPick("1bhk")} title={t("vastu.start.title", "How do you want to start?")} subtitle={t("vastu.start.subtitle", "You can change everything afterwards.")}>
      <div className="flex flex-col gap-2.5" data-testid="vastu-start">
        {option(<PenLine size={18} />, t("vastu.start.draw", "Draw my home"), t("vastu.start.drawBody", "An empty plot — shape it and add rooms."), () => onPick("blank"), "vastu-start-blank")}
        {option(<Sparkles size={18} />, t("vastu.start.demo", "Explore a demo home"), t("vastu.start.demoBody", "A ready-made home with one thing to fix — try Show me and Fix this."), () => onPick("demo"), "vastu-start-demo")}
        {onTrace && option(<ImagePlus size={18} />, t("vastu.start.upload", "Trace a floor plan photo"), t("vastu.start.uploadBody", "Put a photo of your plan underneath and draw over it."), onTrace, "vastu-start-trace")}
        <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-gold/80 flex items-center gap-1.5"><LayoutTemplate size={12} /> {t("vastu.start.templates", "Start with a template")}</p>
        {TEMPLATES.map((tp) => (
          <button key={tp.id} onClick={() => onPick(tp.id)} data-testid={`vastu-start-${tp.id}`} className="w-full flex items-center gap-3 rounded-2xl border border-gold/12 bg-surface px-4 py-3 text-left hover:border-gold/45 transition-all">
            <span className="font-display text-gold text-lg w-14 shrink-0">{t(`vastu.start.${tp.id}`, tp.id.toUpperCase())}</span>
            <span className="flex-1 text-sm tracking-wider">{tp.rooms}</span>
            <ChevronRight size={16} className="text-muted" />
          </button>
        ))}
        <p className="text-[10.5px] text-muted mt-1">{t("vastu.start.note", "Templates are simple starting shapes, not architectural plans.")}</p>
      </div>
    </Sheet>
  );
}
