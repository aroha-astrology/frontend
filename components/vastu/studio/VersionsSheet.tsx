"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { History, Loader2, RotateCcw, Save } from "lucide-react";
import { api, type VastuHomeVersion } from "@/lib/api";
import { Sheet, scoreColor } from "./ui";

/**
 * A home's saved versions: save one now, or restore an earlier one. The
 * server keeps the state from just before a restore as its own version, so
 * a restore can always be undone.
 */
export default function VersionsSheet({ open, onClose, homeId, homeName, onRestored, beforeSave }: {
  open: boolean;
  onClose: () => void;
  homeId: string | null;
  homeName: string;
  /** The restored layout, to load into the editor. */
  onRestored: (layout: Record<string, unknown>) => void;
  /** Make sure pending edits reach the server before snapshotting. */
  beforeSave?: () => Promise<void> | void;
}) {
  const { t } = useTranslation();
  const [versions, setVersions] = useState<VastuHomeVersion[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!homeId) return;
    setError(null);
    try {
      const { versions: v } = await api.vastuHomeVersions(homeId);
      setVersions(v);
    } catch {
      setError(t("vastu.versions.loadError", "Couldn't load the saved versions. Check your connection and try again."));
    }
  }, [homeId, t]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const save = async () => {
    if (!homeId) return;
    setBusy("save");
    setError(null);
    try {
      await beforeSave?.();
      await api.vastuHomeVersionCreate(homeId);
      await load();
    } catch {
      setError(t("vastu.versions.saveError", "Couldn't save a version right now. Please try again."));
    } finally {
      setBusy(null);
    }
  };

  const restore = async (v: VastuHomeVersion) => {
    if (!homeId) return;
    setBusy(v.id);
    setError(null);
    try {
      await beforeSave?.();
      const home = await api.vastuHomeVersionRestore(homeId, v.id);
      onRestored(home.layout);
      onClose();
    } catch {
      setError(t("vastu.versions.restoreError", "Couldn't restore that version. Please try again."));
    } finally {
      setBusy(null);
      setConfirm(null);
    }
  };

  const fmt = (iso: string) => new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <Sheet open={open} onClose={onClose} title={t("vastu.versions.title", "Versions of {{name}}", { name: homeName })} subtitle={t("vastu.versions.subtitle", "Save a version before big changes; restore any time.")}>
      <div className="flex flex-col gap-3" data-testid="vastu-versions">
        <button onClick={() => void save()} disabled={!homeId || busy !== null} className="flex items-center justify-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-sm font-bold text-[#1a0e00] disabled:opacity-40" data-testid="vastu-version-save">
          {busy === "save" ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} {t("vastu.versions.saveNow", "Save this version")}
        </button>
        {error && <p className="text-[12px] text-red-400" role="alert">{error}</p>}
        {versions === null ? (
          <div className="flex justify-center py-6 text-gold"><Loader2 className="animate-spin" size={18} /></div>
        ) : versions.length === 0 ? (
          <p className="flex items-center gap-2 text-[12.5px] text-muted py-3"><History size={14} /> {t("vastu.versions.empty", "No saved versions yet.")}</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {versions.map((v) => (
              <li key={v.id} className="flex items-center gap-3 rounded-2xl border border-gold/12 bg-surface px-3 py-2.5">
                <span className="w-9 text-center text-sm font-bold tabular-nums" style={{ color: v.overallScore != null ? scoreColor(v.overallScore) : undefined }}>{v.overallScore ?? "–"}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] text-foreground truncate">{v.label === "Before restore" ? t("vastu.versions.beforeRestore", "Before restore") : v.label || t("vastu.versions.saved", "Saved version")}</span>
                  <span className="block text-[11px] text-muted">{fmt(v.createdAt)}</span>
                </span>
                {confirm === v.id ? (
                  <div className="flex items-center gap-1">
                    <button onClick={() => setConfirm(null)} className="rounded-lg border border-gold/20 px-2 py-1.5 text-[11px] text-muted">{t("common.no")}</button>
                    <button onClick={() => void restore(v)} disabled={busy !== null} className="rounded-lg bg-gold px-2 py-1.5 text-[11px] font-bold text-[#1a0e00]" data-testid="vastu-version-confirm">
                      {busy === v.id ? <Loader2 size={12} className="animate-spin" /> : t("vastu.versions.restore", "Restore")}
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setConfirm(v.id)} className="flex items-center gap-1 rounded-lg border border-gold/25 px-2.5 py-1.5 text-[11.5px] font-semibold text-gold" data-testid="vastu-version-restore">
                    <RotateCcw size={12} /> {t("vastu.versions.restore", "Restore")}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="text-[10.5px] text-muted">{t("vastu.versions.note", "Restoring keeps a copy of how the home looks now, so you can switch back.")}</p>
      </div>
    </Sheet>
  );
}
