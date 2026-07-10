'use client';

import { useTranslation } from 'react-i18next';
import { Lock, Sparkles, ChevronRight } from 'lucide-react';
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

const PLANET_GLYPHS: Record<string, string> = {
  Sun: '☉', Moon: '☾', Mars: '♂', Mercury: '☿',
  Jupiter: '♃', Venus: '♀', Saturn: '♄', Rahu: '☊', Ketu: '☋',
};

export default function HouseGrid({ houses, unlockedHouses, onHouseClick, credits, className = '' }: HouseGridProps) {
  const { t } = useTranslation();
  const ordinals = t('kundli.house.ordinals', { returnObjects: true }) as string[];

  return (
    <Card className={`p-0 overflow-hidden bg-transparent border-none shadow-none ${className}`}>
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-4 flex-1">
          <span className="text-gold">✦</span>
          <div className="h-px flex-1 bg-gold/20" />
          <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase text-foreground">
            {t('kundli.house.sectionTitle')}
          </h3>
          <div className="h-px flex-1 bg-gold/20" />
          <span className="text-gold">✦</span>
        </div>
      </div>

      <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 rounded-xl p-3 mb-4 flex items-center justify-between">
         <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-emerald-400" />
            <span className="text-xs text-emerald-200">
               {t('kundli.house.creditsAvailable', { credits })}
            </span>
         </div>
         <span className="text-[10px] text-emerald-400/80 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
           {t('kundli.house.unlockHint', { cost: 5 })}
         </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {houses.map((h) => {
          const name = t(`kundli.house.names.${h.house}`);
          const ordinal = ordinals?.[h.house - 1] ?? `${h.house}`;
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
                  {t('kundli.house.numHouse', { ordinal })}
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
                  {name}
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
                   {h.sign} • {t('kundli.house.houseLord')}: {h.lord}
                 </p>
              )}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
