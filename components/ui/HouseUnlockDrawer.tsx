'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Lock, Loader2, MessageCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useHouseInsight } from '@/hooks/useHouseInsight';
import { formatRupees } from '@/lib/format';

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
  onUnlock: (houseNum: number) => Promise<void>;
  balancePaise: number;
  unlockCostPaise: number;
  isUnlocked?: boolean;
}

export default function HouseUnlockDrawer({ isOpen, onClose, house, onUnlock, balancePaise, unlockCostPaise, isUnlocked = false }: HouseUnlockDrawerProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);

  const { state: insightState, data: insight } = useHouseInsight(
    isOpen && isUnlocked && house ? house.house : null,
  );

  if (!house) return null;

  const ordinals = t('kundli.house.ordinals', { returnObjects: true }) as string[];
  const ordinal = ordinals?.[house.house - 1] ?? `${house.house}`;
  const name = t(`kundli.house.names.${house.house}`);
  const hook = t(`kundli.house.hooks.${house.house}`);
  const canAfford = balancePaise >= unlockCostPaise;

  const handleUnlock = async () => {
    setUnlockError(null);
    setUnlocking(true);
    try {
      await onUnlock(house.house);
    } catch {
      setUnlockError(t('kundli.house.notEnoughCredits', { amount: formatRupees(unlockCostPaise) }));
    } finally {
      setUnlocking(false);
    }
  };

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
            className="fixed inset-x-0 bottom-0 z-[100] bg-background border-t border-border rounded-t-[2.5rem] p-6 max-h-[85vh] overflow-y-auto pb-[calc(3rem+var(--sab))]"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold font-bold">
                    {house.house}
                 </div>
                 <div>
                    <h2 className="text-xl font-display text-foreground font-bold">{name}</h2>
                    <p className="text-xs text-muted">{t('kundli.house.of', { name })}</p>
                 </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-muted hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>

            <div className="rounded-2xl border border-gold/20 bg-surface/30 p-5 mb-6">
               <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={16} className="text-gold" />
                  <span className="text-sm font-bold text-foreground">{t('kundli.house.whatYouWillFeel')}</span>
               </div>

               <p className="text-sm text-foreground/90 leading-relaxed font-medium mb-4">
                 {hook}
               </p>

               {isUnlocked ? (
                  <div className="pt-4 border-t border-gold/10">
                     <div className="flex gap-4">
                        <div className="flex-1">
                           <span className="text-[10px] text-muted block mb-1">{t('kundli.house.planetsPresent')}</span>
                           <div className="text-sm font-semibold text-foreground">
                              {house.planets.length > 0 ? house.planets.join(', ') : t('kundli.house.none')}
                           </div>
                        </div>
                        <div>
                           <span className="text-[10px] text-muted block mb-1">{t('kundli.house.houseLord')}</span>
                           <div className="text-sm font-semibold text-gold">
                              {house.lord}
                           </div>
                        </div>
                     </div>

                     {(insightState === 'loading' || insightState === 'generating') && (
                        <div className="mt-4 pt-4 border-t border-gold/10 flex items-center gap-2 text-xs text-muted">
                           <Loader2 size={14} className="animate-spin" />
                           {t('kundli.house.insightsLoading')}
                        </div>
                     )}

                     {(insightState === 'forbidden' || insightState === 'error') && (
                        <div className="mt-4 pt-4 border-t border-gold/10 flex items-center gap-2 text-xs text-red-400">
                           <AlertTriangle size={14} />
                           {t('kundli.house.insightsUnavailable')}
                        </div>
                     )}

                     {insightState === 'ready' && insight?.status === 'ready' && (
                        <div className="mt-4 pt-4 border-t border-gold/10">
                           <span className="text-[10px] text-muted block mb-2">{t('kundli.house.insightsTitle')}</span>
                           <p className="text-sm text-foreground/90 leading-relaxed mb-3">{insight.text}</p>

                           {insight.strengths.length > 0 && (
                              <div className="mb-2 space-y-1">
                                 {insight.strengths.map((s, i) => (
                                    <div key={i} className="flex items-start gap-1.5 text-xs text-emerald-300">
                                       <CheckCircle2 size={13} className="mt-0.5 shrink-0" />
                                       <span>{s}</span>
                                    </div>
                                 ))}
                              </div>
                           )}

                           {insight.weaknesses.length > 0 && (
                              <div className="space-y-1">
                                 {insight.weaknesses.map((w, i) => (
                                    <div key={i} className="flex items-start gap-1.5 text-xs text-amber-300">
                                       <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                                       <span>{w}</span>
                                    </div>
                                 ))}
                              </div>
                           )}
                        </div>
                     )}

                     <button
                        onClick={() => router.push('/ai-chat')}
                        className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-gold/30 bg-gold/5 text-gold text-sm font-semibold transition-all active:scale-[0.98] hover:bg-gold/10"
                     >
                        <MessageCircle size={16} />
                        {t('kundli.house.askAstrologer')}
                     </button>
                  </div>
               ) : (
                 <div className="relative min-h-[190px] rounded-xl overflow-hidden">
                    <p
                      aria-hidden
                      className="text-[11px] leading-relaxed text-foreground/50 blur-[3px] select-none"
                    >
                      {t('kundli.house.teaser')}
                    </p>
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-transparent via-surface/60 to-surface/95">
                       <div className="flex flex-col items-center p-4 bg-background/90 rounded-2xl border border-gold/20 mx-2 max-w-[260px]">
                          <Lock size={28} className="text-gold mb-2" />
                          <h3 className="text-base font-bold text-foreground mb-1 text-center">
                            {t('kundli.house.unlockTitle', { ordinal })}
                          </h3>
                          <p className="text-xs text-muted mb-3 text-center">
                            {t('kundli.house.unlockBody', { cost: formatRupees(unlockCostPaise) })}
                          </p>
                          {unlockError && (
                            <p className="text-xs text-red-400 mb-2 text-center">{unlockError}</p>
                          )}
                          {canAfford ? (
                            <button
                              onClick={handleUnlock}
                              disabled={unlocking}
                              className="w-full flex items-center justify-center gap-2 py-2.5 px-6 bg-gold text-[#1a0e00] rounded-xl font-bold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {unlocking ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                t('kundli.house.unlockButton', { cost: formatRupees(unlockCostPaise) })
                              )}
                            </button>
                          ) : (
                            <div className="w-full">
                              <p className="text-xs text-red-400 mb-2 text-center">
                                {t('kundli.house.notEnoughCredits', { amount: formatRupees(unlockCostPaise) })}
                              </p>
                              <button
                                onClick={() => router.push('/payment')}
                                className="w-full flex items-center justify-center gap-2 py-2.5 px-6 bg-gold text-[#1a0e00] rounded-xl font-bold transition-all active:scale-[0.98]"
                              >
                                {t('payment.buyCredits')}
                              </button>
                            </div>
                          )}
                       </div>
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
