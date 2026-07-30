'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';

// Real shape from KundliReady.yogas.yogas[]
export interface Yoga {
  name: string;
  type?: string;
  present: boolean;
  strength?: 'low' | 'medium' | 'high';
  description: string;
  planets?: string[];
  houses?: number[];
  activationPeriod?: string;
}

interface YogaCardProps {
  yogas: Yoga[];
  mode?: 'plain' | 'technical';
  className?: string;
}

// Jargon cleanup for plain mode — mirrors the old apps/api YOGA_JARGON table
const JARGON: [RegExp, string][] = [
  [/kendra houses?/gi, 'key life areas'],
  [/trikona houses?/gi, 'fortunate areas'],
  [/trik houses?/gi, 'difficult areas'],
  [/dusthana houses?/gi, 'challenging areas'],
  [/lagna/gi, 'rising sign'],
  [/bhava/gi, 'life area'],
  [/lord/gi, 'ruling planet'],
  [/exalt(?:ed|ation)/gi, 'at peak strength'],
  [/debilitat(?:ed|ion)/gi, 'weakened'],
  [/vargottama/gi, 'doubly placed'],
  [/angular/gi, 'prominent'],
  [/yoga karaka/gi, 'chart-strengthening planet'],
];

function plainify(text: string): string {
  let out = text;
  for (const [re, rep] of JARGON) out = out.replace(re, rep);
  return out;
}

const STRENGTH_COLORS: Record<string, string> = {
  high: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5',
  medium: 'text-teal-400 border-teal-500/20 bg-teal-500/5',
  low: 'text-green-400 border-green-500/20 bg-green-500/5',
};

export default function YogaCard({ yogas, mode = 'technical', className = '' }: YogaCardProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const present = yogas.filter((y) => y.present);
  if (!present.length) return null;

  const shown = expanded ? present : present.slice(0, 3);

  return (
    <div className={className}>
      <h3 className="text-[10px] font-semibold tracking-[0.25em] uppercase text-gold mb-3 flex items-center gap-2">
        <span className="text-gold text-xs">✦</span>
        {t('kundli.yogaCard.title')}
        <span className="h-px flex-1 bg-gradient-to-r from-gold/30 to-transparent" />
      </h3>

      <div className="space-y-2">
        {shown.map((y) => {
          const colorClass = STRENGTH_COLORS[y.strength ?? 'low'];
          return (
            <div key={y.name} className={`p-3 rounded-xl border ${colorClass}`}>
              <div className="flex items-center justify-between mb-1 gap-2">
                <span className="text-xs font-bold">{y.name}</span>
                {mode === 'technical' && y.strength && (
                  <span className="text-[9px] uppercase tracking-wider opacity-70">{y.strength}</span>
                )}
              </div>
              <p className="text-[11px] text-muted leading-relaxed">
                {mode === 'plain' ? plainify(y.description) : y.description}
              </p>
              {mode === 'technical' && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {y.planets?.map((p) => (
                    <span key={p} className="text-[9px] px-1.5 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20">{p}</span>
                  ))}
                  {y.houses?.map((h) => (
                    <span key={h} className="text-[9px] px-1.5 py-0.5 rounded-full bg-surface text-muted border border-gold/10">H{h}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {present.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-[11px] text-gold underline-offset-2 hover:underline"
        >
          {expanded ? t('kundli.yogaCard.showLess') : t('kundli.yogaCard.showAll', { count: present.length })}
        </button>
      )}
    </div>
  );
}
