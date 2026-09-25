"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Copy, Pencil, Trash2, Check } from "lucide-react";
import type { HomeSummary } from "../useHomeSync";
import { ScoreRing, Sheet, scoreColor } from "./ui";

/** Your homes: switch, rename, duplicate, delete, or start a new one. */
export default function HomeSheet({ open, onClose, homes, currentId, onSelect, onNew, onDuplicate, onRename, onDelete }: {
  open: boolean;
  onClose: () => void;
  homes: HomeSummary[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDuplicate: () => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  return (
    <Sheet open={open} onClose={onClose} title={t("vastu.homes.title", "Your homes")} subtitle={t("vastu.homes.subtitle", "Each home is saved to this profile.")}>
      <ul className="flex flex-col gap-2" data-testid="vastu-homes">
        {homes.map((h) => {
          const current = h.id === currentId;
          return (
            <li key={h.id} className={`rounded-2xl border px-3 py-2.5 ${current ? "border-gold/50 bg-gold/[0.06]" : "border-gold/12 bg-surface"}`}>
              {editing === h.id ? (
                <form
                  className="flex items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const n = name.trim();
                    if (n) onRename(h.id, n.slice(0, 60));
                    setEditing(null);
                  }}
                >
                  <input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className="flex-1 rounded-lg border border-gold/30 bg-background px-2.5 py-2 text-base outline-none" aria-label={t("vastu.homes.name", "Home name")} />
                  <button type="submit" aria-label={t("vastu.homes.saveName", "Save name")} className="w-9 h-9 rounded-lg bg-gold text-[#1a0e00] flex items-center justify-center"><Check size={16} /></button>
                </form>
              ) : (
                <div className="flex items-center gap-3">
                  <button onClick={() => { onSelect(h.id); onClose(); }} className="flex-1 min-w-0 flex items-center gap-3 text-left">
                    <span className="relative">
                      <ScoreRing score={h.overallScore ?? 0} size={36} stroke={3.5} empty={h.overallScore == null} />
                      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold" style={{ color: h.overallScore != null ? scoreColor(h.overallScore) : undefined }}>{h.overallScore ?? "–"}</span>
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-foreground truncate">{h.name}</span>
                      <span className="block text-[11px] text-muted">{current ? t("vastu.homes.open", "Open now") : new Date(h.updatedAt).toLocaleDateString()}</span>
                    </span>
                  </button>
                  {confirmDel === h.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => setConfirmDel(null)} className="rounded-lg border border-gold/20 px-2 py-1.5 text-[11px] text-muted">{t("common.no")}</button>
                      <button onClick={() => { setConfirmDel(null); onDelete(h.id); }} className="rounded-lg bg-red-500/15 border border-red-500/35 px-2 py-1.5 text-[11px] font-semibold text-red-400">{t("vastu.history.deleteConfirm")}</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditing(h.id); setName(h.name); }} aria-label={t("vastu.homes.rename", "Rename")} className="w-8 h-8 rounded-lg text-muted hover:text-gold flex items-center justify-center"><Pencil size={14} /></button>
                      <button onClick={() => setConfirmDel(h.id)} aria-label={t("vastu.homes.delete", "Delete home")} className="w-8 h-8 rounded-lg text-muted hover:text-red-400 flex items-center justify-center"><Trash2 size={14} /></button>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <div className="flex gap-2 mt-3">
        <button onClick={() => { onClose(); onNew(); }} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-gold px-3 py-2.5 text-sm font-bold text-[#1a0e00]"><Plus size={15} /> {t("vastu.homes.new", "New home")}</button>
        {currentId && <button onClick={() => { onClose(); onDuplicate(); }} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-gold/30 px-3 py-2.5 text-sm font-semibold text-gold"><Copy size={15} /> {t("vastu.homes.duplicate", "Duplicate")}</button>}
      </div>
    </Sheet>
  );
}
