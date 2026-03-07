
import React, { useState, useRef, useEffect } from 'react';
import { Search, Info, X, Send, ChevronDown, Fingerprint, Cpu, Zap, FileText, Sparkles, Loader2, Image as ImageIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { processPdfForStore } from '../services/pdfService';
import { saveBook, getUserUploadCount, getUserCredits } from '../services/db';
import { suggestGenres } from '../services/geminiService';
import { BookMetadata, BookData } from '../types';
import { Crown } from 'lucide-react';
import PricingModal from './PricingModal';

const getDeviceId = () => {
  let id = localStorage.getItem('zetsu_device_id');
  if (!id) {
    id = Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem('zetsu_device_id', id);
  }
  return id;
};

interface NavbarProps {
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
}

const CATEGORIES = [
  "GUIDES & PROTOCOLS", "NEURAL FICTION", "ACADEMIC NODES", "SYSTEM SCHEMATICS",
  "HISTORICAL TRACES", "VISUAL ARTIFACTS", "PHILOSOPHICAL CODES", "RAW DATA STREAMS"
];

const Navbar: React.FC<NavbarProps> = ({ searchQuery = "", setSearchQuery }) => {
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'processing' | 'uploading' | 'success' | 'error'>('idle');
  const [pdfInfo, setPdfInfo] = useState<any>(null);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isAiCurating, setIsAiCurating] = useState(false);
  const [formData, setFormData] = useState({ title: '', author: '', genre: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch premium status
  useEffect(() => {
    const deviceId = getDeviceId();
    getUserCredits(deviceId).then(data => setIsPremium(data.isPremium));
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const deviceId = getDeviceId();
    const { isPremium: premiumStatus } = await getUserCredits(deviceId);
    const uploadCount = await getUserUploadCount(deviceId);
    
    if (!premiumStatus && uploadCount >= 5) {
      setUploadStatus('error');
      alert("OM_G! Your archival sector is full! 📚 You've reached the 5-book limit for free archivists. ✨ Upgrade to PREMIUM for unlimited uploads! 🚀");
      return;
    }

    setUploadStatus('processing');
    try {
      const info = await processPdfForStore(file);
      setPdfInfo(info);
      const initialTitle = file.name.replace('.pdf', '');
      setFormData(prev => ({ ...prev, title: initialTitle }));
      setUploadStatus('idle');
      
      // Trigger AI curation immediately on file select
      curateGenres(initialTitle);
    } catch (err) {
      setUploadStatus('error');
    }
  };

  const curateGenres = async (title: string) => {
    if (!title || title.length < 3) return;
    setIsAiCurating(true);
    const suggestions = await suggestGenres(title);
    setAiSuggestions(suggestions);
    if (suggestions.length > 0 && !formData.genre) {
      setFormData(prev => ({ ...prev, genre: suggestions[0] }));
    }
    setIsAiCurating(false);
  };

  // Debounce AI curation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.title && pdfInfo) {
        curateGenres(formData.title);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [formData.title]);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfInfo || !formData.title || !formData.author || !formData.genre) return;
    
    setUploadStatus('uploading');
    try {
      const deviceId = getDeviceId();
      const id = crypto.randomUUID().split('-')[0];
      const metadata: BookMetadata = {
        id,
        thumbnail: pdfInfo.thumbnail,
        title: formData.title,
        author: formData.author,
        genre: formData.genre,
        pages: pdfInfo.pageCount,
        uploadDate: Date.now(),
        reads: 0,
        upvotes: 0
      };
      const data: BookData = { id, pdfData: pdfInfo.pdfData };
      await saveBook(metadata, data, deviceId);
      setUploadStatus('success');
      
      // Refresh the page or trigger a global refresh
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      setUploadStatus('error');
    }
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-[1600px] mx-auto px-3 md:px-6">
          <div className="flex justify-between items-center h-20 gap-2">
            {/* Logo Section */}
            {!isMobileSearchOpen && (
              <Link to="/" className="flex items-center gap-2 group shrink-0">
                <div className="flex flex-col">
                  <span className="text-[13px] md:text-2xl font-black tracking-tight text-white leading-none uppercase">
                    Zetsumetsu <span className="text-[#00c2ff] italic">EOe</span> <span className="hidden min-[480px]:inline">BOOKZ</span>
                  </span>
                  <span className="text-[6px] md:text-[9px] font-bold text-[#00c2ff] tracking-[0.4em] uppercase opacity-80 mt-1 flex items-center gap-1.5">
                    <span className="inline-block w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-[#00c2ff] animate-pulse" />
                    NEXUS
                  </span>
                </div>
              </Link>
            )}
            
            {/* Search Bar - Desktop & Mobile Toggle */}
            <div className={`flex-1 max-w-[180px] lg:max-w-[240px] mx-4 md:mx-8 ${isMobileSearchOpen ? 'block' : 'hidden md:block'}`} id="nav-search-container">
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
              <div className="flex items-center gap-2 md:gap-6">
                <button 
                  onClick={() => setIsMobileSearchOpen(true)}
                  className="md:hidden p-2 text-slate-400 hover:text-[#00c2ff] transition-colors"
                >
                  <Search size={18} />
                </button>
                
                <div className="flex items-center gap-2 md:gap-4">
                  {!isPremium && (
                    <button 
                      onClick={() => setIsPricingOpen(true)}
                      className="hidden sm:flex px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_35px_rgba(168,85,247,0.6)] transition-all items-center gap-2 border border-white/10"
                    >
                      <Crown size={12} className="fill-white" />
                      GO PREMIUM
                    </button>
                  )}
                  <button 
                    onClick={() => setIsRequestOpen(true)}
                    className="px-4 md:px-8 py-2.5 md:py-3 bg-[#00c2ff] text-black hover:bg-white text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300 flex items-center gap-2 rounded-full shadow-[0_0_25px_rgba(0,194,255,0.3)] hover:shadow-[0_0_45px_rgba(0,194,255,0.6)] active:scale-95 group"
                  >
                    <Send size={14} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    <span className="hidden min-[540px]:inline">SUBMIT DATA</span>
                  </button>

                  <button 
                    onClick={() => setIsAboutOpen(true)}
                    className="flex items-center gap-2 p-2 md:px-4 md:py-2 text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-[0.2em] transition-all"
                  >
                    <Info size={14} />
                    <span className="hidden md:inline">About</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {isRequestOpen && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 backdrop-blur-xl" 
              onClick={() => setIsRequestOpen(false)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative bg-[#0a0a0a] w-full max-w-4xl rounded-[2rem] md:rounded-[2.5rem] shadow-[0_0_100px_rgba(0,194,255,0.1)] border border-white/10 my-auto overflow-hidden"
            >
              <div className="grid md:grid-cols-2 max-h-[90vh] md:max-h-none overflow-y-auto md:overflow-visible">
                
                {/* Protocol Instructions Panel */}
                <div className="p-8 md:p-12 bg-black/40 border-b md:border-b-0 md:border-r border-white/5">
                  <div className="mb-10">
                    <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-2">Archival Sync</h2>
                    <div className="h-1 w-12 bg-[#00c2ff]" />
                    <p className="mt-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                      Direct upload protocol powered by AI.
                    </p>
                  </div>

                  <div className="space-y-8">
                    <div className="flex gap-4">
                      <div className="w-10 h-10 shrink-0 bg-[#00c2ff]/5 border border-[#00c2ff]/20 rounded-xl flex items-center justify-center text-[#00c2ff]">
                        <FileText size={18} />
                      </div>
                      <div>
                        <h4 className="text-[11px] font-black text-white uppercase tracking-wider mb-1">01. Select Artifact</h4>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight leading-normal">
                          Upload your PDF directly to the Zetsu network. No manual review required.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="w-10 h-10 shrink-0 bg-[#00c2ff]/5 border border-[#00c2ff]/20 rounded-xl flex items-center justify-center text-[#00c2ff]">
                        <ImageIcon size={18} />
                      </div>
                      <div>
                        <h4 className="text-[11px] font-black text-[#00c2ff] uppercase tracking-wider mb-1">CRITICAL: PAGE_01 COVER</h4>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight leading-normal">
                          The PDF must have the book cover on the first page for neural thumbnail generation.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="w-10 h-10 shrink-0 bg-[#00c2ff]/5 border border-[#00c2ff]/20 rounded-xl flex items-center justify-center text-[#00c2ff]">
                        <Sparkles size={18} />
                      </div>
                      <div>
                        <h4 className="text-[11px] font-black text-white uppercase tracking-wider mb-1">02. AI Curation</h4>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight leading-normal">
                          The system will analyze your title and suggest the most relevant Genre Sectors.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="w-10 h-10 shrink-0 bg-[#00c2ff]/5 border border-[#00c2ff]/20 rounded-xl flex items-center justify-center text-[#00c2ff]">
                        <Cpu size={18} />
                      </div>
                      <div>
                        <h4 className="text-[11px] font-black text-white uppercase tracking-wider mb-1">03. Global Deployment</h4>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight leading-normal">
                          Your archive becomes a permanent node on the Zetsumetsu network instantly.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-12 p-4 rounded-xl bg-[#00c2ff]/5 border border-[#00c2ff]/10">
                     <p className="text-[8px] font-black text-[#00c2ff] uppercase tracking-[0.2em] text-center">
                       NOTICE: DIRECT UPLOAD PROTOCOL ACTIVE.
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

                  <AnimatePresence mode="wait">
                    {uploadStatus === 'success' ? (
                      <motion.div 
                        key="success"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="py-12 text-center space-y-4"
                      >
                        <div className="w-16 h-16 bg-[#00c2ff]/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(0,194,255,0.2)]">
                          <Zap className="text-[#00c2ff]" size={32} />
                        </div>
                        <h3 className="text-xl font-black text-white uppercase italic">Archive Synced</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest max-w-[200px] mx-auto">
                          Deployment complete. Re-initializing network view...
                        </p>
                      </motion.div>
                    ) : uploadStatus === 'uploading' ? (
                      <motion.div 
                        key="uploading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="py-20 text-center"
                      >
                        <div className="relative w-24 h-24 mx-auto mb-8">
                          <Loader2 className="w-full h-full text-[#00c2ff] animate-spin" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-12 h-12 bg-[#00c2ff]/20 rounded-full animate-ping" />
                          </div>
                        </div>
                        <p className="text-xl font-black text-white uppercase italic animate-pulse">Syncing Bitstream...</p>
                        <div className="mt-4 w-48 h-1 bg-white/5 mx-auto rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-[#00c2ff]"
                            initial={{ width: "0%" }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 2, repeat: Infinity }}
                          />
                        </div>
                      </motion.div>
                    ) : !pdfInfo ? (
                      <motion.div 
                        key="idle"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-white/10 rounded-[2rem] p-12 text-center cursor-pointer hover:border-[#00c2ff]/50 transition-all bg-black/40 group"
                      >
                        <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={handleFileSelect} />
                        <FileText size={48} className="mx-auto mb-4 text-slate-700 group-hover:text-[#00c2ff] transition-colors" />
                        <p className="font-black text-white uppercase tracking-widest text-xs mb-2">Select PDF Artifact</p>
                        <p className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">Max 50MB per node</p>
                      </motion.div>
                    ) : (
                      <motion.form 
                        key="form"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        onSubmit={handleUploadSubmit} 
                        className="space-y-6"
                      >
                        <div className="space-y-4">
                          <div className="flex gap-4 p-4 bg-black rounded-2xl border border-white/5 items-center">
                            <img src={pdfInfo.thumbnail} className="w-12 aspect-[3/4] object-cover rounded shadow-2xl" alt="thumb" />
                            <div className="min-w-0">
                              <p className="text-[10px] font-black text-white uppercase italic truncate">{formData.title}</p>
                              <p className="text-[8px] text-slate-500 font-bold uppercase">{pdfInfo.pageCount} Pages Detected</p>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Archive Title</label>
                            <input 
                              required
                              value={formData.title}
                              onChange={e => setFormData({...formData, title: e.target.value})}
                              placeholder="Project name"
                              className="w-full bg-black border border-white/10 py-4 px-6 rounded-2xl text-xs font-bold text-white focus:outline-none focus:border-[#00c2ff]/50 transition-all uppercase"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Author ID</label>
                            <input 
                              required
                              value={formData.author}
                              onChange={e => setFormData({...formData, author: e.target.value})}
                              placeholder="Your NEURAL_ID"
                              className="w-full bg-black border border-white/10 py-4 px-6 rounded-2xl text-xs font-bold text-white focus:outline-none focus:border-[#00c2ff]/50 transition-all uppercase"
                            />
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Genre Sector</label>
                              {isAiCurating && <Loader2 size={10} className="text-[#00c2ff] animate-spin" />}
                            </div>
                            <div className="relative">
                              <select
                                required
                                value={formData.genre}
                                onChange={(e) => setFormData({...formData, genre: e.target.value})}
                                className="w-full bg-black border border-white/10 py-4 px-6 rounded-2xl text-xs font-bold text-white focus:outline-none focus:border-[#00c2ff]/50 transition-all appearance-none uppercase cursor-pointer"
                              >
                                <option value="" disabled>Select Sector</option>
                                {aiSuggestions.length > 0 ? (
                                  aiSuggestions.map((cat) => (
                                    <option key={cat} value={cat} className="bg-[#0a0a0a] text-white">
                                      {cat}
                                    </option>
                                  ))
                                ) : (
                                  CATEGORIES.map((cat) => (
                                    <option key={cat} value={cat} className="bg-[#0a0a0a] text-white">
                                      {cat}
                                    </option>
                                  ))
                                )}
                              </select>
                              <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-[#00c2ff] pointer-events-none" size={16} />
                            </div>
                            <p className="text-[7px] text-[#00c2ff]/60 font-bold uppercase tracking-widest mt-2 flex items-center gap-1">
                              <Sparkles size={8} /> AI Curated Suggestions
                            </p>
                          </div>
                        </div>
                        <button type="submit" className="w-full bg-[#00c2ff] text-black py-4 rounded-2xl font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-[0_0_30px_rgba(0,194,255,0.2)] mt-4">
                          Initiate Deployment
                        </button>
                      </motion.form>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAboutOpen && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 backdrop-blur-xl" 
              onClick={() => setIsAboutOpen(false)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative bg-[#0a0a0a] w-full max-w-2xl rounded-[2rem] md:rounded-[2.5rem] shadow-2xl border border-white/10 my-auto overflow-hidden"
            >
              <div className="p-8 md:p-12 text-white max-h-[90vh] overflow-y-auto">
                <h2 className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase mb-4 md:mb-6">Manifesto</h2>
                <div className="h-1 w-20 md:w-24 bg-[#00c2ff] mt-2 md:mt-4 mb-6 md:mb-8" />
                <div className="space-y-6 text-slate-400 text-xs md:text-sm leading-relaxed mb-8 md:mb-12">
                  <p>
                    Zetsumetsu EOe BOOKZ is the next generation of digital archiving. Expanding on the foundation of the Internet Archive, Zetsumetsu EOe BOOKZ continues the evolution. A high-fidelity digital archive that transforms static PDF documentation into interactive, shareable social-media-style landing pages.
                  </p>
                  
                  <div className="space-y-4">
                    <p className="text-white font-black uppercase tracking-widest text-[9px] md:text-[10px]">Current Protocols:</p>
                    <ul className="space-y-2 list-none">
                      <li className="flex gap-2">
                        <span className="text-[#00c2ff] font-black">●</span>
                        <span><strong className="text-white">NEURAL MOMENTUM:</strong> A Product Hunt-style meritocracy ranking the most valuable bitstreams in real-time.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-[#00c2ff] font-black">●</span>
                        <span><strong className="text-white">DISCOURSE NODES:</strong> Threaded technical critiques and archival notes for every artifact on the network.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-purple-400 font-black">●</span>
                        <span><strong className="text-white">AI CREDITS:</strong> The energy for your AI assistant. Use credits to search the archives, have the AI read books for you, and boost your rankings.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-[#00c2ff] font-black">●</span>
                        <span><strong className="text-white">IDENTITY LOCK:</strong> Unique device and Neural ID signatures to ensure momentum integrity and prevent bitstream spam.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-indigo-400 font-black">●</span>
                        <span><strong className="text-white">PREMIUM ARCHIVIST:</strong> Unlock everything. Upload unlimited books, get featured in the feed, and access advanced AI features.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-[#00c2ff] font-black">●</span>
                        <span><strong className="text-white">ARCHIVAL METRICS:</strong> Real-time tracking of "Reads" and "Momentum" to measure the impact of every node.</span>
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <p className="text-white font-black uppercase tracking-widest text-[9px] md:text-[10px]">The Zetsu Roadmap:</p>
                    <ul className="space-y-2 list-none opacity-60">
                      <li className="flex gap-2">
                        <span className="text-[#00c2ff] font-black">●</span>
                        <span><strong className="text-white">NEURAL DEPTH:</strong> Full-text indexing and OCR for deep-bitstream search.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-[#00c2ff] font-black">●</span>
                        <span><strong className="text-white">MEDIA DIVERSITY:</strong> Expanding beyond PDFs into Audio Nodes and Neural Emulation.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-[#00c2ff] font-black">●</span>
                        <span><strong className="text-white">TEMPORAL ARCHIVING:</strong> Preserving the evolution of data across the Wayback Protocol.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-[#00c2ff] font-black">●</span>
                        <span><strong className="text-white">BIBLIOGRAPHIC PRECISION:</strong> Deep metadata schemas for academic-grade cross-referencing.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-[#00c2ff] font-black">●</span>
                        <span><strong className="text-white">COLLABORATIVE CURATION:</strong> Enabling Neural IDs to build and share private research dossiers.</span>
                      </li>
                    </ul>
                  </div>

                  <p className="pt-4 border-t border-white/5">
                    Digital Archiving, The Zetsu Way.
                  </p>
                </div>
                <button onClick={() => setIsAboutOpen(false)} className="w-full bg-white text-black py-3 md:py-4 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-xs md:text-base">Close</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <PricingModal 
        isOpen={isPricingOpen} 
        onClose={() => setIsPricingOpen(false)} 
        deviceId={getDeviceId()} 
      />
    </>
  );
};

export default Navbar;
