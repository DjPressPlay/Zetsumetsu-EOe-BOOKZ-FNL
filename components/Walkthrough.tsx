
import React, { useState, useEffect } from 'react';
import { X, ArrowRight, ArrowLeft, Target, Search, BookOpen, User } from 'lucide-react';

const STEPS = [
  {
    title: "WELCOME TO ZETSUMETSU EOe BOOKZ",
    description: "Zetsumetsu EOe BOOKZ is the next generation of digital archiving. Expanding on the foundation of the Internet Archive, Zetsumetsu EOe BOOKZ continues the evolution. A high-fidelity digital archive that transforms static PDF documentation into interactive, shareable social-media-style landing pages.",
    icon: Target,
    target: "body",
  },
  {
    title: "ARCHIVAL SEARCH",
    description: "Use the search interface to filter data streams by title, author, or thematic genre.",
    icon: Search,
    target: "#nav-search-container",
  },
  {
    title: "NEURAL ARCHIVES",
    description: "Explore the global shelf. Each book entry opens a dedicated landing page with deep-link archival viewer capabilities.",
    icon: BookOpen,
    target: "#global-shelf",
  },
  {
    title: "AUTHOR IDENTITIES",
    description: "Click on an author's handle to view their complete archival history and creative footprint.",
    icon: User,
    target: "#featured-archives",
  }
];

const Walkthrough: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const hasSeen = localStorage.getItem('zetsu_walkthrough_complete');
    if (!hasSeen) {
      setTimeout(() => setIsVisible(true), 1500);
    }
  }, []);

  useEffect(() => {
    if (isVisible) {
      const targetSelector = STEPS[currentStep].target;
      if (targetSelector === "body") {
        setRect(null);
        return;
      }
      const el = document.querySelector(targetSelector);
      if (el) {
        setRect(el.getBoundingClientRect());
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentStep, isVisible]);

  const next = () => {
    if (currentStep < STEPS.length - 1) {
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

  const activeStep = STEPS[currentStep];
  const Icon = activeStep.icon;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-[2px] pointer-events-auto" onClick={finish} />
      {rect && (
        <div 
          className="absolute border-2 border-[#00c2ff] rounded-2xl shadow-[0_0_40px_rgba(0,194,255,0.4)] transition-all duration-500 pointer-events-none z-10"
          style={{ top: rect.top - 8, left: rect.left - 8, width: rect.width + 16, height: rect.height + 16 }}
        />
      )}
      <div className={`relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-[2rem] p-8 pointer-events-auto z-20 shadow-[0_20px_100px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in duration-300 ${rect ? 'md:ml-[30vw]' : ''}`}>
        <div className="flex justify-between items-start mb-6">
          <div className="w-12 h-12 bg-[#00c2ff]/10 rounded-2xl flex items-center justify-center text-[#00c2ff]"><Icon size={24} /></div>
          <button onClick={finish} className="text-slate-600 hover:text-white transition-colors"><X size={20} /></button>
        </div>
        <div className="space-y-4 mb-8">
          <h3 className="text-xl font-black italic text-white uppercase tracking-tighter">{activeStep.title}</h3>
          <p className="text-[11px] font-bold text-slate-400 leading-relaxed uppercase tracking-wider">{activeStep.description}</p>
        </div>
        <div className="flex items-center justify-between pt-6 border-t border-white/5">
          <div className="flex gap-1">
            {STEPS.map((_, i) => <div key={i} className={`h-1 rounded-full transition-all ${i === currentStep ? 'w-4 bg-[#00c2ff]' : 'w-1 bg-white/10'}`} />)}
          </div>
          <div className="flex gap-3">
            {currentStep > 0 && <button onClick={prev} className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all"><ArrowLeft size={18} /></button>}
            <button onClick={next} className="px-6 py-3 bg-[#00c2ff] text-black rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:brightness-110 transition-all">
              {currentStep === STEPS.length - 1 ? 'Finish' : 'Continue'}
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Walkthrough;
