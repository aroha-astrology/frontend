"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Send, Check, ChevronRight, Loader2 } from "lucide-react";
import BrandLogo from "@/components/ui/BrandLogo";
import ThemeSwitch from "@/components/ThemeSwitch";
import LanguagePicker from "@/components/LanguagePicker";
import ParticleBackground from "@/components/ParticleBackground";
import { LANGUAGES, useLanguage, type LangCode } from "@/providers/language-provider";
import { useAuth } from "@/providers/auth-provider";
import {
  api,
  ApiError,
  type Gender,
  type UpdateMeBody,
  type CreateProfileBody,
  type ProfileRelationship,
  type PlaceOfBirth,
} from "@/lib/api";
import PlaceAutocomplete from "@/components/PlaceAutocomplete";
import { purgeUserCache } from "@/lib/cache";
import { formatRupees } from "@/lib/format";
import {
  getPendingReferralCode,
  clearPendingReferralCode,
  getPendingUtmSource,
  clearPendingUtmSource,
} from "@/lib/referral";
import { LEGAL_VERSION } from "@/lib/legal-content";
import { useFeature } from "@/hooks/useFeature";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Message {
  id: number;
  from: "bot" | "user";
  text: string;
}

interface Answers {
  language: string;
  name: string;
  /** New-profile mode only ("mode=new-profile") — the ProfileRelationship key (partner/child/etc). */
  relationship: string;
  dob: string;
  tob: string;
  timeSource: string;
  accuracy: string;
  place: string;
  gender: string;
  status: string;
  referralCode?: string;
}

const TOTAL_STEPS = 9;

/**
 * The relationship-to-account-owner question, only reached in new-profile
 * mode (`?mode=new-profile`). Deliberately fractional — it detours off the
 * integer step sequence (between the existing "name" (2) and "DOB" (3)
 * steps) so it can be inserted without renumbering any downstream step for
 * the primary (non-new-profile) flow.
 */
const RELATIONSHIP_STEP = 2.5;


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
/** "1991-08-05" (native date input) -> "05/08/1991" (what `answers.dob` stores). */
function isoToDob(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
/** Native date inputs clamp to `max`, so a birth date can never be in the future. */
function todayIso() {
  return new Date().toLocaleDateString("en-CA");
}

/**
 * Maps the birth-data fields shared by both submit paths — the primary
 * (`UpdateMeBody`) and new-profile (`CreateProfileBody`) branches of
 * `handleConfirm` both accept this same shape, just as part of a larger,
 * otherwise-different body. Mutates `body` in place; leaves each caller to
 * set only the fields that differ between the two (displayName/relationship/
 * addedWithConsent vs. locale/relationshipStatus/currentLocation/consent/etc).
 */
function applyBirthDataFields(
  body: {
    gender?: Gender;
    dateOfBirth?: string;
    timeOfBirth?: string | null;
    placeOfBirth?: PlaceOfBirth | null;
    birthTimeSource?: string;
    birthTimeAccuracy?: "exact" | "approximate" | "unknown";
  },
  answers: Partial<Answers>,
  resolvedPlace: PlaceOfBirth | null,
) {
  if (answers.gender) body.gender = answers.gender as Gender;
  if (answers.dob) {
    const [d, m, y] = answers.dob.split("/");
    body.dateOfBirth = `${y}-${m}-${d}`; // DD/MM/YYYY → YYYY-MM-DD
  }
  if (answers.tob) body.timeOfBirth = answers.tob; // HH:MM
  if (resolvedPlace) body.placeOfBirth = resolvedPlace;
  if (answers.timeSource) {
    const sourceMap: Record<string, string> = {
      certificate: "birth_certificate",
      hospital: "hospital_record",
      family: "family_memory",
      approximate: "unknown", // mapped from approximate source
    };
    body.birthTimeSource = sourceMap[answers.timeSource] ?? "unknown";
  }
  if (answers.accuracy) {
    body.birthTimeAccuracy = answers.accuracy as "exact" | "approximate" | "unknown";
  }
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

function OnboardingPageInner() {
  const { t } = useTranslation();
  const { setLang } = useLanguage();

  const searchParams = useSearchParams();
  const isNewProfileMode = searchParams.get("mode") === "new-profile";

  const [messages, setMessages] = useState<Message[]>([]);
  const [step, setStep] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [inputErr, setInputErr] = useState("");
  const [answers, setAnswers] = useState<Partial<Answers>>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [consented, setConsented] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState("");
  const [resolvedPlace, setResolvedPlace] = useState<PlaceOfBirth | null>(null);
  const [refAutoApplied, setRefAutoApplied] = useState(false);
  const router = useRouter();
  const { refresh, refreshProfiles, user } = useAuth();
  /** Server-side cost (in paise) of POST /v1/profiles — see lib/api.ts `createProfile`. 20000 is the fallback for the fail-open case; the resolved feature price is authoritative when present. */
  const PROFILE_CREATION_COST_PAISE = useFeature("paid.profileCreation").pricePaise ?? 20000;

  const msgId = useRef(0);

  // Pick up a referral code carried in from a shared invite link (?ref=CODE),
  // captured earlier by <ReferralCapture /> before any redirect could drop it.
  useEffect(() => {
    if (isNewProfileMode) return;
    const code = getPendingReferralCode();
    if (!code) return;
    setAnswers((a) => (a.referralCode ? a : { ...a, referralCode: code }));
    setRefAutoApplied(true);
  }, [isNewProfileMode]);
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

  // Advance to next step after the user responds. `nextStep` overrides the
  // default `s + 1` — used by new-profile mode to detour through
  // RELATIONSHIP_STEP without renumbering any of the existing steps.
  const advance = async (ans: Partial<Answers>, userText: string, nextQ: string, nextStep?: number) => {
    setAnswers((a) => ({ ...a, ...ans }));
    userSay(userText);
    await botSay(nextQ);
    setStep((s) => nextStep ?? s + 1);
  };

  // ── Step questions (resolved at render time so i18next re-renders on lang change)
  const Q: Record<number, string> = {
    0: t("onboarding.step1q"),
    1: t("onboarding.step2q"),
    2: t("onboarding.step3q"),
    3: t("onboarding.step4q"),
    4: t("onboarding.step5q"),
    5: t("onboarding.step5_5q", "How confident are you in this birth time?"),
    6: t("onboarding.step6q"),
    7: t("onboarding.step7q"),
    8: t("onboarding.step8q"),
  };

  // ── Kick off the conversation
  useEffect(() => {
    (async () => {
      // Someone whose account was erased signs back in on the SAME row (their
      // phone number is deliberately kept — see the backend's anonymizeUserById),
      // so they arrive here with everything blank. Say so, rather than greeting
      // them as a stranger when they know they've been here before.
      if (user?.previouslyDeleted && !isNewProfileMode) {
        await botSay(t("onboarding.welcomeBackAfterDeletion"), 600);
      }
      await botSay(t("onboarding.greeting"), 600);
      await botSay(Q[0], 900);
      setStep(1);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Progress indicator (0-based step vs 1-9). Math.floor absorbs
  // RELATIONSHIP_STEP's fractional value so a dot still highlights as
  // "current" on that screen; a no-op for every integer step.
  const progress = Math.min(Math.floor(step) - 1, TOTAL_STEPS - 1);

  // ── Text submit (steps 2, 3, 4, 7)
  const handleTextSubmit = async () => {
    const val = textInput.trim();
    if (!val) return;

    if (step === 2) { // name
      if (isNewProfileMode) {
        // Detour through the relationship sub-step instead of going straight
        // to DOB — inserted only for this mode, existing step numbers (3
        // onward) are untouched.
        const relationshipQ = t("onboarding.newProfile.relationshipQ").replace("{name}", val).replace("{{name}}", val);
        await advance({ name: val }, val, relationshipQ, RELATIONSHIP_STEP);
      } else {
        await advance({ name: val }, val, Q[2].replace("{name}", val).replace("{{name}}", val));
      }
    } else if (step === 3) { // dob — the date input holds ISO; store DD/MM/YYYY
      const dob = isoToDob(val);
      if (!isValidDob(dob)) { setInputErr(t("onboarding.invalidDob")); return; }
      await advance({ dob }, dob, Q[3]);
    } else if (step === 4) { // tob
      if (!isValidTob(val)) { setInputErr(t("onboarding.invalidTob")); return; }
      await advance({ tob: val }, val, Q[4]);
    }

    setTextInput("");
    setInputErr("");
  };

  // ── Language selection (step 1)
  const handleLanguage = async (code: LangCode, native: string) => {
    // In new-profile mode we're collecting someone else's birth data — don't
    // change the account owner's own app-wide display language as a side
    // effect. The answer is still recorded and the flow still advances the
    // same way; it's just unused by CreateProfileBody (like handleStatus below).
    if (!isNewProfileMode) setLang(code);
    userSay(native);
    setIsTyping(true);
    setTimeout(async () => {
      setIsTyping(false);
      setAnswers((a) => ({ ...a, language: code }));
      setMessages((m) => [...m, { id: nextId(), from: "bot", text: t("onboarding.step2q") }]);
      setStep(2);
    }, 800);
  };

  // ── Relationship-to-account-owner (RELATIONSHIP_STEP — new-profile mode only)
  const RELATIONSHIPS: { key: ProfileRelationship; label: string }[] = [
    { key: "partner", label: t("profileSwitcher.relationship.partner") },
    { key: "prospective_match", label: t("profileSwitcher.relationship.prospective_match") },
    { key: "spouse", label: t("profileSwitcher.relationship.spouse") },
    { key: "child", label: t("profileSwitcher.relationship.child") },
    { key: "parent", label: t("profileSwitcher.relationship.parent") },
    { key: "sibling", label: t("profileSwitcher.relationship.sibling") },
    { key: "friend", label: t("profileSwitcher.relationship.friend") },
    { key: "other", label: t("profileSwitcher.relationship.other") },
  ];

  const handleRelationship = async (key: string, label: string) => {
    // Rejoins the normal flow at step 3 (DOB) — Q[2] is the same DOB question
    // asked right after the name step in the primary flow, so it needs the
    // same {name} interpolation the primary flow applies at line ~294.
    const dobQ = Q[2].replace("{name}", answers.name ?? "").replace("{{name}}", answers.name ?? "");
    await advance({ relationship: key }, label, dobQ, 3);
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

  // ── Accuracy (step 6)
  const ACCURACIES = [
    { key: "exact", label: t("onboarding.step5_5exact", "Exact") },
    { key: "approximate", label: t("onboarding.step5_5approx", "Approximate") },
    { key: "unknown", label: t("onboarding.step5_5unknown", "Unknown") },
  ];

  const handleAccuracy = async (key: string, label: string) => {
    await advance({ accuracy: key }, label, Q[6]);
  };

  // ── Gender (step 8)
  const GENDERS = [
    { key: "male",   label: t("onboarding.step7male") },
    { key: "female", label: t("onboarding.step7female") },
    { key: "other",  label: t("onboarding.step7other") },
  ];

  const handleGender = async (key: string, label: string) => {
    await advance({ gender: key }, label, Q[8]);
  };

  // ── Relationship status (step 9)
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

  // Map the collected answers to the backend's UpdateMeBody and persist them.
  const handleConfirm = async () => {
    if (!consented) return;
    setSubmitErr("");
    setSubmitting(true);

    if (isNewProfileMode) {
      try {
        const body: CreateProfileBody = { displayName: answers.name! };
        applyBirthDataFields(body, answers, resolvedPlace);
        if (answers.relationship) {
          body.relationship = answers.relationship as ProfileRelationship;
        }
        body.addedWithConsent = consented;

        await api.createProfile(body);
        // The new profile is already active server-side (per the createProfile
        // contract) — this just syncs local `profiles`/`activeProfile` state.
        // Also refresh `user` — creation spent from the account's shared wallet
        // balance, and refreshProfiles() alone wouldn't update the balance the
        // TopBar/credit-affordability checks read off `user`.
        await Promise.all([refreshProfiles(), refresh()]);
        router.replace("/");
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          setSubmitErr(t("onboarding.newProfile.insufficientCredits", { cost: formatRupees(PROFILE_CREATION_COST_PAISE) }));
        } else {
          setSubmitErr(t("onboarding.submitError"));
        }
        setSubmitting(false);
      }
      return;
    }

    try {
      const body: UpdateMeBody = {};
      if (answers.name) body.displayName = answers.name;
      applyBirthDataFields(body, answers, resolvedPlace);
      if (answers.language) body.locale = answers.language;
      if (answers.status) {
        const statusMap: Record<string, string> = {
          dating: "in_relationship",
          other: "prefer_not_to_say",
        };
        body.relationshipStatus = statusMap[answers.status] ?? answers.status;
      }
      if (answers.referralCode) {
        body.referredByCode = answers.referralCode;
      }
      const pendingUtmSource = getPendingUtmSource();
      if (pendingUtmSource) {
        body.referralSource = pendingUtmSource;
      }

      if ("geolocation" in navigator) {
        try {
          // Belt-and-suspenders timeout: some Android WebViews never invoke
          // either callback (e.g. location services off, a stuck permission
          // prompt), so PositionOptions.timeout alone isn't reliable here —
          // it left the whole confirm submission hanging forever upstream.
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error("geolocation_timeout")), 6000);
            navigator.geolocation.getCurrentPosition(
              (p) => { clearTimeout(timer); resolve(p); },
              (e) => { clearTimeout(timer); reject(e); },
              { timeout: 5000 },
            );
          });
          body.currentLocation = {
             lat: pos.coords.latitude,
             lon: pos.coords.longitude,
             name: "Current Location",
             tz: Intl.DateTimeFormat().resolvedOptions().timeZone
          };
        } catch (e) {
          // ignore
        }
      }

      body.onboardingStatus = "completed";
      // Versions come from legal-content.ts rather than being restated here —
      // the consent record must name the document text the user actually saw,
      // and hardcoding drifted silently the last time that text changed.
      body.consent = {
        dataProcessing: true,
        terms: { version: LEGAL_VERSION },
        privacy: { version: LEGAL_VERSION },
      };

      await api.updateMe(body);
      await refresh();
      clearPendingReferralCode();
      clearPendingUtmSource();
      api.regenerateKundli().catch(() => {});
      // Birth details were just set for the first time — same cache purge
      // as profile/page.tsx's birth-detail edit path (nothing should have
      // been cached yet this early, but this keeps the two call sites
      // consistent rather than relying on that assumption).
      if (user) purgeUserCache(user.id);
      router.replace("/?tour=1");
    } catch {
      setSubmitErr(t("onboarding.submitError"));
      setSubmitting(false);
    }
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

          {/* Steps 2, 3, 4: text input */}
          {(step === 2 || step === 3 || step === 4) && (
            <div className="flex flex-col gap-1.5">
              {inputErr && <p className="text-[12px] text-red-400 pl-1">{inputErr}</p>}
              <div className="flex items-center gap-2 rounded-2xl border border-gold/20 bg-card/85 backdrop-blur-md px-4 py-1 focus-within:border-gold/45 transition-colors">
                <input
                  type={step === 2 ? "text" : step === 3 ? "date" : "time"}
                  value={textInput}
                  min={step === 3 ? "1900-01-01" : undefined}
                  max={step === 3 ? todayIso() : undefined}
                  onChange={(e) => {
                    setInputErr("");
                    setTextInput(e.target.value);
                  }}
                  // Open the calendar/clock on a tap anywhere in the field, not
                  // just on the small native indicator. Throws without user
                  // activation and is absent on older engines — the indicator
                  // still works, so swallow it.
                  onClick={(e) => {
                    if (step === 2) return;
                    try { e.currentTarget.showPicker(); } catch { /* fall back to the native indicator */ }
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleTextSubmit()}
                  // placeholder does not render on date/time inputs; those show
                  // the browser's own dd/mm/yyyy hint. The bot's question above
                  // the field carries the instruction.
                  placeholder={step === 2 ? t("onboarding.step2hint") : undefined}
                  className="flex-1 bg-transparent py-3 text-[16px] text-foreground placeholder:text-muted/40 outline-none"
                  autoFocus={step === 2}
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

          {/* RELATIONSHIP_STEP: relationship-to-you (new-profile mode only) */}
          {isNewProfileMode && step === RELATIONSHIP_STEP && (
            <div className="grid grid-cols-2 gap-2">
              {RELATIONSHIPS.map((r) => (
                <button
                  key={r.key}
                  onClick={() => handleRelationship(r.key, r.label)}
                  className="py-3.5 px-3 rounded-xl border border-gold/20 bg-card/80 text-[13px] text-foreground text-center hover:border-gold/50 hover:bg-gold/8 transition-all active:scale-95"
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}

          {/* Step 7: place autocomplete */}
          {step === 7 && (
            <PlaceAutocomplete
              placeholder={t("onboarding.step6hint")}
              inputClassName="w-full bg-transparent py-3 px-4 text-[16px] text-foreground placeholder:text-muted/40 outline-none rounded-2xl border border-gold/20 bg-card/85 backdrop-blur-md focus:border-gold/45 transition-colors"
              worldwide={!user?.phoneE164}
              onSelect={(place) => {
                if (!place) {
                  setResolvedPlace(null);
                  return;
                }
                setResolvedPlace(place);
                setAnswers((a) => ({ ...a, place: place.name }));
                userSay(place.name);
                botSay(Q[7]).then(() => setStep(8));
              }}
            />
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

          {/* Step 6: accuracy */}
          {step === 6 && (
            <div className="grid grid-cols-3 gap-2">
              {ACCURACIES.map((s) => (
                <button
                  key={s.key}
                  onClick={() => handleAccuracy(s.key, s.label)}
                  className="py-3.5 px-3 rounded-xl border border-gold/20 bg-card/80 text-[13px] text-foreground text-center hover:border-gold/50 hover:bg-gold/8 transition-all active:scale-95"
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {/* Step 8: gender */}
          {step === 8 && (
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

          {/* Step 9: relationship status */}
          {step === 9 && (
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
            className="absolute inset-x-0 bottom-0 z-30 rounded-t-3xl border-t border-x border-gold/20 bg-card/95 backdrop-blur-2xl px-6 pt-6 pb-[calc(2.5rem+var(--sab))] shadow-[0_-8px_40px_rgba(0,0,0,0.4)]"
          >
            {/* Handle */}
            <div className="w-10 h-1 rounded-full bg-gold/30 mx-auto mb-5" />

            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-[20px] text-foreground">
                {t(isNewProfileMode ? "onboarding.confirmTitleNewProfile" : "onboarding.confirmTitle")}
              </h3>
              <button
                onClick={() => {
                  setShowConfirm(false);
                  setStep(1);
                  setAnswers({});
                  setConsented(false);
                  setResolvedPlace(null);
                  setTextInput("");
                  setInputErr("");
                  setSubmitErr("");
                  setMessages([
                    { id: nextId(), from: "bot", text: t("onboarding.greeting") },
                    { id: nextId(), from: "bot", text: Q[0] },
                  ]);
                }}
                className="text-[13px] text-gold/80 hover:text-gold uppercase tracking-wider font-medium px-3 py-1 -mr-2 active:scale-95 transition-all"
              >
                {t("profile.edit")}
              </button>
            </div>

            <div className="space-y-3 mb-6">
              {[
                { label: t("onboarding.labelName"),    value: answers.name },
                { label: t("onboarding.labelDob"),     value: answers.dob },
                { label: t("onboarding.labelTob"),     value: answers.tob },
                { label: t("onboarding.labelPlace"),   value: answers.place },
                { label: t("onboarding.labelGender"),  value: answers.gender },
                isNewProfileMode
                  ? { label: t("onboarding.labelRelation"), value: RELATIONSHIPS.find((r) => r.key === answers.relationship)?.label }
                  : { label: t("onboarding.labelStatus"),  value: answers.status },
              ].map(({ label, value }) => value ? (
                <div key={label} className="flex items-center justify-between py-2.5 px-4 rounded-xl border border-gold/10 bg-surface">
                  <span className="text-[12px] text-muted uppercase tracking-wider">{label}</span>
                  <span className="text-[14px] text-foreground font-medium">{value}</span>
                </div>
              ) : null)}
            </div>

            <p className="mb-5 text-[12px] text-muted/90 leading-relaxed">
              {t("onboarding.confirmAccuracyNote")}
            </p>

            {isNewProfileMode && (
              <p className="mb-4 py-2.5 px-4 rounded-xl border border-gold/10 bg-surface text-[12px] text-muted text-center">
                {t("onboarding.newProfile.creditCost", { cost: formatRupees(PROFILE_CREATION_COST_PAISE) })}
              </p>
            )}

            {!isNewProfileMode && (
              <div className="mb-4">
                <label className="text-[11px] text-muted uppercase tracking-wider mb-1 block">
                  {t("referral.codeInputLabel", "Referral Code (Optional)")}
                </label>
                <input
                  type="text"
                  value={answers.referralCode || ""}
                  onChange={(e) => {
                    setRefAutoApplied(false);
                    setAnswers(a => ({ ...a, referralCode: e.target.value.trim().toUpperCase() }));
                  }}
                  placeholder={t("referral.codeInputPlaceholder", "Got a code? Enter it here")}
                  className="w-full h-10 rounded-xl px-3.5 outline-none border text-[13px] focus:border-gold/60 transition-colors bg-surface border-border text-foreground uppercase"
                />
                {refAutoApplied && (
                  <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                    <Check size={12} /> {t("referral.autoApplied", "Applied automatically from your invite link")}
                  </p>
                )}
              </div>
            )}

            <label className="flex items-start gap-2.5 mb-2 text-[12px] text-muted leading-relaxed cursor-pointer">
              <input
                type="checkbox"
                checked={consented}
                onChange={(e) => setConsented(e.target.checked)}
                className="mt-0.5 w-4 h-4 shrink-0 accent-gold"
              />
              {t("onboarding.consentLabel")}
            </label>

            {/* DPDP: the documents being consented to must be readable at the point of consent */}
            <p className="mb-5 pl-[26px] text-[11px] text-muted/70">
              <Link href="/legal/terms" target="_blank" className="text-gold/70 underline underline-offset-2">{t("legal.terms")}</Link>
              {" · "}
              <Link href="/legal/privacy" target="_blank" className="text-gold/70 underline underline-offset-2">{t("legal.privacy")}</Link>
            </p>

            {submitErr && (
              <p className="mb-3 text-[12px] text-red-400 text-center">{submitErr}</p>
            )}

            {isNewProfileMode && (user?.walletBalancePaise ?? 0) < PROFILE_CREATION_COST_PAISE ? (
              <div>
                <p className="mb-3 text-[12px] text-red-400 text-center">
                  {t("onboarding.newProfile.insufficientCredits", { cost: formatRupees(PROFILE_CREATION_COST_PAISE) })}
                </p>
                <button
                  onClick={() => router.push("/payment")}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-[#a67c00] via-[#D4AF37] to-[#f4d675] text-[#1a0e00] font-semibold text-[15px] tracking-wide flex items-center justify-center gap-2 shadow-[0_0_28px_rgba(212,175,55,0.4)] active:scale-[0.98] transition-all"
                >
                  {t("payment.buyCredits")}
                </button>
              </div>
            ) : (
              <button
                onClick={handleConfirm}
                disabled={submitting || !consented}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-[#a67c00] via-[#D4AF37] to-[#f4d675] text-[#1a0e00] font-semibold text-[15px] tracking-wide flex items-center justify-center gap-2 shadow-[0_0_28px_rgba(212,175,55,0.4)] disabled:opacity-50 active:scale-[0.98] transition-all"
              >
                {submitting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>{t(isNewProfileMode ? "profileSwitcher.createProfile" : "onboarding.confirmBtn")} <ChevronRight size={17} /></>
                )}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <OnboardingPageInner />
    </Suspense>
  );
}
