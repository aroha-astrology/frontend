"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Anchor, Briefcase, ChevronDown, Flame, HeartPulse, MessageCircle, Smile, Sparkles, type LucideIcon } from "lucide-react";
import Card from "@/components/ui/Card";
import type { BondCompatibility, RelateKey, RelateMeter, RelatePart } from "@/lib/bonds-api";

type AxisKey = "overall" | RelateKey;

const AXIS_ICON: Record<AxisKey, LucideIcon> = {
  overall: Sparkles,
  emotion: HeartPulse,
  communication: MessageCircle,
  spark: Flame,
  workflow: Briefcase,
  vibe: Smile,
  foundation: Anchor,
};

const KOOTA_PART: Partial<Record<RelatePart, string>> = {
  grahaMaitri: "GrahaMaitri",
  bhakoot: "Bhakoot",
  tara: "Tara",
  yoni: "Yoni",
};
const SIGN_PART: Partial<Record<RelatePart, string>> = { mercury: "mercury", venus: "venus", sun: "sun", jupiter: "jupiter" };
const LORD_PART: Partial<Record<RelatePart, number>> = { lords4: 4, lords10: 10, lords11: 11 };

type Translate = (key: string, vars?: Record<string, unknown>) => string;

/** What one ingredient of a meter is called, built from names the app already translates. */
export function partLabel(t: Translate, part: RelatePart): string {
  const koota = KOOTA_PART[part];
  if (koota) return t(`compatibilityPage.kootaLabel.${koota}`);
  const planet = SIGN_PART[part];
  if (planet) return t("bonds.relate.part.signs", { planet: t(`planetNames.${planet}`) });
  const house = LORD_PART[part];
  if (house) return t("bonds.relate.part.lords", { houseName: t(`why.houses.${house}`) });
  if (part === "venusMars") return t("bonds.relate.part.cross", { a: t("planetNames.venus"), b: t("planetNames.mars") });
  if (part === "marsVenus") return t("bonds.relate.part.cross", { a: t("planetNames.mars"), b: t("planetNames.venus") });
  return t("bonds.relate.part.moonElement");
}

/** Where axis `i` of `n` ends, for a value 0-1, on a 100x100 canvas with the first axis pointing up. */
function point(i: number, n: number, value: number, radius = 30): [number, number] {
  const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
  return [50 + Math.cos(angle) * radius * value, 50 + Math.sin(angle) * radius * value];
}

const ring = (n: number, value: number) => Array.from({ length: n }, (_, i) => point(i, n, value).join(",")).join(" ");

/**
 * "How you relate": the overall score and the bond's meters drawn as one shape,
 * with a row for each underneath. Tapping a point or a row opens what went
 * into that score.
 */
export default function RelateGraph({ compatibility, meters }: { compatibility: BondCompatibility; meters: RelateMeter[] }) {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState<AxisKey | null>(null);

  const axes: Array<{ key: AxisKey; score: number; meter?: RelateMeter }> = [
    { key: "overall", score: compatibility.pct },
    ...meters.map((m) => ({ key: m.key as AxisKey, score: m.score, meter: m })),
  ];
  const n = axes.length;
  const shape = axes.map((a, i) => point(i, n, Math.max(0.06, a.score / 100)).join(",")).join(" ");
  const name = (key: AxisKey) => (key === "overall" ? t("bonds.relate.overall") : t(`bonds.relate.name.${key}`));
  const toggle = (key: AxisKey) => setOpen((cur) => (cur === key ? null : key));

  return (
    <Card className="p-4 border-gold/15 space-y-3" data-testid="bond-relate">
      <p className="text-xs font-semibold uppercase tracking-wider text-gold">{t("bonds.relate.title")}</p>

      {n >= 3 && (
        <div className="relative mx-auto aspect-square w-full max-w-[260px]">
          <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
            {[0.25, 0.5, 0.75, 1].map((v) => (
              <polygon key={v} points={ring(n, v)} fill="none" strokeWidth="0.4" className="stroke-gold/20" />
            ))}
            {axes.map((a, i) => {
              const [x, y] = point(i, n, 1);
              return <line key={a.key} x1="50" y1="50" x2={x} y2={y} strokeWidth="0.4" className="stroke-gold/20" />;
            })}
            <motion.polygon
              points={shape}
              strokeWidth="1.2"
              strokeLinejoin="round"
              className="fill-gold/20 stroke-gold"
              style={{ transformOrigin: "50px 50px" }}
              initial={{ scale: reduce ? 1 : 0.2, opacity: reduce ? 1 : 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: reduce ? 0 : 0.7, ease: "easeOut" }}
            />
            {axes.map((a, i) => {
              const [x, y] = point(i, n, Math.max(0.06, a.score / 100));
              return <circle key={a.key} cx={x} cy={y} r={open === a.key ? 2.6 : 1.8} className="fill-gold" />;
            })}
          </svg>
          {axes.map((a, i) => {
            const [x, y] = point(i, n, 1, 41);
            const Icon = AXIS_ICON[a.key];
            const active = open === a.key;
            return (
              <button
                key={a.key}
                type="button"
                onClick={() => toggle(a.key)}
                aria-label={`${name(a.key)} ${a.score}`}
                aria-pressed={active}
                style={{ left: `${x}%`, top: `${y}%` }}
                className={`absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5 rounded-xl border px-2 py-1 transition-colors ${
                  active ? "border-gold bg-gold/20 text-gold" : "border-gold/20 bg-card text-foreground/85"
                }`}
              >
                <Icon size={14} className="text-gold" />
                <span className="text-[11px] font-semibold leading-none">{a.score}</span>
              </button>
            );
          })}
        </div>
      )}

      <ul className="space-y-1.5">
        {axes.map((a) => {
          const Icon = AXIS_ICON[a.key];
          const active = open === a.key;
          const line = a.meter ? t(`bonds.relate.line.${a.meter.key}.${a.meter.level}`) : t(`bonds.label.${compatibility.label}`);
          return (
            <li key={a.key} className={`rounded-2xl border transition-colors ${active ? "border-gold/40 bg-gold/5" : "border-gold/10"}`}>
              <button
                type="button"
                onClick={() => toggle(a.key)}
                aria-expanded={active}
                data-testid={`relate-row-${a.key}`}
                className="flex w-full items-start gap-3 px-3 py-2.5 text-left"
              >
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold/10 text-gold">
                  <Icon size={15} />
                </span>
                <span className="min-w-0 flex-1 space-y-1.5">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium text-foreground">{name(a.key)}</span>
                    <span className="shrink-0 text-sm font-semibold text-gold">{a.score}</span>
                  </span>
                  <span className="block h-1.5 overflow-hidden rounded-full bg-gold/10">
                    <motion.span
                      className="block h-full rounded-full bg-gold/80"
                      initial={{ width: reduce ? `${a.score}%` : 0 }}
                      animate={{ width: `${a.score}%` }}
                      transition={{ duration: reduce ? 0 : 0.7, ease: "easeOut" }}
                    />
                  </span>
                  <span className="block text-xs leading-snug text-foreground/80">{line}</span>
                </span>
                {a.meter && (
                  <ChevronDown size={16} className={`mt-1 shrink-0 text-muted transition-transform ${active ? "rotate-180" : ""}`} />
                )}
              </button>
              <AnimatePresence initial={false}>
                {active && a.meter && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: reduce ? 0 : 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2 px-3 pb-3 pl-14" data-testid={`relate-parts-${a.key}`}>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted">{t("bonds.relate.partsTitle")}</p>
                      {a.meter.parts.map((p) => (
                        <div key={p.part} className="space-y-1">
                          <div className="flex items-baseline justify-between gap-2 text-xs">
                            <span className="min-w-0 text-foreground/85">{partLabel(t, p.part)}</span>
                            <span className="shrink-0 text-muted">{p.score}</span>
                          </div>
                          <span className="block h-1 overflow-hidden rounded-full bg-gold/10">
                            <span className="block h-full rounded-full bg-gold/60" style={{ width: `${p.score}%` }} />
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
      <p className="text-[11px] text-muted">{t("bonds.relate.tap")}</p>
    </Card>
  );
}
