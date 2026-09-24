"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X } from "lucide-react";
import { onForegroundPush, type ForegroundPush } from "@/lib/push-events";
import { track } from "@/lib/analytics";

const SHOW_MS = 6000;

/**
 * Android shows nothing for a push that arrives while the app is open, so a
 * "your report is ready" sent mid-session used to vanish. This slides it in at
 * the top for a few seconds; tapping opens the same screen the OS
 * notification would have.
 */
export default function PushForegroundBanner() {
  const router = useRouter();
  const [push, setPush] = useState<ForegroundPush | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubscribe = onForegroundPush((next) => {
      setPush(next);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setPush(null), SHOW_MS);
    });
    return () => {
      unsubscribe();
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const close = () => {
    if (timer.current) clearTimeout(timer.current);
    setPush(null);
  };

  const open = () => {
    if (!push) return;
    track("push_opened", { type: push.type ?? null, foreground: true });
    if (push.navigate) router.push(push.navigate);
    close();
  };

  return (
    <AnimatePresence>
      {push && (
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: "spring", damping: 24 }}
          className="fixed inset-x-0 top-0 z-[300] flex justify-center px-4 pt-[calc(0.75rem+var(--sat))] pointer-events-none"
        >
          <div
            role="alert"
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-gold/30 bg-card/95 p-3 shadow-2xl backdrop-blur-xl"
          >
            <button onClick={open} className="flex flex-1 items-start gap-3 text-left">
              <span className="mt-0.5 shrink-0 text-gold">
                <Bell size={18} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">{push.title}</span>
                {push.body && <span className="mt-0.5 block text-xs leading-relaxed text-muted line-clamp-2">{push.body}</span>}
              </span>
            </button>
            <button onClick={close} aria-label="Dismiss" className="shrink-0 p-1 text-muted hover:text-foreground">
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
