"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronLeft, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { api, type BookingType, type BookingMessage } from "@/lib/api";
import { streamBookingMessages } from "@/lib/booking-chat-api";

/**
 * Shared booking-thread chat, used both standalone (with `onBack`, for a
 * page whose entire body IS this chat) and embedded inside another page
 * that already has its own navigation (omit `onBack`, no header row is
 * rendered). This exact prop shape is the contract two later, independent
 * build steps (astrologer marketplace, pooja booking "my bookings" pages)
 * import against — don't change it without updating both call sites.
 */
export interface BookingChatConversationProps {
  bookingType: BookingType;
  bookingId: string;
  viewerRole: "customer" | "provider";
  counterpartName: string;
  counterpartPhotoUrl?: string | null;
  onBack?: () => void;
}

/**
 * BookingMessage plus client-only bookkeeping for optimistic sends.
 * `localKey` is a stable React key that survives the optimistic-id ->
 * real-server-id swap on a successful send, so the bubble never
 * unmounts/remounts (and re-plays its entrance animation) mid-send.
 */
interface LocalMessage extends BookingMessage {
  localKey: string;
  /** Optimistically pushed, POST still in flight. */
  pending?: boolean;
  /** The POST for this optimistic send failed. */
  failed?: boolean;
  /** Independently confirmed by a fetch (initial hydration or a stream
   * event) rather than only known via its own POST response — this is
   * what distinguishes "Delivered" from plain "Sent". */
  confirmed?: boolean;
}

type DeliveryStatus = "sent" | "delivered" | "read" | "failed";

function messageStatus(msg: LocalMessage): DeliveryStatus {
  if (msg.failed) return "failed";
  if (msg.readAt) return "read";
  if (msg.confirmed) return "delivered";
  return "sent";
}

function formatMessageTime(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function BookingChatConversation({
  bookingType,
  bookingId,
  viewerRole,
  counterpartName,
  counterpartPhotoUrl,
  onBack,
}: BookingChatConversationProps) {
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const counterpartInitial = (counterpartName || "?").trim().charAt(0).toUpperCase();

  // Merge an incoming, independently-confirmed message (from initial
  // hydration or a stream event) into state. Upserts by real message id so a
  // message that arrives twice (e.g. once echoed by the stream after we
  // already have it) never renders twice, and — separately — replaces a
  // still-pending/just-failed optimistic bubble that looks like the same
  // send instead of appending a duplicate.
  const mergeConfirmed = useCallback((incoming: BookingMessage) => {
    setMessages((prev) => {
      const existingIdx = prev.findIndex((m) => m.id === incoming.id);
      if (existingIdx !== -1) {
        const next = [...prev];
        next[existingIdx] = { ...incoming, localKey: next[existingIdx]!.localKey, confirmed: true };
        return next;
      }

      const optimisticIdx = prev.findIndex(
        (m) => (m.pending || m.failed) && m.senderRole === incoming.senderRole && m.body === incoming.body,
      );
      if (optimisticIdx !== -1) {
        const next = [...prev];
        next[optimisticIdx] = { ...incoming, localKey: next[optimisticIdx]!.localKey, confirmed: true };
        return next;
      }

      return [...prev, { ...incoming, localKey: incoming.id, confirmed: true }];
    });
  }, []);

  // Initial load: hydrate the full transcript, then start the live stream
  // for anything after that point. The stream is a simple server-side
  // poller (not token-by-token), so a dropped connection just means
  // reconnecting and resuming — retried with backoff, capped, surfacing a
  // persistent inline error only once retries are exhausted.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const history = await api.listBookingMessages(bookingType, bookingId);
        if (cancelled) return;
        setMessages(history.map((m) => ({ ...m, localKey: m.id, confirmed: true })));
      } catch {
        if (!cancelled) setLoadError(t("bookingChat.loadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }

      let attempt = 0;
      while (!cancelled) {
        try {
          setStreamError(null);
          for await (const event of streamBookingMessages(bookingType, bookingId)) {
            if (cancelled) break;
            if (event.type === "message") {
              mergeConfirmed(event.data);
            } else {
              setStreamError(event.data.message || t("bookingChat.streamError"));
            }
          }
          attempt = 0; // clean end (server closed it) — reconnect fresh
        } catch {
          if (cancelled) break;
          attempt += 1;
          setStreamError(t("bookingChat.streamError"));
          if (attempt >= 5) break;
        }
        if (cancelled) break;
        await new Promise((resolve) => setTimeout(resolve, Math.min(2000 * (attempt || 1), 10000)));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bookingType, bookingId, mergeConfirmed, t]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const body = input.trim();
    if (!body || sending) return;

    const localKey = crypto.randomUUID();
    const optimistic: LocalMessage = {
      id: `pending-${localKey}`,
      localKey,
      bookingType,
      bookingId,
      senderRole: viewerRole,
      body,
      readAt: null,
      createdAt: new Date().toISOString(),
      pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput("");
    setSending(true);

    try {
      const sent = await api.sendBookingMessage(bookingType, bookingId, body);
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.localKey === localKey);
        if (idx === -1) return prev; // already reconciled via the stream
        const next = [...prev];
        next[idx] = { ...sent, localKey }; // real id now — "Sent" until the stream confirms it
        return next;
      });
    } catch {
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.localKey === localKey);
        if (idx === -1) return prev;
        const next = [...prev];
        next[idx] = { ...next[idx]!, pending: false, failed: true };
        return next;
      });
    } finally {
      setSending(false);
    }
  }, [input, sending, bookingType, bookingId, viewerRole]);

  // Simplest safe retry: drop the failed bubble and repopulate the input so
  // the user re-sends explicitly, rather than risking a silent double-send.
  const retryFailed = useCallback((msg: LocalMessage) => {
    setMessages((prev) => prev.filter((m) => m.localKey !== msg.localKey));
    setInput(msg.body);
  }, []);

  return (
    <main className="min-h-screen pb-36 flex flex-col" style={{ background: "var(--background)" }}>
      {onBack && (
        <div
          className="sticky top-0 z-20 px-4 pt-4 pb-3 border-b flex items-center gap-3"
          style={{ borderColor: "var(--border)", background: "var(--background)" }}
        >
          <button
            onClick={onBack}
            aria-label={t("common.back")}
            className="p-1 -ml-1 rounded-full hover:bg-gold/10 transition-colors shrink-0"
            style={{ color: "var(--foreground)" }}
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-base font-semibold truncate" style={{ color: "var(--foreground)" }}>
            {counterpartName}
          </h1>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 px-4 pt-4 space-y-4 overflow-y-auto pb-10">
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center py-10">
            <div
              className="flex gap-2.5 items-center rounded-full px-4 py-2 border"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              <div className="flex gap-1 items-center">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    animate={{ y: [0, -4, 0] }}
                    transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
                    className="w-1.5 h-1.5 rounded-full bg-yellow-500 block"
                  />
                ))}
              </div>
              <span className="text-xs italic" style={{ color: "var(--text-muted)" }}>
                {t("bookingChat.loadingMessages")}
              </span>
            </div>
          </motion.div>
        )}

        {loadError && !loading && (
          <div
            className="mx-auto max-w-xs text-center rounded-xl border px-4 py-3 text-sm"
            style={{ borderColor: "rgba(239,68,68,0.5)", background: "var(--surface)", color: "#f87171" }}
          >
            {loadError}
          </div>
        )}

        {!loading && !loadError && messages.length === 0 && (
          <p className="text-center text-sm text-muted py-10">{t("bookingChat.emptyState")}</p>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isOwn = msg.senderRole === viewerRole;
            const status = messageStatus(msg);
            return (
              <motion.div
                key={msg.localKey}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={isOwn ? "flex flex-col items-end" : "flex flex-col items-start"}
              >
                <div className={isOwn ? "flex justify-end" : "flex justify-start"}>
                  {!isOwn && (
                    <div className="w-7 h-7 rounded-full mr-2 flex-shrink-0 mt-1 overflow-hidden">
                      {counterpartPhotoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={counterpartPhotoUrl}
                          alt={counterpartName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-gradient-to-br from-gold/80 to-purple-600/60 flex items-center justify-center text-[#1a0e00] font-display text-xs">
                          {counterpartInitial}
                        </div>
                      )}
                    </div>
                  )}
                  <div
                    className={
                      isOwn
                        ? `bg-yellow-500 text-black rounded-[16px_16px_3px_16px] px-4 py-3 max-w-[80%] text-sm whitespace-pre-wrap break-words ${status === "failed" ? "border-2 border-red-500/60" : ""}`
                        : "rounded-[16px_16px_16px_3px] px-4 py-3 max-w-[92%] text-sm border whitespace-pre-wrap break-words"
                    }
                    style={!isOwn ? { background: "var(--surface)", borderColor: "var(--border)" } : {}}
                  >
                    {msg.body}
                  </div>
                </div>
                <div className={isOwn ? "mt-0.5" : "ml-9 mt-0.5"}>
                  <span className="text-[10px] text-muted">
                    {formatMessageTime(msg.createdAt, i18n.language)}
                    {isOwn && (
                      <>
                        {" · "}
                        {status === "failed" ? (
                          <>
                            <span className="text-red-400">{t("bookingChat.failedToSend")}</span>{" "}
                            <button
                              onClick={() => retryFailed(msg)}
                              className="underline underline-offset-2 text-red-400"
                            >
                              {t("bookingChat.retry")}
                            </button>
                          </>
                        ) : (
                          <span>{t(`bookingChat.${status}`)}</span>
                        )}
                      </>
                    )}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {streamError && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div
              className="rounded-[16px_16px_16px_3px] px-4 py-3 max-w-[92%] text-sm border"
              style={{ background: "var(--surface)", borderColor: "rgba(239,68,68,0.5)", color: "#f87171" }}
            >
              {streamError}
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div
        className="fixed bottom-[calc(var(--tab-bar-h)+1rem)] left-0 right-0 px-4 py-3"
        style={{ background: "var(--background)" }}
      >
        <div className="max-w-lg mx-auto flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder={t("bookingChat.inputPlaceholder")}
            className="flex-1 h-14 rounded-full px-5 outline-none border text-sm disabled:opacity-50"
            style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--foreground)" }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || sending}
            aria-label={t("bookingChat.send")}
            className="h-14 w-14 rounded-full bg-yellow-500 text-black flex items-center justify-center disabled:opacity-40 transition-opacity"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </main>
  );
}
