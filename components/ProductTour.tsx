'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProductTourProps {
  onComplete: () => void;
}

const TOUR_STEPS = [
  {
    title: 'Your Kundli is Being Prepared',
    description: 'We\'re computing your birth chart using precise Vedic ephemeris data.',
    icon: '🌙',
  },
  {
    title: 'Divisional Charts Loading',
    description: 'All 24 divisional charts (D1 to D108) reveal different life dimensions.',
    icon: '✦',
  },
  {
    title: 'Dasha Timeline Computing',
    description: 'Your Vimshottari dasha periods show planetary influences across your life.',
    icon: '⏳',
  },
  {
    title: 'Your Reading is Ready!',
    description: 'Explore your personalized Vedic astrology insights.',
    icon: '✨',
  },
];

export default function ProductTour({ onComplete }: ProductTourProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step >= TOUR_STEPS.length - 1) {
      const t = setTimeout(onComplete, 2000);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStep((s) => s + 1), 3000);
    return () => clearTimeout(t);
  }, [step, onComplete]);

  const current = TOUR_STEPS[step];

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
          className="text-center px-8 max-w-sm"
        >
          <span className="text-4xl block mb-4">{current.icon}</span>
          <h2 className="text-lg font-semibold text-text mb-2">{current.title}</h2>
          <p className="text-sm text-text-secondary leading-relaxed">{current.description}</p>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mt-6">
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? 'w-6 bg-primary' : 'w-1.5 bg-primary/20'
                }`}
              />
            ))}
          </div>

          {step < TOUR_STEPS.length - 1 && (
            <button
              onClick={() => setStep(TOUR_STEPS.length - 1)}
              className="mt-6 text-[10px] text-primary/60 uppercase tracking-widest hover:text-primary transition-colors"
            >
              Skip Tour
            </button>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
