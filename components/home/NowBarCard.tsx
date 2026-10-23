"use client";

import { useTranslation } from "react-i18next";
import { Clock3 } from "lucide-react";
import Card from "@/components/ui/Card";
import { useNewFeature } from "@/hooks/useFeature";
import { useLiveNow } from "@/hooks/useLiveNow";
import { muhurtaKey, nowTone, planetKey, whenParts, windowNameKey, type NowTone } from "@/lib/live-now";

const TONE_CLASS: Record<NowTone, string> = {
  caution: "border-red-400/40 bg-red-500/10",
  good: "border-emerald-400/40 bg-emerald-500/10",
  neutral: "border-gold/15",
};

/**
 * Home's Now Bar (live.nowBar, ships off): what is running right now where the reader is. It leads
 * with the strongest thing: Rahu Kaal while it is on, Abhijit Muhurta while that is on, else the
 * choghadiya. Under it, the hora and the next good window. The same answer feeds the Android widget.
 */
export default function NowBarCard() {
  const { t } = useTranslation();
  const { enabled } = useNewFeature("live.nowBar");
  const { live, state, place } = useLiveNow(enabled);

  if (!enabled) return null;
  if (state === "unavailable" && !live) return null;
  if (!live) {
    return (
      <Card className="p-5 border-gold/15 min-h-24" data-testid="now-bar-loading" aria-busy="true">
        <p className="flex items-center gap-2 text-gold text-xs font-medium uppercase tracking-wider">
          <Clock3 size={14} />
          {t("nowBar.title")}
        </p>
      </Card>
    );
  }

  const tone = nowTone(live);
  const planet = (p: string) => t(`planetNames.${planetKey(p)}`, { defaultValue: p });
  const windowName = (label: string) =>
    t(`muhurtaNames.${windowNameKey(label)}`, { defaultValue: label });
  const when = (inMin: number) => {
    const w = whenParts(inMin);
    return t(`nowBar.${w.key}`, w.vars);
  };

  const lead = live.rahuKaal.on
    ? t("nowBar.rahuOn", { time: live.rahuKaal.end })
    : live.abhijit.on
      ? t("nowBar.abhijitOn", { time: live.abhijit.end })
      : live.choghadiya
        ? t("nowBar.chogLine", {
            name: t(`muhurtaNames.${muhurtaKey(live.choghadiya.name)}`, { defaultValue: live.choghadiya.name }),
            time: live.choghadiya.end,
          })
        : null;

  const nakshatra = t(`nakshatraNames.${live.nakshatra.name.toLowerCase().replace(/[^a-z]/g, "")}`, {
    defaultValue: live.nakshatra.name,
  });

  return (
    <Card className={`p-5 ${TONE_CLASS[tone]}`} data-testid="now-bar" data-tone={tone}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-gold text-xs font-medium uppercase tracking-wider">
          <Clock3 size={14} />
          {t("nowBar.title")}
        </p>
        <span className="text-[11px] text-muted" data-testid="now-bar-place">
          {t("nowBar.forPlace", { place: place?.name ?? live.tz.split("/").pop()?.replace(/_/g, " ") })}
        </span>
      </div>

      {lead && <p className="text-base font-semibold text-foreground" data-testid="now-bar-lead">{lead}</p>}
      {live.choghadiya && !live.rahuKaal.on && !live.abhijit.on && (
        <p className="mt-0.5 text-xs text-muted">{t(`nowBar.type.${live.choghadiya.type}`)}</p>
      )}

      <ul className="mt-3 space-y-1 text-sm text-foreground/85">
        {live.hora && (
          <li data-testid="now-bar-hora">{t("nowBar.horaLine", { planet: planet(live.hora.planet), time: live.hora.end })}</li>
        )}
        {live.nextGood && (
          <li data-testid="now-bar-next-good">
            {t("nowBar.nextGood", {
              label: windowName(live.nextGood.label),
              time: live.nextGood.start,
              when: when(live.nextGood.inMin),
            })}
          </li>
        )}
        {live.nextCaution && !live.rahuKaal.on && (
          <li data-testid="now-bar-next-caution">
            {t("nowBar.rahuLater", { time: live.nextCaution.start, when: when(live.nextCaution.inMin) })}
          </li>
        )}
      </ul>

      <p className="mt-3 text-[11px] text-muted">
        {t("nowBar.dayLine", {
          tithi: live.tithi.name,
          paksha: t(`nowBar.paksha.${live.tithi.paksha.toLowerCase()}`),
          nakshatra,
        })}
      </p>
      {place?.reference && <p className="mt-1 text-[11px] text-muted">{t("nowBar.referenceNote")}</p>}
    </Card>
  );
}
