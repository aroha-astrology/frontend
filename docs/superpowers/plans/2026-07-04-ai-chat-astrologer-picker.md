# AI Chat Astrologer Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the inline persona-pill switcher in `/ai-chat` with a two-step flow: a persona-picker list screen, then a chat screen scoped to the chosen persona.

**Architecture:** `app/ai-chat/page.tsx` becomes a thin shell holding `selectedPersona: ChatPersona | null` state. `null` renders a new `AstrologerList` component; a non-null value renders a new `ChatConversation` component (today's chat logic, moved verbatim and adapted) mounted with `key={selectedPersona}` so every persona switch gets a fresh conversation. Persona data (avatar/name/specialty/rating) moves to a shared `lib/personas.ts` so both components import the same source of truth.

**Tech Stack:** Next.js 15 (App Router), React, TypeScript (strict), Tailwind CSS (theme tokens: `bg-card`, `text-gold`, `text-muted`, `text-foreground`, `border-gold`), framer-motion, react-i18next, lucide-react icons.

**Reference spec:** `docs/superpowers/specs/2026-07-04-ai-chat-astrologer-picker-design.md`

**No automated test coverage applies:** this repo's Playwright e2e suite (`e2e/*.spec.ts`) only tests unauthenticated routes and auth-guard redirects — there's no fixture anywhere in the repo for driving an authenticated session, and `/ai-chat` requires auth. Building that fixture is out of scope for this change (not requested, not in the spec). Verification here is: TypeScript compiles (`npx tsc -p .`), lint is clean (`npm run lint`), the existing e2e auth-guard test for `/ai-chat` still passes unmodified, and a manual browser walkthrough of the new flow.

---

### Task 1: Add i18n keys for the picker screen and templated greeting

**Files:**
- Modify: `frontend/i18n/resources.ts` (7 locale blocks: `en` L150-176, `hi` L472-498, `bn` L776-802, `mr` L1080-1106, `te` L1384-1410, `ta` L1688-1714, `gu` L1992-2018)

- [ ] **Step 1: For each of the 7 locales, replace the `subtitle` line with itself plus 3 new keys, and replace `greeting` with `personaGreeting`**

  **en** (around line 152-154):
  ```ts
  subtitle: "Yogi Baba · Vedic wisdom",
  listTitle: "Choose Your Astrologer",
  listSubtitle: "Ask the cosmos anything",
  online: "Online",
  disclosure: "Responses are AI-generated from traditional Vedic calculations — not a substitute for a licensed astrologer consultation.",
  personaGreeting: "Namaste 🙏 I am {{name}}, your AI astrologer for {{specialty}}. Ask me anything.",
  ```
  (delete the old `greeting: "Namaste 🙏 I am Yogi Baba, your AI Vedic Astrologer. Ask me about career, marriage, wealth, health, or your lucky gemstone.",` line entirely)

  **hi** (around line 474-476):
  ```ts
  subtitle: "योगी बाबा · वैदिक ज्ञान",
  listTitle: "अपना ज्योतिषी चुनें",
  listSubtitle: "ब्रह्मांड से कुछ भी पूछें",
  online: "ऑनलाइन",
  disclosure: "उत्तर पारंपरिक वैदिक गणनाओं से AI द्वारा तैयार किए गए हैं — यह लाइसेंस प्राप्त ज्योतिषी परामर्श का विकल्प नहीं है।",
  personaGreeting: "नमस्ते 🙏 मैं {{name}} हूं, आपका {{specialty}} के लिए AI ज्योतिषी। मुझसे कुछ भी पूछें।",
  ```
  (delete the old `greeting:` line)

  **bn** (around line 778-780):
  ```ts
  subtitle: "যোগী বাবা · বৈদিক প্রজ্ঞা",
  listTitle: "আপনার জ্যোতিষী বেছে নিন",
  listSubtitle: "মহাবিশ্বকে যা খুশি জিজ্ঞাসা করুন",
  online: "অনলাইন",
  disclosure: "উত্তরগুলি ঐতিহ্যবাহী বৈদিক গণনা থেকে AI দ্বারা তৈরি — এটি লাইসেন্সপ্রাপ্ত জ্যোতিষী পরামর্শের বিকল্প নয়।",
  personaGreeting: "নমস্কার 🙏 আমি {{name}}, আপনার {{specialty}}-এর জন্য AI জ্যোতিষী। আমাকে যা খুশি জিজ্ঞাসা করুন।",
  ```
  (delete the old `greeting:` line)

  **mr** (around line 1082-1084):
  ```ts
  subtitle: "योगी बाबा · वैदिक ज्ञान",
  listTitle: "तुमचा ज्योतिषी निवडा",
  listSubtitle: "विश्वाला काहीही विचारा",
  online: "ऑनलाइन",
  disclosure: "उत्तरे पारंपरिक वैदिक गणनांवर आधारित AI द्वारे तयार केली आहेत — हा परवानाधारक ज्योतिषाच्या सल्ल्याचा पर्याय नाही.",
  personaGreeting: "नमस्ते 🙏 मी {{name}} आहे, तुमचा {{specialty}} साठी AI ज्योतिषी. मला काहीही विचारा.",
  ```
  (delete the old `greeting:` line)

  **te** (around line 1386-1388):
  ```ts
  subtitle: "యోగి బాబా · వేద జ్ఞానం",
  listTitle: "మీ జ్యోతిష్కుడిని ఎంచుకోండి",
  listSubtitle: "విశ్వాన్ని ఏదైనా అడగండి",
  online: "ఆన్‌లైన్",
  disclosure: "సమాధానాలు సాంప్రదాయ వేద గణనల నుండి AI ద్వారా రూపొందించబడ్డాయి — ఇది లైసెన్స్ పొందిన జ్యోతిష్కుడి సంప్రదింపునకు ప్రత్యామ్నాయం కాదు.",
  personaGreeting: "నమస్కారం 🙏 నేను {{name}}ని, మీ {{specialty}} కోసం AI జ్యోతిష్కుడిని. నన్ను ఏదైనా అడగండి.",
  ```
  (delete the old `greeting:` line)

  **ta** (around line 1690-1692):
  ```ts
  subtitle: "யோகி பாபா · வேத ஞானம்",
  listTitle: "உங்கள் ஜோதிடரைத் தேர்ந்தெடுக்கவும்",
  listSubtitle: "பிரபஞ்சத்திடம் எதையும் கேளுங்கள்",
  online: "ஆன்லைன்",
  disclosure: "பதில்கள் பாரம்பரிய வேத கணக்கீடுகளிலிருந்து AI ஆல் உருவாக்கப்படுகின்றன — இது உரிமம் பெற்ற ஜோதிடர் ஆலோசனைக்கு மாற்றாக இல்லை.",
  personaGreeting: "நமஸ்காரம் 🙏 நான் {{name}}, உங்கள் {{specialty}}க்கான AI ஜோதிடர். என்னிடம் எதையும் கேளுங்கள்.",
  ```
  (delete the old `greeting:` line)

  **gu** (around line 1994-1996):
  ```ts
  subtitle: "યોગી બાબા · વૈદિક જ્ઞાન",
  listTitle: "તમારો જ્યોતિષી પસંદ કરો",
  listSubtitle: "બ્રહ્માંડને કંઈપણ પૂછો",
  online: "ઓનલાઇન",
  disclosure: "જવાબો પરંપરાગત વૈદિક ગણતરીઓમાંથી AI દ્વારા બનાવવામાં આવ્યા છે — તે લાઇસન્સ પ્રાપ્ત જ્યોતિષી પરામર્શનો વિકલ્પ નથી.",
  personaGreeting: "નમસ્તે 🙏 હું {{name}} છું, તમારો {{specialty}} માટે AI જ્યોતિષી. મને કંઈપણ પૂછો.",
  ```
  (delete the old `greeting:` line)

- [ ] **Step 2: Verify no other code references the removed `greeting` key**

  Run: `grep -rn "aiChatPage.greeting" frontend --include=*.tsx --include=*.ts`
  Expected: no matches once Task 3 (which currently reads `t("aiChatPage.greeting")`) is also updated. If this is run before Task 3, one match in `app/ai-chat/page.tsx` is expected and fine.

- [ ] **Step 3: Type-check**

  Run: `cd frontend && npx tsc -p .`
  Expected: no errors (resources.ts has no explicit type annotations that would catch a missing key at compile time, so this mainly guards against a stray syntax error from the edit — a trailing comma/brace mistake would fail here).

- [ ] **Step 4: Commit**

  ```bash
  git add frontend/i18n/resources.ts
  git commit -m "feat(i18n): add astrologer-picker strings and templated persona greeting"
  ```

---

### Task 2: Create shared persona data module

**Files:**
- Create: `frontend/lib/personas.ts`

- [ ] **Step 1: Write the file**

  ```ts
  import type { ChatPersona } from "@/lib/swarm-api";

  export interface Persona {
    key: ChatPersona;
    avatar: string;
    nameKey: string;
    specialtyKey: string;
    rating: number;
  }

  /**
   * Visual persona presentation — the 4 keys are the same functional personas
   * the backend has always had (general/career/love/health topic grounding).
   * Naming/avatars/ratings give each one an identity to show in the UI; they
   * don't change what's sent to the API. Ratings are cosmetic (no backend).
   */
  export const PERSONAS: Persona[] = [
    { key: "general", avatar: "🧙", nameKey: "aiChatPage.personaGeneral", specialtyKey: "aiChatPage.personaGeneralSpecialty", rating: 4.9 },
    { key: "career", avatar: "💼", nameKey: "aiChatPage.personaCareer", specialtyKey: "aiChatPage.personaCareerSpecialty", rating: 4.8 },
    { key: "love", avatar: "🌸", nameKey: "aiChatPage.personaLove", specialtyKey: "aiChatPage.personaLoveSpecialty", rating: 4.9 },
    { key: "health", avatar: "🌿", nameKey: "aiChatPage.personaHealth", specialtyKey: "aiChatPage.personaHealthSpecialty", rating: 5.0 },
  ];
  ```

- [ ] **Step 2: Type-check**

  Run: `cd frontend && npx tsc -p .`
  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add frontend/lib/personas.ts
  git commit -m "feat(ai-chat): extract shared persona data into lib/personas.ts"
  ```

---

### Task 3: Create `ChatConversation` component (moved + adapted chat logic)

**Files:**
- Create: `frontend/components/ai-chat/ChatConversation.tsx`

- [ ] **Step 1: Write the file**

  This is today's `app/ai-chat/page.tsx` logic, adapted to take `persona`/`onBack` props instead of owning persona-switch state, with the top pill-switcher section removed and a back button added to the header, and the greeting now using the templated `personaGreeting` key.

  ```tsx
  "use client";

  import { useState, useRef, useEffect, useCallback } from "react";
  import { Send, ChevronLeft } from "lucide-react";
  import { motion, AnimatePresence } from "framer-motion";
  import { useTranslation } from "react-i18next";
  import { streamChat, type ChatPersona, type ChatHistoryTurn } from "@/lib/swarm-api";
  import { PERSONAS } from "@/lib/personas";
  import IconButton from "@/components/ui/IconButton";

  interface Message {
    role: "user" | "assistant";
    content: string;
    isError?: boolean;
  }

  const THINKING_KEYS = ["aiChatPage.thinking1", "aiChatPage.thinking2", "aiChatPage.thinking3"];

  export default function ChatConversation({
    persona,
    onBack,
  }: {
    persona: ChatPersona;
    onBack: () => void;
  }) {
    const { t } = useTranslation();
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
        content: t("aiChatPage.personaGreeting", {
          name: t(activePersona.nameKey),
          specialty: t(activePersona.specialtyKey),
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
    }, [input, streaming, persona, t]);

    return (
      <main className="min-h-screen pb-32 flex flex-col" style={{ background: "var(--background)" }}>
        {/* Header — back button + the currently selected astrologer's identity */}
        <div className="px-5 pt-10 pb-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3">
            <IconButton aria-label={t("common.back")} onClick={onBack}>
              <ChevronLeft size={18} />
            </IconButton>
            <div className="flex-1 text-center pr-10">
              <h1 className="text-2xl font-bold text-gold font-display">
                {activePersona.avatar} {t(activePersona.nameKey)}
              </h1>
              <p className="text-sm text-[var(--text-muted)] mt-1">{t(activePersona.specialtyKey)}</p>
            </div>
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
  ```

  Note the `sendMessage` dependency array now includes `t` (it wasn't in the original — the original had a stale-closure bug where `t` wasn't listed despite being used inside; since we're touching this code anyway, fix it here rather than carrying the bug forward into the new component).

- [ ] **Step 2: Type-check**

  Run: `cd frontend && npx tsc -p .`
  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add frontend/components/ai-chat/ChatConversation.tsx
  git commit -m "feat(ai-chat): extract ChatConversation component with back navigation"
  ```

---

### Task 4: Create `AstrologerList` component (new picker screen)

**Files:**
- Create: `frontend/components/ai-chat/AstrologerList.tsx`

- [ ] **Step 1: Write the file**

  ```tsx
  "use client";

  import { motion } from "framer-motion";
  import { Star } from "lucide-react";
  import { useTranslation } from "react-i18next";
  import Card from "@/components/ui/Card";
  import { PERSONAS } from "@/lib/personas";
  import type { ChatPersona } from "@/lib/swarm-api";

  export default function AstrologerList({ onSelect }: { onSelect: (persona: ChatPersona) => void }) {
    const { t } = useTranslation();

    return (
      <main className="min-h-screen pb-32 px-5 pt-10" style={{ background: "var(--background)" }}>
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gold font-display">{t("aiChatPage.listTitle")}</h1>
          <p className="text-sm text-muted mt-1">{t("aiChatPage.listSubtitle")}</p>
        </div>

        <div className="flex flex-col gap-3 max-w-lg mx-auto">
          {PERSONAS.map((persona, i) => (
            <motion.div
              key={persona.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.06 }}
            >
              <Card
                className="p-4 flex items-center gap-4 cursor-pointer hover:border-gold/50 transition-colors"
                onClick={() => onSelect(persona.key)}
              >
                <div className="w-12 h-12 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center text-2xl flex-shrink-0">
                  {persona.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground truncate">{t(persona.nameKey)}</span>
                    <span className="flex items-center gap-0.5 text-xs text-gold flex-shrink-0">
                      <Star size={11} fill="currentColor" /> {persona.rating}
                    </span>
                  </div>
                  <p className="text-sm text-muted mt-0.5 truncate">{t(persona.specialtyKey)}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span className="text-[11px] text-muted">{t("aiChatPage.online")}</span>
                  </div>
                </div>
                <span className="text-muted text-lg flex-shrink-0">›</span>
              </Card>
            </motion.div>
          ))}
        </div>
      </main>
    );
  }
  ```

- [ ] **Step 2: Type-check**

  Run: `cd frontend && npx tsc -p .`
  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add frontend/components/ai-chat/AstrologerList.tsx
  git commit -m "feat(ai-chat): add astrologer picker list screen"
  ```

---

### Task 5: Rewrite `app/ai-chat/page.tsx` as a thin shell

**Files:**
- Modify: `frontend/app/ai-chat/page.tsx` (currently 364 lines — replace entirely)

- [ ] **Step 1: Replace the full file contents**

  ```tsx
  "use client";

  import { useState } from "react";
  import type { ChatPersona } from "@/lib/swarm-api";
  import AstrologerList from "@/components/ai-chat/AstrologerList";
  import ChatConversation from "@/components/ai-chat/ChatConversation";

  export default function AIChatPage() {
    const [selectedPersona, setSelectedPersona] = useState<ChatPersona | null>(null);

    if (selectedPersona === null) {
      return <AstrologerList onSelect={setSelectedPersona} />;
    }

    return (
      <ChatConversation
        key={selectedPersona}
        persona={selectedPersona}
        onBack={() => setSelectedPersona(null)}
      />
    );
  }
  ```

- [ ] **Step 2: Confirm the old `greeting` i18n key has no remaining references**

  Run: `grep -rn "aiChatPage.greeting\b" frontend --include=*.tsx --include=*.ts`
  Expected: no matches (Task 1 removed the key from resources.ts; this file no longer references it either since it's fully replaced).

- [ ] **Step 3: Type-check**

  Run: `cd frontend && npx tsc -p .`
  Expected: no errors.

- [ ] **Step 4: Commit**

  ```bash
  git add frontend/app/ai-chat/page.tsx
  git commit -m "feat(ai-chat): wire astrologer picker into /ai-chat as a two-step flow"
  ```

---

### Task 6: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Lint**

  Run: `cd frontend && npm run lint`
  Expected: no errors.

- [ ] **Step 2: Production build**

  Run: `cd frontend && npm run build`
  Expected: build succeeds (this also re-runs the full TS type-check across the app, catching anything `tsc -p .` alone might have missed in Next's build pipeline).

- [ ] **Step 3: Existing e2e auth-guard regression check**

  Run: `cd frontend && npx playwright test e2e/auth.spec.ts -g "ai-chat"`
  Expected: PASS — `/ai-chat` still redirects an unauthenticated visitor to `/sign-in` (this test doesn't touch the new picker UI at all, it just confirms the auth guard wrapping the route wasn't disturbed by the page.tsx rewrite).

- [ ] **Step 4: Manual browser walkthrough**

  Start the dev server (`npm run dev`), sign in, and confirm:
  1. Navigating to `/ai-chat` shows the 4-card astrologer list, no chat visible.
  2. Each card shows the right avatar/name/specialty, a star rating, and an "Online" badge.
  3. Tapping a card opens `ChatConversation` for that persona: header shows a back arrow, the persona's avatar/name/specialty, and a correctly personalized opening greeting (not always "Yogi Baba").
  4. Sending a message streams a real response from the backend.
  5. Tapping the back arrow returns to the list.
  6. Selecting a persona a second time (same or different) starts a fresh conversation — no leftover messages from the previous visit.
  7. Switching language via the existing language picker updates the list title/subtitle/online badge and the persona greeting.

- [ ] **Step 5: Report results**

  If all checks pass, no further commit is needed — this task is verification-only. If any step fails, fix the root cause in the relevant task's file and re-run this task's checks before considering the plan complete.

---

## Self-Review Notes

- **Spec coverage:** Architecture (Task 5), `lib/personas.ts` + ratings (Task 2), list screen visuals + i18n (Tasks 1, 4), `ChatConversation` back button + fresh-per-visit via `key` (Tasks 3, 5), error handling (unchanged, carried over verbatim in Task 3), testing (Task 6) — all spec sections are covered.
- **No placeholders:** every task has complete file contents or exact commands; nothing deferred to "later."
- **Type consistency:** `ChatPersona` (from `lib/swarm-api.ts`) is the one persona-key type threaded through `lib/personas.ts`, `AstrologerList`'s `onSelect`, `ChatConversation`'s `persona` prop, and `page.tsx`'s state — verified same name/shape used everywhere it appears across Tasks 2–5.
