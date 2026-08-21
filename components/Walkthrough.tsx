import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ArrowRight, 
  ArrowLeft, 
  BookOpen, 
  Search, 
  Lock, 
  ShieldCheck, 
  Flame, 
  Sparkles,
  User,
  CheckCircle2
} from 'lucide-react';
import MarqsLogo from './MarqsLogo';
import { getUserProfile, setWalletPassword, getClientIp } from '../services/userProfile';

const Walkthrough: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);

  // Form state for Step 2 (Claim Author & Password)
  const [authorNameInput, setAuthorNameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingWallet, setIsSavingWallet] = useState(false);
  const [walletSaved, setWalletSaved] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  useEffect(() => {
    const hasSeen = localStorage.getItem('zetsu_walkthrough_complete');
    if (!hasSeen) {
      const profile = getUserProfile();
      if (profile.authorName && profile.authorName !== 'Anonymous Archivist') {
        setAuthorNameInput(profile.authorName);
      }
      setWalletSaved(!!profile.hasPassword);
      setTimeout(() => setIsVisible(true), 1200);
    }
  }, []);

  const steps = [
    {
      id: 'welcome',
      title: "WELCOME TO ZETSU EOE BOOKZ",
      subtitle: "The Next-Gen Interactive Archival Ecosystem",
      description: "Zetsu EOE Bookz transforms static manuscripts into living interactive archives. Read page-by-page, discover rare works, and push creative momentum across the collective shelf.",
      target: "body",
      renderBadge: () => (
        <div className="w-12 h-12 rounded-2xl bg-[#00c2ff]/10 border border-[#00c2ff]/30 flex items-center justify-center text-[#00c2ff] shadow-[0_0_20px_rgba(0,194,255,0.2)]">
          <BookOpen size={24} />
        </div>
      )
    },
    {
      id: 'marqs_intro',
      title: "MARQ'S REWARDS & ECONOMY",
      subtitle: "The Native Archival Engagement Engine",
      description: "Earn Marq's by reading pages (+0.25 M), uploading manuscripts (+10 M), and engaging with the community. Accumulate your balance to redeem print-on-demand books or boost your published works in the feed.",
      target: "body",
      renderBadge: () => (
        <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center shadow-[0_0_20px_rgba(255,230,0,0.25)]">
          <MarqsLogo size={24} glow />
        </div>
      )
    },
    {
      id: 'wallet_setup',
      title: "CLAIM AUTHOR IDENTITY & SECURE WALLET",
      subtitle: "Cloud Sync with Supabase & Password Protection",
      description: "Set your Author handle and secure your Marq's wallet with a private password. Your balance and published works are securely tied to your profile in the cloud database.",
      target: "body",
      renderBadge: () => (
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-purple-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-[0_0_20px_rgba(255,230,0,0.2)]">
          <Lock size={22} />
        </div>
      )
    },
    {
      id: 'archives',
      title: "EXPLORE & PRINT ON DEMAND",
      subtitle: "Global Archival Grid & Stripe Checkout",
      description: "Search archives by genre or author, test interactive reading views, and order archival physical copies anytime with direct Stripe Checkout or Marq's redemption.",
      target: "#global-shelf",
      renderBadge: () => (
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
          <Sparkles size={24} />
        </div>
      )
    }
  ];

  useEffect(() => {
    if (isVisible) {
      const targetSelector = steps[currentStep]?.target;
      if (!targetSelector || targetSelector === "body") {
        setRect(null);
        return;
      }
      const el = document.querySelector(targetSelector);
      if (el) {
        setRect(el.getBoundingClientRect());
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        setRect(null);
      }
    }
  }, [currentStep, isVisible]);

  const handleSaveWalletInIntro = async (e: React.FormEvent) => {
    e.preventDefault();
    setWalletError(null);

    if (!passwordInput.trim()) {
      setWalletError('Please enter a secure wallet password.');
      return;
    }
    if (passwordInput.length < 4) {
      setWalletError('Password must be at least 4 characters.');
      return;
    }
    if (passwordInput !== confirmPassword) {
      setWalletError('Passwords do not match.');
      return;
    }

    setIsSavingWallet(true);
    try {
      await setWalletPassword(passwordInput, authorNameInput.trim() || 'Archivist');
      setWalletSaved(true);
    } catch (err: any) {
      setWalletError(err?.message || 'Failed to initialize wallet profile.');
    } finally {
      setIsSavingWallet(false);
    }
  };

  const next = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      finish();
    }
  };

  const prev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const finish = () => {
    setIsVisible(false);
    localStorage.setItem('zetsu_walkthrough_complete', 'true');
  };

  if (!isVisible) return null;

  const activeStep = steps[currentStep];

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 pointer-events-none">
      <div className="absolute inset-0 bg-black/85 backdrop-blur-[4px] pointer-events-auto" onClick={finish} />
      
      {rect && (
        <div 
          className="absolute border-2 border-amber-400/70 rounded-3xl shadow-[0_0_50px_rgba(255,230,0,0.3)] transition-all duration-500 pointer-events-none z-10"
          style={{ top: rect.top - 8, left: rect.left - 8, width: rect.width + 16, height: rect.height + 16 }}
        />
      )}

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className={`relative w-full max-w-lg bg-[#0a0f16] border border-amber-500/30 rounded-[2.5rem] p-6 sm:p-8 pointer-events-auto z-20 shadow-[0_25px_100px_rgba(0,0,0,0.9),0_0_50px_rgba(255,230,0,0.15)] ${rect ? 'md:ml-[25vw]' : ''}`}
      >
        {/* Header Badge & Close */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            {activeStep.renderBadge()}
            <div>
              <span className="text-[8px] font-black uppercase tracking-[0.3em] text-amber-400 block">
                STEP {currentStep + 1} OF {steps.length}
              </span>
              <span className="text-[10px] font-mono text-slate-400 uppercase">
                Zetsu EOE Onboarding
              </span>
            </div>
          </div>

          <button 
            onClick={finish} 
            className="p-2 text-slate-500 hover:text-white rounded-full hover:bg-white/5 transition-colors"
            title="Skip Intro"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-3 mb-6">
          <h3 className="text-xl sm:text-2xl font-black italic text-white uppercase tracking-tight">
            {activeStep.title}
          </h3>
          <p className="text-[10px] font-black text-amber-300 uppercase tracking-widest">
            {activeStep.subtitle}
          </p>
          <p className="text-xs text-slate-300 leading-relaxed pt-1">
            {activeStep.description}
          </p>
        </div>

        {/* Step 2 Special: Interactive Author & Password Form */}
        {activeStep.id === 'wallet_setup' && (
          <div className="my-5 p-4 sm:p-5 rounded-2xl bg-black/60 border border-amber-400/25 space-y-4">
            {walletSaved ? (
              <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300">
                <CheckCircle2 size={20} className="shrink-0" />
                <div>
                  <p className="text-xs font-black uppercase">Wallet Profile Protected!</p>
                  <p className="text-[10px] text-slate-400">
                    Author: <span className="text-white font-bold">{authorNameInput || 'Archivist'}</span> — 50 Marq's Starter Allocation Synced.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveWalletInIntro} className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <User size={12} /> Claim Author & Wallet Password
                  </span>
                  <span className="text-[8px] font-mono text-emerald-400">+50 Marq's Bonus</span>
                </div>

                <input 
                  type="text"
                  placeholder="Author Alias / Pen Name (e.g. Master Archivist)"
                  value={authorNameInput}
                  onChange={e => setAuthorNameInput(e.target.value)}
                  className="w-full bg-[#12161f] border border-white/10 px-3.5 py-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400/60 font-medium placeholder:text-slate-600"
                />

                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="password"
                    placeholder="Wallet Password"
                    value={passwordInput}
                    onChange={e => setPasswordInput(e.target.value)}
                    className="w-full bg-[#12161f] border border-white/10 px-3.5 py-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400/60 font-medium placeholder:text-slate-600"
                  />
                  <input 
                    type="password"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#12161f] border border-white/10 px-3.5 py-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400/60 font-medium placeholder:text-slate-600"
                  />
                </div>

                {walletError && (
                  <p className="text-[10px] text-red-400 font-bold">{walletError}</p>
                )}

                <button 
                  type="submit"
                  disabled={isSavingWallet}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(255,230,0,0.2)]"
                >
                  {isSavingWallet ? 'Encrypting & Syncing...' : 'Protect Wallet & Sync (+50 Marq’s)'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Footer Navigation */}
        <div className="flex items-center justify-between pt-6 border-t border-white/10">
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <div 
                key={i} 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentStep ? 'w-6 bg-gradient-to-r from-amber-400 to-yellow-400' : 'w-2 bg-white/10'
                }`} 
              />
            ))}
          </div>

          <div className="flex gap-2">
            {currentStep > 0 && (
              <button 
                onClick={prev} 
                className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all"
                title="Previous"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            
            <button 
              onClick={next} 
              className="px-6 py-3 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-black rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(255,230,0,0.25)] active:scale-95"
            >
              {currentStep === steps.length - 1 ? 'Start Archiving' : 'Continue'}
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Walkthrough;
