"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { streamChat, type ChatHistoryTurn, type ChatDetailLevel } from "@/lib/swarm-api";
import { ASTROLOGER } from "@/lib/personas";
import { CHAT_PENDING_CONTEXT_KEY } from "@/lib/chat-handoff";
import SegmentedToggle from "@/components/ui/SegmentedToggle";

interface Message {
  role: "user" | "assistant";
  content: string;
  isError?: boolean;
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

export default function ChatConversation() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: t("aiChatPage.personaGreeting", {
        name: t(ASTROLOGER.nameKey),
        specialty: t(ASTROLOGER.specialtyKey),
      }),
    },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [thinkingIdx, setThinkingIdx] = useState(0);
  const [detailLevel, setDetailLevel] = useState<ChatDetailLevel>("direct");
  const bottomRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  const sendMessage = useCallback(async (text?: string) => {
    const msg = text ?? input;
    if (!msg.trim() || streaming) return;

    // Add user message + empty assistant placeholder in one update
    setMessages((prev) => [
      ...prev,
      { role: "user", content: msg },
      { role: "assistant", content: "" },
    ]);
    setInput("");
    setStreaming(true);

    const historyForThisTurn = historyRef.current;
    const summaryForThisTurn = summaryRef.current;

    try {
      const stream = streamChat(msg, {
        history: historyForThisTurn,
        summary: summaryForThisTurn,
        detailLevel,
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
          next.push({ role: "assistant", content: errorMsg, isError: true });
        }
        return next;
      });
    } finally {
      setStreaming(false);
    }
  }, [input, streaming, t, detailLevel]);

  // A caller (e.g. the compatibility page's "Ask an Astrologer" button) can
  // hand off a pre-composed first message via sessionStorage so the
  // astrologer already has context instead of starting from a blank chat.
  useEffect(() => {
    const pending = sessionStorage.getItem(CHAT_PENDING_CONTEXT_KEY);
    if (!pending) return;
    sessionStorage.removeItem(CHAT_PENDING_CONTEXT_KEY);
    sendMessage(pending);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen pb-32 flex flex-col" style={{ background: "var(--background)" }}>
      {/* Header — the astrologer's identity */}
      <div className="px-5 pt-10 pb-4 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gold font-display">
            {ASTROLOGER.avatar} {t(ASTROLOGER.nameKey)}
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">{t(ASTROLOGER.specialtyKey)}</p>
        </div>
        <p className="text-[10px] text-[var(--text-muted)]/70 mt-2 max-w-sm mx-auto leading-relaxed text-center">
          {t("aiChatPage.disclosure")}
        </p>
        <div className="flex justify-center mt-3">
          <SegmentedToggle
            value={detailLevel}
            onChange={setDetailLevel}
            options={[
              { value: "direct", label: t("aiChatPage.toggle.direct") },
              { value: "details", label: t("aiChatPage.toggle.details") },
            ]}
          />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 px-4 space-y-4 overflow-y-auto pb-4">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}
            >
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
                {msg.role === "assistant" ? renderMessageContent(msg.content) : msg.content}
                {/* Show cursor while streaming the last message */}
                {streaming && i === messages.length - 1 && msg.role === "assistant" && (
                  <span className="inline-block w-0.5 h-4 bg-yellow-500 animate-pulse ml-0.5 align-middle" />
                )}
                {/* Sent indicator — single check only; there's no "read" concept for an AI reply */}
                {msg.role === "user" && (
                  <span className="block text-right text-[10px] text-black/50 mt-0.5 leading-none">✓ {t("aiChatPage.sent")}</span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

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
      <div className="fixed bottom-16 left-0 right-0 px-4 py-3" style={{ background: "var(--background)" }}>
        <div className="flex gap-3 max-w-lg mx-auto">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder={t("aiChatPage.inputPlaceholder")}
            className="flex-1 h-14 rounded-full px-5 outline-none border text-sm"
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
    </main>
  );
}
