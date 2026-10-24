"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Flag, MoonStar, Trash2, UserX } from "lucide-react";
import ParticleBackground from "@/components/ParticleBackground";
import IconButton from "@/components/ui/IconButton";
import Card from "@/components/ui/Card";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import NewFeatureGuard from "@/components/NewFeatureGuard";
import { api, ApiError } from "@/lib/api";
import {
  MAX_POST_CHARS,
  REPORT_REASONS,
  signOfRoom,
  skyProblemOf,
  type SkyPost,
  type SkyRoom,
} from "@/lib/same-sky";

/** The grievance officer's contact under the room (IT Rules 2021): the one named in the Terms. NEXT_PUBLIC_GRIEVANCE_EMAIL can override it. */
const GRIEVANCE_EMAIL = process.env.NEXT_PUBLIC_GRIEVANCE_EMAIL ?? "subir@arohaastrology.in";

function SkyPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [room, setRoom] = useState<SkyRoom | null>(null);
  const [failed, setFailed] = useState(false);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [notice, setNotice] = useState<{ text: string; tone: "ok" | "bad" } | null>(null);
  const [reporting, setReporting] = useState<SkyPost | null>(null);

  const load = useCallback(() => {
    setFailed(false);
    api
      .sky()
      .then(setRoom)
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onPost() {
    setPosting(true);
    setNotice(null);
    try {
      const res = await api.skyPost(text);
      setText("");
      setNotice(
        res.outcome === "APPROVED"
          ? { text: t("sky.approved"), tone: "ok" }
          : res.outcome === "PENDING"
            ? { text: t("sky.waiting"), tone: "ok" }
            : { text: t("sky.rejected"), tone: "bad" },
      );
      load();
    } catch (err) {
      const problem = err instanceof ApiError ? skyProblemOf(err.message) : null;
      setNotice({ text: t(`sky.problem.${problem ?? "generic"}`), tone: "bad" });
    } finally {
      setPosting(false);
    }
  }

  async function onReport(reason: string) {
    if (!reporting) return;
    const post = reporting;
    setReporting(null);
    try {
      await api.skyReport(post.id, reason);
      setRoom((r) => (r ? { ...r, posts: r.posts.filter((p) => p.id !== post.id) } : r));
      setNotice({ text: t("sky.reported"), tone: "ok" });
    } catch {
      setNotice({ text: t("sky.problem.generic"), tone: "bad" });
    }
  }

  async function onBlock(post: SkyPost) {
    try {
      await api.skyBlock(post.id);
      load();
      setNotice({ text: t("sky.blocked"), tone: "ok" });
    } catch {
      setNotice({ text: t("sky.problem.generic"), tone: "bad" });
    }
  }

  async function onDelete(post: SkyPost) {
    try {
      await api.skyDeletePost(post.id);
      load();
    } catch {
      setNotice({ text: t("sky.problem.generic"), tone: "bad" });
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
            <MoonStar size={18} className="text-gold" />
            {t("sky.title")}
          </h1>
        </div>

        {failed && !room && (
          <div className="py-10 text-center space-y-3">
            <p className="text-sm text-muted">{t("sky.problem.generic")}</p>
            <button type="button" onClick={load} className="h-10 rounded-full border border-gold/25 px-5 text-sm">
              {t("ritual.retry")}
            </button>
          </div>
        )}

        {room && room.room === null && (
          <p className="py-8 text-center text-sm text-muted" data-testid="sky-no-room">
            {t("sky.noRoom")}
          </p>
        )}

        {room?.room && (
          <>
            <p className="text-sm text-gold" data-testid="sky-room">
              {t("sky.roomLine", { sign: t(`zodiac.signs.${room.room}`, { defaultValue: signOfRoom(room.room) }) })}
            </p>
            <p className="text-[11px] leading-relaxed text-muted">{t("sky.intro")}</p>

            <Card className="p-4 border-gold/15 space-y-2">
              <textarea
                data-testid="sky-input"
                value={text}
                maxLength={MAX_POST_CHARS}
                onChange={(e) => setText(e.target.value)}
                placeholder={t("sky.placeholder")}
                rows={3}
                className="w-full resize-none rounded-2xl bg-white/5 p-3 text-sm text-foreground outline-none placeholder:text-muted"
              />
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-muted" data-testid="sky-left">
                  {t("sky.leftToday", { n: room.postsLeftToday })}
                </span>
                <span className="ml-auto text-[11px] text-muted">
                  {text.length}/{MAX_POST_CHARS}
                </span>
                <button
                  type="button"
                  data-testid="sky-post"
                  disabled={posting || text.trim().length < 3 || room.postsLeftToday <= 0}
                  onClick={() => void onPost()}
                  className="h-9 rounded-full bg-gold/25 px-5 text-sm font-semibold text-gold disabled:opacity-40"
                >
                  {posting ? t("sky.posting") : t("sky.post")}
                </button>
              </div>
              <p className="text-[11px] text-muted">{t("sky.rules")}</p>
            </Card>

            {notice && (
              <p
                role="status"
                data-testid="sky-notice"
                className={`text-sm ${notice.tone === "ok" ? "text-gold" : "text-red-300"}`}
              >
                {notice.text}
              </p>
            )}

            {room.posts.length === 0 && (
              <p className="py-6 text-center text-sm text-muted" data-testid="sky-empty">
                {t("sky.empty")}
              </p>
            )}

            {room.posts.map((p) => (
              <Card key={p.id} className="p-4 border-gold/15 space-y-2" data-testid="sky-post-card">
                <div className="flex items-center gap-2 text-[11px] text-muted">
                  <span className="text-foreground/80">{p.mine ? t("sky.you") : p.handle}</span>
                  {p.mine && p.status && p.status !== "APPROVED" && (
                    <span className="rounded-full border border-gold/30 px-2 py-0.5 text-gold" data-testid="sky-status">
                      {t(`sky.status.${p.status}`)}
                    </span>
                  )}
                </div>
                <p className="whitespace-pre-line break-words text-sm text-foreground leading-relaxed">{p.body}</p>
                <div className="flex items-center justify-end gap-1">
                  {p.mine ? (
                    <button
                      type="button"
                      data-testid="sky-delete"
                      aria-label={t("sky.delete")}
                      onClick={() => void onDelete(p)}
                      className="grid h-8 w-8 place-items-center rounded-full text-muted hover:text-foreground"
                    >
                      <Trash2 size={14} />
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        data-testid="sky-block"
                        aria-label={t("sky.block")}
                        onClick={() => void onBlock(p)}
                        className="grid h-8 w-8 place-items-center rounded-full text-muted hover:text-foreground"
                      >
                        <UserX size={14} />
                      </button>
                      <button
                        type="button"
                        data-testid="sky-report"
                        aria-label={t("sky.report")}
                        onClick={() => setReporting(p)}
                        className="grid h-8 w-8 place-items-center rounded-full text-muted hover:text-foreground"
                      >
                        <Flag size={14} />
                      </button>
                    </>
                  )}
                </div>
              </Card>
            ))}

            {GRIEVANCE_EMAIL && (
              <p className="text-[11px] leading-relaxed text-muted" data-testid="sky-grievance">
                {t("sky.grievance", { email: GRIEVANCE_EMAIL })}
              </p>
            )}
          </>
        )}
      </div>

      {reporting && (
        <BottomSheetModal
          onClose={() => setReporting(null)}
          closeLabel={t("common.close")}
          header={<h2 className="text-base font-semibold text-foreground">{t("sky.reportTitle")}</h2>}
        >
          <div className="space-y-2 p-1 pb-4">
            {REPORT_REASONS.map((reason) => (
              <button
                key={reason}
                type="button"
                data-testid={`sky-reason-${reason}`}
                onClick={() => void onReport(reason)}
                className="w-full rounded-2xl border border-gold/20 px-4 py-3 text-left text-sm text-foreground"
              >
                {t(`sky.reason.${reason}`)}
              </button>
            ))}
          </div>
        </BottomSheetModal>
      )}
    </main>
  );
}

export default function SkyRoute() {
  return (
    <NewFeatureGuard featureKey="community.sameSky">
      <SkyPage />
    </NewFeatureGuard>
  );
}
