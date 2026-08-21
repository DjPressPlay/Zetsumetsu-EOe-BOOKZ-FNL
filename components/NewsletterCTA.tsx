
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Check, Sparkles, Mail, Coins, TrendingUp, Instagram, Linkedin, Facebook, Globe, DollarSign, Rocket, ArrowRight } from 'lucide-react';
import { subscribeToNewsletter } from '../services/db';

const NewsletterCTA: React.FC = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || status === 'loading') return;

    setStatus('loading');
    try {
      await subscribeToNewsletter(email);
      setStatus('success');
      setEmail('');
      setTimeout(() => setStatus('idle'), 5000);
    } catch (err) {
      console.error(err);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <section id="newsletter-promo-section" className="max-w-[1600px] mx-auto px-6 py-24">
      <div className="relative group">
        {/* The "Open Book" Container */}
        <div className="relative grid grid-cols-1 lg:grid-cols-2 min-h-[600px] bg-[#0a0a0a] border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl">
          
          {/* Central Spine/Fold */}
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/5 hidden lg:block z-20 shadow-[0_0_20px_rgba(255,255,255,0.05)]" />
          
          {/* Left Page: Proposition & Context */}
          <div className="relative p-8 md:p-16 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-white/5 bg-gradient-to-br from-[#0d0d0d] to-[#0a0a0a]">
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00c2ff]/10 border border-[#00c2ff]/20 mb-8">
                <Sparkles size={14} className="text-[#00c2ff]" />
                <span className="text-[10px] font-black text-[#00c2ff] uppercase tracking-[0.3em]">Newsletter Promo</span>
              </div>

              <h2 className="text-3xl md:text-5xl font-black text-white uppercase italic tracking-tighter mb-4 leading-none">
                Marqs <span className="text-[#00c2ff]">Membership</span>
              </h2>

              <div className="space-y-6 text-left">
                <p className="text-base md:text-lg text-slate-200 font-bold tracking-tight leading-relaxed">
                  You wrote a book. You have something to share. A new idea surfaced...
                </p>

                <p className="text-sm md:text-base text-[#00c2ff] font-bold leading-relaxed">
                  Now you need people to see it — and we pay you to stick around.
                </p>
                
                <p className="text-xs md:text-sm text-slate-400 font-medium leading-relaxed">
                  The Archive runs a promo network across 6 platforms. Sign up and get $3 the moment you join, then $1 every month just for staying on the list — paid in Marqs, the app's currency.
                </p>

                <div className="p-6 bg-white/[0.03] rounded-2xl border border-white/5 space-y-3 mt-4">
                  <div className="flex items-center gap-2">
                    <Coins size={16} className="text-amber-400" />
                    <span className="text-[11px] font-black text-amber-400 uppercase tracking-widest">In-App Currency Rewards</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Earn Marqs passively and convert your readership rewards into direct book promotion across our entire reader ecosystem.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Page: How it works & Signup */}
          <div className="relative p-8 md:p-16 flex flex-col justify-center bg-gradient-to-bl from-[#0a0a0a] to-[#0d0d0d]">
            <div className="relative z-10 space-y-8">
              
              {/* How it works */}
              <div className="space-y-4 text-left">
                <h3 className="text-xl md:text-2xl font-black text-white uppercase italic tracking-tighter">
                  How <span className="text-[#00c2ff]">it works</span>
                </h3>

                <div className="space-y-3">
                  <div className="p-3.5 bg-white/5 rounded-xl border border-white/5 flex items-start gap-3.5">
                    <div className="w-6 h-6 rounded-lg bg-[#00c2ff]/10 text-[#00c2ff] font-black text-xs flex items-center justify-center shrink-0 border border-[#00c2ff]/20">
                      1
                    </div>
                    <p className="text-xs md:text-sm text-slate-300 font-semibold leading-snug pt-0.5">
                      Sign up with your email
                    </p>
                  </div>

                  <div className="p-3.5 bg-white/5 rounded-xl border border-white/5 flex items-start gap-3.5">
                    <div className="w-6 h-6 rounded-lg bg-amber-400/10 text-amber-400 font-black text-xs flex items-center justify-center shrink-0 border border-amber-400/20">
                      2
                    </div>
                    <p className="text-xs md:text-sm text-slate-300 font-semibold leading-snug pt-0.5">
                      Get <span className="text-amber-400 font-bold">$3 in Marqs</span> the moment you join
                    </p>
                  </div>

                  <div className="p-3.5 bg-white/5 rounded-xl border border-white/5 flex items-start gap-3.5">
                    <div className="w-6 h-6 rounded-lg bg-emerald-400/10 text-emerald-400 font-black text-xs flex items-center justify-center shrink-0 border border-emerald-400/20">
                      3
                    </div>
                    <p className="text-xs md:text-sm text-slate-300 font-semibold leading-snug pt-0.5">
                      Get <span className="text-emerald-400 font-bold">$1 in Marqs</span> automatically every month after that
                    </p>
                  </div>

                  <div className="p-3.5 bg-white/5 rounded-xl border border-white/5 flex items-start gap-3.5">
                    <div className="w-6 h-6 rounded-lg bg-purple-400/10 text-purple-400 font-black text-xs flex items-center justify-center shrink-0 border border-purple-400/20">
                      4
                    </div>
                    <p className="text-xs md:text-sm text-slate-300 font-semibold leading-snug pt-0.5">
                      Use your Marqs to boost your book, push it up the category feed, or spend them anywhere in the app economy
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div className="text-left">
                  <p className="text-xs md:text-sm font-bold text-white tracking-wide">
                    Just sign up and start earning.
                  </p>
                </div>

                <form id="newsletter-form" onSubmit={handleSubmit} className="relative w-full">
                  <div className="relative group">
                    <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#00c2ff] transition-colors" size={20} />
                    <input 
                      id="newsletter-email-input"
                      type="email" 
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ENTER YOUR EMAIL" 
                      className="w-full bg-black border border-white/10 rounded-2xl py-5 pl-16 pr-32 text-xs font-bold text-white focus:outline-none focus:border-[#00c2ff]/50 transition-all uppercase tracking-widest placeholder:text-slate-700"
                    />
                    <button 
                      id="newsletter-sync-btn"
                      type="submit"
                      disabled={status === 'loading' || status === 'success'}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-3 bg-[#00c2ff] text-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      {status === 'loading' ? (
                        <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                      ) : status === 'success' ? (
                        <Check size={14} />
                      ) : (
                        <>
                          <Send size={14} />
                          <span>Sync</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>

                <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-[#00c2ff]" />
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Network Status: Active</span>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    {/* Social Icons */}
                    <div className="flex items-center gap-4 border-r border-white/10 pr-6">
                      <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mr-1">Follow:</span>
                      <a 
                        id="newsletter-social-instagram"
                        href="https://www.instagram.com/artworqq/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-slate-500 hover:text-[#00c2ff] transition-colors" 
                        title="Instagram"
                      >
                        <Instagram size={16} />
                      </a>
                      <a 
                        id="newsletter-social-linkedin"
                        href="https://www.linkedin.com/in/artworqq-kevin-suber-31547573/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-slate-500 hover:text-[#00c2ff] transition-colors" 
                        title="LinkedIn"
                      >
                        <Linkedin size={16} />
                      </a>
                      <a 
                        id="newsletter-social-facebook"
                        href="https://www.facebook.com/people/Zetsuedu/61584374975193/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-slate-500 hover:text-[#00c2ff] transition-colors" 
                        title="Facebook"
                      >
                        <Facebook size={16} />
                      </a>
                      <a 
                        id="newsletter-social-google"
                        href="https://share.google/Gf0nbD7yyZlAdd3xF" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-slate-500 hover:text-[#00c2ff] transition-colors" 
                        title="Google"
                      >
                        <Globe size={16} />
                      </a>
                    </div>

                    <button 
                      id="newsletter-join-zetsuedu-btn"
                      onClick={() => window.open('https://www.skool.com/zetsuedu-7521/about', '_blank')}
                      className="text-[9px] font-black text-[#00c2ff] hover:underline uppercase tracking-widest whitespace-nowrap flex items-center gap-1"
                    >
                      Join Zetsu EDU →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative Book Shadow/Depth */}
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[95%] h-8 bg-white/5 blur-2xl rounded-full -z-10" />
      </div>
    </section>
  );
};

export default NewsletterCTA;
