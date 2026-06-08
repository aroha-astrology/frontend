"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Mic } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getAIResponse } from "@/data/aiResponses";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

const suggestions = [
  "Career prediction",
  "Marriage prediction",
  "Financial future",
  "Lucky gemstone",
  "Health guidance",
  "2026 Forecast",
];

function AIChatContent() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Namaste 🙏 I am Yogi Baba, your AI Vedic Astrologer. Ask me about career, marriage, wealth, health, or your lucky gemstone.",
    },
  ]);
  const [input, setInput] = useState(initialQ);
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  /* Character-by-character streaming */
  const streamReply = useCallback((fullText: string) => {
    const STREAM_LIMIT = 400;
    const text = fullText.length > STREAM_LIMIT ? fullText.slice(0, STREAM_LIMIT) + "…" : fullText;
    let idx = 0;
    setMessages((prev) => [...prev, { role: "assistant", content: "", streaming: true }]);

    const tick = () => {
      idx++;
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.streaming) {
          next[next.length - 1] = { ...last, content: text.slice(0, idx) };
        }
        return next;
      });
      if (idx < text.length) setTimeout(tick, 18);
      else {
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.streaming) next[next.length - 1] = { ...last, streaming: false };
          return next;
        });
      }
    };
    setTimeout(tick, 18);
  }, []);

  const sendMessage = useCallback(async (text?: string) => {
    const msg = text ?? input;
    if (!msg.trim() || typing) return;

    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setInput("");
    setTyping(true);

    await new Promise((r) => setTimeout(r, 900 + Math.random() * 600));

    const reply = getAIResponse(msg);
    setTyping(false);
    streamReply(reply);
  }, [input, typing, streamReply]);

  return (
    <motion.main
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen pb-32 pt-24 flex flex-col"
      style={{ background: "var(--background)" }}
    >
      {/* Premium chat header */}
      <div
        className="fixed top-0 left-0 right-0 z-40 px-5 pt-10 pb-4 flex items-center gap-3"
        style={{
          background: "rgba(5,6,10,0.9)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(212,175,55,0.1)",
        }}
      >
        {/* AI avatar orb */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-xl"
          style={{
            background: "linear-gradient(135deg, rgba(212,175,55,0.3), rgba(212,175,55,0.1))",
            border: "1px solid rgba(212,175,55,0.4)",
          }}
        >
          🔮
        </div>

        <div className="flex-1">
          <h1
            className="font-editorial text-lg font-semibold leading-tight"
            style={{ color: "var(--gold)", fontStyle: "italic" }}
          >
            Yogi Baba
          </h1>
          <div className="flex items-center gap-1.5">
            <span className="live-pulse" />
            <span className="text-[10px]" style={{ color: "#22c55e" }}>Live · AI Vedic Astrologer</span>
          </div>
        </div>
      </div>

      {/* Suggestion chips */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
        {suggestions.map((s) => (
          <motion.button
            key={s}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => sendMessage(s)}
            className="px-3 py-1.5 rounded-full text-xs whitespace-nowrap border"
            style={{
              background: "rgba(212,175,55,0.08)",
              borderColor: "rgba(212,175,55,0.3)",
              color: "var(--text-muted)",
            }}
          >
            {s}
          </motion.button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 px-4 space-y-4 overflow-y-auto pb-4">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={msg.role === "user" ? { opacity: 0, x: 30 } : { opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              {msg.role === "user" ? (
                <div className="flex justify-end">
                  <div
                    className="px-4 py-3 rounded-3xl rounded-br-sm text-sm max-w-[80%]"
                    style={{
                      background: "linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.08))",
                      border: "1px solid rgba(212,175,55,0.3)",
                      color: "var(--foreground)",
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div className="flex justify-start gap-2">
                  {/* Small avatar */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 mt-1"
                    style={{
                      background: "rgba(212,175,55,0.15)",
                      border: "1px solid rgba(212,175,55,0.3)",
                    }}
                  >
                    🔮
                  </div>

                  <div
                    className="px-4 py-3 rounded-3xl rounded-bl-sm text-sm max-w-[78%] border relative group"
                    style={{ background: "var(--surface)", borderColor: "var(--border)" }}
                  >
                    {msg.content}
                    {msg.streaming && (
                      <span className="inline-block w-0.5 h-4 bg-gold ml-0.5 animate-pulse align-middle" />
                    )}

                    {/* Copy button — shows on hover */}
                    {!msg.streaming && (
                      <button
                        className="absolute -bottom-5 right-2 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: "var(--text-muted)" }}
                        onClick={() => navigator.clipboard?.writeText(msg.content)}
                      >
                        Copy
                      </button>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {typing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
              style={{ background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.3)" }}
            >
              🔮
            </div>
            <div
              className="rounded-3xl rounded-bl-sm px-4 py-3 border flex gap-1.5 items-center"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              {[0, 1, 2].map((j) => (
                <motion.span
                  key={j}
                  animate={{ y: [0, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 0.8, delay: j * 0.15 }}
                  className="w-1.5 h-1.5 rounded-full block"
                  style={{ background: "var(--gold)" }}
                />
              ))}
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div
        className="fixed bottom-16 left-0 right-0 px-4 py-3"
        style={{ background: "rgba(5,6,10,0.9)", backdropFilter: "blur(20px)" }}
      >
        <div className="flex gap-2 max-w-lg mx-auto items-center">
          {/* Mic button */}
          <button
            className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 border"
            style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text-muted)" }}
          >
            <Mic size={18} />
          </button>

          {/* Text input */}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Ask Yogi Baba anything..."
            className="flex-1 h-12 rounded-full px-5 outline-none border text-sm"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
              color: "var(--foreground)",
            }}
          />

          {/* Send button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => sendMessage()}
            disabled={!input.trim() || typing}
            className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-40"
            style={{
              background: "linear-gradient(135deg, #D4AF37, #F4D675)",
              color: "#05060A",
            }}
          >
            <Send size={18} />
          </motion.button>
        </div>
      </div>
    </motion.main>
  );
}

export default function AIChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: "var(--background)" }} />}>
      <AIChatContent />
    </Suspense>
  );
}
