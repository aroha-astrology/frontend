'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface HouseData {
  house: number;
  sign: string;
  signIndex: number;
  lord: string;
  planets: string[];
}

interface HouseUnlockDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  house: HouseData | null;
  onUnlock: (houseNum: number) => void;
  credits: number;
  unlockCost: number;
  isUnlocked?: boolean;
}

const HOUSE_MEANINGS: Record<number, { title: string; hook: string }> = {
  1:  { title: 'Self',        hook: 'Discover your core personality and how the world sees you.' },
  2:  { title: 'Wealth',      hook: 'Uncover the secrets of your financial luck and family bonds.' },
  3:  { title: 'Courage',     hook: 'Learn about your innate courage, skills, and communication style.' },
  4:  { title: 'Home',        hook: 'Know what brings emotional peace, property luck, and motherly bond. The 4th house governs comfort and roots.' },
  5:  { title: 'Children',    hook: 'Explore your creative potential, romance, and past-life karma.' },
  6:  { title: 'Enemies',     hook: 'Understand how you handle conflicts, debts, and your daily service.' },
  7:  { title: 'Marriage',    hook: 'Reveal the dynamics of your partnerships and marital harmony.' },
  8:  { title: 'Longevity',   hook: 'Dive into life\'s mysteries, transformations, and hidden wealth.' },
  9:  { title: 'Fortune',     hook: 'Find out about your luck, dharma, and higher learning journey.' },
  10: { title: 'Career',      hook: 'Unlock the potential of your professional life and public status.' },
  11: { title: 'Gains',       hook: 'See your path to fulfilling desires and gaining from your networks.' },
  12: { title: 'Liberation',  hook: 'Discover your subconscious mind, spirituality, and foreign travels.' },
};

export default function HouseUnlockDrawer({ isOpen, onClose, house, onUnlock, credits, unlockCost, isUnlocked = false }: HouseUnlockDrawerProps) {
  const { t } = useTranslation();

  if (!house) return null;

  const meaning = HOUSE_MEANINGS[house.house];
  const canAfford = credits >= unlockCost;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 z-[100] bg-background border-t border-border rounded-t-[2.5rem] p-6 max-h-[85vh] overflow-y-auto pb-12"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold font-bold">
                    {house.house}
                 </div>
                 <div>
                    <h2 className="text-xl font-display text-foreground font-bold">{meaning?.title || 'House'}</h2>
                    <p className="text-xs text-muted">House of {meaning?.title}</p>
                 </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-muted hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>

            <div className="relative rounded-2xl border border-gold/20 bg-surface/30 p-5 mb-6 overflow-hidden">
               <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={16} className="text-gold" />
                  <span className="text-sm font-bold text-foreground">What you will feel</span>
               </div>
               
               <p className="text-sm text-foreground/90 leading-relaxed relative z-10 font-medium">
                 {meaning?.hook}
               </p>

               <div className={`absolute top-24 inset-x-0 pointer-events-none text-[10px] text-justify leading-relaxed px-4 transition-all duration-700 ${isUnlocked ? 'text-foreground blur-none opacity-100 relative top-0 mt-4 pointer-events-auto' : 'opacity-10 text-gold/30 blur-[2px]'}`}>
                  Astrological analysis indicates that the planetary alignments in this house exert a profound influence on your current dasha sequence. The conjunction of significant celestial bodies creates a unique energetic signature, manifesting as both challenges and hidden opportunities in this domain of life. When the lord of this house transits through favorable nakshatras, you can expect sudden shifts in perspective. Furthermore, the aspect from benefic planets mitigates potential malefic effects, offering a protective shield. Deeply examining the degrees of these placements reveals timing for important life events, specifically surrounding periods of personal transformation and material gains. Your karma uniquely unfolds here, dictating the lessons required for spiritual evolution and worldly success.
               </div>

               {isUnlocked && (
                  <div className="mt-6 pt-4 border-t border-gold/10">
                     <div className="flex gap-4">
                        <div className="flex-1">
                           <span className="text-[10px] text-muted block mb-1">Planets Present</span>
                           <div className="text-sm font-semibold text-foreground">
                              {house.planets.length > 0 ? house.planets.join(', ') : 'None'}
                           </div>
                        </div>
                        <div>
                           <span className="text-[10px] text-muted block mb-1">House Lord</span>
                           <div className="text-sm font-semibold text-gold">
                              {house.lord}
                           </div>
                        </div>
                     </div>
                  </div>
               )}

               {!isUnlocked && (
                 <div className="mt-8 flex justify-center pb-4 relative z-10">
                    <div className="flex flex-col items-center p-4 bg-background/80 backdrop-blur-md rounded-2xl border border-gold/10">
                       <Lock size={32} className="text-gold mb-3" />
                       <h3 className="text-lg font-bold text-foreground mb-1">Unlock {house.house}{house.house === 1 ? 'st' : house.house === 2 ? 'nd' : house.house === 3 ? 'rd' : 'th'} House</h3>
                       <p className="text-xs text-muted mb-4 text-center max-w-[200px]">
                         Spend {unlockCost} credits to reveal the deep astrological secrets hidden in this house.
                       </p>
                       <button
                         onClick={() => onUnlock(house.house)}
                         disabled={!canAfford}
                         className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-gold text-[#1a0e00] rounded-xl font-bold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                       >
                         {canAfford ? `Unlock for ${unlockCost} Credits` : 'Not enough credits'}
                       </button>
                    </div>
                 </div>
               )}

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
