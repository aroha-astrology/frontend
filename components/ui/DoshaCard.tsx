'use client';

import { useState } from 'react';

// Real shapes from KundliReady.doshas — each key has distinct "present" field names
export interface MangalDosha {
  present: boolean;
  severity?: 'low' | 'medium' | 'high';
  affectedHouses?: number[];
  description?: string;
  cancellation?: string;
}
export interface KaalSarpDosha {
  present: boolean;
  severity?: 'low' | 'medium' | 'high';
  type?: string;
  description?: string;
}
export interface SadeSati {
  active: boolean; // NOTE: "active", not "present"
  phase?: string;
  severity?: 'low' | 'medium' | 'high';
  description?: string;
}
export interface SimpleDosha {
  present: boolean;
  severity?: 'low' | 'medium' | 'high';
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
  pitra?: SimpleDosha;
  kemDruma?: SimpleDosha;
  grahan?: GrahanDosha;
  guruChandal?: SimpleDosha;
}

interface Dosha {
  key: string;
  label: string;
  severity: 'low' | 'medium' | 'high';
  description?: string;
  meta?: string; // e.g. phase, cancellation, type
}

// Backend severity vocabulary is 'none' | 'mild' | 'moderate' | 'severe' (see
// astro-engine dosha detectors) — translate it rather than silently bucketing
// every unrecognized value to 'medium', which previously made every dosha
// look identically "moderate" regardless of its real computed severity.
function sev(s?: string): 'low' | 'medium' | 'high' {
  if (s === 'high' || s === 'medium' || s === 'low') return s;
  if (s === 'mild') return 'low';
  if (s === 'moderate') return 'medium';
  if (s === 'severe') return 'high';
  return 'medium';
}

function extractDoshas(analysis: DoshaAnalysis): Dosha[] {
  const out: Dosha[] = [];

  if (analysis.mangal?.present) {
    out.push({ key: 'mangal', label: 'Mangal Dosha', severity: sev(analysis.mangal.severity), description: analysis.mangal.description, meta: analysis.mangal.cancellation ? `Cancellation: ${analysis.mangal.cancellation}` : undefined });
  }
  if (analysis.kaalSarp?.present) {
    out.push({ key: 'kaalSarp', label: 'Kaal Sarp Dosha', severity: sev(analysis.kaalSarp.severity), description: analysis.kaalSarp.description, meta: analysis.kaalSarp.type });
  }
  if (analysis.sadeSati?.active) {
    out.push({ key: 'sadeSati', label: 'Sade Sati', severity: sev(analysis.sadeSati.severity), description: analysis.sadeSati.description, meta: analysis.sadeSati.phase ? `Phase: ${analysis.sadeSati.phase}` : undefined });
  }
  if (analysis.pitra?.present) {
    out.push({ key: 'pitra', label: 'Pitra Dosha', severity: sev(analysis.pitra.severity), description: analysis.pitra.description });
  }
  if (analysis.kemDruma?.present) {
    out.push({ key: 'kemDruma', label: 'Kemdrum Dosha', severity: sev(analysis.kemDruma.severity), description: analysis.kemDruma.description });
  }
  if (analysis.grahan?.present && analysis.grahan.type !== 'none') {
    out.push({ key: 'grahan', label: 'Grahan Dosha', severity: sev(analysis.grahan.severity), description: analysis.grahan.description, meta: analysis.grahan.type });
  }
  if (analysis.guruChandal?.present) {
    out.push({ key: 'guruChandal', label: 'Guru Chandal Dosha', severity: sev(analysis.guruChandal.severity), description: analysis.guruChandal.description });
  }
  return out;
}

const SEVERITY_COLORS: Record<string, string> = {
  high: 'border-red-500/25 bg-red-500/5 text-red-400',
  medium: 'border-orange-500/25 bg-orange-500/5 text-orange-400',
  low: 'border-yellow-500/25 bg-yellow-500/5 text-yellow-400',
};

const PLAIN_BLURB: Record<string, string> = {
  low: 'A mild influence — generally manageable with awareness.',
  medium: 'A moderate influence that deserves attention in key life areas.',
  high: 'A strong influence — classical remedies and awareness are advised.',
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
  const [expanded, setExpanded] = useState(false);
  const list = extractDoshas(doshas);
  if (!list.length) return null;

  const shown = expanded ? list : list.slice(0, 2);

  return (
    <div className={className}>
      <h3 className="text-[10px] font-semibold tracking-[0.25em] uppercase text-gold mb-3 flex items-center gap-2">
        <span className="text-red-400 text-xs">⚠</span>
        Doshas Detected
        <span className="h-px flex-1 bg-gradient-to-r from-red-400/30 to-transparent" />
      </h3>

      <div className="space-y-2">
        {shown.map((d) => {
          const colorClass = SEVERITY_COLORS[d.severity];
          return (
            <div key={d.key} className={`p-3 rounded-xl border ${colorClass}`}>
              <div className="flex items-center justify-between mb-1 gap-2">
                <span className="text-xs font-bold">{d.label}</span>
                {mode === 'technical' && (
                  <span className="text-[9px] uppercase tracking-wider opacity-70">{d.severity}</span>
                )}
              </div>
              <p className="text-[11px] text-muted leading-relaxed">
                {d.description
                  ? (mode === 'plain' ? plainify(d.description) : d.description)
                  : PLAIN_BLURB[d.severity]}
              </p>
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
          {expanded ? 'Show less' : `Show all ${list.length} doshas`}
        </button>
      )}
    </div>
  );
}
