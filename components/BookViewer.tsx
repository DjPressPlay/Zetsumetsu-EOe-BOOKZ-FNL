
import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BookMetadata, BookData } from '../types';
import { renderPdfPage } from '../services/pdfService';
import { getBookMetadata, getBookData } from '../services/db';
import { 
  ChevronUp, 
  ChevronDown, 
  ChevronLeft,
  ChevronRight,
  X, 
  Share2, 
  Check, 
  Play, 
  Pause, 
  Globe,
  ZoomIn,
  ZoomOut,
  Maximize
} from 'lucide-react';

const SPEEDS = {
  AMBIENT: 15000,
  STANDARD: 8000,
  RAPID: 4000
};

const BookViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [metadata, setMetadata] = useState<BookMetadata | null>(null);
  const [pdfData, setPdfData] = useState<BookData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState<keyof typeof SPEEDS>('STANDARD');
  const [progress, setProgress] = useState(0);
  const [uiVisible, setUiVisible] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [zoom, setZoom] = useState(1);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const uiTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (id) {
      Promise.all([getBookMetadata(id), getBookData(id)]).then(([meta, data]) => {
        setMetadata(meta);
        setPdfData(data);
        setLoading(false);
      });
    }
  }, [id]);

  useEffect(() => {
    if (pdfData && canvasRef.current) {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        renderPdfPage(pdfData.pdfData, currentPage, canvasRef.current!).then(() => {
          setIsTransitioning(false);
        });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [pdfData, currentPage]);

  useEffect(() => {
    let interval: number;
    let progressInterval: number;
    if (isPlaying && metadata) {
      const startTime = Date.now();
      const duration = SPEEDS[playSpeed];
      progressInterval = window.setInterval(() => {
        const elapsed = Date.now() - startTime;
        setProgress(Math.min((elapsed / duration) * 100, 100));
      }, 50);
      interval = window.setInterval(() => {
        setCurrentPage(prev => (prev >= metadata.pages ? (setIsPlaying(false), prev) : prev + 1));
        setProgress(0);
      }, duration);
    } else {
      setProgress(0);
    }
    return () => { clearInterval(interval); clearInterval(progressInterval); };
  }, [isPlaying, playSpeed, metadata, currentPage]);

  useEffect(() => {
    const showUI = () => {
      setUiVisible(true);
      if (uiTimeoutRef.current) window.clearTimeout(uiTimeoutRef.current);
      if (isPlaying) uiTimeoutRef.current = window.setTimeout(() => setUiVisible(false), 3000);
    };
    window.addEventListener('mousemove', showUI);
    window.addEventListener('touchstart', showUI);
    return () => { window.removeEventListener('mousemove', showUI); window.removeEventListener('touchstart', showUI); };
  }, [isPlaying]);

  const copyAuthorUrl = () => {
    if (!metadata) return;
    const baseUrl = window.location.href.split('#')[0];
    const authorUrl = `${baseUrl}#/author/${encodeURIComponent(metadata.author)}`;
    navigator.clipboard.writeText(authorUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (metadata && currentPage < metadata.pages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-black">
      <div className="w-12 h-12 border-2 border-[#00c2ff]/20 border-t-[#00c2ff] rounded-full animate-spin" />
    </div>
  );

  if (!metadata || !pdfData) return (
    <div className="h-screen flex items-center justify-center bg-black text-white">
      <Link to="/" className="bg-[#00c2ff] text-black px-6 py-2 rounded-full font-black uppercase text-[10px] tracking-widest">Return to Archives</Link>
    </div>
  );

  return (
    <div className={`h-screen w-screen bg-black text-white overflow-hidden flex flex-col transition-all duration-700 ${!uiVisible ? 'cursor-none' : ''}`}>
      
      {/* 1. Global Progress Bar (Cyan Shadow) */}
      <div className="fixed top-0 left-0 right-0 z-50 h-[2px] bg-white/5">
        <div 
          className="h-full bg-[#00c2ff] transition-all duration-100 linear shadow-[0_0_15px_rgba(0,194,255,1)]"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 2. Main Controls Dock (Adaptive) */}
      <aside className={`fixed z-50 flex transition-all duration-500 transform 
        bottom-6 left-1/2 -translate-x-1/2 md:bottom-auto md:top-1/2 md:right-6 md:left-auto md:-translate-y-1/2 md:flex-col gap-4 
        ${uiVisible ? 'translate-y-0 opacity-100 md:translate-x-0' : 'translate-y-20 opacity-0 md:translate-x-20'}`}>
        
        <div className="bg-[#0a0f14]/90 backdrop-blur-xl border border-white/10 p-2 rounded-full md:rounded-3xl shadow-[0_20px_40px_rgba(0,0,0,0.8)] flex md:flex-col items-center gap-2 md:gap-3">
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full md:rounded-2xl transition-all ${isPlaying ? 'bg-[#00c2ff] text-black' : 'hover:bg-white/5 text-slate-400'}`}
          >
            {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
          </button>
          
          <div className="w-[1px] h-6 md:w-8 md:h-[1px] bg-white/10" />
          
          <button 
            disabled={currentPage <= 1 || isPlaying} 
            onClick={handlePrev}
            className="w-10 h-10 flex items-center justify-center rounded-full md:rounded-xl hover:bg-white/5 disabled:opacity-5 text-slate-500"
          >
            <ChevronLeft className="md:hidden" size={20} />
            <ChevronUp className="hidden md:block" size={24} />
          </button>
          
          <div className="flex flex-col items-center min-w-[3rem]">
            <span className="text-[10px] md:text-[11px] font-black text-[#00c2ff] italic leading-none">{currentPage}</span>
            <span className="text-[7px] font-bold text-slate-600 uppercase tracking-widest mt-1">/ {metadata.pages}</span>
          </div>

          <button 
            disabled={currentPage >= metadata.pages || isPlaying} 
            onClick={handleNext}
            className="w-10 h-10 flex items-center justify-center rounded-full md:rounded-xl hover:bg-white/5 disabled:opacity-5 text-slate-500"
          >
            <ChevronRight className="md:hidden" size={20} />
            <ChevronDown className="hidden md:block" size={24} />
          </button>
        </div>

        <div className="bg-[#0a0f14]/90 backdrop-blur-xl border border-white/10 p-1 rounded-full md:rounded-2xl flex md:flex-col items-center gap-1">
          {(['AMBIENT', 'STANDARD', 'RAPID'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setPlaySpeed(s)}
              className={`w-10 h-10 md:h-8 rounded-full md:rounded-xl text-[7px] font-black tracking-tighter transition-all ${playSpeed === s ? 'bg-white text-black' : 'text-slate-600 hover:text-white/10'}`}
            >
              {s[0]}
            </button>
          ))}
        </div>

        <div className="bg-[#0a0f14]/90 backdrop-blur-xl border border-white/10 p-2 rounded-full md:rounded-3xl shadow-2xl flex md:flex-col items-center gap-2">
          <button 
            onClick={() => setZoom(prev => Math.min(prev + 0.25, 3))}
            className="w-10 h-10 flex items-center justify-center rounded-full md:rounded-xl hover:bg-white/5 text-slate-400"
            title="Zoom In"
          >
            <ZoomIn size={18} />
          </button>
          <button 
            onClick={() => setZoom(1)}
            className="w-10 h-10 flex items-center justify-center rounded-full md:rounded-xl hover:bg-white/5 text-slate-400"
            title="Reset Zoom"
          >
            <Maximize size={16} />
          </button>
          <button 
            onClick={() => setZoom(prev => Math.max(prev - 0.25, 0.5))}
            className="w-10 h-10 flex items-center justify-center rounded-full md:rounded-xl hover:bg-white/5 text-slate-400"
            title="Zoom Out"
          >
            <ZoomOut size={18} />
          </button>
        </div>
      </aside>

      {/* 3. Immersive Tap Zones (Mobile Navigation) */}
      <div className="fixed inset-0 z-10 pointer-events-none flex">
        <div onClick={handlePrev} className="w-1/4 h-full pointer-events-auto cursor-w-resize group" aria-label="Previous Page">
          <div className="h-full flex items-center px-4 opacity-0 group-hover:opacity-10 transition-opacity">
             <ChevronLeft size={48} className="text-[#00c2ff]" />
          </div>
        </div>
        <div className="flex-1 h-full" />
        <div onClick={handleNext} className="w-1/4 h-full pointer-events-auto cursor-e-resize group" aria-label="Next Page">
          <div className="h-full flex items-center justify-end px-4 opacity-0 group-hover:opacity-10 transition-opacity">
             <ChevronRight size={48} className="text-[#00c2ff]" />
          </div>
        </div>
      </div>

      {/* 4. Top Information Bar */}
      <div className={`fixed top-4 md:top-6 left-4 md:left-6 right-4 md:right-6 z-50 flex justify-between items-center transition-all duration-500 ${uiVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'}`}>
        <Link to={`/book/${id}`} className="flex items-center gap-3 md:gap-4 bg-[#0a0f14]/80 backdrop-blur-md border border-white/10 p-1.5 md:p-2 pr-4 md:pr-6 rounded-xl md:rounded-2xl hover:bg-[#111] transition-all">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-white/5 rounded-lg md:rounded-xl flex items-center justify-center text-slate-400">
            <X size={18} />
          </div>
          <div className="flex flex-col overflow-hidden max-w-[120px] md:max-w-none">
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-[#00c2ff] leading-none mb-1 truncate">Eject Archive</span>
            <span className="text-[7px] md:text-[9px] font-mono text-slate-600 leading-none truncate">{metadata.title}</span>
          </div>
        </Link>

        <button 
          onClick={copyAuthorUrl}
          className="bg-white text-black h-10 md:h-14 px-4 md:px-8 rounded-xl md:rounded-2xl flex items-center gap-2 md:gap-3 font-black text-[8px] md:text-[10px] uppercase tracking-[0.2em] hover:bg-[#00c2ff] transition-all shadow-2xl"
        >
          {copied ? <Check size={18} /> : <Share2 size={18} />}
          <span className="hidden xs:inline">{copied ? 'Origin Synced' : 'Author Hash'}</span>
        </button>
      </div>

      {/* 5. Reading Environment */}
      <main className="flex-1 w-full h-full relative bg-[#020202] overflow-auto no-scrollbar flex items-center justify-center p-8 md:p-12">
        <div 
          className={`relative transition-all duration-500 transform origin-center ${isTransitioning ? 'scale-[0.98] opacity-20' : 'opacity-100'}`}
          style={{ transform: `scale(${zoom})` }}
        >
           <div className="relative shadow-[0_0_100px_rgba(0,194,255,0.15)] rounded-sm overflow-hidden bg-white">
            <canvas 
              ref={canvasRef} 
              className="block max-w-[90vw] max-h-[80vh] md:max-w-[none] md:max-h-[85vh] object-contain"
            />
            {currentPage > 1 && (
              <div className="absolute inset-y-0 left-0 w-8 md:w-12 bg-gradient-to-r from-black/10 to-transparent pointer-events-none" />
            )}
          </div>
        </div>
        
        {/* Ambient Backlight Engine */}
        <div className="absolute inset-0 pointer-events-none -z-10 flex items-center justify-center overflow-hidden">
           <div className={`w-[120vw] h-[120vh] md:w-[70vw] md:h-[70vh] bg-[#00c2ff]/5 blur-[150px] md:blur-[200px] rounded-full transition-opacity duration-1000 ${isPlaying ? 'opacity-100' : 'opacity-40'}`} />
        </div>
      </main>

      {/* 6. Lower Status Panel */}
      <div className={`fixed bottom-6 left-6 z-50 transition-opacity duration-500 hidden md:block ${uiVisible ? 'opacity-50' : 'opacity-0'}`}>
        <div className="flex items-center gap-3 bg-[#0a0f14]/80 p-3 rounded-xl border border-white/5">
          <Globe size={14} className={isPlaying ? 'text-[#00c2ff] animate-pulse' : 'text-slate-600'} />
          <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white">Stream: {isPlaying ? 'Live' : 'Buffered'}</span>
        </div>
      </div>
    </div>
  );
};

export default BookViewer;
