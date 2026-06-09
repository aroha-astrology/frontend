"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Send, Check, ChevronRight, Loader2 } from "lucide-react";
import BrandLogo from "@/components/ui/BrandLogo";
import ThemeSwitch from "@/components/ThemeSwitch";
import LanguagePicker from "@/components/LanguagePicker";
import ParticleBackground from "@/components/ParticleBackground";
import { LANGUAGES, useLanguage, type LangCode } from "@/providers/language-provider";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Message {
  id: number;
  from: "bot" | "user";
  text: string;
}

interface Answers {
  language: string;
  name: string;
  dob: string;
  tob: string;
  timeSource: string;
  place: string;
  gender: string;
  status: string;
}

const TOTAL_STEPS = 8;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isValidDob(v: string) {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(v)) return false;
  const [d, m, y] = v.split("/").map(Number);
  return d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1900 && y <= new Date().getFullYear();
}
function isValidTob(v: string) {
  if (!/^\d{2}:\d{2}$/.test(v)) return false;
  const [h, m] = v.split(":").map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}
function formatDobInput(raw: string) {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}
function formatTobInput(raw: string) {
  const d = raw.replace(/\D/g, "").slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}:${d.slice(2)}`;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function BotBubble({ text }: { text: string }) {
  return (
    <div className="flex items-end gap-2 max-w-[82%]">
      {/* Avatar */}
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gold/80 to-purple-600/60 shrink-0 flex items-center justify-center text-[11px]">
        ✨
      </div>
      <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-surface border border-gold/10 text-[14px] text-foreground leading-relaxed shadow-sm">
        {text}
      </div>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end max-w-[82%] ml-auto">
      <div className="px-4 py-3 rounded-2xl rounded-br-sm bg-gold/15 border border-gold/20 text-[14px] text-foreground leading-relaxed">
        {text}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 max-w-[82%]">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gold/80 to-purple-600/60 shrink-0 flex items-center justify-center text-[11px]">✨</div>
      <div className="px-4 py-3.5 rounded-2xl rounded-bl-sm bg-surface border border-gold/10 flex gap-1 items-center">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-gold/60"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.18 }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const { t } = useTranslation();
  const { setLang } = useLanguage();

  const [messages, setMessages] = useState<Message[]>([]);
  const [step, setStep] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [inputErr, setInputErr] = useState("");
  const [answers, setAnswers] = useState<Partial<Answers>>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const msgId = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  const nextId = () => ++msgId.current;

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Bot sends a message after a typing delay
  const botSay = (text: string, delay = 700) => {
    setIsTyping(true);
    return new Promise<void>((res) => {
      setTimeout(() => {
        setIsTyping(false);
        setMessages((m) => [...m, { id: nextId(), from: "bot", text }]);
        res();
      }, delay);
    });
  };

  // Add a user message
  const userSay = (text: string) => {
    setMessages((m) => [...m, { id: nextId(), from: "user", text }]);
  };

  // Advance to next step after the user responds
  const advance = async (ans: Partial<Answers>, userText: string, nextQ: string) => {
    setAnswers((a) => ({ ...a, ...ans }));
    userSay(userText);
    await botSay(nextQ);
    setStep((s) => s + 1);
  };

  // ── Step questions (resolved at render time so i18next re-renders on lang change)
  const Q: Record<number, string> = {
    0: t("onboarding.step1q"),
    1: t("onboarding.step2q"),
    2: t("onboarding.step3q"),
    3: t("onboarding.step4q"),
    4: t("onboarding.step5q"),
    5: t("onboarding.step6q"),
    6: t("onboarding.step7q"),
    7: t("onboarding.step8q"),
  };

  // ── Kick off the conversation
  useEffect(() => {
    (async () => {
      await botSay(t("onboarding.greeting"), 600);
      await botSay(Q[0], 900);
      setStep(1);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Progress indicator (0-based step vs 1-8)
  const progress = Math.min(step - 1, TOTAL_STEPS - 1);

  // ── Text submit (steps 2, 3, 4, 6)
  const handleTextSubmit = async () => {
    const val = textInput.trim();
    if (!val) return;

    if (step === 2) { // name
      await advance({ name: val }, val, Q[2]);
    } else if (step === 3) { // dob
      if (!isValidDob(val)) { setInputErr(t("onboarding.invalidDob")); return; }
      await advance({ dob: val }, val, Q[3]);
    } else if (step === 4) { // tob
      if (!isValidTob(val)) { setInputErr(t("onboarding.invalidTob")); return; }
      await advance({ tob: val }, val, Q[4]);
    } else if (step === 6) { // place
      await advance({ place: val }, val, Q[6]);
    }

    setTextInput("");
    setInputErr("");
  };

  // ── Language selection (step 1)
  const handleLanguage = async (code: LangCode, native: string) => {
    setLang(code);
    userSay(native);
    setIsTyping(true);
    setTimeout(async () => {
      setIsTyping(false);
      setAnswers((a) => ({ ...a, language: code }));
      setMessages((m) => [...m, { id: nextId(), from: "bot", text: t("onboarding.step2q") }]);
      setStep(2);
    }, 800);
  };

  // ── Time source (step 5)
  const TIME_SOURCES = [
    { key: "certificate", label: t("onboarding.step5cert") },
    { key: "family",      label: t("onboarding.step5family") },
    { key: "hospital",    label: t("onboarding.step5hospital") },
    { key: "approximate", label: t("onboarding.step5approx") },
  ];

  const handleTimeSource = async (key: string, label: string) => {
    await advance({ timeSource: key }, label, Q[5]);
  };

  // ── Gender (step 7)
  const GENDERS = [
    { key: "male",   label: t("onboarding.step7male") },
    { key: "female", label: t("onboarding.step7female") },
    { key: "other",  label: t("onboarding.step7other") },
  ];

  const handleGender = async (key: string, label: string) => {
    await advance({ gender: key }, label, Q[7]);
  };

  // ── Relationship status (step 8)
  const STATUSES = [
    { key: "single",   label: t("onboarding.step8single") },
    { key: "dating",   label: t("onboarding.step8dating") },
    { key: "engaged",  label: t("onboarding.step8engaged") },
    { key: "married",  label: t("onboarding.step8married") },
    { key: "other",    label: t("onboarding.step8other") },
  ];

  const handleStatus = async (key: string, label: string) => {
    setAnswers((a) => ({ ...a, status: key }));
    userSay(label);
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages((m) => [...m, { id: nextId(), from: "bot", text: t("onboarding.allSet") }]);
      setTimeout(() => setShowConfirm(true), 600);
    }, 800);
  };

  const handleConfirm = () => {
    setSubmitting(true);
    setTimeout(() => { window.location.href = "/"; }, 1800);
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="cosmic-bg min-h-screen flex flex-col relative overflow-hidden text-foreground">
      <ParticleBackground />

      {/* Header */}
      <div className="relative z-20 flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
        <div className="flex items-center gap-3">
          <BrandLogo size={32} className="opacity-80" />
          <div className="select-none">
            <span className="font-display-decorative text-gold text-[13px] tracking-[0.2em]">AROHA</span>
          </div>
        </div>

        {/* Progress dots */}
        {step >= 1 && (
          <div className="flex gap-1.5 items-center">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === progress ? 16 : 6,
                  height: 6,
                  background: i <= progress ? "var(--gold)" : "var(--border)",
                }}
              />
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <LanguagePicker />
          <ThemeSwitch />
        </div>
      </div>

      {/* Chat area */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-4">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              {msg.from === "bot" ? <BotBubble text={msg.text} /> : <UserBubble text={msg.text} />}
            </motion.div>
          ))}
        </AnimatePresence>

        {isTyping && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <TypingIndicator />
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar — changes per step */}
      {!showConfirm && step >= 1 && !isTyping && (
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-20 px-4 pb-8 pt-3 shrink-0"
        >
          {/* Step 1: Language grid */}
          {step === 1 && (
            <div className="grid grid-cols-3 gap-2">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => handleLanguage(l.code, l.native)}
                  className="py-3 rounded-xl border border-gold/20 bg-card/80 text-center hover:border-gold/50 hover:bg-gold/10 transition-all active:scale-95"
                >
                  <div className="text-[14px] font-medium text-foreground">{l.native}</div>
                  <div className="text-[10px] text-muted mt-0.5">{l.label}</div>
                </button>
              ))}
            </div>
          )}

          {/* Steps 2, 3, 4, 6: text input */}
          {(step === 2 || step === 3 || step === 4 || step === 6) && (
            <div className="flex flex-col gap-1.5">
              {inputErr && <p className="text-[12px] text-red-400 pl-1">{inputErr}</p>}
              <div className="flex items-center gap-2 rounded-2xl border border-gold/20 bg-card/85 backdrop-blur-md px-4 py-1 focus-within:border-gold/45 transition-colors">
                <input
                  type={step === 2 ? "text" : "tel"}
                  inputMode={step === 2 ? "text" : "numeric"}
                  value={textInput}
                  onChange={(e) => {
                    setInputErr("");
                    if (step === 3) setTextInput(formatDobInput(e.target.value));
                    else if (step === 4) setTextInput(formatTobInput(e.target.value));
                    else setTextInput(e.target.value);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleTextSubmit()}
                  placeholder={
                    step === 2 ? t("onboarding.step2hint") :
                    step === 3 ? t("onboarding.step3hint") :
                    step === 4 ? t("onboarding.step4hint") :
                    t("onboarding.step6hint")
                  }
                  className="flex-1 bg-transparent py-3 text-[15px] text-foreground placeholder:text-muted/40 outline-none"
                  autoFocus
                />
                <button
                  onClick={handleTextSubmit}
                  disabled={!textInput.trim()}
                  className="w-9 h-9 rounded-xl bg-gold flex items-center justify-center shrink-0 disabled:opacity-30 active:scale-90 transition-all"
                >
                  <Send size={15} className="text-[#1a0e00]" />
                </button>
              </div>
            </div>
          )}

          {/* Step 5: time source */}
          {step === 5 && (
            <div className="grid grid-cols-2 gap-2">
              {TIME_SOURCES.map((s) => (
                <button
                  key={s.key}
                  onClick={() => handleTimeSource(s.key, s.label)}
                  className="py-3.5 px-3 rounded-xl border border-gold/20 bg-card/80 text-[13px] text-foreground text-center hover:border-gold/50 hover:bg-gold/8 transition-all active:scale-95"
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {/* Step 7: gender */}
          {step === 7 && (
            <div className="flex gap-2">
              {GENDERS.map((g) => (
                <button
                  key={g.key}
                  onClick={() => handleGender(g.key, g.label)}
                  className="flex-1 py-3.5 rounded-xl border border-gold/20 bg-card/80 text-[13px] font-medium text-foreground text-center hover:border-gold/50 hover:bg-gold/8 transition-all active:scale-95"
                >
                  {g.label}
                </button>
              ))}
            </div>
          )}

          {/* Step 8: relationship status */}
          {step === 8 && (
            <div className="grid grid-cols-2 gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s.key}
                  onClick={() => handleStatus(s.key, s.label)}
                  className="py-3.5 px-3 rounded-xl border border-gold/20 bg-card/80 text-[13px] text-foreground text-center hover:border-gold/50 hover:bg-gold/8 transition-all active:scale-95"
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* ── Confirm overlay ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="absolute inset-x-0 bottom-0 z-30 rounded-t-3xl border-t border-x border-gold/20 bg-card/95 backdrop-blur-2xl px-6 pt-6 pb-10 shadow-[0_-8px_40px_rgba(0,0,0,0.4)]"
          >
            {/* Handle */}
            <div className="w-10 h-1 rounded-full bg-gold/30 mx-auto mb-5" />

            <h3 className="font-display text-[20px] text-foreground mb-4">{t("onboarding.confirmTitle")}</h3>

            <div className="space-y-3 mb-6">
              {[
                { label: t("onboarding.labelName"),    value: answers.name },
                { label: t("onboarding.labelDob"),     value: answers.dob },
                { label: t("onboarding.labelTob"),     value: answers.tob },
                { label: t("onboarding.labelPlace"),   value: answers.place },
                { label: t("onboarding.labelGender"),  value: answers.gender },
                { label: t("onboarding.labelStatus"),  value: answers.status },
              ].map(({ label, value }) => value ? (
                <div key={label} className="flex items-center justify-between py-2.5 px-4 rounded-xl border border-gold/10 bg-surface">
                  <span className="text-[12px] text-muted uppercase tracking-wider">{label}</span>
                  <span className="text-[14px] text-foreground font-medium">{value}</span>
                </div>
              ) : null)}
            </div>

            <button
              onClick={handleConfirm}
              disabled={submitting}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-[#a67c00] via-[#D4AF37] to-[#f4d675] text-[#1a0e00] font-semibold text-[15px] tracking-wide flex items-center justify-center gap-2 shadow-[0_0_28px_rgba(212,175,55,0.4)] disabled:opacity-50 active:scale-[0.98] transition-all"
            >
              {submitting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>{t("onboarding.confirmBtn")} <ChevronRight size={17} /></>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
