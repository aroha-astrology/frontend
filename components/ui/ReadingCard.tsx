'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Card from './Card';

interface Highlight {
  finding_id: string;
  text: string;
}

interface ReadingCardProps {
  hook: string;
  highlights?: Highlight[];
  analysisMd?: string;
  score?: number | null;
  className?: string;
}

export default function ReadingCard({
  hook,
  highlights = [],
  analysisMd = '',
  score,
  className = '',
}: ReadingCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card
      className={`p-4 ${className}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Layer 1: Hook — always visible */}
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-text leading-snug flex-1">{hook}</p>
        {score != null && (
          <span className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
            {score}
          </span>
        )}
      </div>

      {/* Layer 2: Highlights */}
      {highlights.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {highlights.map((h) => (
            <li key={h.finding_id} className="flex items-start gap-2 text-xs text-text-secondary">
              <span className="text-accent/70 mt-0.5 shrink-0 text-[10px]">◆</span>
              <span>{h.text}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Layer 3: Full analysis — expandable drawer */}
      {analysisMd && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-3 text-[10px] font-semibold text-primary tracking-wide uppercase hover:opacity-80 transition-opacity"
          >
            {expanded ? 'Close' : 'Read full analysis'}
          </button>
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="mt-2 pt-2 border-t border-gold/10">
                  <p className="text-xs leading-relaxed text-text-secondary whitespace-pre-wrap">
                    {analysisMd}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </Card>
  );
}
