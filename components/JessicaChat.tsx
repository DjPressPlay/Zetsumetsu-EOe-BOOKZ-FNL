
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, X, Sparkles, User, Bot, Minus, Maximize2, Zap } from 'lucide-react';
import { BookMetadata } from '../types';
import { JessicaAI } from '../services/jessicaService';
import { useParams, useLocation } from 'react-router-dom';
import { getUserCredits } from '../services/db';
import PricingModal from './PricingModal';

interface Message {
  role: 'user' | 'jessica';
  text: string;
  timestamp: number;
}

interface JessicaChatProps {
  books: BookMetadata[];
}

const JessicaChat: React.FC<JessicaChatProps> = ({ books }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'jessica', text: "Omg, hi! I'm Jessica, your Zetsu EOe site companion! ✨ I'm so stoked to help you navigate the archives! What can I find for you today? 📚", timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [jessica, setJessica] = useState<JessicaAI | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { id: currentBookId } = useParams<{ id: string }>();

  const getDeviceId = () => {
    let id = localStorage.getItem('zetsu_device_id');
    if (!id) {
      id = Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem('zetsu_device_id', id);
    }
    return id;
  };

  // Initialize Jessica AI
  useEffect(() => {
    if (books.length > 0 && !jessica) {
      try {
        setJessica(new JessicaAI(books));
      } catch (err) {
        console.error("Failed to initialize Jessica AI:", err);
      }
    }
  }, [books, jessica]);

  // Fetch credits
  useEffect(() => {
    if (isOpen) {
      const deviceId = getDeviceId();
      getUserCredits(deviceId).then(data => {
        setCredits(data.credits);
        setIsPremium(data.isPremium);
      });
    }
  }, [isOpen]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading || !jessica) return;

    const userMsg = input.trim();
    const deviceId = getDeviceId();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg, timestamp: Date.now() }]);
    setIsLoading(true);

    try {
      const response = await jessica.sendMessage(userMsg, deviceId, currentBookId);
      setMessages(prev => [...prev, { role: 'jessica', text: response || "Oopsy! Something went wrong in the bitstream! 🍭", timestamp: Date.now() }]);
      // Refresh credits after message (in case tool was used)
      getUserCredits(deviceId).then(data => {
        setCredits(data.credits);
        setIsPremium(data.isPremium);
      });
    } catch (err) {
      console.error("Jessica Error:", err);
      setMessages(prev => [...prev, { role: 'jessica', text: "Oh no! My neural link glitched! Can we try that again? ✨", timestamp: Date.now() }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: 0,
              height: isMinimized ? '60px' : '500px',
              width: '350px'
            }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="bg-[#0a0a0a] border border-[#00c2ff]/30 rounded-3xl shadow-[0_0_50px_rgba(0,194,255,0.2)] overflow-hidden flex flex-col mb-4"
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-[#00c2ff]/20 to-transparent border-b border-white/5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#00c2ff] flex items-center justify-center shadow-[0_0_15px_rgba(0,194,255,0.5)]">
                  <Sparkles size={16} className="text-black" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-widest">Jessica AI</h3>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-tighter">Online</span>
                    </div>
                    {credits !== null && (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-purple-500/10 rounded-md border border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.3)]">
                          <Zap size={8} className="text-purple-400 fill-purple-400 drop-shadow-[0_0_5px_rgba(168,85,247,0.8)]" />
                          <span className="text-[8px] font-black text-purple-400 uppercase tracking-tighter drop-shadow-[0_0_5px_rgba(168,85,247,0.8)]">{credits} SHARDS</span>
                        </div>
                        <button 
                          onClick={() => setIsPricingOpen(true)}
                          className="text-[7px] font-black text-white/40 hover:text-[#00c2ff] uppercase tracking-widest transition-colors border-b border-white/10 hover:border-[#00c2ff]/40"
                        >
                          [TOP_UP]
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1.5 text-slate-500 hover:text-white transition-colors"
                >
                  {isMinimized ? <Maximize2 size={14} /> : <Minus size={14} />}
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-slate-500 hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            {!isMinimized && (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] p-3 rounded-2xl text-[11px] leading-relaxed ${
                        msg.role === 'user' 
                          ? 'bg-[#00c2ff] text-black font-bold rounded-tr-none' 
                          : 'bg-white/5 text-slate-300 border border-white/5 rounded-tl-none font-mono'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white/5 p-3 rounded-2xl rounded-tl-none border border-white/5 flex gap-1">
                        <span className="w-1 h-1 bg-[#00c2ff] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1 h-1 bg-[#00c2ff] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1 h-1 bg-[#00c2ff] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <form onSubmit={handleSend} className="p-4 border-t border-white/5 bg-black/50">
                  <div className="relative">
                    <input 
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask Jessica anything..."
                      className="w-full bg-[#111] border border-white/10 rounded-xl py-2.5 pl-4 pr-10 text-[10px] font-bold text-white focus:outline-none focus:border-[#00c2ff]/50 transition-all uppercase tracking-widest"
                    />
                    <button 
                      type="submit"
                      disabled={!input.trim() || isLoading}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-[#00c2ff] hover:text-white disabled:opacity-30 transition-colors"
                    >
                      <Send size={14} />
                    </button>
                  </div>
                </form>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          setIsOpen(true);
          setIsMinimized(false);
        }}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(0,194,255,0.3)] transition-all duration-500 ${
          isOpen ? 'opacity-0 pointer-events-none scale-0' : 'opacity-100 scale-100 bg-[#00c2ff]'
        }`}
      >
        <div className="relative">
          <MessageSquare size={24} className="text-black" />
          <motion.div 
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center"
          >
            <Sparkles size={8} className="text-[#00c2ff]" />
          </motion.div>
        </div>
      </motion.button>
      <PricingModal 
        isOpen={isPricingOpen} 
        onClose={() => setIsPricingOpen(false)} 
        deviceId={getDeviceId()} 
      />
    </div>
  );
};

export default JessicaChat;
