"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Briefcase, Heart, Leaf, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { streamChat, type ChatPersona } from "@/lib/swarm-api";

interface Message {
  role: "user" | "assistant";
  content: string;
  isError?: boolean;
}

const PERSONAS: { key: ChatPersona; icon: typeof Sparkles; labelKey: string }[] = [
  { key: "general", icon: Sparkles, labelKey: "aiChatPage.personaGeneral" },
  { key: "career", icon: Briefcase, labelKey: "aiChatPage.personaCareer" },
  { key: "love", icon: Heart, labelKey: "aiChatPage.personaLove" },
  { key: "health", icon: Leaf, labelKey: "aiChatPage.personaHealth" },
];

export default function AIChatPage() {
  const { t } = useTranslation();
  const [persona, setPersona] = useState<ChatPersona>("general");
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
  const bottomRef = useRef<HTMLDivElement>(null);

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

    try {
      const stream = streamChat(msg, { persona });
      let fullContent = "";

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
        } else if (event.type === "error") {
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
      {/* Header */}
      <div className="px-5 pt-10 pb-4 text-center border-b" style={{ borderColor: "var(--border)" }}>
        <h1 className="text-3xl font-bold text-gold font-display">🔮 {t("aiChatPage.title")}</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">{t("aiChatPage.subtitle")}</p>
        <p className="text-[10px] text-[var(--text-muted)]/70 mt-2 max-w-sm mx-auto leading-relaxed">
          {t("aiChatPage.disclosure")}
        </p>
      </div>

      {/* Persona selector */}
      <div className="flex gap-2 px-4 pt-3 justify-center">
        {PERSONAS.map(({ key, icon: Icon, labelKey }) => (
          <button
            key={key}
            onClick={() => setPersona(key)}
            disabled={streaming}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium border transition-colors disabled:opacity-40 ${
              persona === key ? "border-yellow-500 text-yellow-500 bg-yellow-500/10" : "border-transparent"
            }`}
            style={persona === key ? {} : { background: "var(--surface)", borderColor: "var(--border)", color: "var(--text-muted)" }}
          >
            <Icon size={13} />
            {t(labelKey)}
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
                  🔮
                </div>
              )}
              <div
                className={
                  msg.role === "user"
                    ? "bg-yellow-500 text-black rounded-3xl rounded-br-md px-4 py-3 max-w-[80%] text-sm"
                    : `rounded-3xl rounded-bl-md px-4 py-3 max-w-[80%] text-sm border ${msg.isError ? "border-red-500/50" : ""}`
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
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator — shown only when streaming hasn't started producing content yet */}
        {streaming && messages[messages.length - 1]?.role === "assistant" && !messages[messages.length - 1]?.content && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="w-7 h-7 rounded-full bg-yellow-500/20 flex items-center justify-center text-sm mr-2 flex-shrink-0">
              🔮
            </div>
            <div
              className="rounded-3xl rounded-bl-md px-4 py-3 border flex gap-1 items-center"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  animate={{ y: [0, -4, 0] }}
                  transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
                  className="w-1.5 h-1.5 rounded-full bg-yellow-500 block"
                />
              ))}
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
