"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Copy, Orbit, Plus, Share2, ShieldCheck, Trash2 } from "lucide-react";
import ParticleBackground from "@/components/ParticleBackground";
import IconButton from "@/components/ui/IconButton";
import Card from "@/components/ui/Card";
import NewFeatureGuard from "@/components/NewFeatureGuard";
import PulseDot from "@/components/circles/PulseDot";
import { useCircles } from "@/hooks/useCircles";
import { api, type Profile } from "@/lib/api";
import { PLAY_STORE_URL } from "@/lib/app-review";
import {
  addableProfiles,
  circleInstallUrl,
  FAMILY_SHIELD_SLUG,
  inviteLink,
  type CircleInvite,
  type CircleProblem,
} from "@/lib/circles";

function CirclePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { circle, failed, reload, add, remove, invite, inviteEnabled } = useCircles();
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [picking, setPicking] = useState(false);
  const [problem, setProblem] = useState<CircleProblem | "generic" | null>(null);
  const [made, setMade] = useState<CircleInvite | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!picking || profiles) return;
    api
      .listProfiles()
      .then((list) => setProfiles(list.filter((p) => !p.isPrimary)))
      .catch(() => setProfiles([]));
  }, [picking, profiles]);

  const addable = profiles ? addableProfiles(profiles, circle) : [];
  const full = circle ? circle.members.length >= circle.max : false;

  async function onAdd(profileId: string) {
    setProblem(null);
    const res = await add(profileId);
    if (!res.ok) setProblem(res.problem);
    else setPicking(false);
  }

  async function onRemove(id: string, name: string) {
    if (!window.confirm(t("circles.removeConfirm", { name }))) return;
    setProblem(null);
    const res = await remove(id);
    if (!res.ok) setProblem(res.problem);
  }

  async function onInvite() {
    setProblem(null);
    const res = await invite();
    if (!res.ok) setProblem(res.problem);
    else setMade(res.value);
  }

  const link = made ? inviteLink(window.location.origin, made.code) : null;

  async function onShare() {
    if (!made || !link) return;
    const text = `${link}\n${circleInstallUrl(PLAY_STORE_URL, made.code)}`;
    try {
      if (navigator.share) {
        await navigator.share({ text: link, url: link });
        return;
      }
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      /* the share sheet was dismissed */
    }
  }

  async function onCopy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <main className="cosmic-bg min-h-screen pb-tab-safe relative overflow-hidden text-foreground">
      <ParticleBackground />
      <div className="relative z-10 page-container pt-8 space-y-4 page-cols">
        <div className="flex items-center gap-3">
          <IconButton onClick={() => router.back()} aria-label={t("common.back")}>
            <ArrowLeft size={18} />
          </IconButton>
          <h1 className="flex-1 text-lg font-display flex items-center gap-2">
            <Orbit size={18} className="text-gold" />
            {t("circles.title")}
          </h1>
          {circle && <span className="text-xs text-muted">{t("circles.count", { n: circle.members.length, max: circle.max })}</span>}
        </div>

        {failed && !circle && (
          <div className="py-10 text-center space-y-3">
            <p className="text-sm text-muted">{t("circles.loadFailed")}</p>
            <button type="button" onClick={reload} className="h-10 rounded-full border border-gold/25 px-5 text-sm">
              {t("ritual.retry")}
            </button>
          </div>
        )}

        {problem && (
          <p className="rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200" role="alert" data-testid="circles-problem">
            {t(`circles.problem.${problem}`)}
          </p>
        )}

        {circle && circle.members.length === 0 && <p className="py-6 text-center text-sm text-muted">{t("circles.empty")}</p>}

        {circle?.members.map((m) => (
          <Card key={m.id} className="p-4 border-gold/15 space-y-2" data-testid="circle-member">
            <div className="flex items-center gap-3">
              <PulseDot tone={m.pulse?.tone ?? null} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{m.name}</p>
                <p className="text-[11px] text-muted">
                  {m.kind === "linked"
                    ? t("circles.linkedTag")
                    : m.relationship
                      ? t(`profileSwitcher.relationship.${m.relationship}`, { defaultValue: "" })
                      : ""}
                </p>
              </div>
              {m.pulse && <span className="text-sm font-semibold text-gold" data-testid="circle-score">{m.pulse.score}</span>}
              <button
                type="button"
                aria-label={t("circles.remove")}
                onClick={() => void onRemove(m.id, m.name)}
                className="grid h-8 w-8 place-items-center rounded-full text-muted hover:text-foreground"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <p className="text-xs text-foreground/85" data-testid="circle-tone">
              {m.pulse ? t(`circles.tone.${m.pulse.tone}`) : t("circles.pulseNone")}
            </p>
          </Card>
        ))}

        {circle && circle.members.length > 0 && <p className="text-[11px] leading-relaxed text-muted">{t("circles.pulseNote")}</p>}

        {circle && !full && (
          <button
            type="button"
            data-testid="circle-add"
            onClick={() => setPicking((p) => !p)}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gold/20 text-sm font-semibold text-gold"
          >
            <Plus size={16} />
            {t("circles.add")}
          </button>
        )}

        {picking && (
          <Card className="p-4 border-gold/20 space-y-2" data-testid="circle-picker">
            <p className="text-sm font-semibold text-foreground">{t("circles.addTitle")}</p>
            {profiles === null && <p className="text-xs text-muted">…</p>}
            {profiles && addable.length === 0 && <p className="text-xs text-muted">{t("circles.addNone")}</p>}
            {addable.map((p) => (
              <button
                key={p.id}
                type="button"
                data-testid={`circle-pick-${p.id}`}
                onClick={() => void onAdd(p.id)}
                className="flex w-full items-center justify-between rounded-2xl border border-gold/15 px-4 py-3 text-left text-sm"
              >
                <span className="truncate">{p.displayName ?? "—"}</span>
                <Plus size={14} className="text-gold" />
              </button>
            ))}
            <button
              type="button"
              onClick={() => router.push("/onboarding?mode=new-profile")}
              className="h-10 w-full rounded-full border border-gold/25 text-sm text-foreground/85"
            >
              {t("circles.addProfile")}
            </button>
          </Card>
        )}

        {inviteEnabled && (
          <Card className="p-4 border-gold/15 space-y-3" data-testid="circle-invite">
            <button
              type="button"
              data-testid="circle-invite-make"
              onClick={() => void onInvite()}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-full border border-gold/30 text-sm font-semibold text-gold"
            >
              <Share2 size={16} />
              {t("circles.invite")}
            </button>
            {made && link && (
              <div className="space-y-2">
                <p className="text-xs text-muted">{t("circles.inviteMade")}</p>
                <p className="break-all rounded-2xl bg-white/5 p-3 text-xs text-foreground" data-testid="circle-invite-link">
                  {link}
                </p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => void onShare()} className="flex h-10 flex-1 items-center justify-center gap-1 rounded-full bg-gold/20 text-sm text-gold">
                    <Share2 size={14} />
                    {t("circles.inviteShare")}
                  </button>
                  <button type="button" onClick={() => void onCopy()} className="flex h-10 flex-1 items-center justify-center gap-1 rounded-full border border-gold/25 text-sm">
                    <Copy size={14} />
                    {copied ? t("circles.inviteCopied") : t("circles.inviteCopy")}
                  </button>
                </div>
              </div>
            )}
            <p className="text-[11px] leading-relaxed text-muted">{t("circles.inviteNote")}</p>
          </Card>
        )}

        <Link
          href={`/shlokas/${FAMILY_SHIELD_SLUG}`}
          className="flex items-center gap-3 rounded-3xl border border-gold/20 bg-card p-4"
          data-testid="circle-shield"
        >
          <ShieldCheck size={20} className="text-gold" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-foreground">{t("circles.shield")}</span>
            <span className="block text-[11px] text-muted">{t("circles.shieldSub")}</span>
          </span>
        </Link>
      </div>
    </main>
  );
}

export default function CircleRoute() {
  return (
    <NewFeatureGuard featureKey="circles.circles">
      <CirclePage />
    </NewFeatureGuard>
  );
}
