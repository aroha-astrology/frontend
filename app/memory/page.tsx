"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ArrowLeft, BookHeart, CheckCircle2, Trash2 } from "lucide-react";
import ParticleBackground from "@/components/ParticleBackground";
import IconButton from "@/components/ui/IconButton";
import Card from "@/components/ui/Card";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import NewFeatureGuard from "@/components/NewFeatureGuard";
import { api, ApiError } from "@/lib/api";
import { formatEventDate, kindKey, splitVault, type MemoryVault, type VaultEntry } from "@/lib/memory";
import { useNewFeature } from "@/hooks/useFeature";
import { useMemorySummary } from "@/hooks/useMemorySummary";

function MemoryPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [vault, setVault] = useState<MemoryVault | null>(null);
  const [failed, setFailed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const chip = useNewFeature("memory.rectifyChip").enabled;
  const { summary, refresh } = useMemorySummary();

  const load = useCallback(() => {
    setFailed(false);
    api
      .memoryVault()
      .then(setVault)
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onDelete(entry: VaultEntry) {
    if (!window.confirm(t("memory.deleteConfirm"))) return;
    try {
      await api.memoryForget(entry.id);
      setVault((v) => (v ? { ...v, items: v.items.filter((i) => i.id !== entry.id) } : v));
    } catch {
      setMessage(t("memory.error"));
    }
  }

  async function onHappened(entry: VaultEntry) {
    setMessage(null);
    try {
      await api.memoryHappened(entry.id);
      setMessage(t("memory.happenedDone"));
      load();
      refresh();
    } catch (err) {
      setMessage(err instanceof ApiError && err.message === "NOT_YET" ? t("memory.notYet") : t("memory.error"));
    }
  }

  async function onDismiss(entry: VaultEntry) {
    try {
      await api.memoryDismiss(entry.id);
      load();
    } catch {
      setMessage(t("memory.error"));
    }
  }

  async function onForgetAll() {
    setBusy(true);
    try {
      await api.memoryForgetAll();
      setVault({ items: [], freeReply: false });
      setMessage(t("memory.forgetAllDone"));
      refresh();
    } catch {
      setMessage(t("memory.error"));
    } finally {
      setBusy(false);
      setConfirmAll(false);
    }
  }

  const { events, facts } = vault ? splitVault(vault.items) : { events: [], facts: [] };

  function Entry({ e }: { e: VaultEntry }) {
    return (
      <Card className="p-4 border-gold/15 space-y-2" data-testid="memory-item">
        {e.eventDate && (
          <div className="flex items-center gap-2 text-[11px] text-gold">
            <span className="rounded-full border border-gold/30 px-2 py-0.5">{t(kindKey(e.eventKind))}</span>
            <span>{t("memory.dateOn", { date: formatEventDate(e.eventDate, i18n.language) })}</span>
            {e.confirmed && (
              <span className="inline-flex items-center gap-1 text-foreground/80" data-testid="memory-confirmed">
                <CheckCircle2 size={12} /> {t("memory.confirmedTag")}
              </span>
            )}
          </div>
        )}
        {e.toldByGuide && <p className="text-[11px] text-muted">{t("memory.toldByGuide")}</p>}
        <p className="text-sm text-foreground leading-relaxed">{e.text}</p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {e.canConfirm && (
            <button
              type="button"
              data-testid="memory-happened"
              onClick={() => void onHappened(e)}
              className="h-8 rounded-full bg-gold/20 px-3 text-xs font-medium text-gold"
            >
              {t("memory.happened")}
            </button>
          )}
          {e.status === "ACTIVE" && e.eventDate && !e.canConfirm && (
            <button
              type="button"
              data-testid="memory-dismiss"
              onClick={() => void onDismiss(e)}
              className="h-8 rounded-full border border-gold/20 px-3 text-xs text-muted"
            >
              {t("memory.dismiss")}
            </button>
          )}
          <button
            type="button"
            data-testid="memory-delete"
            aria-label={t("memory.delete")}
            onClick={() => void onDelete(e)}
            className="ml-auto grid h-8 w-8 place-items-center rounded-full text-muted hover:text-foreground"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </Card>
    );
  }

  return (
    <main className="cosmic-bg min-h-screen pb-tab-safe relative overflow-hidden text-foreground">
      <ParticleBackground />
      <div className="relative z-10 page-container pt-8 space-y-4 page-cols">
        <div className="flex items-center gap-3">
          <IconButton onClick={() => router.back()} aria-label={t("common.back")}>
            <ArrowLeft size={18} />
          </IconButton>
          <h1 className="flex-1 text-lg font-display flex items-center gap-2">
            <BookHeart size={18} className="text-gold" />
            {t("memory.title")}
          </h1>
        </div>

        <p className="text-xs leading-relaxed text-muted">{t("memory.intro")}</p>

        {chip && summary?.suggestRectify && (
          <Link
            href="/settings#birth-time"
            data-testid="rectify-chip"
            className="block rounded-3xl border border-gold/30 bg-gold/10 p-4"
          >
            <span className="block text-sm font-semibold text-gold">{t("memory.rectifyChip")}</span>
            <span className="block text-[11px] text-muted">{t("memory.rectifyChipSub")}</span>
          </Link>
        )}

        {message && (
          <p role="status" data-testid="memory-message" className="text-xs text-gold">
            {message}
          </p>
        )}

        {failed && !vault && (
          <div className="py-10 text-center space-y-3">
            <p className="text-sm text-muted">{t("memory.error")}</p>
            <button type="button" onClick={load} className="h-10 rounded-full border border-gold/25 px-5 text-sm">
              {t("ritual.retry")}
            </button>
          </div>
        )}

        {vault && vault.items.length === 0 && (
          <p className="py-8 text-center text-sm text-muted" data-testid="memory-empty">
            {t("memory.empty")}
          </p>
        )}

        {events.length > 0 && (
          <section className="space-y-2" data-testid="memory-events">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gold/80">{t("memory.sectionEvents")}</h2>
            {events.map((e) => (
              <Entry key={e.id} e={e} />
            ))}
          </section>
        )}

        {facts.length > 0 && (
          <section className="space-y-2" data-testid="memory-facts">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gold/80">{t("memory.sectionFacts")}</h2>
            {facts.map((e) => (
              <Entry key={e.id} e={e} />
            ))}
          </section>
        )}

        {vault && vault.items.length > 0 && (
          <button
            type="button"
            data-testid="memory-forget-all"
            onClick={() => setConfirmAll(true)}
            className="h-11 w-full rounded-full border border-red-400/40 text-sm font-medium text-red-300"
          >
            {t("memory.forgetAll")}
          </button>
        )}
      </div>

      {confirmAll && (
        <BottomSheetModal
          onClose={() => !busy && setConfirmAll(false)}
          closeLabel={t("common.close")}
          header={<h2 className="text-base font-semibold text-foreground">{t("memory.forgetAllConfirmTitle")}</h2>}
        >
          <div className="space-y-4 p-1 pb-4">
            <p className="text-sm text-muted">{t("memory.forgetAllConfirmBody")}</p>
            <div className="flex gap-3">
              <button
                type="button"
                data-testid="memory-forget-all-confirm"
                disabled={busy}
                onClick={() => void onForgetAll()}
                className="flex-1 rounded-2xl bg-red-500/80 py-3 text-sm font-medium text-white disabled:opacity-50"
              >
                {t("memory.forgetAll")}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmAll(false)}
                className="flex-1 rounded-2xl border border-gold/25 py-3 text-sm text-foreground"
              >
                {t("memory.cancel")}
              </button>
            </div>
          </div>
        </BottomSheetModal>
      )}
    </main>
  );
}

export default function MemoryRoute() {
  return (
    <NewFeatureGuard featureKey="memory.vault">
      <MemoryPage />
    </NewFeatureGuard>
  );
}
