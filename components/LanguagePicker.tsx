"use client";

import { useEffect, useRef, useState } from "react";
import { Globe, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { LANGUAGES, useLanguage } from "@/providers/language-provider";
import IconButton from "@/components/ui/IconButton";

export default function LanguagePicker() {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  return (
    <div className="relative" ref={ref}>
      <IconButton
        onClick={() => setOpen((o) => !o)}
        className="relative"
        aria-label="Select language"
        aria-expanded={open}
      >
        <Globe size={18} />
        <span className="absolute -bottom-1 -right-1 text-[8px] font-bold uppercase bg-gold text-background rounded-full px-1 leading-tight">
          {current.code}
        </span>
      </IconButton>

      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-44 rounded-2xl border border-gold/20 bg-card shadow-xl overflow-hidden z-50"
          >
            {LANGUAGES.map((l) => {
              const active = l.code === lang;
              return (
                <li key={l.code}>
                  <button
                    onClick={() => {
                      setLang(l.code);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-gold/10 ${
                      active ? "text-gold" : "text-foreground/80"
                    }`}
                  >
                    <span className="flex flex-col items-start leading-tight">
                      <span className="font-medium">{l.native}</span>
                      <span className="text-[10px] text-muted">{l.label}</span>
                    </span>
                    {active && <Check size={14} className="text-gold" />}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
