"use client";

import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ChevronDown, Cloud, CloudOff, Loader2, Plus, Compass, Shapes, Undo2, Redo2, DoorOpen, AppWindow, Copy, Trash2, HelpCircle, X, Wand2 } from "lucide-react";
import type { SaveStatus } from "../useHomeSync";
import type { RoomRating } from "@/lib/vastu/analysis";
import { DockButton, RatingPill } from "./ui";

export type StudioView = "2d" | "3d" | "vastu";

export function SaveBadge({ status }: { status: SaveStatus }) {
  const { t } = useTranslation();
  if (status === "idle") return null;
  const map = {
    saving: { icon: <Loader2 size={11} className="animate-spin" />, cls: "text-muted", key: "vastu.save.saving" },
    saved: { icon: <Cloud size={11} />, cls: "text-emerald-400", key: "vastu.save.saved" },
    offline: { icon: <CloudOff size={11} />, cls: "text-amber-400", key: "vastu.save.offline" },
    error: { icon: <CloudOff size={11} />, cls: "text-red-400", key: "vastu.save.error" },
  } as const;
  const m = map[status];
  return (
    <span className={`flex items-center gap-1 text-[11px] ${m.cls}`} role="status" data-testid="vastu-save-status">
      {m.icon} {t(m.key)}
    </span>
  );
}

/** Compact studio header: which home, and whether it's saved. */
export function StudioHeader({ homeName, status, onHomes, right }: { homeName: string; status: SaveStatus; onHomes: () => void; right?: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-end gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold/80">{t("vastu.studio.title", "Vastu Studio")}</p>
        <button onClick={onHomes} className="mt-0.5 flex items-center gap-1.5 max-w-full" data-testid="vastu-home-switch" aria-label={t("vastu.homes.title", "Your homes")}>
          <span className="font-display text-[22px] leading-tight text-foreground truncate">{homeName}</span>
          <ChevronDown size={18} className="text-gold shrink-0" />
        </button>
        <div className="mt-0.5 h-4"><SaveBadge status={status} /></div>
      </div>
      {right}
    </div>
  );
}

/** [ 2D ] [ 3D ] [ VASTU ] */
export function ViewSwitcher({ view, onChange, has3d }: { view: StudioView; onChange: (v: StudioView) => void; has3d: boolean }) {
  const { t } = useTranslation();
  const opts: { v: StudioView; label: string }[] = [
    { v: "2d", label: "2D" },
    ...(has3d ? [{ v: "3d" as const, label: "3D" }] : []),
    { v: "vastu", label: t("vastu.studio.lens", "Vastu Lens") },
  ];
  return (
    <div className="relative inline-flex rounded-full border border-gold/15 bg-background/70 p-1 backdrop-blur" role="tablist" data-testid="vastu-view-switch">
      {opts.map((o) => {
        const active = view === o.v;
        return (
          <button
            key={o.v}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.v)}
            className={`relative z-10 px-3.5 py-1.5 rounded-full text-[11.5px] font-bold tracking-wide transition-colors ${active ? "text-[#1a0e00]" : "text-muted hover:text-foreground"}`}
          >
            {active && <motion.span layoutId="vastu-view-pill" className="absolute inset-0 -z-10 rounded-full bg-gold" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
            {o.v === "vastu" && <span className="mr-1">✨</span>}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Nothing selected: the main actions. */
export function Dock({ onAdd, onNorth, onPlot, onUndo, onRedo, canUndo, canRedo }: {
  onAdd: () => void;
  onNorth: () => void;
  onPlot: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex gap-1.5" data-testid="vastu-dock">
      <DockButton primary icon={<Plus size={18} strokeWidth={2.5} />} label={t("vastu.studio.room", "Room")} onClick={onAdd} testId="vastu-add-room" tour="vastu-palette" />
      <DockButton icon={<Compass size={18} />} label={t("vastu.studio.north", "North")} onClick={onNorth} testId="vastu-north" tour="vastu-north" />
      <DockButton icon={<Shapes size={18} />} label={t("vastu.studio.shape", "Shape")} onClick={onPlot} testId="vastu-plot" />
      <DockButton icon={<Undo2 size={18} />} label={t("vastu.studio.undo", "Undo")} onClick={onUndo} disabled={!canUndo} testId="vastu-undo" />
      <DockButton icon={<Redo2 size={18} />} label={t("vastu.studio.redo", "Redo")} onClick={onRedo} disabled={!canRedo} testId="vastu-redo" />
    </div>
  );
}

/** A room selected: its live rating and what you can do to it. */
export function RoomBar({ emoji, label, rating, onDoor, onWindow, onWhy, onFix, onDuplicate, onDelete, onClose }: {
  emoji: string;
  label: string;
  rating: RoomRating | undefined;
  onDoor: () => void;
  onWindow: () => void;
  onWhy: () => void;
  onFix?: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-gold/25 bg-card p-2.5 flex flex-col gap-2.5" data-testid="vastu-room-bar">
      <div className="flex items-center gap-2 px-1">
        <span className="text-xl">{emoji}</span>
        <span className="text-sm font-semibold text-foreground truncate">{label}</span>
        {rating && <span className="text-[11px] font-mono text-muted">{rating.zone}</span>}
        {rating && <RatingPill ratingKey={rating.ratingKey} size="xs" />}
        <button onClick={onClose} aria-label={t("common.close")} className="ml-auto w-8 h-8 rounded-full text-muted hover:text-foreground flex items-center justify-center"><X size={16} /></button>
      </div>
      <div className="flex gap-1.5">
        <DockButton icon={<DoorOpen size={17} />} label={t("vastu.fixture.door")} onClick={onDoor} testId="vastu-add-door" />
        <DockButton icon={<AppWindow size={17} />} label={t("vastu.fixture.window")} onClick={onWindow} testId="vastu-add-window" />
        <DockButton icon={<HelpCircle size={17} />} label={t("vastu.studio.why", "Why?")} onClick={onWhy} testId="vastu-why-btn" />
        {onFix && <DockButton icon={<Wand2 size={17} />} label={t("vastu.fix.short", "Fix")} onClick={onFix} active testId="vastu-fix-btn" />}
        <DockButton icon={<Copy size={17} />} label={t("vastu.studio.copy", "Copy")} onClick={onDuplicate} testId="vastu-duplicate" />
        <DockButton icon={<Trash2 size={17} />} label={t("vastu.block.delete")} onClick={onDelete} testId="vastu-delete" />
      </div>
    </motion.div>
  );
}
