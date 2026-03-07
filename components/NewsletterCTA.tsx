
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Check, Sparkles, Mail } from 'lucide-react';
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
    <section className="max-w-[1600px] mx-auto px-6 py-24">
      <div className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-[#0a0a0a] to-black border border-white/10 p-8 md:p-16 text-center">
        {/* Decorative elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none opacity-20">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#00c2ff] rounded-full blur-[120px] -translate-y-1/2" />
        </div>

        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00c2ff]/10 border border-[#00c2ff]/20 mb-8">
            <Sparkles size={14} className="text-[#00c2ff]" />
            <span className="text-[10px] font-black text-[#00c2ff] uppercase tracking-[0.3em]">Neural Broadcast</span>
          </div>

          <h2 className="text-4xl md:text-6xl font-black text-white uppercase italic tracking-tighter mb-6 leading-none">
            Join the <span className="text-[#00c2ff]">Zetsu EOe BOOKZ</span> newsletter
          </h2>
          
          <p className="text-sm md:text-base text-slate-400 font-bold uppercase tracking-wider mb-12 leading-relaxed">
            Get updates on the latest books, neural protocols, and archival expansions directly in your inbox.
          </p>

          <form onSubmit={handleSubmit} className="relative max-w-md mx-auto">
            <div className="relative group">
              <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#00c2ff] transition-colors" size={20} />
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ENTER YOUR NEURAL_ID@EMAIL.COM" 
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
            
            <AnimatePresence>
              {status === 'success' && (
                <motion.p 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute -bottom-8 left-0 right-0 text-[10px] font-black text-[#00c2ff] uppercase tracking-widest"
                >
                  Neural link established. Welcome to the network.
                </motion.p>
              )}
              {status === 'error' && (
                <motion.p 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute -bottom-8 left-0 right-0 text-[10px] font-black text-red-500 uppercase tracking-widest"
                >
                  Sync failed. Bitstream unstable.
                </motion.p>
              )}
            </AnimatePresence>
          </form>
        </div>
      </div>
    </section>
  );
};

export default NewsletterCTA;
