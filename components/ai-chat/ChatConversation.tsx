"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { Send, Wallet, Volume2, VolumeX, ThumbsUp, ThumbsDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import posthog from "posthog-js";
import { streamChat, sendChatFeedback, type ChatHistoryTurn, type ChatDetailLevel } from "@/lib/swarm-api";
import { ASTROLOGER } from "@/lib/personas";
import { CHAT_PENDING_CONTEXT_KEY } from "@/lib/chat-handoff";
import { useAuth } from "@/providers/auth-provider";
import { getFirebaseAuth } from "@/lib/firebase";
import { getTtsBackend } from "@/lib/tts";
import { LANGUAGES, type LangCode } from "@/providers/language-provider";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import { useKundli } from "@/hooks/useKundli";
import { getUserMoonSign } from "@/lib/kundli-helpers";
import { zodiacSignLabel } from "@/data/zodiac";

/** Must match CHAT_MESSAGE_COST in the backend's astro.routes.ts. */
const CHAT_MESSAGE_COST = 2;
/** Below this balance (but still affordable), nudge the user to top up before they run out mid-conversation. */
const LOW_CREDIT_THRESHOLD = 8;

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isError?: boolean;
  /** Canned "recharge to continue" reply — sent without ever hitting the AI. */
  isOutOfCredit?: boolean;
  /** The canned persona-intro bubble, not a real AI reply — no listen/feedback icons on it. */
  isGreeting?: boolean;
}

const THINKING_KEYS = ["aiChatPage.thinking1", "aiChatPage.thinking2", "aiChatPage.thinking3"];

/**
 * Assistant replies are markdown (short direct replies happen to have no
 * markdown syntax and pass through unchanged; Details-mode replies use real
 * headers/bold/tables). Wide elements (tables) scroll horizontally instead
 * of breaking the bubble layout on a narrow phone screen.
 */
function renderMessageContent(content: string) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="list-disc pl-4 space-y-1 my-1.5">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-4 space-y-1 my-1.5">{children}</ol>,
        li: ({ children }) => <li>{children}</li>,
        strong: ({ children }) => <strong className="font-semibold text-gold">{children}</strong>,
        h1: ({ children }) => <p className="mt-2 mb-1 font-semibold text-gold">{children}</p>,
        h2: ({ children }) => <p className="mt-2 mb-1 font-semibold text-gold">{children}</p>,
        h3: ({ children }) => <p className="mt-2 mb-1 font-semibold text-gold">{children}</p>,
        table: ({ children }) => (
          <div className="overflow-x-auto my-2 -mx-1">
            <table className="text-xs border-collapse">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border px-2 py-1 text-left font-semibold" style={{ borderColor: "var(--border)" }}>
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border px-2 py-1 align-top" style={{ borderColor: "var(--border)" }}>
            {children}
          </td>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

/**
 * The backend prompt (scholar.ts OUTPUT_STYLE) asks the model to end a reply
 * with an optional suggested follow-up on its own line, prefixed "Ask next:"
 * — split it out so it renders as a tappable chip instead of literal text in
 * the bubble. Only applied once a message has finished streaming (checked by
 * the caller) so a not-yet-complete "Ask next: Wh" mid-stream doesn't flicker.
 */
function splitFollowUp(content: string): { text: string; followUp: string | null } {
  const match = content.match(/\n *Ask next:\s*(.+?)\s*$/i);
  if (!match) return { text: content, followUp: null };
  return { text: content.slice(0, match.index).trimEnd(), followUp: match[1] };
}

export default function ChatConversation({ chartId }: { chartId?: string } = {}) {
  const { t, i18n } = useTranslation();
  const { user, refresh } = useAuth();
  const canAfford = (user?.credits ?? 0) >= CHAT_MESSAGE_COST;
  const [messages, setMessages] = useState<Message[]>([
    {
      id: crypto.randomUUID(),
      role: "assistant",
      content: t("aiChatPage.personaGreeting", {
        name: t(ASTROLOGER.nameKey),
        specialty: t(ASTROLOGER.specialtyKey),
      }),
      isGreeting: true,
    },
  ]);
  // Already-fetched-elsewhere kundli data (moon sign etc.) — reused here
  // purely to personalize the opening greeting, no extra LLM call involved.
  const { kundli } = useKundli();
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [thinkingIdx, setThinkingIdx] = useState(0);
  // All chats use "direct" mode; the Direct/Details toggle was removed.
  const detailLevel: ChatDetailLevel = "direct";
  const bottomRef = useRef<HTMLDivElement>(null);
  
  const sessionIdRef = useRef<string | undefined>(undefined);

  // Cycle the "thinking" label while waiting for the first token, so the
  // wait doesn't feel like a stalled/frozen request.
  useEffect(() => {
    if (!streaming) return;
    setThinkingIdx(0);
    const id = setInterval(() => setThinkingIdx((i) => (i + 1) % THINKING_KEYS.length), 1800);
    return () => clearInterval(id);
  }, [streaming]);

  // Conversation memory sent to the backend on each turn. Refs (not state)
  // because they're pure bookkeeping for the next request, not render input.
  // The backend folds older turns into `summary` once the raw history gets
  // long (see chat-compaction.ts) and tells us via a `summary` SSE event —
  // when that happens we drop the folded turns from what we send next time,
  // so the prompt (and therefore latency/timeout risk) stays bounded no
  // matter how long the conversation runs. This is also how the assistant
  // avoids re-asking things the user already answered earlier in the thread.
  const historyRef = useRef<ChatHistoryTurn[]>([]);
  const summaryRef = useRef<string | undefined>(undefined);

  // Per-message TTS + feedback state. Keyed by client-generated message id
  // (see the Message interface above) rather than array index, since index
  // keys shift as the conversation grows.
  const ttsBackend = getTtsBackend();
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [voteMap, setVoteMap] = useState<Record<string, "up" | "down">>({});
  const [missingVoiceLang, setMissingVoiceLang] = useState<LangCode | null>(null);

  const handleSpeak = useCallback(async (msg: Message, spokenText: string) => {
    if (!ttsBackend) return;
    if (speakingId === msg.id) {
      ttsBackend.stop();
      setSpeakingId(null);
      return;
    }

    const lang = i18n.language as LangCode;
    const hasVoice = await ttsBackend.hasVoiceFor(lang);
    if (!hasVoice) {
      setMissingVoiceLang(lang);
      return;
    }

    setSpeakingId(msg.id);
    await ttsBackend.speak(spokenText, lang);
    setSpeakingId((current) => (current === msg.id ? null : current));
  }, [ttsBackend, speakingId, i18n.language]);

  useEffect(() => {
    return () => ttsBackend?.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVote = useCallback((msg: Message, questionText: string | undefined, vote: "up" | "down") => {
    if (voteMap[msg.id]) return;
    setVoteMap((prev) => ({ ...prev, [msg.id]: vote }));

    if (posthog.__loaded) {
      posthog.capture("chat_feedback", {
        vote,
        locale: i18n.language,
        session_id: sessionIdRef.current,
      });
    }

    sendChatFeedback({
      vote,
      sessionId: sessionIdRef.current,
      locale: i18n.language,
      ...(vote === "down" ? { question: questionText, answer: msg.content } : {}),
    });
  }, [voteMap, i18n.language]);

  useEffect(() => {
    // Check if we have a sessionId in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const sid = urlParams.get("sessionId");
    
    if (sid && !sessionIdRef.current) {
      sessionIdRef.current = sid;
      // Fetch session from backend
      const auth = getFirebaseAuth();
      auth.currentUser?.getIdToken().then((token) => {
        const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.arohaastrology.in").replace(/\/$/, "");
        fetch(`${baseUrl}/v1/chat/sessions/${sid}`, {
          headers: {
            Authorization: `Bearer ${token || ""}`,
          },
        })
          .then((res) => {
            if (res.ok) return res.json();
            throw new Error("Failed to load session");
          })
          .then((session) => {
            if (session && session.history) {
              historyRef.current = session.history;
              summaryRef.current = session.summary;
              const loadedMessages: Message[] = [
                {
                  id: crypto.randomUUID(),
                  role: "assistant",
                  content: t("aiChatPage.personaGreeting", {
                    name: t(ASTROLOGER.nameKey),
                    specialty: t(ASTROLOGER.specialtyKey),
                  }),
                  isGreeting: true,
                },
              ];
              for (const h of session.history) {
                loadedMessages.push({
                  id: crypto.randomUUID(),
                  role: h.role,
                  content: h.content,
                });
              }
              setMessages(loadedMessages);
            }
          })
          .catch(console.error);
      });
    }
  }, [t]);

  // Personalize the opening greeting once the user's kundli is available —
  // e.g. "I see your Moon in Rohini" instead of a generic hello. Only touches
  // the greeting while the chat is still in its pristine just-opened state
  // (no loaded session, nothing sent yet), so it never rewrites a real
  // conversation already in progress.
  useEffect(() => {
    if (sessionIdRef.current) return;
    const moonSignEnglish = getUserMoonSign(kundli);
    if (!moonSignEnglish) return;
    setMessages((prev) => {
      if (prev.length !== 1 || !prev[0]?.isGreeting) return prev;
      return [
        {
          ...prev[0],
          content: t("aiChatPage.personaGreetingWithMoon", {
            name: t(ASTROLOGER.nameKey),
            specialty: t(ASTROLOGER.specialtyKey),
            moonSign: zodiacSignLabel(t, moonSignEnglish),
          }),
        },
      ];
    });
  }, [kundli, t]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  const sendMessage = useCallback(async (text?: string) => {
    const msg = text ?? input;
    if (!msg.trim() || streaming) return;

    // Out of credits: still show the message as sent (rather than silently
    // dropping it, which reads as the app being broken) but reply with a
    // canned recharge prompt instead of spending a real request on the LLM.
    if (!canAfford) {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "user", content: msg },
        { id: crypto.randomUUID(), role: "assistant", content: t("aiChatPage.outOfCreditReply"), isOutOfCredit: true },
      ]);
      setInput("");
      return;
    }

    // Add user message + empty assistant placeholder in one update
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: msg },
      { id: crypto.randomUUID(), role: "assistant", content: "" },
    ]);
    setInput("");
    setStreaming(true);

    const historyForThisTurn = historyRef.current;
    const summaryForThisTurn = summaryRef.current;

    try {
      const stream = streamChat(msg, {
        history: historyForThisTurn,
        summary: summaryForThisTurn,
        sessionId: sessionIdRef.current,
        detailLevel,
        chartId,
        locale: i18n.language,
      });
      let fullContent = "";
      let hadError = false;
      let newSummary = summaryForThisTurn;
      let summaryChanged = false;

      for await (const event of stream) {
        if (event.type === "token") {
          fullContent += event.data.content;
          const captured = fullContent;
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && last.role === "assistant") {
              next[next.length - 1] = { ...last, content: captured };
            }
            return next;
          });
        } else if (event.type === "summary") {
          newSummary = event.data.summary;
          summaryChanged = true;
        } else if (event.type === "error") {
          hadError = true;
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && last.role === "assistant") {
              next[next.length - 1] = {
                ...last,
                content: t("aiChatPage.errorPrefix", { error: event.data.message }),
                isError: true,
              };
            }
            return next;
          });
          break;
        } else if (event.type === "session_id") {
          sessionIdRef.current = event.data.sessionId;
          // Update URL without reloading
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.set("sessionId", event.data.sessionId);
          window.history.replaceState({}, "", newUrl.toString());
        } else if (event.type === "done") {
          break;
        }
      }

      // If we got no content at all, show a fallback
      if (!fullContent) {
        hadError = true;
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.role === "assistant" && !last.content) {
            next[next.length - 1] = {
              ...last,
              content: t("aiChatPage.noResponse"),
              isError: true,
            };
          }
          return next;
        });
      }

      // Only remember a turn that actually completed — an error/fallback
      // message isn't real conversation content and shouldn't be replayed
      // back to the model as if the assistant said it.
      if (!hadError && fullContent) {
        summaryRef.current = newSummary;
        historyRef.current = summaryChanged
          ? [
              { role: "user", content: msg },
              { role: "assistant", content: fullContent },
            ]
          : [
              ...historyForThisTurn,
              { role: "user", content: msg },
              { role: "assistant", content: fullContent },
            ];
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : t("aiChatPage.connectError");
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last && last.role === "assistant") {
          next[next.length - 1] = {
            ...last,
            content: errorMsg,
            isError: true,
          };
        } else {
          next.push({ id: crypto.randomUUID(), role: "assistant", content: errorMsg, isError: true });
        }
        return next;
      });
    } finally {
      setStreaming(false);
      // Credits are charged server-side the moment the request is accepted
      // (even if generation then fails) — refresh so the balance shown in
      // the top bar reflects the new total right away.
      refresh().catch(() => {});
    }
  }, [input, streaming, canAfford, t, detailLevel, refresh]);

  // A caller (e.g. the compatibility page's "Ask an Astrologer" button) can
  // hand off a pre-composed first message via sessionStorage so the
  // astrologer already has context instead of starting from a blank chat.
  useEffect(() => {
    const pending = sessionStorage.getItem(CHAT_PENDING_CONTEXT_KEY);
    if (pending) {
      sessionStorage.removeItem(CHAT_PENDING_CONTEXT_KEY);
      sendMessage(pending);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen pb-52 flex flex-col" style={{ background: "var(--background)" }}>
      {/* Header — the astrologer's identity */}
      <div className="px-5 pt-4 pb-4 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gold font-display">
            {ASTROLOGER.avatar} {t(ASTROLOGER.nameKey)}
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">{t(ASTROLOGER.specialtyKey)}</p>
        </div>
        <p className="text-[10px] text-[var(--text-muted)]/70 mt-2 max-w-sm mx-auto leading-relaxed text-center">
          {t("aiChatPage.disclosure")}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 px-4 space-y-4 overflow-y-auto pb-10">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => {
            // The empty assistant placeholder pushed at send-time renders as a
            // content-less bubble until the first token arrives — while
            // streaming, that gap is already covered by the typing indicator
            // below, so skip it here instead of showing both at once.
            if (streaming && i === messages.length - 1 && msg.role === "assistant" && !msg.content) {
              return null;
            }
            const isLastStreaming = streaming && i === messages.length - 1;
            const { text: assistantText, followUp } =
              msg.role === "assistant" && !isLastStreaming ? splitFollowUp(msg.content) : { text: msg.content, followUp: null };
            return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={msg.role === "user" ? "flex flex-col items-end" : "flex flex-col items-start"}
            >
              <div className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}>
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-yellow-500/20 flex items-center justify-center text-sm mr-2 flex-shrink-0 mt-1">
                    {ASTROLOGER.avatar}
                  </div>
                )}
                <div
                  className={
                    msg.role === "user"
                      ? "bg-yellow-500 text-black rounded-[16px_16px_3px_16px] px-4 py-3 max-w-[80%] text-sm"
                      : `rounded-[16px_16px_16px_3px] px-4 py-3 max-w-[92%] text-sm border ${msg.isError ? "border-red-500/50" : ""}`
                  }
                  style={
                    msg.role !== "user"
                      ? { background: "var(--surface)", borderColor: msg.isError ? undefined : "var(--border)", color: msg.isError ? "#f87171" : undefined }
                      : {}
                  }
                >
                  {msg.role === "assistant" ? renderMessageContent(assistantText) : msg.content}
                  {/* Cursor while streaming — only once tokens have actually started
                      arriving. Before that, `msg.content` is still empty and the
                      dedicated typing indicator below is showing instead; without
                      this guard both rendered at once, showing an empty bubble with
                      a lone blinking "|" alongside the "Consulting the stars..." bubble. */}
                  {isLastStreaming && msg.role === "assistant" && msg.content && (
                    <span className="inline-block w-0.5 h-4 bg-yellow-500 animate-pulse ml-0.5 align-middle" />
                  )}
                  {/* Sent indicator — single check only; there's no "read" concept for an AI reply */}
                  {msg.role === "user" && (
                    <span className="block text-right text-[10px] text-black/50 mt-0.5 leading-none">✓ {t("aiChatPage.sent")}</span>
                  )}
                  {msg.isOutOfCredit && (
                    <Link
                      href="/payment"
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-gold border border-gold/40 rounded-full px-3 py-1.5 hover:bg-gold/10 transition-colors"
                    >
                      <Wallet size={13} />
                      {t("aiChatPage.recharge")}
                    </Link>
                  )}
                </div>
              </div>
              {/* Listen / feedback icons — only on settled, real assistant replies (not the canned greeting). */}
              {msg.role === "assistant" && !isLastStreaming && !msg.isError && !msg.isOutOfCredit && !msg.isGreeting && (
                <div className="ml-9 mt-1.5 flex flex-wrap items-center gap-3">
                  {ttsBackend && (
                    <button
                      onClick={() => handleSpeak(msg, assistantText)}
                      aria-label={t(speakingId === msg.id ? "aiChatPage.stopListening" : "aiChatPage.listen")}
                      className="transition-colors"
                      style={{ color: speakingId === msg.id ? "var(--gold, #eab308)" : "var(--text-muted)" }}
                    >
                      {speakingId === msg.id ? <VolumeX size={15} /> : <Volume2 size={15} />}
                    </button>
                  )}
                  <button
                    onClick={() => handleVote(msg, messages[i - 1]?.role === "user" ? messages[i - 1]!.content : undefined, "up")}
                    disabled={!!voteMap[msg.id]}
                    aria-label={t("aiChatPage.helpful")}
                    className="transition-colors disabled:opacity-40"
                    style={{ color: voteMap[msg.id] === "up" ? "#22c55e" : "var(--text-muted)" }}
                  >
                    <ThumbsUp size={15} fill={voteMap[msg.id] === "up" ? "currentColor" : "none"} />
                  </button>
                  <button
                    onClick={() => handleVote(msg, messages[i - 1]?.role === "user" ? messages[i - 1]!.content : undefined, "down")}
                    disabled={!!voteMap[msg.id]}
                    aria-label={t("aiChatPage.notHelpful")}
                    className="transition-colors disabled:opacity-40"
                    style={{ color: voteMap[msg.id] === "down" ? "#ef4444" : "var(--text-muted)" }}
                  >
                    <ThumbsDown size={15} fill={voteMap[msg.id] === "down" ? "currentColor" : "none"} />
                  </button>
                  {voteMap[msg.id] && (
                    <span className="text-[10px] text-[var(--text-muted)]">{t("aiChatPage.feedbackThanks")}</span>
                  )}
                </div>
              )}
              {/* Suggested follow-up — tappable, sends it as the next message */}
              {followUp && (
                <button
                  onClick={() => sendMessage(followUp)}
                  disabled={streaming}
                  className="ml-9 mt-1.5 max-w-[85%] text-left text-xs text-gold/90 border border-gold/25 rounded-xl px-3 py-2 hover:bg-gold/10 transition-colors disabled:opacity-40"
                >
                  {followUp}
                </button>
              )}
            </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Conversation starters — only before the user has sent anything, so a
            blank input box isn't the first thing a new chat asks of them. */}
        {messages.length === 1 && !streaming && (
          <div className="flex flex-wrap gap-2 ml-9">
            {(["suggestion1", "suggestion2", "suggestion3", "suggestion4", "suggestion5"] as const).map((key) => (
              <button
                key={key}
                onClick={() => sendMessage(t(`aiChatPage.${key}`))}
                className="text-xs text-gold/90 border border-gold/25 rounded-full px-3 py-2 hover:bg-gold/10 transition-colors"
              >
                {t(`aiChatPage.${key}`)}
              </button>
            ))}
          </div>
        )}

        {/* Typing indicator — shown only when streaming hasn't started producing content yet */}
        {streaming && messages[messages.length - 1]?.role === "assistant" && !messages[messages.length - 1]?.content && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start items-center"
          >
            <div className="w-7 h-7 rounded-full bg-yellow-500/20 flex items-center justify-center text-sm mr-2 flex-shrink-0">
              {ASTROLOGER.avatar}
            </div>
            <div
              className="rounded-[16px_16px_16px_3px] px-4 py-3 border flex gap-2.5 items-center"
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
              <AnimatePresence mode="wait">
                <motion.span
                  key={thinkingIdx}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-xs italic"
                  style={{ color: "var(--text-muted)" }}
                >
                  {t(THINKING_KEYS[thinkingIdx]!)}
                </motion.span>
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="fixed bottom-[calc(var(--tab-bar-h)+1rem)] left-0 right-0 px-4 py-3" style={{ background: "var(--background)" }}>
        <div className="max-w-lg mx-auto">
          {!canAfford ? (
            <p className="text-center text-[11px] text-red-400 mb-1.5">
              {t("aiChatPage.notEnoughCreditsToAsk")} &middot;{" "}
              <Link href="/payment" className="underline underline-offset-2">
                {t("payment.buyCredits")}
              </Link>
            </p>
          ) : (user?.credits ?? 0) < LOW_CREDIT_THRESHOLD ? (
            <p className="text-center text-[11px] text-yellow-500 mb-1.5">
              {t("aiChatPage.lowCreditWarning", { credits: user?.credits ?? 0 })}{" "}
              <Link href="/payment" className="underline underline-offset-2">
                {t("payment.buyCredits")}
              </Link>
            </p>
          ) : (
            <p className="text-center text-[10px] text-[var(--text-muted)]/70 mb-1.5">
              {t("aiChatPage.costPerMessage", { cost: CHAT_MESSAGE_COST })}
            </p>
          )}
          <div className="flex gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder={t("aiChatPage.inputPlaceholder")}
              className="flex-1 h-14 rounded-full px-5 outline-none border text-sm disabled:opacity-50"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border)",
                color: "var(--foreground)",
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || streaming}
              className="h-14 w-14 rounded-full bg-yellow-500 text-black flex items-center justify-center disabled:opacity-40 transition-opacity"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>

      {missingVoiceLang && (
        <BottomSheetModal
          onClose={() => setMissingVoiceLang(null)}
          closeLabel={t("common.close")}
          header={<h2 className="text-base font-semibold text-gold">{t("aiChatPage.voiceMissingTitle")}</h2>}
        >
          <p className="text-sm text-[var(--text-muted)] mb-4">
            {t("aiChatPage.voiceMissingBody", {
              language: LANGUAGES.find((l) => l.code === missingVoiceLang)?.native ?? missingVoiceLang,
            })}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                // market:// resolves to the Play Store app on Android; on a
                // plain web browser (or if no app handles the scheme) nothing
                // happens, so fall back to the https URL after a short delay.
                const playUrl = "https://play.google.com/store/apps/details?id=com.google.android.tts";
                window.location.href = "market://details?id=com.google.android.tts";
                setTimeout(() => window.open(playUrl, "_blank"), 800);
                setMissingVoiceLang(null);
              }}
              className="flex-1 h-11 rounded-full bg-yellow-500 text-black text-sm font-semibold"
            >
              {t("aiChatPage.voiceMissingDownload")}
            </button>
            <button
              onClick={() => setMissingVoiceLang(null)}
              className="flex-1 h-11 rounded-full border text-sm"
              style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
            >
              {t("aiChatPage.voiceMissingCancel")}
            </button>
          </div>
        </BottomSheetModal>
      )}
    </main>
  );
}
