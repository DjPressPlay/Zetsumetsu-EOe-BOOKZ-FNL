
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Check, Sparkles, Mail, Trophy, Zap, Star, Award, TrendingUp, BookOpen, ArrowRight, Instagram, Linkedin, Facebook, Globe } from 'lucide-react';
import { subscribeToNewsletter } from '../services/db';

const PROMO_BADGES = [
  { icon: Zap, label: "BOOST BADGE", color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/20" },
  { icon: Star, label: "ELITE BADGE", color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/20" },
  { icon: Award, label: "LEGACY BADGE", color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
  { icon: Trophy, label: "ALPHA BADGE", color: "text-[#00c2ff]", bg: "bg-[#00c2ff]/10", border: "border-[#00c2ff]/20" },
];

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
    <section className="max-w-[1600px] mx-auto px-6 py-24">
      <div className="relative group">
        {/* The "Open Book" Container */}
        <div className="relative grid grid-cols-1 lg:grid-cols-2 min-h-[600px] bg-[#0a0a0a] border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl">
          
          {/* Central Spine/Fold */}
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/5 hidden lg:block z-20 shadow-[0_0_20px_rgba(255,255,255,0.05)]" />
          
          {/* Left Page: Instructions */}
          <div className="relative p-8 md:p-16 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-white/5 bg-gradient-to-br from-[#0d0d0d] to-[#0a0a0a]">
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00c2ff]/10 border border-[#00c2ff]/20 mb-8">
                <Sparkles size={14} className="text-[#00c2ff]" />
                <span className="text-[10px] font-black text-[#00c2ff] uppercase tracking-[0.3em]">Newsletter Promo</span>
              </div>

              <h2 className="text-3xl md:text-5xl font-black text-white uppercase italic tracking-tighter mb-8 leading-none">
                Newsletter <span className="text-[#00c2ff]">Promo</span>
              </h2>

              <div className="space-y-6 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-1 bg-[#00c2ff] rounded-full" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Promotion Protocol</span>
                </div>
                <p className="text-sm md:text-base text-slate-300 font-bold uppercase tracking-wider leading-relaxed">
                  You wrote a book. You have something to share. A new idea surfaced... <br />
                  <span className="text-white">Now you need people to see it.</span>
                </p>
                
                <p className="text-xs md:text-sm text-slate-400 font-medium uppercase tracking-widest leading-relaxed">
                  The Archive runs a promo network across 6 platforms. The Promotion Protocol is how you get your book in front of that audience — for free, just by showing up.
                </p>

                <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                  <h3 className="text-[10px] font-black text-[#00c2ff] uppercase tracking-[0.3em]">How it works</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <div className="mt-1 w-1 h-1 bg-[#00c2ff] rounded-full shrink-0" />
                      <p className="text-[11px] text-slate-300 font-bold uppercase tracking-widest leading-relaxed">
                        Every so often a post goes out across the network with a badge hidden inside it.
                      </p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="mt-1 w-1 h-1 bg-[#00c2ff] rounded-full shrink-0" />
                      <p className="text-[11px] text-slate-300 font-bold uppercase tracking-widest leading-relaxed">
                        Catch it while it's live and it's yours.
                      </p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="mt-1 w-1 h-1 bg-[#00c2ff] rounded-full shrink-0" />
                      <p className="text-[11px] text-slate-300 font-bold uppercase tracking-widest leading-relaxed">
                        Turn it in and your book gets posted across the whole network the same day.
                      </p>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Right Page: The Long Game & Signup */}
          <div className="relative p-8 md:p-16 flex flex-col justify-center bg-gradient-to-bl from-[#0a0a0a] to-[#0d0d0d]">
            <div className="relative z-10 space-y-10">
              <div className="space-y-4 text-left">
                <h3 className="text-xl md:text-2xl font-black text-white uppercase italic tracking-tighter">
                  The <span className="text-[#00c2ff]">Longer Game</span>
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <div className="mt-1.5 w-1 h-1 bg-[#00c2ff] rounded-full shrink-0" />
                    <p className="text-xs md:text-sm text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                      Collect all 4 badge types and instead of one post you get a 2 day run.
                    </p>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-1.5 w-1 h-1 bg-[#00c2ff] rounded-full shrink-0" />
                    <p className="text-xs md:text-sm text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                      Your book goes out for two days across every platform. <span className="text-white">That's the move.</span>
                    </p>
                  </li>
                </ul>
                <div className="flex gap-4 text-[9px] font-black text-[#00c2ff] uppercase tracking-widest">
                  <span>No paid ads</span>
                  <span className="text-slate-700">/</span>
                  <span>No pitching</span>
                </div>
              </div>

              {/* Badges Row */}
              <div className="flex flex-wrap gap-2 justify-start">
                {PROMO_BADGES.map((badge, i) => (
                  <div key={i} className={`px-3 py-2 rounded-xl ${badge.bg} border ${badge.border} flex items-center gap-2`}>
                    <badge.icon size={12} className={badge.color} />
                    <span className={`text-[8px] font-black uppercase tracking-widest ${badge.color}`}>{badge.label}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-6">
                <div className="text-left">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">
                    It works simple. Follow to start earning. <br />
                    <span className="text-white">Just follow the Zetsu network, stay sharp, catch the drops.</span>
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="relative w-full">
                  <div className="relative group">
                    <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#00c2ff] transition-colors" size={20} />
                    <input 
                      type="email" 
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="SYNC YOUR NEURAL_ID@EMAIL.COM" 
                      className="w-full bg-black border border-white/10 rounded-2xl py-5 pl-16 pr-32 text-xs font-bold text-white focus:outline-none focus:border-[#00c2ff]/50 transition-all uppercase tracking-widest placeholder:text-slate-800"
                    />
                    <button 
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

                <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-6">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-[#00c2ff]" />
                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Network Status: Active</span>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    {/* Social Icons */}
                    <div className="flex items-center gap-4 border-r border-white/10 pr-6">
                      <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest mr-2">Follow:</span>
                      <a 
                        href="https://www.instagram.com/artworqq/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-slate-500 hover:text-[#00c2ff] transition-colors" 
                        title="Instagram"
                      >
                        <Instagram size={16} />
                      </a>
                      <a 
                        href="https://www.linkedin.com/in/artworqq-kevin-suber-31547573/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-slate-500 hover:text-[#00c2ff] transition-colors" 
                        title="LinkedIn"
                      >
                        <Linkedin size={16} />
                      </a>
                      <a 
                        href="https://www.facebook.com/people/Zetsuedu/61584374975193/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-slate-500 hover:text-[#00c2ff] transition-colors" 
                        title="Facebook"
                      >
                        <Facebook size={16} />
                      </a>
                      <a 
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
                      onClick={() => window.open('https://www.skool.com/zetsuedu-7521/about', '_blank')}
                      className="text-[9px] font-black text-[#00c2ff] hover:underline uppercase tracking-widest whitespace-nowrap"
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
