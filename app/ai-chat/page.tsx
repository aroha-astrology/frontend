"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send } from "lucide-react";
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
      className="min-h-screen pb-32 flex flex-col"
      style={{ background: "var(--background)" }}
    >
      {/* Header */}
      <div className="px-5 pt-10 pb-4 text-center border-b" style={{ borderColor: "var(--border)" }}>
        <h1 className="text-3xl font-bold text-gold font-display">🔮 AI Astrologer</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Yogi Baba · Vedic wisdom</p>
      </div>

      {/* Suggestion chips */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
        {suggestions.map((s) => (
          <motion.button
            key={s}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => sendMessage(s)}
            className="px-4 py-2 rounded-full text-sm whitespace-nowrap border"
            style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text-muted)" }}
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
                    : "rounded-3xl rounded-bl-md px-4 py-3 max-w-[80%] text-sm border"
                }
                style={
                  msg.role !== "user"
                    ? { background: "var(--surface)", borderColor: "var(--border)" }
                    : {}
                }
              >
                {msg.content}
                {msg.streaming && (
                  <span className="inline-block w-0.5 h-4 bg-yellow-500 ml-0.5 animate-pulse align-middle" />
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {typing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="w-7 h-7 rounded-full bg-yellow-500/20 flex items-center justify-center text-sm mr-2 flex-shrink-0">
              🔮
            </div>
            <div
              className="rounded-3xl rounded-bl-md px-4 py-3 border flex gap-1 items-center"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              {[0, 1, 2].map((j) => (
                <motion.span
                  key={j}
                  animate={{ y: [0, -4, 0] }}
                  transition={{ repeat: Infinity, duration: 0.8, delay: j * 0.15 }}
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
            placeholder="Ask your astrologer..."
            className="flex-1 h-14 rounded-full px-5 outline-none border text-sm"
            style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--foreground)" }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || typing}
            className="h-14 w-14 rounded-full bg-yellow-500 text-black flex items-center justify-center disabled:opacity-40 transition-opacity"
          >
            <Send size={20} />
          </button>
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
