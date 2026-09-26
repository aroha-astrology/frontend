"use client";

import { useTranslation } from "react-i18next";
import { Crosshair, Wand2 } from "lucide-react";
import type { RoomExplanation } from "@/lib/vastu/explain";
import { getRoomType, DIRECTION_META } from "@/lib/vastu/data";
import { RatingPill, Sheet } from "./ui";

function DirRow({ label, dirs, tone }: { label: string; dirs: string[]; tone: string }) {
  if (!dirs.length) return null;
  return (
    <div className="flex items-center gap-2">
      <span className="w-24 shrink-0 text-[11px] text-muted">{label}</span>
      <div className="flex flex-wrap gap-1">
        {dirs.map((d) => (
          <span key={d} className={`rounded-md border px-1.5 py-0.5 text-[11px] font-mono font-semibold ${tone}`}>{d}</span>
        ))}
      </div>
    </div>
  );
}

/** "Why?" — the deterministic reason for a room's rating. No AI involved. */
export default function WhySheet({ explanation, onClose, onShowMe, onFix }: {
  explanation: RoomExplanation | null;
  onClose: () => void;
  onShowMe?: () => void;
  onFix?: () => void;
}) {
  const { t } = useTranslation();
  const e = explanation;
  const type = e ? getRoomType(e.roomType) : undefined;
  const room = e ? t(type?.labelKey ?? e.roomType, type?.label ?? e.roomType) : "";
  const zoneName = e ? (e.zone === "C" ? t("vastu.studio.centre", "the centre") : t(`vastu.dir.${e.zone}`, DIRECTION_META[e.zone].label)) : "";
  const ideal = e?.ideal.join(" / ") ?? "";

  return (
    <Sheet open={!!e} onClose={onClose} title={e ? `${type?.emoji ?? ""} ${room} · ${e.zone}` : ""} subtitle={t("vastu.why.subtitle", "Why this rating")}>
      {e && (
        <div className="flex flex-col gap-4" data-testid="vastu-why">
          <div className="flex items-center gap-2">
            <RatingPill ratingKey={e.ratingKey} />
            <span className="text-[11px] text-muted">{t("vastu.why.points", "{{score}} / 100 for this room", { score: e.score })}</span>
          </div>
          <p className="text-sm text-foreground/90 leading-relaxed">
            {e.ratingKey === "center"
              ? t("vastu.why.center", "{{room}} sits on the Brahmasthan, the centre of the home, which this rule set keeps open and light.", { room })
              : e.ratingKey === "ideal"
                ? t("vastu.why.ideal", "{{room}} in {{zone}} matches this rule set's first choice.", { room, zone: zoneName })
                : e.ratingKey === "acceptable"
                  ? t("vastu.why.acceptable", "{{room}} in {{zone}} is workable under this rule set. The traditional first choice is {{ideal}}.", { room, zone: zoneName, ideal })
                  : e.ratingKey === "harmful"
                    ? t("vastu.why.harmful", "This rule set advises against {{room}} in {{zone}}. The traditional first choice is {{ideal}}.", { room, zone: zoneName, ideal })
                    : t("vastu.why.poor", "This rule set has no preference for {{room}} in {{zone}}. The traditional first choice is {{ideal}}.", { room, zone: zoneName, ideal })}
            {e.judgedByDoor && " " + t("vastu.why.byDoor", "An entrance is judged by the way its main door faces.")}
          </p>
          {e.reason && (
            <div className="rounded-2xl border border-gold/15 bg-gold/[0.04] p-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-gold/80 mb-1">{t("vastu.why.tradition", "In this tradition")}</p>
              <p className="text-[13px] text-foreground/85 leading-relaxed">{t(`vastu.why.reasons.${e.roomType}`, e.reason)}</p>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <DirRow label={t("vastu.why.best", "Best")} dirs={e.ideal} tone="border-emerald-500/30 text-emerald-400" />
            <DirRow label={t("vastu.why.fine", "Also fine")} dirs={e.acceptable} tone="border-lime-500/30 text-lime-400" />
            <DirRow label={t("vastu.why.avoid", "Avoid")} dirs={e.avoid} tone="border-red-500/30 text-red-400" />
          </div>
          {(onShowMe || onFix) && (
            <div className="flex gap-2">
              {onShowMe && (
                <button onClick={onShowMe} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-gold/30 px-3 py-2.5 text-sm font-semibold text-gold">
                  <Crosshair size={15} /> {t("vastu.studio.showMe", "Show me")}
                </button>
              )}
              {onFix && (
                <button onClick={onFix} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-gold px-3 py-2.5 text-sm font-bold text-[#1a0e00]">
                  <Wand2 size={15} /> {t("vastu.fix.cta", "Fix this")}
                </button>
              )}
            </div>
          )}
          <p className="text-[10.5px] text-muted">{t("vastu.why.ruleSet", "Based on Aroha's selected Vastu rule set ({{id}}). Other traditions may differ.", { id: e.ruleSetId })}</p>
        </div>
      )}
    </Sheet>
  );
}
