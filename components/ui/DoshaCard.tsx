'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';

// Real shapes from KundliReady.doshas — each key has distinct "present" field names
export interface MangalDosha {
  present: boolean;
  severity?: string;
  /** 'cancelled' means not Manglik: Mars is in a dosha house but a traditional exception applies. */
  type?: 'partial' | 'full' | 'cancelled' | 'none' | string;
  affectedHouses?: number[];
  description?: string;
  /** The exceptions that cancel it, e.g. "Mars in own sign Aries - cancellation applies". */
  cancellations?: string[];
}
export interface KaalSarpDosha {
  present: boolean;
  severity?: 'low' | 'medium' | 'high';
  type?: string;
  description?: string;
}
/** Saturn's natal support in one sign it transits (backend doshas/saturnStrength.ts). */
export interface SaturnSignStrength {
  sign: string;
  /** Saturn's own Bhinnashtakavarga bindus in the sign, 0-8. */
  saturnBindus: number;
  /** Sarvashtakavarga total in the sign (28 is the classical benchmark). */
  sarvaBindus: number;
  dignity?: 'exalted' | 'own' | 'friend' | 'neutral' | 'enemy' | 'debilitated' | string;
  /** Saturn is in this sign right now. */
  now: boolean;
}
export interface SaturnTransitStrength {
  lagnaRole: 'lagna-lord' | 'yogakaraka' | null;
  signs: SaturnSignStrength[];
}
export interface SadeSati {
  active: boolean; // NOTE: "active", not "present"
  phase?: string;
  severity?: string;
  description?: string;
  /** Which Sade Sati of the reader's life this is: 1, 2, 3... Null without a birth chart. */
  cycle?: number | null;
  strength?: SaturnTransitStrength;
  /** Set while Saturn has stepped out on a retrograde: when the Sade Sati comes back. */
  resumesOn?: string | null;
  /** When none is running: the next one. */
  next?: { startDate: string; endDate: string } | null;
}
// Shani Dhaiya: Saturn in the 4th (Kantaka Shani) or 8th (Ashtama Shani) sign
// from the Moon. Live like Sade Sati, and also says "active".
export interface Dhaiya {
  active: boolean;
  phase?: '4th' | '8th' | 'none';
  name?: string;
  severity?: string;
  description?: string;
  strength?: SaturnTransitStrength;
  resumesOn?: string | null;
  next?: { phase: '4th' | '8th'; startDate: string; endDate: string } | null;
}
export interface SimpleDosha {
  present: boolean;
  severity?: string;
  description?: string;
}
export interface GrahanDosha {
  present: boolean;
  type?: string; // "none" means not present
  severity?: 'low' | 'medium' | 'high';
  description?: string;
}

export interface DoshaAnalysis {
  mangal?: MangalDosha;
  kaalSarp?: KaalSarpDosha;
  sadeSati?: SadeSati;
  dhaiya?: Dhaiya;
  pitra?: SimpleDosha;
  kemDruma?: SimpleDosha;
  grahan?: GrahanDosha;
  guruChandal?: SimpleDosha;
}

interface Dosha {
  key: string;
  severity: 'low' | 'medium' | 'high' | 'cancelled';
  description?: string;
  meta?: string; // e.g. phase, cancellation, type
}

// Maps a dosha's stable `key` to its i18n label key — see kundli.doshaNames
// in i18n/resources.ts. Reused by DoshaYogaPanel.tsx for the same 7 names.
export const DOSHA_NAME_I18N_KEYS: Record<string, string> = {
  mangal: 'kundli.doshaNames.mangal',
  kaalSarp: 'kundli.doshaNames.kaalSarp',
  sadeSati: 'kundli.doshaNames.sadeSati',
  dhaiya: 'kundli.doshaNames.dhaiya',
  pitra: 'kundli.doshaNames.pitra',
  kemDruma: 'kundli.doshaNames.kemDruma',
  grahan: 'kundli.doshaNames.grahan',
  guruChandal: 'kundli.doshaNames.guruChandal',
};

// Backend severity vocabulary is 'none' | 'mild' | 'moderate' | 'severe' (see
// astro-engine dosha detectors) — translate it rather than silently bucketing
// every unrecognized value to 'medium', which previously made every dosha
// look identically "moderate" regardless of its real computed severity.
// 'none' is the mildest, never 'medium' (a cancelled Mangal Dosha carries 'none').
function sev(s?: string): 'low' | 'medium' | 'high' {
  if (s === 'high' || s === 'medium' || s === 'low') return s;
  if (s === 'mild' || s === 'none') return 'low';
  if (s === 'moderate') return 'medium';
  if (s === 'severe') return 'high';
  return 'medium';
}

/** Cancelled means not Manglik (the backend still sets `present`, with type 'cancelled'). */
function mangalCancelled(m?: MangalDosha): boolean {
  return !!m?.present && m.type === 'cancelled';
}

/** The "doshas found" count: running ones only, never a cancelled Mangal Dosha. */
export function countPresentDoshas(d: DoshaAnalysis): number {
  return [
    d.mangal?.present && !mangalCancelled(d.mangal),
    d.kaalSarp?.present,
    d.sadeSati?.active,
    d.dhaiya?.active,
    d.pitra?.present,
    d.kemDruma?.present,
    d.grahan?.present && d.grahan?.type !== 'none',
    d.guruChandal?.present,
  ].filter(Boolean).length;
}

interface SaturnNote {
  key: 'sadeSati' | 'dhaiya';
  kind: 'onBreak' | 'nextFrom';
  date: string;
}

/** Sade Sati and Dhaiya that are not running today: on a retrograde break, or the next one's start. */
function saturnNotes(d: DoshaAnalysis): SaturnNote[] {
  const out: SaturnNote[] = [];
  for (const key of ['sadeSati', 'dhaiya'] as const) {
    const s = d[key];
    if (!s || s.active) continue;
    if (s.resumesOn) out.push({ key, kind: 'onBreak', date: s.resumesOn });
    else if (s.next?.startDate) out.push({ key, kind: 'nextFrom', date: s.next.startDate });
  }
  return out;
}

/** Whether the card has anything to show: a dosha, a cancelled Mangal, or a Saturn break/next date. */
export function hasDoshaCardContent(d: DoshaAnalysis): boolean {
  return extractDoshas(d).length > 0 || saturnNotes(d).length > 0;
}

/**
 * How much natal support Saturn has in the sign it is in now. Phaladeepika 23.11 and 23.20: 5-8 own
 * bindus and a sign total above 28 are good; 4 or fewer and 28 or less are hard. Anything else is mixed.
 */
export function saturnSupport(s: SaturnSignStrength): 'good' | 'mixed' | 'weak' {
  if (s.saturnBindus >= 5 && s.sarvaBindus > 28) return 'good';
  if (s.saturnBindus <= 4 && s.sarvaBindus <= 28) return 'weak';
  return 'mixed';
}

/** The lines under a running Sade Sati or Dhaiya: which cycle it is, and Saturn's support in its current sign. */
function saturnFacts(
  key: string,
  d: DoshaAnalysis,
  t: (k: string, o?: Record<string, unknown>) => string,
): string[] {
  const src = key === 'sadeSati' ? d.sadeSati : key === 'dhaiya' ? d.dhaiya : undefined;
  if (!src) return [];
  const out: string[] = [];
  const cycle = key === 'sadeSati' ? d.sadeSati?.cycle : null;
  if (typeof cycle === 'number' && cycle >= 1) {
    out.push(cycle <= 3 ? t(`kundli.doshaCard.cycle${cycle}`) : t('kundli.doshaCard.cycleN', { n: cycle }));
  }
  const now = src.strength?.signs?.find((s) => s.now);
  if (src.strength && now) {
    const signKey = String(now.sign).toLowerCase();
    out.push(
      t('kundli.doshaCard.strengthLine', {
        sign: t(`zodiac.signs.${signKey}`, { defaultValue: now.sign }),
        bindus: now.saturnBindus,
        sarva: now.sarvaBindus,
      }),
    );
    out.push(t(`kundli.doshaCard.support.${saturnSupport(now)}`));
    if (now.dignity === 'exalted' || now.dignity === 'own') out.push(t('kundli.doshaCard.dignityStrong'));
    if (now.dignity === 'debilitated') out.push(t('kundli.doshaCard.dignityWeak'));
    if (src.strength.lagnaRole === 'lagna-lord') out.push(t('kundli.doshaCard.roleLagnaLord'));
    if (src.strength.lagnaRole === 'yogakaraka') out.push(t('kundli.doshaCard.roleYogakaraka'));
  }
  return out;
}

function formatDay(iso: string, lang: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  // English as the app writes dates elsewhere ("3 Jun 2027"), not the US "Jun 3, 2027".
  const locale = !lang || lang === 'en' ? 'en-IN' : lang;
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
}

function extractDoshas(analysis: DoshaAnalysis): Dosha[] {
  const out: Dosha[] = [];

  if (analysis.mangal?.present) {
    const cancelled = mangalCancelled(analysis.mangal);
    const reasons = (analysis.mangal.cancellations ?? []).map((c) => c.replace(/ - cancellation applies$/, ''));
    out.push({
      key: 'mangal',
      severity: cancelled ? 'cancelled' : sev(analysis.mangal.severity),
      description: analysis.mangal.description,
      meta: reasons.length ? `Cancellation: ${reasons.join('; ')}` : undefined,
    });
  }
  if (analysis.kaalSarp?.present) {
    out.push({ key: 'kaalSarp', severity: sev(analysis.kaalSarp.severity), description: analysis.kaalSarp.description, meta: analysis.kaalSarp.type });
  }
  if (analysis.sadeSati?.active) {
    out.push({ key: 'sadeSati', severity: sev(analysis.sadeSati.severity), description: analysis.sadeSati.description, meta: analysis.sadeSati.phase ? `Phase: ${analysis.sadeSati.phase}` : undefined });
  }
  if (analysis.dhaiya?.active) {
    out.push({ key: 'dhaiya', severity: sev(analysis.dhaiya.severity), description: analysis.dhaiya.description, meta: analysis.dhaiya.name || undefined });
  }
  if (analysis.pitra?.present) {
    out.push({ key: 'pitra', severity: sev(analysis.pitra.severity), description: analysis.pitra.description });
  }
  if (analysis.kemDruma?.present) {
    out.push({ key: 'kemDruma', severity: sev(analysis.kemDruma.severity), description: analysis.kemDruma.description });
  }
  if (analysis.grahan?.present && analysis.grahan.type !== 'none') {
    out.push({ key: 'grahan', severity: sev(analysis.grahan.severity), description: analysis.grahan.description, meta: analysis.grahan.type });
  }
  if (analysis.guruChandal?.present) {
    out.push({ key: 'guruChandal', severity: sev(analysis.guruChandal.severity), description: analysis.guruChandal.description });
  }
  return out;
}

const SEVERITY_COLORS: Record<string, string> = {
  high: 'border-red-500/25 bg-red-500/5 text-red-400',
  medium: 'border-orange-500/25 bg-orange-500/5 text-orange-400',
  low: 'border-yellow-500/25 bg-yellow-500/5 text-yellow-400',
  cancelled: 'border-white/10 bg-white/[0.03] text-muted',
};

const PLAIN_BLURB_I18N_KEYS: Record<string, string> = {
  low: 'kundli.doshaCard.plainBlurb.low',
  medium: 'kundli.doshaCard.plainBlurb.medium',
  high: 'kundli.doshaCard.plainBlurb.high',
};

// Jargon cleanup for plain mode — mirrors YogaCard's plainify() so a dosha's
// real, chart-specific description is simplified rather than thrown away.
const JARGON: [RegExp, string][] = [
  [/\blagna\b/gi, 'rising sign'],
  [/\bkendra\b/gi, 'key life area'],
  [/\bconjunct\b/gi, 'closely aligned with'],
  [/\baspected by\b/gi, 'influenced by'],
  [/\bexalted?\b/gi, 'at peak strength'],
  [/\bdebilitated?\b/gi, 'weakened'],
  [/\blord\b/gi, 'ruling planet'],
];

function plainify(text: string): string {
  let out = text;
  for (const [re, rep] of JARGON) out = out.replace(re, rep);
  return out;
}

interface DoshaCardProps {
  doshas: DoshaAnalysis;
  mode?: 'plain' | 'technical';
  className?: string;
}

export default function DoshaCard({ doshas, mode = 'technical', className = '' }: DoshaCardProps) {
  const { t, i18n } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const list = extractDoshas(doshas);
  const notes = saturnNotes(doshas);
  if (!list.length && !notes.length) return null;

  const shown = expanded ? list : list.slice(0, 2);

  return (
    <div className={className}>
      <h3 className="text-[10px] font-semibold tracking-[0.25em] uppercase text-gold mb-3 flex items-center gap-2">
        <span className="text-red-400 text-xs">⚠</span>
        {t('kundli.doshaCard.title')}
        <span className="h-px flex-1 bg-gradient-to-r from-red-400/30 to-transparent" />
      </h3>

      <div className="space-y-2">
        {shown.map((d) => {
          const colorClass = SEVERITY_COLORS[d.severity];
          return (
            <div key={d.key} className={`p-3 rounded-xl border ${colorClass}`}>
              <div className="flex items-center justify-between mb-1 gap-2">
                <span className="text-xs font-bold">{t(DOSHA_NAME_I18N_KEYS[d.key])}</span>
                {d.severity === 'cancelled' ? (
                  <span className="text-[9px] uppercase tracking-wider opacity-70">{t('kundli.doshaCard.cancelled')}</span>
                ) : mode === 'technical' && (
                  <span className="text-[9px] uppercase tracking-wider opacity-70">{d.severity}</span>
                )}
              </div>
              <p className="text-[11px] text-muted leading-relaxed">
                {d.description
                  ? (mode === 'plain' ? plainify(d.description) : d.description)
                  : d.severity !== 'cancelled' && t(PLAIN_BLURB_I18N_KEYS[d.severity])}
              </p>
              {saturnFacts(d.key, doshas, t).length > 0 && (
                <ul className="mt-1.5 space-y-0.5 text-[11px] text-muted" data-testid={`saturn-facts-${d.key}`}>
                  {saturnFacts(d.key, doshas, t).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              )}
              {mode === 'technical' && d.meta && (
                <p className="text-[10px] text-muted/60 mt-1">{d.meta}</p>
              )}
            </div>
          );
        })}
      </div>

      {list.length > 2 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-[11px] text-gold underline-offset-2 hover:underline"
        >
          {expanded ? t('kundli.doshaCard.showLess') : t('kundli.doshaCard.showAll', { count: list.length })}
        </button>
      )}

      {notes.length > 0 && (
        <div className={`${list.length ? 'mt-2 ' : ''}space-y-1`}>
          {notes.map((n) => (
            <p key={n.key} className="px-3 py-2 rounded-xl border border-white/10 bg-white/[0.03] text-[11px] text-muted">
              {t(`kundli.doshaCard.${n.kind}`, {
                name: t(DOSHA_NAME_I18N_KEYS[n.key]),
                date: formatDay(n.date, i18n?.language),
              })}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
