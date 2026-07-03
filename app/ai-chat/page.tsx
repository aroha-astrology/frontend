"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { streamChat, type ChatPersona, type ChatHistoryTurn } from "@/lib/swarm-api";

interface Message {
  role: "user" | "assistant";
  content: string;
  isError?: boolean;
}

/**
 * Visual persona presentation only — the 4 keys are the same functional
 * personas the backend has always had (general/career/love/health topic
 * grounding). Naming/avatars give each one an identity to show in the UI;
 * they don't change what's sent to the API.
 */
const PERSONAS: { key: ChatPersona; avatar: string; nameKey: string; specialtyKey: string }[] = [
  { key: "general", avatar: "🧙", nameKey: "aiChatPage.personaGeneral", specialtyKey: "aiChatPage.personaGeneralSpecialty" },
  { key: "career", avatar: "💼", nameKey: "aiChatPage.personaCareer", specialtyKey: "aiChatPage.personaCareerSpecialty" },
  { key: "love", avatar: "🌸", nameKey: "aiChatPage.personaLove", specialtyKey: "aiChatPage.personaLoveSpecialty" },
  { key: "health", avatar: "🌿", nameKey: "aiChatPage.personaHealth", specialtyKey: "aiChatPage.personaHealthSpecialty" },
];

const THINKING_KEYS = ["aiChatPage.thinking1", "aiChatPage.thinking2", "aiChatPage.thinking3"];

export default function AIChatPage() {
  const { t } = useTranslation();
  const [persona, setPersona] = useState<ChatPersona>("general");
  const activePersona = PERSONAS.find((p) => p.key === persona)!;
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
      content: t("aiChatPage.greeting"),
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
        persona,
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
                content: t("aiChatPage.errorPrefix", { error: event.data.error }),
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
  }, [input, streaming, persona]);

  return (
    <main className="min-h-screen pb-32 flex flex-col" style={{ background: "var(--background)" }}>
      {/* Header — shows the currently selected astrologer's identity */}
      <div className="px-5 pt-10 pb-4 text-center border-b" style={{ borderColor: "var(--border)" }}>
        <h1 className="text-3xl font-bold text-gold font-display">
          {activePersona.avatar} {t(activePersona.nameKey)}
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">{t(activePersona.specialtyKey)}</p>
        <p className="text-[10px] text-[var(--text-muted)]/70 mt-2 max-w-sm mx-auto leading-relaxed">
          {t("aiChatPage.disclosure")}
        </p>
      </div>

      {/* Persona cards — avatar + name + specialty, wraps rather than overflowing on narrow screens */}
      <div className="flex flex-wrap gap-2 px-4 pt-3 justify-center">
        {PERSONAS.map(({ key, avatar, nameKey, specialtyKey }) => (
          <button
            key={key}
            onClick={() => setPersona(key)}
            disabled={streaming}
            className={`flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border whitespace-nowrap transition-colors disabled:opacity-40 ${
              persona === key ? "border-yellow-500 bg-yellow-500/10" : "border-transparent"
            }`}
            style={persona === key ? {} : { background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${
                persona === key ? "bg-yellow-500/20" : ""
              }`}
              style={persona === key ? {} : { background: "var(--background)" }}
            >
              {avatar}
            </span>
            <span className="flex flex-col items-start leading-none">
              <span className={`text-xs font-semibold ${persona === key ? "text-yellow-500" : ""}`} style={persona === key ? {} : { color: "var(--foreground)" }}>
                {t(nameKey)}
              </span>
              <span className="text-[9.5px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                {t(specialtyKey)}
              </span>
            </span>
          </button>
        ))}
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
                  {activePersona.avatar}
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
                {msg.content || (streaming && i === messages.length - 1 ? "" : msg.content)}
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
              {activePersona.avatar}
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
