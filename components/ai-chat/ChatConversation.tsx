"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { streamChat, type ChatHistoryTurn } from "@/lib/swarm-api";
import { ASTROLOGER } from "@/lib/personas";

interface Message {
  role: "user" | "assistant";
  content: string;
  isError?: boolean;
}

const THINKING_KEYS = ["aiChatPage.thinking1", "aiChatPage.thinking2", "aiChatPage.thinking3"];

/**
 * The LLM writes `*`/`-` bullet lines and blank-line paragraph breaks, but a
 * plain-text `<div>` collapses newlines (default `white-space: normal`), so
 * a multi-line list rendered as-is turns into one run-on line with literal
 * "*" characters. Split into real paragraphs/list items instead.
 */
function renderMessageContent(content: string) {
  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length === 0) return;
    blocks.push(
      <ul key={`list-${blocks.length}`} className="list-disc pl-4 space-y-1 my-1.5">
        {listItems.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    );
    listItems = [];
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    const bulletMatch = trimmed.match(/^[*-]\s+(.*)/);
    if (bulletMatch) {
      listItems.push(bulletMatch[1]!);
      return;
    }
    flushList();
    if (trimmed) {
      blocks.push(
        <p key={`p-${i}`} className="mb-1.5 last:mb-0">
          {trimmed}
        </p>
      );
    }
  });
  flushList();

  return blocks;
}

export default function ChatConversation() {
  const { t } = useTranslation();
  const suggestions = [
    t("aiChatPage.suggestion1"),
    t("aiChatPage.suggestion2"),
    t("aiChatPage.suggestion3"),
    t("aiChatPage.suggestion4"),
    t("aiChatPage.suggestion5"),
  ];
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
  }, [input, streaming, t]);

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
      </div>

      {/* Suggestion chips */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => sendMessage(s)}
            disabled={streaming}
            className="px-4 py-2 rounded-full text-sm whitespace-nowrap border transition-colors hover:border-yellow-500/50 disabled:opacity-40"
            style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text-muted)" }}
          >
            {s}
          </button>
        ))}
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
                    : `rounded-[16px_16px_16px_3px] px-4 py-3 max-w-[80%] text-sm border ${msg.isError ? "border-red-500/50" : ""}`
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
