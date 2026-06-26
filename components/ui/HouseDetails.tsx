'use client';

import Card from './Card';

interface HouseData {
  house: number;
  sign: string;
  signIndex: number;
  lord: string;
  planets: string[];
}

interface HouseDetailsProps {
  houses: HouseData[];
  className?: string;
}

const HOUSE_MEANINGS: Record<number, { short: string; keywords: string[] }> = {
  1:  { short: 'Self',        keywords: ['body', 'personality', 'appearance', 'vitality'] },
  2:  { short: 'Wealth',      keywords: ['family', 'speech', 'food', 'values'] },
  3:  { short: 'Courage',     keywords: ['siblings', 'communication', 'short travel'] },
  4:  { short: 'Happiness',   keywords: ['mother', 'home', 'property', 'vehicles'] },
  5:  { short: 'Children',    keywords: ['education', 'creativity', 'romance', 'past karma'] },
  6:  { short: 'Enemies',     keywords: ['health', 'debts', 'obstacles', 'service'] },
  7:  { short: 'Marriage',    keywords: ['partner', 'business', 'public relations'] },
  8:  { short: 'Longevity',   keywords: ['transformation', 'occult', 'inheritance'] },
  9:  { short: 'Fortune',     keywords: ['dharma', 'father', 'higher education', 'travel'] },
  10: { short: 'Career',      keywords: ['profession', 'status', 'reputation', 'authority'] },
  11: { short: 'Gains',       keywords: ['income', 'desires', 'elder siblings', 'networks'] },
  12: { short: 'Liberation',  keywords: ['losses', 'foreign', 'moksha', 'sleep'] },
};

const PLANET_GLYPHS: Record<string, string> = {
  Sun: '☉', Moon: '☾', Mars: '♂', Mercury: '☿',
  Jupiter: '♃', Venus: '♀', Saturn: '♄', Rahu: '☊', Ketu: '☋',
};

export default function HouseDetails({ houses, className = '' }: HouseDetailsProps) {
  return (
    <Card className={`p-4 ${className}`}>
      <h3 className="text-[10px] font-semibold tracking-[0.25em] uppercase text-primary mb-3 flex items-center gap-2">
        <span className="text-accent text-xs">✦</span>
        House Details
        <span className="h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent" />
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {houses.map((h) => {
          const meaning = HOUSE_MEANINGS[h.house];
          return (
            <div
              key={h.house}
              className="p-2.5 rounded-xl border border-gold/10 bg-card/50"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-primary">
                  H{h.house} <span className="font-normal text-text-secondary">({h.sign})</span>
                </span>
                <span className="text-[10px] text-text-secondary">
                  Lord: <span className="text-primary/80">{PLANET_GLYPHS[h.lord] ?? ''} {h.lord}</span>
                </span>
              </div>

              {meaning && (
                <p className="text-[10px] text-text-secondary/60 mb-1">
                  {meaning.short} — {meaning.keywords.join(', ')}
                </p>
              )}

              {h.planets.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {h.planets.map((p) => (
                    <span key={p} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-primary/10 text-primary border border-primary/20">
                      {PLANET_GLYPHS[p] ?? ''} {p}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-[10px] text-text-secondary/30">No planets</span>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
