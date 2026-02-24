
import React, { useState } from 'react';
import { Search, Info, X, Send, ChevronDown, Fingerprint, Cpu, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

interface NavbarProps {
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
}

const CATEGORIES = [
  "LIGHTHEARTED COMEDY", "NEON NOIR DETECTIVE", "DARK SCI-FI", "HIGH FANTASY", 
  "CLASSIC HORROR", "WASTELAND APOCALYPSE", "SUPERHERO ACTION", "TEEN DRAMA / SLICE OF LIFE"
];

const Navbar: React.FC<NavbarProps> = ({ searchQuery = "", setSearchQuery }) => {
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [requestStatus, setRequestStatus] = useState<'idle' | 'sending' | 'success'>('idle');
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);

  const handleRequestSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setRequestStatus('sending');

    const form = e.currentTarget;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    try {
      const response = await fetch('https://formspree.io/f/mnjdygog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setRequestStatus('success');
        // Reset form after a few seconds
        setTimeout(() => {
          setIsRequestOpen(false);
          setRequestStatus('idle');
          form.reset();
        }, 3000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Sync failed');
      }
    } catch (err) {
      console.error('Request submission error:', err);
      alert('PROTOCOL ERROR: DATA TRANSMISSION INTERRUPTED. PLEASE RETRY.');
      setRequestStatus('idle');
    }
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6">
          <div className="flex justify-between items-center h-20">
            {/* Logo Section */}
            {!isMobileSearchOpen && (
              <Link to="/" className="flex items-center gap-3 group shrink-0">
                <div className="flex flex-col">
                  <span className="text-lg md:text-2xl font-black tracking-tight text-white leading-none uppercase">
                    Zetsumetsu <span className="text-[#00c2ff] italic">EOe</span> BOOKZ
                  </span>
                  <span className="text-[7px] md:text-[9px] font-bold text-[#00c2ff] tracking-[0.4em] uppercase opacity-80 mt-1 flex items-center gap-2">
                    <span className="inline-block w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-[#00c2ff] animate-pulse" />
                    NEXUS
                  </span>
                </div>
              </Link>
            )}
            
            {/* Search Bar - Desktop & Mobile Toggle */}
            <div className={`flex-1 max-w-xl mx-4 md:mx-12 ${isMobileSearchOpen ? 'block' : 'hidden md:block'}`} id="nav-search-container">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#00c2ff] transition-colors" size={16} />
                <input 
                  type="text" 
                  autoFocus={isMobileSearchOpen}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery?.(e.target.value)}
                  placeholder="SEARCH ARCHIVES..." 
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-full py-2.5 md:py-3 pl-10 md:pl-12 pr-10 text-[10px] md:text-sm font-mono text-slate-300 focus:outline-none focus:border-[#00c2ff]/50 transition-all uppercase tracking-widest placeholder:text-slate-700 shadow-inner"
                />
                <button 
                  onClick={() => {
                    if (isMobileSearchOpen) {
                      setIsMobileSearchOpen(false);
                      setSearchQuery?.("");
                    } else {
                      setSearchQuery?.("");
                    }
                  }} 
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Actions Section */}
            {!isMobileSearchOpen && (
              <div className="flex items-center gap-2 md:gap-3">
                <button 
                  onClick={() => setIsMobileSearchOpen(true)}
                  className="md:hidden p-2 text-slate-400 hover:text-[#00c2ff] transition-colors"
                >
                  <Search size={20} />
                </button>
                
                <div className="flex bg-[#0a0a0a] border border-white/10 rounded-full p-0.5 md:p-1 shadow-2xl items-center">
                  <button 
                    onClick={() => setIsRequestOpen(true)}
                    className="px-3 md:px-5 py-2 text-white hover:text-[#00c2ff] text-[9px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.2em] transition-all flex items-center gap-1 md:gap-2 border-r border-white/5"
                  >
                    <Send size={12} className="text-[#00c2ff]" />
                    <span className="hidden xs:inline">Request</span>
                  </button>
                  <button 
                    onClick={() => setIsAboutOpen(true)}
                    className="px-3 md:px-5 py-2 text-slate-400 hover:text-[#00c2ff] text-[9px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.2em] transition-all flex items-center gap-1 md:gap-2"
                  >
                    <Info size={12} />
                    <span className="hidden xs:inline">About</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {isRequestOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setIsRequestOpen(false)} />
          <div className="relative bg-[#0a0a0a] w-full max-w-4xl rounded-[2rem] md:rounded-[2.5rem] shadow-[0_0_100px_rgba(0,194,255,0.1)] overflow-hidden border border-white/10 my-8">
            <div className="grid md:grid-cols-2">
              
              {/* Protocol Instructions Panel */}
              <div className="p-8 md:p-12 bg-black/40 border-b md:border-b-0 md:border-r border-white/5">
                <div className="mb-10">
                  <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-2">Protocol</h2>
                  <div className="h-1 w-12 bg-[#00c2ff]" />
                  <p className="mt-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                    How to add your book to Zetsumetsu EOe BOOKZ.
                  </p>
                </div>

                <div className="space-y-8">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 shrink-0 bg-[#00c2ff]/5 border border-[#00c2ff]/20 rounded-xl flex items-center justify-center text-[#00c2ff]">
                      <Fingerprint size={18} />
                    </div>
                    <div>
                      <h4 className="text-[11px] font-black text-white uppercase tracking-wider mb-1">01. Request Sync</h4>
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight leading-normal">
                        Submit your book details using the form. Our archivists will review the metadata.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-10 h-10 shrink-0 bg-[#00c2ff]/5 border border-[#00c2ff]/20 rounded-xl flex items-center justify-center text-[#00c2ff]">
                      <Zap size={18} />
                    </div>
                    <div>
                      <h4 className="text-[11px] font-black text-white uppercase tracking-wider mb-1">02. Team Outreach</h4>
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight leading-normal">
                        SUBMIT A REQUEST AND WE WILL CONTACT YOU THROUGH EMAIL to coordinate the PDF upload.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-10 h-10 shrink-0 bg-[#00c2ff]/5 border border-[#00c2ff]/20 rounded-xl flex items-center justify-center text-[#00c2ff]">
                      <Cpu size={18} />
                    </div>
                    <div>
                      <h4 className="text-[11px] font-black text-white uppercase tracking-wider mb-1">03. Deployment</h4>
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight leading-normal">
                        Your archive becomes a permanent node on the Zetsumetsu network.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-12 p-4 rounded-xl bg-[#00c2ff]/5 border border-[#00c2ff]/10">
                   <p className="text-[8px] font-black text-[#00c2ff] uppercase tracking-[0.2em] text-center">
                     NOTICE: NO UPLOAD REQUIRED AT THIS STAGE.
                   </p>
                </div>
              </div>

              {/* Form Panel */}
              <div className="p-8 md:p-12 flex flex-col justify-center">
                <div className="flex justify-end md:absolute md:top-6 md:right-6 mb-8 md:mb-0">
                  <button onClick={() => setIsRequestOpen(false)} className="p-2 hover:bg-white/5 rounded-full text-slate-500 transition-colors">
                    <X size={20} />
                  </button>
                </div>

                {requestStatus === 'success' ? (
                  <div className="py-12 text-center space-y-4">
                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Send className="text-green-500" size={32} />
                    </div>
                    <h3 className="text-xl font-black text-white uppercase">Request Transmitted</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest max-w-[200px] mx-auto">
                      Stand by. We will contact you via email shortly.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleRequestSubmit} className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Archive Title</label>
                        <input 
                          required
                          name="title"
                          type="text" 
                          placeholder="Project name"
                          className="w-full bg-black border border-white/10 py-4 px-6 rounded-2xl text-xs font-bold text-white focus:outline-none focus:border-[#00c2ff]/50 transition-all uppercase placeholder:opacity-20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Contact Email</label>
                        <input 
                          required
                          name="email"
                          type="email" 
                          placeholder="yourname@domain.com"
                          className="w-full bg-black border border-white/10 py-4 px-6 rounded-2xl text-xs font-bold text-white focus:outline-none focus:border-[#00c2ff]/50 transition-all uppercase placeholder:opacity-20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Genre Sector</label>
                        <div className="relative">
                          <select
                            required
                            name="category"
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full bg-black border border-white/10 py-4 px-6 rounded-2xl text-xs font-bold text-white focus:outline-none focus:border-[#00c2ff]/50 transition-all appearance-none uppercase cursor-pointer"
                          >
                            {CATEGORIES.map((cat) => (
                              <option key={cat} value={cat} className="bg-[#0a0a0a] text-white">
                                {cat}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-[#00c2ff] pointer-events-none" size={16} />
                        </div>
                      </div>
                    </div>
                    <button type="submit" disabled={requestStatus === 'sending'} className="w-full bg-[#00c2ff] text-black py-4 rounded-2xl font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-[0_0_30px_rgba(0,194,255,0.2)] mt-4 disabled:opacity-50">
                      {requestStatus === 'sending' ? 'Transmitting...' : 'Initiate Request'}
                    </button>
                    <p className="text-[7px] text-slate-600 text-center font-bold uppercase tracking-[0.2em] px-4">
                      BY SUBMITTING, YOU AGREE TO BE CONTACTED VIA EMAIL FOR DATA SYNC.
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {isAboutOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setIsAboutOpen(false)} />
          <div className="relative bg-[#0a0a0a] w-full max-w-2xl rounded-[2rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10 animate-in fade-in zoom-in duration-300">
            <div className="p-8 md:p-12 text-white">
              <h2 className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase mb-4 md:mb-6">Manifesto</h2>
              <div className="h-1 w-20 md:w-24 bg-[#00c2ff] mt-2 md:mt-4 mb-6 md:mb-8" />
              <p className="text-slate-400 text-xs md:text-sm leading-relaxed mb-8 md:mb-12">
                Zetsumetsu EOe BOOKZ is a high-fidelity neural archive designed to transform static PDF documentation into immersive digital experiences. It functions as a decentralized storage nexus where creative intelligence is preserved.
              </p>
              <button onClick={() => setIsAboutOpen(false)} className="w-full bg-white text-black py-3 md:py-4 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-xs md:text-base">Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
