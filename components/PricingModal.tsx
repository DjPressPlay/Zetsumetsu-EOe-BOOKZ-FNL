
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Crown, Check, Sparkles, ShieldCheck } from 'lucide-react';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  deviceId: string;
}

const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose, deviceId }) => {
  const [loading, setLoading] = React.useState(false);

  const handleCheckout = async (type: 'premium') => {
    try {
      setLoading(true);
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: deviceId, type })
      });
      const { url } = await response.json();
      if (url) window.location.href = url;
    } catch (err) {
      console.error("Stripe Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-xl" 
            onClick={onClose} 
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.92, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 15 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className="relative bg-[#0a0a0e] w-full max-w-xl max-h-[92dvh] rounded-3xl sm:rounded-[2.5rem] shadow-[0_0_80px_rgba(168,85,247,0.25)] border border-purple-500/30 overflow-hidden flex flex-col my-auto z-10"
          >
            {/* Header with Close */}
            <div className="sticky top-0 z-20 px-5 sm:px-8 pt-5 pb-4 bg-[#0a0a0e]/95 backdrop-blur-md border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                  <Crown size={16} className="fill-purple-400" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-white uppercase italic tracking-tight leading-none">
                    PREMIUM <span className="text-purple-400">ARCHIVIST</span>
                  </h2>
                  <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                    Archival Upgrade Protocol
                  </p>
                </div>
              </div>

              <button 
                onClick={onClose} 
                className="p-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-full border border-white/10 transition-colors"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Modal Body */}
            <div className="p-4 sm:p-8 overflow-y-auto space-y-5">
              {/* Premium Plan Card */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl sm:rounded-3xl blur opacity-30 group-hover:opacity-50 transition duration-700"></div>
                <div className="relative bg-black/90 border border-purple-500/40 rounded-2xl sm:rounded-3xl p-5 sm:p-7 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2.5 bg-purple-600/15 rounded-xl border border-purple-500/30">
                      <Crown className="text-purple-400 fill-purple-400" size={22} />
                    </div>
                    <div className="text-right">
                      <div className="flex items-baseline justify-end gap-1">
                        <span className="text-2xl sm:text-3xl font-black text-white">$19.99</span>
                        <span className="text-[10px] font-mono text-purple-400 font-bold">USD</span>
                      </div>
                      <p className="text-[8.5px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-wider">One-time sync</p>
                    </div>
                  </div>

                  <h3 className="text-base sm:text-lg font-black text-white uppercase italic tracking-tight mb-2">
                    MAXIMUM ARCHIVAL CAPACITY
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-300 mb-5 leading-relaxed">
                    Permanent access to the 20-book archival tier with priority ranking deployment.
                  </p>

                  <ul className="space-y-3 mb-6">
                    {[
                      { title: "UPLOAD UP TO 20 BOOKS (4X CAPACITY)", sub: "Quadruple your archival quota permanently" },
                      { title: "PRIORITY FEED VISIBILITY", sub: "Enhanced discoverability across readers" },
                      { title: "VERIFIED ARCHIVIST BADGE", sub: "Instant wallet credential icon upon upgrade" },
                      { title: "7,500 MARQ'S GRANT", sub: "Direct balance injection to boost book ranks" }
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-[9.5px] sm:text-[10.5px] font-bold text-slate-200 uppercase tracking-wider">
                        <Check size={14} className="text-[#00f2c3] shrink-0 mt-0.5" />
                        <div>
                          <span className="text-white font-black">{item.title}</span>
                          {item.sub && (
                            <span className="block text-[8px] sm:text-[8.5px] font-bold text-purple-300 normal-case tracking-normal mt-0.5">
                              ({item.sub})
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>

                  <button 
                    onClick={() => handleCheckout('premium')}
                    disabled={loading}
                    className="w-full py-3.5 sm:py-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black uppercase tracking-[0.18em] rounded-xl sm:rounded-2xl shadow-[0_0_25px_rgba(168,85,247,0.4)] hover:shadow-[0_0_40px_rgba(168,85,247,0.6)] transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-xs sm:text-sm disabled:opacity-50"
                  >
                    <Crown size={15} className="fill-white" />
                    <span>{loading ? "INITIALIZING SECURE SYNC..." : "UPGRADE NOW • $19.99"}</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 text-center flex items-center justify-center gap-2 text-[8px] sm:text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                <ShieldCheck size={13} className="text-emerald-400" />
                <span>SECURE STRIPE CHECKOUT PROTOCOL ACTIVE</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default PricingModal;

