'use client';

import React, { useMemo } from 'react';

const GLOSSARY: Record<string, string> = {
  'Guru Chandal Yoga': 'Jupiter-Rahu affliction',
  'Kaal Sarp Dosha': 'Rahu-Ketu axis affliction',
  'Neech Bhang Raj Yoga': 'debilitation cancellation',
  'Gajakesari Yoga': 'Moon-Jupiter prosperity',
  'Mangal Dosha': 'Mars affliction',
  'Raj Yoga': 'royal success combination',
  'Dhana Yoga': 'wealth combination',
  'Sade Sati': '7.5-year Saturn phase',
  'Mahadasha': 'major planetary period',
  'Antardasha': 'sub-period',
  'Pratyantardasha': 'sub-sub-period',
  'Vimshottari': '120-year cycle system',
  'Nakshatra': 'lunar mansion',
  'Ascendant': 'rising sign at birth',
  'Lagna': 'rising sign',
  'Trikona': 'trine houses (1,5,9)',
  'Kendra': 'angular houses (1,4,7,10)',
  'Dusthana': 'malefic houses (6,8,12)',
  'Gochara': 'planetary transit',
  'Retrograde': 'planet moving backward',
  'Exalted': 'planet at peak strength',
  'Debilitated': 'planet at lowest strength',
  'Combust': 'planet eclipsed by Sun',
  'Dosha': 'planetary affliction',
  'Ashtakavarga': 'benefic point system',
  'Navamsa': 'D9 marriage/soul chart',
  'Vedha': 'transit obstruction',
};

interface GlossaryTextProps {
  children: string;
  className?: string;
  extraTerms?: Record<string, string>;
}

export default function GlossaryText({ children, className = '', extraTerms }: GlossaryTextProps) {
  const allTerms = useMemo(() => ({ ...GLOSSARY, ...extraTerms }), [extraTerms]);

  const regex = useMemo(() => {
    const escaped = Object.keys(allTerms)
      .sort((a, b) => b.length - a.length)
      .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|');
    return new RegExp(`\\b(${escaped})\\b`, 'gi');
  }, [allTerms]);

  const nodes = useMemo(() => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let key = 0;
    let match: RegExpExecArray | null;
    regex.lastIndex = 0;

    while ((match = regex.exec(children)) !== null) {
      if (match.index > lastIndex) {
        parts.push(children.slice(lastIndex, match.index));
      }
      const term = match[0];
      const meaning =
        allTerms[term] ??
        allTerms[Object.keys(allTerms).find((k) => k.toLowerCase() === term.toLowerCase()) ?? ''];

      parts.push(
        <span key={key++} className="group relative inline">
          <span className="font-medium text-text underline decoration-primary/30 decoration-dotted underline-offset-2 cursor-help">
            {term}
          </span>
          {meaning && (
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded bg-card border border-gold/20 text-[10px] text-text-secondary whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-lg z-50">
              {meaning}
            </span>
          )}
        </span>,
      );
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < children.length) {
      parts.push(children.slice(lastIndex));
    }
    regex.lastIndex = 0;
    return parts;
  }, [children, allTerms, regex]);

  return <span className={`text-xs leading-relaxed text-text-secondary ${className}`}>{nodes}</span>;
}
