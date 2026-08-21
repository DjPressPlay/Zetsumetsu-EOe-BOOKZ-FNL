import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import MarqsLogo from './MarqsLogo';

interface EarnEventDetail {
  amount: number;
  usdValue: number;
  action: string;
  label: string;
  details: string;
}

const MarqsToast: React.FC = () => {
  const [toasts, setToasts] = useState<(EarnEventDetail & { id: string })[]>([]);

  useEffect(() => {
    const handleEarned = (e: Event) => {
      const detail = (e as CustomEvent<EarnEventDetail>).detail;
      if (!detail) return;
      const id = Date.now() + Math.random().toString();
      setToasts(prev => [...prev.slice(-3), { ...detail, id }]);

      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 3500);
    };

    window.addEventListener('zetsu-marqs-earned', handleEarned);
    return () => window.removeEventListener('zetsu-marqs-earned', handleEarned);
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-[300] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto bg-[#0a0f16]/95 backdrop-blur-xl border border-amber-400/40 shadow-[0_10px_30px_rgba(255,230,0,0.25)] rounded-2xl px-4 py-3 flex items-center gap-3 text-white max-w-xs"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(255,230,0,0.3)]">
              <MarqsLogo size={16} glow />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-amber-300 font-mono leading-none">
                  +{toast.amount} {toast.amount === 1 ? 'MARQ' : "MARQ'S"}
                </span>
                <span className="text-[8px] font-mono text-emerald-400">
                  (+${toast.usdValue.toFixed(4)})
                </span>
              </div>
              <span className="text-[9px] font-bold text-slate-300 uppercase tracking-tight block truncate mt-0.5">
                {toast.label}: {toast.details}
              </span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default MarqsToast;

