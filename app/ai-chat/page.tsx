"use client";

import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getAIResponse } from "@/data/aiResponses";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const suggestions = [
  "Career prediction",
  "Marriage prediction",
  "Financial future",
  "Lucky gemstone",
  "Health guidance",
];

export default function AIChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Namaste 🙏 I am Yogi Baba, your AI Vedic Astrologer. Ask me about career, marriage, wealth, health, or your lucky gemstone.",
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const sendMessage = async (text?: string) => {
    const msg = text ?? input;
    if (!msg.trim()) return;

    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setInput("");
    setTyping(true);

    await new Promise((r) => setTimeout(r, 900 + Math.random() * 600));

    const reply = getAIResponse(msg);
    setTyping(false);
    setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
  };

  return (
    <main className="min-h-screen pb-32 flex flex-col" style={{ background: "var(--background)" }}>
      {/* Header */}
      <div className="px-5 pt-10 pb-4 text-center border-b" style={{ borderColor: "var(--border)" }}>
        <h1 className="text-3xl font-bold text-gold font-display">🔮 AI Astrologer</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Yogi Baba · Vedic wisdom</p>
      </div>

      {/* Suggestion chips */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => sendMessage(s)}
            className="px-4 py-2 rounded-full text-sm whitespace-nowrap border transition-colors hover:border-yellow-500/50"
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
                    : "rounded-3xl rounded-bl-md px-4 py-3 max-w-[80%] text-sm border"
                }
                style={
                  msg.role !== "user"
                    ? { background: "var(--surface)", borderColor: "var(--border)" }
                    : {}
                }
              >
                {msg.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {typing && (
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
            placeholder="Ask your astrologer..."
            className="flex-1 h-14 rounded-full px-5 outline-none border text-sm"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
              color: "var(--foreground)",
            }}
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
    </main>
  );
}
