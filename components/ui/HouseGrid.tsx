'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Lock, Sparkles, ChevronRight, Hand } from 'lucide-react';
import Card from './Card';

interface HouseData {
  house: number;
  sign: string;
  signIndex: number;
  lord: string;
  planets: string[];
}

interface HouseGridProps {
  houses: HouseData[];
  unlockedHouses: number[];
  onHouseClick: (house: HouseData) => void;
  className?: string;
  credits: number;
}

const HOUSE_MEANINGS: Record<number, { short: string; keywords: string[] }> = {
  1:  { short: 'Self',        keywords: ['body', 'personality', 'appearance', 'vitality'] },
  2:  { short: 'Wealth',      keywords: ['family', 'speech', 'food', 'values'] },
  3:  { short: 'Courage',     keywords: ['siblings', 'communication', 'short travel'] },
  4:  { short: 'Home',        keywords: ['mother', 'home', 'property', 'vehicles'] },
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

export default function HouseGrid({ houses, unlockedHouses, onHouseClick, credits, className = '' }: HouseGridProps) {
  const { t } = useTranslation();

  return (
    <Card className={`p-0 overflow-hidden bg-transparent border-none shadow-none ${className}`}>
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-4 flex-1">
          <span className="text-gold">✦</span>
          <div className="h-px flex-1 bg-gold/20" />
          <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase text-foreground">
            {t('kundli.houseDetails', 'PLANETARY POSITIONS')}
          </h3>
          <div className="h-px flex-1 bg-gold/20" />
          <span className="text-gold">✦</span>
        </div>
      </div>

      <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 rounded-xl p-3 mb-4 flex items-center justify-between">
         <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-emerald-400" />
            <span className="text-xs text-emerald-200">
               {t('kundli.creditsAvailable', 'You have {{credits}} credits', { credits })}
            </span>
         </div>
         <span className="text-[10px] text-emerald-400/80 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
           Unlock a house for 5 credits
         </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {houses.map((h) => {
          const meaning = HOUSE_MEANINGS[h.house];
          const isUnlocked = unlockedHouses.includes(h.house);

          return (
            <button
              key={h.house}
              onClick={() => onHouseClick(h)}
              className={`p-3 rounded-2xl border text-left transition-all ${
                isUnlocked 
                  ? 'bg-surface border-gold/20 hover:border-gold/40' 
                  : 'bg-surface/40 border-border/50 hover:border-gold/30 hover:bg-surface/60 opacity-80'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
                  {t('kundli.houseNum', '{{num}} House', { num: h.house + (h.house === 1 ? 'st' : h.house === 2 ? 'nd' : h.house === 3 ? 'rd' : 'th') })}
                </span>
                {!isUnlocked ? (
                  <div className="bg-background rounded-full p-1 border border-border">
                     <Lock size={12} className="text-muted-foreground" />
                  </div>
                ) : (
                  <ChevronRight size={14} className="text-gold/50" />
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <span className={`text-base font-bold font-display ${isUnlocked ? 'text-foreground' : 'text-foreground/70'}`}>
                  {meaning?.short || 'House'}
                </span>
                
                {isUnlocked && (
                  <div className="flex -space-x-1.5">
                    {h.planets.length > 0 ? (
                      h.planets.slice(0, 3).map((p, i) => (
                         <div key={p} className="w-6 h-6 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center text-[10px] text-gold z-[1]" style={{ zIndex: 10 - i }}>
                           {PLANET_GLYPHS[p] ?? p.slice(0, 1)}
                         </div>
                      ))
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-surface border border-border flex items-center justify-center text-[10px] text-muted">
                        —
                      </div>
                    )}
                    {h.planets.length > 3 && (
                       <div className="w-6 h-6 rounded-full bg-surface border border-border flex items-center justify-center text-[8px] text-muted z-0">
                         +{h.planets.length - 3}
                       </div>
                    )}
                  </div>
                )}
              </div>
              
              {isUnlocked && (
                 <p className="text-[11px] text-muted mt-2 truncate">
                   {h.sign} • Lord {h.lord}
                 </p>
              )}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
