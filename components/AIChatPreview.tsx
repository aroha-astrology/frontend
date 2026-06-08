"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const previewMessages = [
  { role: "user", content: "What does my career hold this year?" },
  {
    role: "assistant",
    content:
      "Jupiter's transit through your 10th house indicates remarkable professional growth. Bold decisions in the next quarter will shape your trajectory for years to come.",
  },
];

export default function AIChatPreview() {
  return (
    <div className="rounded-3xl border p-5" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center text-sm">
          🔮
        </div>
        <div>
          <p className="text-sm font-semibold text-gold">AI Astrologer</p>
          <p className="text-[10px] text-[var(--text-muted)]">Online · Vedic wisdom</p>
        </div>
      </div>

      <div className="space-y-3">
        {previewMessages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.2 }}
            className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}
          >
            <div
              className={
                msg.role === "user"
                  ? "bg-yellow-500 text-black rounded-3xl rounded-br-md px-4 py-2.5 max-w-[85%] text-sm"
                  : "rounded-3xl rounded-bl-md px-4 py-2.5 max-w-[85%] text-sm border"
              }
              style={
                msg.role !== "user"
                  ? { background: "var(--surface-2, var(--secondary))", borderColor: "var(--border)" }
                  : {}
              }
            >
              {msg.content}
            </div>
          </motion.div>
        ))}
      </div>

      <Link href="/ai-chat">
        <button className="mt-4 w-full h-11 rounded-2xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-black text-sm font-bold">
          Start Your Reading →
        </button>
      </Link>
    </div>
  );
}
