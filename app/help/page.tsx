"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Loader2, LifeBuoy } from "lucide-react";
import ParticleBackground from "@/components/ParticleBackground";
import IconButton from "@/components/ui/IconButton";
import Card from "@/components/ui/Card";
import SegmentedToggle from "@/components/ui/SegmentedToggle";
import { api, ApiError, type SupportTicket } from "@/lib/api";

type HelpCategory = "billing" | "chart_accuracy" | "technical_issue" | "other";

const CATEGORIES: HelpCategory[] = ["billing", "chart_accuracy", "technical_issue", "other"];

const KNOWN_STATUS_KEYS: Record<string, string> = {
  open: "help.status.open",
  in_progress: "help.status.inProgress",
  resolved: "help.status.resolved",
  closed: "help.status.closed",
};

function statusLabel(t: TFunction, status: string): string {
  const key = KNOWN_STATUS_KEYS[status];
  return key ? t(key) : status;
}

function statusTone(status: string): string {
  if (status === "resolved") return "border-green-500/40 bg-green-500/10 text-green-400";
  if (status === "closed") return "border-border bg-surface text-muted";
  return "border-gold/40 bg-gold/10 text-gold"; // open / in_progress / unknown
}

function categoryLabel(t: TFunction, category: string): string {
  return t(`help.category.${category}`, category);
}

function truncate(text: string, max: number): string {
  const trimmed = text.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max).trimEnd()}…` : trimmed;
}

const textareaClass =
  "w-full rounded-xl px-3.5 py-3 outline-none border text-sm focus:border-gold/60 transition-colors bg-surface border-border text-foreground resize-none";

export default function HelpPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();

  const [category, setCategory] = useState<HelpCategory>("billing");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [tickets, setTickets] = useState<SupportTicket[] | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const fetchTickets = useCallback(() => {
    setListLoading(true);
    setListError(null);
    api
      .listMySupportTickets()
      .then((res) => setTickets(res.tickets))
      .catch((err) => setListError(err instanceof ApiError ? err.message : t("help.loadError")))
      .finally(() => setListLoading(false));
  }, [t]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  async function handleSubmit() {
    const trimmed = message.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const ticket = await api.createSupportTicket({
        category,
        message: trimmed,
        locale: i18n.language,
        appVersion: process.env.NEXT_PUBLIC_APP_VERSION,
      });
      setTickets((prev) => (prev ? [ticket, ...prev] : [ticket]));
      setMessage("");
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : t("help.submitError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="cosmic-bg min-h-screen pb-tab-safe relative overflow-hidden text-foreground">
      <ParticleBackground />

      <div className="relative z-10 px-5 pt-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <IconButton onClick={() => router.back()} aria-label={t("common.back")}>
            <ArrowLeft size={18} />
          </IconButton>
          <h1 className="text-lg font-display text-foreground flex-1">{t("help.title")}</h1>
        </div>

        <p className="text-sm text-muted mb-5">{t("help.subtitle")}</p>

        {/* Form */}
        <Card className="p-4 mb-6">
          <label className="text-[11px] text-muted uppercase tracking-wider mb-2 block">
            {t("help.categoryLabel")}
          </label>
          <SegmentedToggle<HelpCategory>
            value={category}
            onChange={setCategory}
            options={CATEGORIES.map((c) => ({ value: c, label: t(`help.category.${c}`) }))}
            className="flex-wrap gap-y-2 mb-4"
          />

          <label className="text-[11px] text-muted uppercase tracking-wider mb-2 block">
            {t("help.messageLabel")}
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            maxLength={5000}
            placeholder={t("help.messagePlaceholder")}
            className={textareaClass}
          />

          {submitError && <p className="mt-2 text-[12px] text-red-400">{submitError}</p>}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !message.trim()}
            className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-black text-sm font-bold disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : t("help.submit")}
          </button>
        </Card>

        {/* Ticket history */}
        <h2 className="text-sm font-semibold text-foreground mb-3">{t("help.historyTitle")}</h2>

        {listLoading && tickets === null && (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 text-gold/50 animate-spin" />
          </div>
        )}

        {listError && (
          <div className="text-center py-8">
            <p className="text-sm text-muted mb-3">{listError}</p>
            <button
              type="button"
              onClick={fetchTickets}
              className="px-4 py-2 rounded-full border border-gold/40 text-gold text-sm hover:bg-gold/10 transition-colors"
            >
              {t("help.retry")}
            </button>
          </div>
        )}

        {tickets && !listError && (
          tickets.length === 0 ? (
            <div className="text-center py-10">
              <LifeBuoy className="mx-auto mb-3 text-gold/30" size={32} />
              <p className="text-sm text-muted">{t("help.empty")}</p>
              <p className="text-xs text-muted/70 mt-1">{t("help.emptyDesc")}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 pb-6">
              {tickets.map((ticket) => (
                <Card key={ticket.id} className="p-4">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-gold">
                      {categoryLabel(t, ticket.category)}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${statusTone(
                        ticket.status
                      )}`}
                    >
                      {statusLabel(t, ticket.status)}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/90 mb-2">{truncate(ticket.message, 140)}</p>
                  {ticket.adminNote && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <p className="text-[11px] text-gold/80 mb-1">{t("help.replyLabel")}</p>
                      <p className="text-sm text-foreground/90 whitespace-pre-wrap">{ticket.adminNote}</p>
                    </div>
                  )}
                  <p className="text-[11px] text-muted mt-2">
                    {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                  </p>
                </Card>
              ))}
            </div>
          )
        )}
      </div>
    </main>
  );
}
