"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Orbit } from "lucide-react";
import ParticleBackground from "@/components/ParticleBackground";
import Card from "@/components/ui/Card";
import { api, ApiError } from "@/lib/api";
import {
  clearPendingCircleInvite,
  INVITE_CODE_PATTERN,
  problemOf,
  storePendingCircleInvite,
  type CircleProblem,
  type InvitePreview,
} from "@/lib/circles";
import { useAuth } from "@/providers/auth-provider";

type Load = "loading" | "ready" | "invalid";

/**
 * The landing card behind a Cosmic Circle invite link, /circle/invite/<code>. Anyone can read it
 * (it shows the inviter's first name and nothing else); joining needs an account. A reader without
 * one keeps the code (it is also carried through the Play install), signs in, and is brought back
 * here from Home to confirm: nobody is linked without tapping "Join".
 */
export default function CircleInvitePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const code = String(params?.code ?? "").toUpperCase();
  const { firebaseUser, loading: authLoading } = useAuth();

  const [load, setLoad] = useState<Load>("loading");
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinedName, setJoinedName] = useState<string | null>(null);
  const [problem, setProblem] = useState<CircleProblem | "generic" | null>(null);

  useEffect(() => {
    if (!INVITE_CODE_PATTERN.test(code)) {
      setLoad("invalid");
      return;
    }
    let cancelled = false;
    api
      .circleInvitePreview(code)
      .then((res) => {
        if (cancelled) return;
        setPreview(res);
        setLoad("ready");
        if (res.state !== "open") clearPendingCircleInvite();
      })
      .catch(() => {
        if (!cancelled) setLoad("invalid");
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  async function join() {
    setJoining(true);
    setProblem(null);
    try {
      const res = await api.circleAcceptInvite(code);
      clearPendingCircleInvite();
      setJoinedName(res.inviterName);
    } catch (err) {
      const p = err instanceof ApiError ? problemOf(err.message) : null;
      if (p === "INVITE_USED" || p === "INVITE_EXPIRED") clearPendingCircleInvite();
      setProblem(p ?? "generic");
    } finally {
      setJoining(false);
    }
  }

  function signIn() {
    storePendingCircleInvite(code);
    router.push("/sign-in");
  }

  const name = preview?.inviterName ?? "";

  return (
    <main className="cosmic-bg min-h-screen relative overflow-hidden text-foreground">
      <ParticleBackground />
      <div className="relative z-10 page-container pt-16 space-y-4">
        <Card className="p-6 border-gold/30 space-y-4 text-center" data-testid="circle-invite-page">
          <Orbit size={36} className="mx-auto text-gold" />

          {load === "loading" && <p className="text-sm text-muted">…</p>}

          {load === "invalid" && <p className="text-sm text-foreground/90" data-testid="circle-invite-invalid">{t("circles.invitePage.invalid")}</p>}

          {load === "ready" && preview && preview.state !== "open" && (
            <p className="text-sm text-foreground/90" data-testid="circle-invite-closed">
              {t(preview.state === "used" ? "circles.problem.INVITE_USED" : "circles.problem.INVITE_EXPIRED")}
            </p>
          )}

          {load === "ready" && preview?.state === "open" && !joinedName && (
            <>
              <h1 className="text-xl font-display">{t("circles.invitePage.title", { name })}</h1>
              <p className="text-sm leading-relaxed text-foreground/85">{t("circles.invitePage.body")}</p>
              {problem && (
                <p className="rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200" role="alert" data-testid="circle-invite-problem">
                  {t(`circles.problem.${problem}`)}
                </p>
              )}
              {authLoading ? null : firebaseUser ? (
                <button
                  type="button"
                  data-testid="circle-invite-accept"
                  disabled={joining}
                  onClick={() => void join()}
                  className="h-11 w-full rounded-full bg-gold/20 text-sm font-semibold text-gold disabled:opacity-50"
                >
                  {t("circles.invitePage.accept", { name })}
                </button>
              ) : (
                <button
                  type="button"
                  data-testid="circle-invite-signin"
                  onClick={signIn}
                  className="h-11 w-full rounded-full bg-gold/20 text-sm font-semibold text-gold"
                >
                  {t("circles.invitePage.signIn")}
                </button>
              )}
            </>
          )}

          {joinedName && (
            <>
              <p className="text-base font-semibold text-foreground" data-testid="circle-invite-done">
                {t("circles.invitePage.done", { name: joinedName })}
              </p>
              <button
                type="button"
                onClick={() => router.push("/circles")}
                className="h-11 w-full rounded-full bg-gold/20 text-sm font-semibold text-gold"
              >
                {t("circles.invitePage.openCircle")}
              </button>
            </>
          )}
        </Card>
      </div>
    </main>
  );
}
