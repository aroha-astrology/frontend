"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Pencil, Loader2, Sparkles } from "lucide-react";
import ParticleBackground from "@/components/ParticleBackground";
import IconButton from "@/components/ui/IconButton";
import Card from "@/components/ui/Card";
import PlaceAutocomplete from "@/components/PlaceAutocomplete";
import { useAuth } from "@/providers/auth-provider";
import { api, type Gender, type PlaceOfBirth, type UpdateMeBody } from "@/lib/api";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Formats a "HH:mm[:ss]" string for display (e.g. "02:30 PM"). */
function formatTimeOfBirth(hhmmss: string | null | undefined): string {
  if (!hhmmss) return "";
  const [h, m] = hhmmss.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmmss;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

interface EditForm {
  displayName: string;
  gender: Gender;
  dateOfBirth: string; // YYYY-MM-DD, matches <input type="date">
  timeOfBirth: string; // HH:mm, matches <input type="time">
  placeName: string;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ReadRow({ label, value }: { label: string; value: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between py-3 border-b border-gold/10 last:border-b-0">
      <span className="text-[12px] text-muted uppercase tracking-wider">{label}</span>
      <span className="text-[14px] text-foreground font-medium text-right">
        {value || t("profile.notSet")}
      </span>
    </div>
  );
}

const inputClass =
  "w-full h-12 rounded-xl px-3.5 outline-none border text-sm focus:border-gold/60 transition-colors bg-surface border-border text-foreground";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, loading, refresh } = useAuth();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditForm | null>(null);
  const [resolvedPlace, setResolvedPlace] = useState<PlaceOfBirth | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState("");

  const GENDERS: { key: Exclude<Gender, null>; label: string }[] = [
    { key: "male", label: t("onboarding.step7male") },
    { key: "female", label: t("onboarding.step7female") },
    { key: "other", label: t("onboarding.step7other") },
  ];

  const genderLabel = (g: Gender) => GENDERS.find((g2) => g2.key === g)?.label ?? "";

  function startEdit() {
    if (!user) return;
    setForm({
      displayName: user.displayName ?? "",
      gender: user.gender ?? null,
      dateOfBirth: user.dateOfBirth ?? "",
      timeOfBirth: (user.timeOfBirth ?? "").slice(0, 5),
      placeName: user.placeOfBirth?.name ?? "",
    });
    setResolvedPlace(user.placeOfBirth ?? null);
    setSubmitErr("");
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setForm(null);
    setSubmitErr("");
  }

  async function handleSave() {
    if (!form || !user) return;
    setSubmitting(true);
    setSubmitErr("");
    try {
      const body: UpdateMeBody = {};
      let birthChanged = false;

      if (form.displayName !== (user.displayName ?? "")) {
        body.displayName = form.displayName;
      }
      if (form.gender !== (user.gender ?? null)) {
        body.gender = form.gender;
      }
      if (form.dateOfBirth && form.dateOfBirth !== (user.dateOfBirth ?? "")) {
        body.dateOfBirth = form.dateOfBirth;
        birthChanged = true;
      }
      if (form.timeOfBirth && form.timeOfBirth !== (user.timeOfBirth ?? "").slice(0, 5)) {
        body.timeOfBirth = form.timeOfBirth;
        birthChanged = true;
      }
      if (resolvedPlace && resolvedPlace.name !== user.placeOfBirth?.name) {
        body.placeOfBirth = resolvedPlace;
        birthChanged = true;
      }

      await api.updateMe(body);
      await refresh();

      // Birth details changed — the natal chart is now stale. Fire-and-forget,
      // same pattern as onboarding's post-updateMe warm-up.
      if (birthChanged) api.regenerateKundli().catch(() => {});

      setEditing(false);
      setForm(null);
    } catch {
      setSubmitErr(t("profile.saveError"));
    } finally {
      setSubmitting(false);
    }
  }

  // ── Loading ──
  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
            className="w-10 h-10 rounded-full border-2 border-gold border-t-transparent mx-auto"
          />
          <p className="text-sm text-muted mt-4">{t("profile.loading")}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="cosmic-bg min-h-screen pb-28 relative overflow-hidden text-foreground">
      <ParticleBackground />

      <div className="relative z-10 px-5 pt-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <IconButton onClick={() => router.back()} aria-label={t("common.back")}>
            <ArrowLeft size={18} />
          </IconButton>
          <h1 className="text-lg font-display text-foreground flex-1">{t("profile.title")}</h1>
          {!editing && (
            <button
              onClick={startEdit}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gold/30 text-gold text-xs font-semibold hover:bg-gold/10 transition-colors"
            >
              <Pencil size={13} /> {t("profile.edit")}
            </button>
          )}
        </div>

        <Card className="p-4 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-gold" />
            <div>
              <span className="text-[10px] text-muted uppercase tracking-wider block">
                {t("payment.currentBalance")}
              </span>
              <span className="text-base font-bold text-gold">
                {user?.credits ?? 0} {t("payment.creditsUnit")}
              </span>
            </div>
          </div>
          <button
            onClick={() => router.push("/payment")}
            className="px-4 py-2 rounded-xl bg-gold text-[#1a0e00] text-xs font-bold"
          >
            {t("payment.buyCredits")}
          </button>
        </Card>

        <Card className="p-4">
          {!editing ? (
            <div>
              <ReadRow label={t("profile.name")} value={user?.displayName ?? ""} />
              <ReadRow label={t("profile.phone")} value={user?.phoneE164 ?? ""} />
              <ReadRow label={t("profile.gender")} value={genderLabel(user?.gender ?? null)} />
              <ReadRow
                label={t("profile.dob")}
                value={user?.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : ""}
              />
              <ReadRow label={t("profile.tob")} value={formatTimeOfBirth(user?.timeOfBirth)} />
              <ReadRow label={t("profile.place")} value={user?.placeOfBirth?.name ?? ""} />
            </div>
          ) : form ? (
            <div className="space-y-3.5">
              <div>
                <label className="text-[11px] text-muted uppercase tracking-wider mb-1 block">
                  {t("profile.name")}
                </label>
                <input
                  type="text"
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  placeholder={t("profile.namePlaceholder")}
                  className={inputClass}
                />
              </div>

              {/* Phone is the OTP-verified identity — read-only even in edit mode */}
              <ReadRow label={t("profile.phone")} value={user?.phoneE164 ?? ""} />

              <div>
                <label className="text-[11px] text-muted uppercase tracking-wider mb-1 block">
                  {t("profile.gender")}
                </label>
                <div className="flex gap-2">
                  {GENDERS.map((g) => (
                    <button
                      key={g.key}
                      type="button"
                      onClick={() => setForm({ ...form, gender: g.key })}
                      className={`flex-1 py-2.5 rounded-xl border text-[13px] font-medium text-center transition-all ${
                        form.gender === g.key
                          ? "border-gold bg-gold/15 text-gold"
                          : "border-gold/20 bg-card/80 text-foreground hover:border-gold/50"
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] text-muted uppercase tracking-wider mb-1 block">
                  {t("profile.dob")}
                </label>
                <input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="text-[11px] text-muted uppercase tracking-wider mb-1 block">
                  {t("profile.tob")}
                </label>
                <input
                  type="time"
                  value={form.timeOfBirth}
                  onChange={(e) => setForm({ ...form, timeOfBirth: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="text-[11px] text-muted uppercase tracking-wider mb-1 block">
                  {t("profile.place")}
                </label>
                <PlaceAutocomplete
                  placeholder={t("profile.placePlaceholder")}
                  inputClassName={inputClass}
                  onSelect={(place) => {
                    setResolvedPlace(place);
                    setForm((f) => (f ? { ...f, placeName: place.name } : f));
                  }}
                />
                {form.placeName && (
                  <p className="text-[11px] text-muted mt-1.5 ml-1">{form.placeName}</p>
                )}
              </div>
            </div>
          ) : null}
        </Card>

        {editing && (
          <div className="mt-4 flex gap-3">
            <button
              onClick={cancelEdit}
              disabled={submitting}
              className="flex-1 py-3 rounded-xl border border-gold/20 text-foreground text-sm font-medium disabled:opacity-50 transition-opacity"
            >
              {t("profile.cancel")}
            </button>
            <button
              onClick={handleSave}
              disabled={submitting}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-black text-sm font-bold disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : t("profile.save")}
            </button>
          </div>
        )}

        {submitErr && <p className="mt-3 text-[12px] text-red-400 text-center">{submitErr}</p>}
      </div>
    </main>
  );
}
