'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Card from './Card';

interface PlanetInsightProps {
  planet: string;
  icon: string;
  sign: string;
  nakshatra?: string;
  subtitle: string;
  description: string;
  defaultExpanded?: boolean;
}

function InsightCard({ planet, icon, sign, nakshatra, subtitle, description, defaultExpanded = false }: PlanetInsightProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="rounded-2xl bg-surface/50 border border-gold/15 overflow-hidden">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between text-left"
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-base">{icon}</span>
            <span className="font-bold text-foreground text-sm">
              {planet} <span className="font-normal text-muted">in {sign} {nakshatra ? `(${nakshatra})` : ''}</span>
            </span>
          </div>
          <span className="text-[11px] text-muted">{subtitle}</span>
        </div>
        <ChevronDown 
          size={16} 
          className={`text-muted transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
      
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 pb-4 overflow-hidden"
          >
            <p className="text-[13px] leading-relaxed text-foreground/90">
              {description}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface KundliInsightsProps {
  ascendant: any;
  sun: any;
  moon: any;
}

export default function KundliInsights({ ascendant, sun, moon }: KundliInsightsProps) {
  const { t } = useTranslation();
  
  if (!ascendant && !sun && !moon) return null;

  return (
    <Card className="p-4 bg-transparent border-none shadow-none px-0">
      <div className="flex items-center gap-4 mb-4">
        <span className="text-gold">✦</span>
        <div className="h-px flex-1 bg-gold/20" />
        <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase text-foreground">
          {t('kundli.whatKundliShows', 'WHAT YOUR KUNDLI SHOWS')}
        </h3>
        <div className="h-px flex-1 bg-gold/20" />
        <span className="text-gold">✦</span>
      </div>

      <div className="space-y-3">
        {sun && (
          <InsightCard 
            planet={t('kundli.sun', 'Sun')}
            icon="☼"
            sign={sun.sign}
            nakshatra={sun.nakshatra}
            subtitle={t('kundli.sunSubtitle', 'Your core nature and life purpose')}
            description={t('kundli.sunDesc', 'You are the kind of person who bursts into a room with undeniable drive and urgency. When faced with challenges, you leap into action without hesitation. Your inner fire is contagious.')}
            defaultExpanded={true}
          />
        )}
        
        {moon && (
          <InsightCard 
            planet={t('kundli.moon', 'Moon')}
            icon="☾"
            sign={moon.sign}
            nakshatra={moon.nakshatra}
            subtitle={t('kundli.moonSubtitle', 'Your emotions, thinking, and inner comfort')}
            description={t('kundli.moonDesc', 'You feel emotions intensely but show a calm surface, creating a quiet fortitude around you. Your inner world is rich, and you seek emotional security through intellectual understanding and deep connections.')}
          />
        )}
        
        {ascendant && (
          <InsightCard 
            planet={t('kundli.ascendant', 'Lagna')}
            icon="↑"
            sign={ascendant.sign || ascendant.ascendantSign}
            nakshatra={ascendant.nakshatra}
            subtitle={t('kundli.ascendantSubtitle', 'How you act and face life daily')}
            description={t('kundli.ascendantDesc', 'People notice your intense presence the moment you enter a space; you do not go unnoticed or blend in easily. Your personal aura is magnetic, drawing people towards your mysteries while keeping them slightly at bay.')}
          />
        )}
      </div>
    </Card>
  );
}
