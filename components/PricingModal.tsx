
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Crown, Zap, Check, Sparkles } from 'lucide-react';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  deviceId: string;
}

const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose, deviceId }) => {
  const handleCheckout = async (type: 'premium') => {
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: deviceId, type })
      });
      const { url } = await response.json();
      if (url) window.location.href = url;
    } catch (err) {
      console.error("Stripe Error:", err);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 backdrop-blur-xl" 
            onClick={onClose} 
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-[#0a0a0a] w-full max-w-4xl rounded-[2.5rem] shadow-[0_0_100px_rgba(0,194,255,0.1)] border border-white/10 overflow-hidden"
          >
            <div className="absolute top-6 right-6 z-10">
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-500 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-8 md:p-12">
              <div className="text-center mb-12">
                <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter mb-2">PRICES</h2>
                <div className="h-1 w-24 bg-[#00c2ff] mx-auto mb-4" />
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">Select your archival upgrade protocol</p>
              </div>

              <div className="flex justify-center">
                {/* Premium Plan */}
                <div className="relative group max-w-md w-full">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-[2rem] blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                  <div className="relative bg-black border border-white/10 rounded-[2rem] p-8 h-full flex flex-col">
                    <div className="flex justify-between items-start mb-6">
                      <div className="p-3 bg-purple-600/10 rounded-2xl border border-purple-600/20">
                        <Crown className="text-purple-500" size={24} />
                      </div>
                      <div className="text-right">
                        <span className="text-3xl font-black text-white">$19.99</span>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">One-time sync</p>
                      </div>
                    </div>

                    <h3 className="text-xl font-black text-white uppercase italic mb-4">PREMIUM ARCHIVIST</h3>
                    <p className="text-xs text-slate-400 mb-8 leading-relaxed">
                      Expanded archival capacity. Unlock up to 20 book slots for your account.
                    </p>

                    <ul className="space-y-4 mb-10 flex-1">
                      {[
                        "UPLOAD UP TO 20 BOOKS (4X CAPACITY)",
                        "FEATURED IN THE FEED",
                        "PRIORITY SUPPORT",
                        "VERIFIED ARCHIVIST BADGE",
                        "EARLY ACCESS TO NEW FEATURES"
                      ].map((feature, i) => (
                        <li key={i} className="flex items-center gap-3 text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                          <Check size={14} className="text-purple-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <button 
                      onClick={() => handleCheckout('premium')}
                      className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-lg hover:shadow-purple-500/20 transition-all active:scale-[0.98]"
                    >
                      UPGRADE NOW
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-12 text-center">
                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.4em] flex items-center justify-center gap-2">
                  <Sparkles size={10} /> SECURE STRIPE GATEWAY ACTIVE <Sparkles size={10} />
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default PricingModal;
