
import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BookMetadata, BookData } from '../types';
import { renderPdfPage, renderPdfPageToDataUrl, clearPageDataUrlCache } from '../services/pdfService';
import { getBookMetadata, getBookData, awardMarqs, recordLedgerAction } from '../services/db';
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
  Maximize,
  RotateCcw
} from 'lucide-react';

const SPEEDS = {
  AMBIENT: 15000,
  STANDARD: 8000,
  RAPID: 4000
};

interface FlipAnimationData {
  direction: 'next' | 'prev';
  fromLeftImg: string;
  fromRightImg: string;
  toLeftImg: string | null;
  toRightImg: string | null;
  active: boolean;
  targetPage: number;
}

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
  const [zoom, setZoom] = useState(1);

  // Magazine Page Flip Animation State
  const [flipData, setFlipData] = useState<FlipAnimationData | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);

  // Mobile orientation detection
  const [isPortrait, setIsPortrait] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [dismissRotatePrompt, setDismissRotatePrompt] = useState(false);
  
  const coverCanvasRef = useRef<HTMLCanvasElement>(null);
  const leftCanvasRef = useRef<HTMLCanvasElement>(null);
  const rightCanvasRef = useRef<HTMLCanvasElement>(null);
  const uiTimeoutRef = useRef<number | null>(null);
  const readPagesRef = useRef<Set<number>>(new Set());

  // Page geometry: Page 1 is the closed front cover.
  // Interior spreads start at page 2: [2, 3], [4, 5], [6, 7], etc.
  const isCover = currentPage === 1;
  const leftPage = isCover ? null : (currentPage % 2 === 0 ? currentPage : currentPage - 1);
  const rightPage = isCover ? null : (metadata && leftPage && leftPage + 1 <= metadata.pages ? leftPage + 1 : null);

  // Clear page image cache on book change
  useEffect(() => {
    clearPageDataUrlCache();
  }, [id]);

  // Track mobile device & orientation changes
  useEffect(() => {
    const checkOrientation = () => {
      const portrait = window.innerHeight > window.innerWidth;
      const mobile = window.innerWidth < 820 || (('ontouchstart' in window || navigator.maxTouchPoints > 0) && Math.min(window.innerWidth, window.innerHeight) < 800);
      setIsPortrait(portrait);
      setIsMobile(mobile);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // Award Marqs and record ledger for visible pages
  useEffect(() => {
    if (metadata) {
      const pagesToAward: number[] = [];
      if (currentPage === 1) {
        pagesToAward.push(1);
      } else {
        if (leftPage) pagesToAward.push(leftPage);
        if (rightPage) pagesToAward.push(rightPage);
      }

      pagesToAward.forEach(page => {
        if (!readPagesRef.current.has(page)) {
          readPagesRef.current.add(page);
          awardMarqs('read_page', `Read Page ${page} of "${metadata.title}"`);
          
          recordLedgerAction({
            action: 'read_page',
            targetTitle: metadata.title,
            targetId: metadata.id,
            targetPath: `/read/${metadata.id}`,
            metadata: {
              page,
              totalPages: metadata.pages,
              marqsAmount: 0.25
            }
          }).catch(() => {});
        }
      });
    }
  }, [currentPage, leftPage, rightPage, metadata]);

  useEffect(() => {
    if (id) {
      Promise.all([getBookMetadata(id), getBookData(id)]).then(([meta, data]) => {
        setMetadata(meta);
        setPdfData(data);
        setLoading(false);
      });
    }
  }, [id]);

  // Background pre-rendering of adjacent pages for instantaneous magazine flips
  useEffect(() => {
    if (!pdfData || !metadata) return;
    const adjacentPages = currentPage === 1 
      ? [1, 2, 3] 
      : [
          currentPage === 2 ? 1 : currentPage - 2,
          currentPage - 1,
          currentPage + 2,
          currentPage + 3
        ];
    adjacentPages.filter(p => p >= 1 && p <= metadata.pages).forEach(p => {
      renderPdfPageToDataUrl(pdfData.pdfData, p).catch(() => {});
    });
  }, [pdfData, currentPage, metadata]);

  // Trigger flip activation on next tick for CSS 3D transition
  useEffect(() => {
    if (flipData && !flipData.active) {
      const frame = requestAnimationFrame(() => {
        setFlipData(prev => prev ? { ...prev, active: true } : null);
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [flipData]);

  // Settle flip animation cleanly without flash: canvases were already updated in background
  useEffect(() => {
    if (flipData && flipData.active) {
      const timer = setTimeout(() => {
        setFlipData(null);
        setIsFlipping(false);
      }, 650);
      return () => clearTimeout(timer);
    }
  }, [flipData]);

  // Render pages using double-buffering (zero blank flashing)
  useEffect(() => {
    if (pdfData) {
      if (currentPage === 1) {
        if (coverCanvasRef.current) {
          renderPdfPage(pdfData.pdfData, 1, coverCanvasRef.current).catch(err => {
            console.error('Cover render error:', err);
          });
        }
      } else {
        const tasks: Promise<any>[] = [];
        if (leftCanvasRef.current && leftPage) {
          tasks.push(renderPdfPage(pdfData.pdfData, leftPage, leftCanvasRef.current));
        }
        if (rightCanvasRef.current && rightPage) {
          tasks.push(renderPdfPage(pdfData.pdfData, rightPage, rightCanvasRef.current));
        }
        Promise.all(tasks).catch(err => {
          console.error('Spread render error:', err);
        });
      }
    }
  }, [pdfData, currentPage, leftPage, rightPage]);

  const copyAuthorUrl = () => {
    if (!metadata) return;
    const baseUrl = window.location.href.split('#')[0];
    const authorUrl = `${baseUrl}#/author/${encodeURIComponent(metadata.author)}`;
    navigator.clipboard.writeText(authorUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Flip Forward (Magazine Turn Next)
  const handleNext = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (isFlipping || !metadata || !pdfData) return;

    if (currentPage === 1) {
      // Opening the cover: from Page 1 to Spread [2, 3]
      if (metadata.pages < 2) return;
      const nextLeft = 2;
      const nextRight = 3 <= metadata.pages ? 3 : null;

      setIsFlipping(true);

      try {
        const fromCoverImg = coverCanvasRef.current ? coverCanvasRef.current.toDataURL('image/jpeg', 0.9) : '';
        const [toLeftImg, toRightImg] = await Promise.all([
          renderPdfPageToDataUrl(pdfData.pdfData, nextLeft),
          nextRight ? renderPdfPageToDataUrl(pdfData.pdfData, nextRight) : Promise.resolve(null)
        ]);

        if (!fromCoverImg || !toLeftImg) {
          setCurrentPage(nextLeft);
          setIsFlipping(false);
          return;
        }

        // Mount 3D flip leaf showing the cover opening across the spine
        setFlipData({
          direction: 'next',
          fromLeftImg: '',
          fromRightImg: fromCoverImg,
          toLeftImg,
          toRightImg,
          active: false,
          targetPage: nextLeft
        });

        setCurrentPage(nextLeft);
      } catch (err) {
        console.error('Flip next from cover error:', err);
        setCurrentPage(nextLeft);
        setIsFlipping(false);
      }
      return;
    }

    // Normal interior spread flip
    const currentLeft = leftPage!;
    const nextLeft = currentLeft + 2;
    const nextRight = nextLeft + 1 <= metadata.pages ? nextLeft + 1 : null;
    if (nextLeft > metadata.pages) return;

    setIsFlipping(true);

    try {
      const fromLeftImg = leftCanvasRef.current ? leftCanvasRef.current.toDataURL('image/jpeg', 0.9) : '';
      const fromRightImg = rightCanvasRef.current ? rightCanvasRef.current.toDataURL('image/jpeg', 0.9) : '';

      const [toLeftImg, toRightImg] = await Promise.all([
        renderPdfPageToDataUrl(pdfData.pdfData, nextLeft),
        nextRight ? renderPdfPageToDataUrl(pdfData.pdfData, nextRight) : Promise.resolve(null)
      ]);

      if (!fromRightImg || !toLeftImg) {
        setCurrentPage(nextLeft);
        setIsFlipping(false);
        return;
      }

      // Mount 3D flip leaf showing the exact transition
      setFlipData({
        direction: 'next',
        fromLeftImg,
        fromRightImg,
        toLeftImg,
        toRightImg,
        active: false,
        targetPage: nextLeft
      });

      // Concurrently update currentPage so the double-buffered canvases render
      // the new spread underneath in the background while the flip is turning!
      setCurrentPage(nextLeft);
    } catch (err) {
      console.error('Flip next error:', err);
      setCurrentPage(nextLeft);
      setIsFlipping(false);
    }
  };

  // Flip Backward (Magazine Turn Previous)
  const handlePrev = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (isFlipping || !metadata || !pdfData) return;
    if (currentPage <= 1) return;

    if (currentPage === 2) {
      // Closing the book: from Spread [2, 3] back to Cover (Page 1)
      setIsFlipping(true);

      try {
        const fromLeftImg = leftCanvasRef.current ? leftCanvasRef.current.toDataURL('image/jpeg', 0.9) : '';
        const fromRightImg = rightCanvasRef.current ? rightCanvasRef.current.toDataURL('image/jpeg', 0.9) : '';
        const toCoverImg = await renderPdfPageToDataUrl(pdfData.pdfData, 1);

        if (!fromLeftImg || !toCoverImg) {
          setCurrentPage(1);
          setIsFlipping(false);
          return;
        }

        setFlipData({
          direction: 'prev',
          fromLeftImg,
          fromRightImg,
          toLeftImg: '',
          toRightImg: toCoverImg,
          active: false,
          targetPage: 1
        });

        setCurrentPage(1);
      } catch (err) {
        console.error('Flip prev to cover error:', err);
        setCurrentPage(1);
        setIsFlipping(false);
      }
      return;
    }

    // Normal interior spread flip
    const prevLeft = Math.max(2, (leftPage || 4) - 2);
    const prevRight = prevLeft + 1 <= metadata.pages ? prevLeft + 1 : null;

    setIsFlipping(true);

    try {
      const fromLeftImg = leftCanvasRef.current ? leftCanvasRef.current.toDataURL('image/jpeg', 0.9) : '';
      const fromRightImg = rightCanvasRef.current ? rightCanvasRef.current.toDataURL('image/jpeg', 0.9) : '';

      const [toLeftImg, toRightImg] = await Promise.all([
        renderPdfPageToDataUrl(pdfData.pdfData, prevLeft),
        prevRight ? renderPdfPageToDataUrl(pdfData.pdfData, prevRight) : Promise.resolve(null)
      ]);

      if (!fromLeftImg || (!toRightImg && prevRight !== null)) {
        setCurrentPage(prevLeft);
        setIsFlipping(false);
        return;
      }

      setFlipData({
        direction: 'prev',
        fromLeftImg,
        fromRightImg,
        toLeftImg,
        toRightImg,
        active: false,
        targetPage: prevLeft
      });

      // Concurrently update currentPage so the double-buffered canvases render
      // the previous spread underneath in the background while the flip is turning!
      setCurrentPage(prevLeft);
    } catch (err) {
      console.error('Flip prev error:', err);
      setCurrentPage(prevLeft);
      setIsFlipping(false);
    }
  };

  // Auto-play advances by magazine spread flip
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
        if (!isFlipping) {
          const isAtEnd = currentPage === 1 
            ? metadata.pages < 2 
            : (rightPage ? rightPage >= metadata.pages : (leftPage ? leftPage >= metadata.pages : false));
          if (isAtEnd) {
            setIsPlaying(false);
          } else {
            handleNext();
          }
        }
        setProgress(0);
      }, duration);
    } else {
      setProgress(0);
    }
    return () => { clearInterval(interval); clearInterval(progressInterval); };
  }, [isPlaying, playSpeed, metadata, currentPage, leftPage, rightPage, isFlipping]);

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

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isFlipping) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        handleNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        handlePrev();
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, leftPage, rightPage, metadata, isFlipping]);

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

  const isNextDisabled = !metadata || (currentPage === 1 ? metadata.pages < 2 : (rightPage ? rightPage >= metadata.pages : (leftPage ? leftPage >= metadata.pages : true))) || isPlaying || isFlipping;
  const isPrevDisabled = currentPage <= 1 || isPlaying || isFlipping;

  return (
    <div className={`h-screen w-screen bg-black text-white overflow-hidden flex flex-col transition-all duration-700 ${!uiVisible ? 'cursor-none' : ''}`}>
      
      {/* 0. Mobile Rotation Prompt Overlay */}
      {isPortrait && isMobile && !dismissRotatePrompt && (
        <div className="fixed inset-0 z-[100] bg-black/92 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="max-w-xs w-full bg-[#0a0f14] border border-[#00c2ff]/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_60px_rgba(0,194,255,0.25)] flex flex-col items-center">
            
            {/* Animated Device Rotation Graphic */}
            <div className="relative w-20 h-20 mb-5 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-[#00c2ff]/10 animate-ping duration-1000" />
              <div className="relative w-14 h-20 rounded-2xl border-2 border-[#00c2ff] flex flex-col items-center justify-between p-1.5 shadow-[0_0_25px_rgba(0,194,255,0.5)]">
                <div className="w-4 h-0.5 bg-[#00c2ff]/60 rounded-full" />
                <RotateCcw className="w-5 h-5 text-[#00c2ff] animate-spin" style={{ animationDuration: '6s' }} />
                <div className="w-2 h-2 rounded-full border border-[#00c2ff]/60" />
              </div>
            </div>

            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[#00c2ff] mb-2">
              Authentic Book Mode
            </span>
            <h2 className="text-lg font-black uppercase tracking-tight text-white mb-2">
              Turn Your Device
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed mb-6 font-medium">
              Please turn your device to <span className="text-[#00c2ff] font-bold">landscape</span> to view two pages at once like an open book.
            </p>

            <button
              onClick={() => setDismissRotatePrompt(true)}
              className="w-full py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white text-[10px] font-black uppercase tracking-wider transition-colors border border-white/10"
            >
              Continue in Portrait
            </button>
          </div>
        </div>
      )}

      {/* 1. Global Progress Bar (Cyan Shadow) */}
      <div className="fixed top-0 left-0 right-0 z-50 h-[2px] bg-white/5">
        <div 
          className="h-full bg-[#00c2ff] transition-all duration-100 linear shadow-[0_0_15px_rgba(0,194,255,1)]"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 2. Main Controls Dock (Adaptive) */}
      <aside className={`fixed z-50 flex transition-all duration-500 transform 
        bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 
        landscape:bottom-auto landscape:top-1/2 landscape:right-3 landscape:left-auto landscape:-translate-y-1/2 landscape:flex-col landscape:translate-x-0 landscape:gap-2
        md:bottom-auto md:top-1/2 md:right-6 md:left-auto md:-translate-y-1/2 md:flex-col md:translate-x-0 md:gap-4 gap-2 sm:gap-4
        ${uiVisible ? 'translate-y-0 opacity-100 landscape:translate-x-0 md:translate-x-0' : 'translate-y-20 opacity-0 landscape:translate-x-20 md:translate-x-20 pointer-events-none'}`}>
        
        <div className="bg-[#0a0f14]/90 backdrop-blur-xl border border-white/10 p-1.5 sm:p-2 rounded-2xl md:rounded-3xl shadow-[0_20px_40px_rgba(0,0,0,0.8)] flex landscape:flex-col md:flex-col items-center gap-1.5 sm:gap-2 md:gap-3">
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className={`w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl md:rounded-2xl transition-all ${isPlaying ? 'bg-[#00c2ff] text-black shadow-[0_0_15px_rgba(0,194,255,0.4)]' : 'hover:bg-white/5 text-slate-400'}`}
            title={isPlaying ? 'Pause Auto-Flip' : 'Play Auto-Flip'}
          >
            {isPlaying ? <Pause size={16} className="sm:w-[18px] sm:h-[18px]" fill="currentColor" /> : <Play size={16} className="sm:w-[18px] sm:h-[18px]" fill="currentColor" />}
          </button>
          
          <div className="w-[1px] h-5 sm:h-6 landscape:w-6 landscape:h-[1px] md:w-8 md:h-[1px] bg-white/10" />
          
          <button 
            disabled={isPrevDisabled} 
            onClick={handlePrev}
            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl hover:bg-white/5 disabled:opacity-10 text-slate-400 hover:text-white transition-opacity"
            title="Previous 2 Pages"
          >
            <ChevronLeft className="landscape:hidden md:hidden" size={18} />
            <ChevronUp className="hidden landscape:block md:block" size={22} />
          </button>
          
          {/* Spread Page Indicator */}
          {currentPage === 1 ? (
            <div className="flex flex-col items-center min-w-[2.8rem] sm:min-w-[3.6rem]">
              <span className="text-[9px] sm:text-[10px] font-black text-[#00c2ff] uppercase tracking-wider leading-none whitespace-nowrap">
                COVER
              </span>
              <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 sm:mt-1 whitespace-nowrap">
                1 / {metadata.pages}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center min-w-[2.8rem] sm:min-w-[3.6rem]">
              <span className="text-[10px] sm:text-[11px] font-black text-[#00c2ff] italic leading-none whitespace-nowrap">
                {leftPage}{rightPage ? `–${rightPage}` : ''}
              </span>
              <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 sm:mt-1 whitespace-nowrap">
                / {metadata.pages}
              </span>
            </div>
          )}

          <button 
            disabled={isNextDisabled} 
            onClick={handleNext}
            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl hover:bg-white/5 disabled:opacity-10 text-slate-400 hover:text-white transition-opacity"
            title={currentPage === 1 ? "Open Book (Pages 2 & 3)" : "Next 2 Pages"}
          >
            <ChevronRight className="landscape:hidden md:hidden" size={18} />
            <ChevronDown className="hidden landscape:block md:block" size={22} />
          </button>
        </div>

        <div className="bg-[#0a0f14]/90 backdrop-blur-xl border border-white/10 p-1 rounded-xl md:rounded-2xl flex landscape:flex-col md:flex-col items-center gap-1">
          {(['AMBIENT', 'STANDARD', 'RAPID'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setPlaySpeed(s)}
              className={`w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-8 rounded-lg md:rounded-xl text-[7px] font-black tracking-tighter transition-all ${playSpeed === s ? 'bg-white text-black' : 'text-slate-500 hover:text-white/20'}`}
            >
              {s[0]}
            </button>
          ))}
        </div>

        <div className="bg-[#0a0f14]/90 backdrop-blur-xl border border-white/10 p-1.5 sm:p-2 rounded-xl md:rounded-3xl shadow-2xl flex landscape:flex-col md:flex-col items-center gap-1 sm:gap-2">
          <button 
            onClick={() => setZoom(prev => Math.min(prev + 0.25, 3))}
            className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 flex items-center justify-center rounded-lg hover:bg-white/5 text-slate-400 hover:text-white"
            title="Zoom In"
          >
            <ZoomIn size={15} className="sm:w-[18px] sm:h-[18px]" />
          </button>
          <button 
            onClick={() => setZoom(1)}
            className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 flex items-center justify-center rounded-lg hover:bg-white/5 text-slate-400 hover:text-white"
            title="Reset Zoom"
          >
            <Maximize size={14} className="sm:w-[16px] sm:h-[16px]" />
          </button>
          <button 
            onClick={() => setZoom(prev => Math.max(prev - 0.25, 0.5))}
            className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 flex items-center justify-center rounded-lg hover:bg-white/5 text-slate-400 hover:text-white"
            title="Zoom Out"
          >
            <ZoomOut size={15} className="sm:w-[18px] sm:h-[18px]" />
          </button>
        </div>
      </aside>

      {/* 3. Immersive Tap Zones (Navigation) */}
      <div className="fixed inset-0 z-10 pointer-events-none flex">
        <div onClick={handlePrev} className="w-1/4 h-full pointer-events-auto cursor-w-resize group" aria-label="Previous Pages">
          <div className="h-full flex items-center px-4 opacity-0 group-hover:opacity-10 transition-opacity">
             <ChevronLeft size={48} className="text-[#00c2ff]" />
          </div>
        </div>
        <div className="flex-1 h-full" />
        <div onClick={handleNext} className="w-1/4 h-full pointer-events-auto cursor-e-resize group" aria-label="Next Pages">
          <div className="h-full flex items-center justify-end px-4 opacity-0 group-hover:opacity-10 transition-opacity">
             <ChevronRight size={48} className="text-[#00c2ff]" />
          </div>
        </div>
      </div>

      {/* 4. Top Information Bar */}
      <div className={`fixed top-3 sm:top-4 md:top-6 left-3 sm:left-4 md:left-6 right-3 sm:right-4 md:right-6 z-50 flex justify-between items-center transition-all duration-500 ${uiVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10 pointer-events-none'}`}>
        <Link to={`/book/${id}`} className="flex items-center gap-2 sm:gap-3 md:gap-4 bg-[#0a0f14]/90 backdrop-blur-md border border-white/10 p-1 sm:p-1.5 md:p-2 pr-3 sm:pr-4 md:pr-6 rounded-xl md:rounded-2xl hover:bg-[#111] transition-all">
          <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 bg-white/5 rounded-lg md:rounded-xl flex items-center justify-center text-slate-400">
            <X size={16} className="sm:w-[18px] sm:h-[18px]" />
          </div>
          <div className="flex flex-col overflow-hidden max-w-[110px] xs:max-w-[150px] md:max-w-none">
            <span className="text-[8px] sm:text-[9px] md:text-[10px] font-black uppercase tracking-widest text-[#00c2ff] leading-none mb-0.5 sm:mb-1 truncate">Eject Archive</span>
            <span className="text-[7px] sm:text-[8px] md:text-[9px] font-mono text-slate-400 leading-none truncate">{metadata.title}</span>
          </div>
        </Link>

        <button 
          onClick={copyAuthorUrl}
          className="bg-white text-black h-8 sm:h-10 md:h-14 px-3 sm:px-4 md:px-8 rounded-xl md:rounded-2xl flex items-center gap-1.5 sm:gap-2 md:gap-3 font-black text-[7px] sm:text-[8px] md:text-[10px] uppercase tracking-[0.2em] hover:bg-[#00c2ff] transition-all shadow-2xl"
        >
          {copied ? <Check size={14} className="sm:w-[18px] sm:h-[18px]" /> : <Share2 size={14} className="sm:w-[18px] sm:h-[18px]" />}
          <span className="hidden xs:inline">{copied ? 'Origin Synced' : 'Author Hash'}</span>
        </button>
      </div>

      {/* 5. Reading Environment (2-Page Open Book Spread with 3D Magazine Page Flip) */}
      <main className="flex-1 w-full h-full relative bg-[#020202] overflow-auto no-scrollbar flex items-center justify-center p-2 sm:p-4 md:p-8 landscape:p-2">
        <div 
          className="relative flex items-center justify-center transition-transform duration-300 origin-center"
          style={{ transform: `scale(${zoom})` }}
        >
          {/* Real Book Container with 3D Perspective */}
          {currentPage === 1 && !flipData ? (
            /* 1. Closed Book (Cover Mode - Page 1 Only) */
            <div 
              onClick={handleNext}
              className="relative group cursor-pointer shadow-[0_25px_65px_rgba(0,0,0,0.95),0_0_80px_rgba(0,194,255,0.12)] rounded-r-xl rounded-l-md overflow-hidden bg-[#0d1217] flex items-stretch justify-center border border-white/15 max-h-[82vh] landscape:max-h-[92vh] md:max-h-[88vh] transition-transform duration-300 hover:scale-[1.01]"
            >
              {/* Canvas for Front Cover */}
              <div className="relative bg-white flex items-center justify-center overflow-hidden">
                <canvas 
                  ref={coverCanvasRef}
                  className="block max-h-[80vh] landscape:max-h-[90vh] md:max-h-[86vh] max-w-[90vw] md:max-w-[45vw] object-contain"
                />

                {/* Book Spine Binding on Left Edge */}
                <div className="absolute inset-y-0 left-0 w-4 sm:w-8 bg-gradient-to-r from-black/60 via-black/25 to-transparent pointer-events-none" />

                {/* Outer Edge Shadow on Right Edge */}
                <div className="absolute inset-y-0 right-0 w-3 sm:w-6 bg-gradient-to-l from-black/20 to-transparent pointer-events-none" />

                {/* Tasteful "Click Cover to Open" Pill */}
                <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 flex items-center gap-2 text-white text-[9px] font-black uppercase tracking-wider group-hover:border-[#00c2ff] group-hover:text-[#00c2ff] transition-all shadow-xl">
                  <span>Open Book</span>
                  <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>

              {/* Physical Page Stack Depth on the Right Side of Closed Book */}
              <div className="w-2 sm:w-3.5 bg-gradient-to-r from-[#1a202c] via-[#2d3748] to-[#1a202c] border-l border-black/40 shadow-inner flex flex-col justify-around py-4 opacity-80">
                <div className="w-full h-[1px] bg-white/10" />
                <div className="w-full h-[1px] bg-white/10" />
                <div className="w-full h-[1px] bg-white/10" />
                <div className="w-full h-[1px] bg-white/10" />
              </div>
            </div>
          ) : (
            /* 2. Open 2-Page Book Spread (Pages 2 & 3, 4 & 5, etc.) */
            <div 
              className="relative shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_80px_rgba(0,194,255,0.12)] rounded-lg overflow-hidden bg-[#0d1217] flex items-stretch justify-center border border-white/10 max-h-[82vh] landscape:max-h-[92vh] md:max-h-[88vh]"
              style={{ perspective: '2400px' }}
            >
              
              {/* Left Page (Verso) */}
              <div className="relative bg-white flex items-center justify-center overflow-hidden">
                <canvas 
                  ref={leftCanvasRef} 
                  className="block max-h-[80vh] landscape:max-h-[90vh] md:max-h-[86vh] max-w-[47vw] landscape:max-w-[45vw] md:max-w-[43vw] object-contain"
                />
                
                {/* Outer Left Edge Shadow (Curvature) */}
                <div className="absolute inset-y-0 left-0 w-3 sm:w-6 bg-gradient-to-r from-black/15 to-transparent pointer-events-none" />

                {/* Book Center Binding Gutter Shadow (Right edge of left page) */}
                <div className="absolute inset-y-0 right-0 w-6 sm:w-14 bg-gradient-to-l from-black/30 via-black/10 to-transparent pointer-events-none" />
              </div>

              {/* Book Center Spine Seam / Crease */}
              <div className="w-[1px] md:w-[2px] bg-black/40 z-20 shadow-[0_0_8px_rgba(0,0,0,0.9)] shrink-0" />

              {/* Right Page (Recto) */}
              <div className="relative bg-white flex items-center justify-center overflow-hidden">
                {rightPage ? (
                  <>
                    <canvas 
                      ref={rightCanvasRef} 
                      className="block max-h-[80vh] landscape:max-h-[90vh] md:max-h-[86vh] max-w-[47vw] landscape:max-w-[45vw] md:max-w-[43vw] object-contain"
                    />

                    {/* Book Center Binding Gutter Shadow (Left edge of right page) */}
                    <div className="absolute inset-y-0 left-0 w-6 sm:w-14 bg-gradient-to-r from-black/30 via-black/10 to-transparent pointer-events-none" />

                    {/* Outer Right Edge Shadow (Curvature) */}
                    <div className="absolute inset-y-0 right-0 w-3 sm:w-6 bg-gradient-to-l from-black/15 to-transparent pointer-events-none" />
                  </>
                ) : (
                  /* Back Endpaper / Blank page for single odd page ends */
                  <div className="flex flex-col items-center justify-center bg-[#0d1217] text-slate-500 p-8 min-h-[300px] w-[35vw] max-w-[43vw] h-full select-none border-l border-white/5">
                    <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center mb-3">
                      <span className="text-[#00c2ff] text-lg font-mono font-bold">Ω</span>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">End of Volume</span>
                    <span className="text-[8px] font-mono text-slate-600 mt-1 uppercase">Marqs Archives</span>
                  </div>
                )}
              </div>

              {/* 3D Magazine Page Flip Overlay */}
              {flipData && (
                <div 
                  className="absolute inset-0 z-30 flex items-stretch pointer-events-none"
                  style={{ perspective: '2400px' }}
                >
                  {/* Stationary Left Half */}
                  <div className="relative w-1/2 h-full bg-white overflow-hidden flex items-center justify-center">
                    {flipData.direction === 'next' ? (
                      flipData.fromLeftImg ? (
                        <img src={flipData.fromLeftImg} alt="" className="w-full h-full object-contain" />
                      ) : (
                        /* Opening from Cover: Inside Lining of Front Cover */
                        <div className="flex flex-col items-center justify-center bg-[#0d1217] text-slate-500 p-8 w-full h-full select-none">
                          <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center mb-2">
                            <span className="text-[#00c2ff] text-xs font-mono font-bold">M</span>
                          </div>
                          <span className="text-[8px] font-black uppercase tracking-[0.25em] text-slate-500">Inside Cover</span>
                        </div>
                      )
                    ) : (
                      flipData.targetPage === 1 ? (
                        /* Closing to Cover: Inside Lining of Front Cover */
                        <div className="flex flex-col items-center justify-center bg-[#0d1217] text-slate-500 p-8 w-full h-full select-none">
                          <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center mb-2">
                            <span className="text-[#00c2ff] text-xs font-mono font-bold">M</span>
                          </div>
                          <span className="text-[8px] font-black uppercase tracking-[0.25em] text-slate-500">Inside Cover</span>
                        </div>
                      ) : (
                        flipData.toLeftImg && <img src={flipData.toLeftImg} alt="" className="w-full h-full object-contain" />
                      )
                    )}
                    <div className="absolute inset-y-0 left-0 w-3 sm:w-6 bg-gradient-to-r from-black/15 to-transparent pointer-events-none" />
                    <div className="absolute inset-y-0 right-0 w-6 sm:w-14 bg-gradient-to-l from-black/30 via-black/10 to-transparent pointer-events-none" />
                  </div>

                  {/* Center Spine Crease */}
                  <div className="w-[1px] md:w-[2px] bg-black/50 z-40 shrink-0" />

                  {/* Stationary Right Half */}
                  <div className="relative w-1/2 h-full bg-white overflow-hidden flex items-center justify-center">
                    {flipData.direction === 'next' ? (
                      flipData.toRightImg ? (
                        <img src={flipData.toRightImg} alt="" className="w-full h-full object-contain" />
                      ) : (
                        <div className="flex flex-col items-center justify-center bg-[#0d1217] text-slate-500 p-8 w-full h-full select-none">
                          <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center mb-3">
                            <span className="text-[#00c2ff] text-lg font-mono font-bold">Ω</span>
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">End of Volume</span>
                          <span className="text-[8px] font-mono text-slate-600 mt-1 uppercase">Marqs Archives</span>
                        </div>
                      )
                    ) : (
                      flipData.fromRightImg ? (
                        <img src={flipData.fromRightImg} alt="" className="w-full h-full object-contain" />
                      ) : (
                        <div className="flex flex-col items-center justify-center bg-[#0d1217] text-slate-500 p-8 w-full h-full select-none">
                          <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center mb-3">
                            <span className="text-[#00c2ff] text-lg font-mono font-bold">Ω</span>
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">End of Volume</span>
                          <span className="text-[8px] font-mono text-slate-600 mt-1 uppercase">Marqs Archives</span>
                        </div>
                      )
                    )}
                    <div className="absolute inset-y-0 right-0 w-3 sm:w-6 bg-gradient-to-l from-black/15 to-transparent pointer-events-none" />
                    <div className="absolute inset-y-0 left-0 w-6 sm:w-14 bg-gradient-to-r from-black/30 via-black/10 to-transparent pointer-events-none" />
                  </div>

                  {/* 3D Flipping Leaf (Magazine Sheet Turning) */}
                  {flipData.direction === 'next' ? (
                    <div 
                      className="absolute top-0 bottom-0 left-1/2 w-1/2 z-50 origin-left"
                      style={{
                        transformStyle: 'preserve-3d',
                        WebkitTransformStyle: 'preserve-3d',
                        transform: flipData.active ? 'rotateY(-180deg)' : 'rotateY(0deg)',
                        WebkitTransform: flipData.active ? 'rotateY(-180deg)' : 'rotateY(0deg)',
                        transition: 'transform 600ms cubic-bezier(0.25, 1, 0.5, 1), box-shadow 600ms cubic-bezier(0.25, 1, 0.5, 1)',
                        boxShadow: flipData.active ? '-20px 0 35px rgba(0,0,0,0.5)' : 'none',
                      }}
                    >
                      {/* Front Face: fromRightImg (turns from right half across spine) */}
                      <div 
                        className="absolute inset-0 bg-white overflow-hidden flex items-center justify-center"
                        style={{ 
                          backfaceVisibility: 'hidden', 
                          WebkitBackfaceVisibility: 'hidden' 
                        }}
                      >
                        <img src={flipData.fromRightImg} alt="" className="w-full h-full object-contain" />
                        <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black/30 via-black/10 to-transparent pointer-events-none" />
                        <div className="absolute inset-y-0 right-0 w-4 bg-gradient-to-l from-black/15 to-transparent pointer-events-none" />
                        {/* Gentle gloss sheen */}
                        <div 
                          className="absolute inset-0 pointer-events-none transition-opacity duration-500"
                          style={{ 
                            opacity: flipData.active ? 0.15 : 0,
                            background: 'linear-gradient(to right, rgba(0,0,0,0.15) 0%, transparent 40%, rgba(255,255,255,0.15) 60%, rgba(0,0,0,0.1) 100%)'
                          }}
                        />
                      </div>

                      {/* Back Face: toLeftImg (lands on left half, upright and unmirrored) */}
                      <div 
                        className="absolute inset-0 bg-white overflow-hidden flex items-center justify-center"
                        style={{ 
                          backfaceVisibility: 'hidden', 
                          WebkitBackfaceVisibility: 'hidden',
                          transform: 'rotateY(180deg)',
                          WebkitTransform: 'rotateY(180deg)'
                        }}
                      >
                        <img src={flipData.toLeftImg || ''} alt="" className="w-full h-full object-contain" />
                        <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-black/30 via-black/10 to-transparent pointer-events-none" />
                        <div className="absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-black/15 to-transparent pointer-events-none" />
                        {/* Gentle gloss sheen */}
                        <div 
                          className="absolute inset-0 pointer-events-none transition-opacity duration-500"
                          style={{ 
                            opacity: flipData.active ? 0 : 0.15,
                            background: 'linear-gradient(to left, rgba(0,0,0,0.15) 0%, transparent 40%, rgba(255,255,255,0.15) 60%, rgba(0,0,0,0.1) 100%)'
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    /* Backward Flip: Leaf turns from left half across spine to right */
                    <div 
                      className="absolute top-0 bottom-0 left-0 w-1/2 z-50 origin-right"
                      style={{
                        transformStyle: 'preserve-3d',
                        WebkitTransformStyle: 'preserve-3d',
                        transform: flipData.active ? 'rotateY(180deg)' : 'rotateY(0deg)',
                        WebkitTransform: flipData.active ? 'rotateY(180deg)' : 'rotateY(0deg)',
                        transition: 'transform 600ms cubic-bezier(0.25, 1, 0.5, 1), box-shadow 600ms cubic-bezier(0.25, 1, 0.5, 1)',
                        boxShadow: flipData.active ? '20px 0 35px rgba(0,0,0,0.5)' : 'none',
                      }}
                    >
                      {/* Front Face: fromLeftImg (lifts from left half) */}
                      <div 
                        className="absolute inset-0 bg-white overflow-hidden flex items-center justify-center"
                        style={{ 
                          backfaceVisibility: 'hidden', 
                          WebkitBackfaceVisibility: 'hidden' 
                        }}
                      >
                        <img src={flipData.fromLeftImg} alt="" className="w-full h-full object-contain" />
                        <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-black/30 via-black/10 to-transparent pointer-events-none" />
                        <div className="absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-black/15 to-transparent pointer-events-none" />
                        <div 
                          className="absolute inset-0 pointer-events-none transition-opacity duration-500"
                          style={{ 
                            opacity: flipData.active ? 0.15 : 0,
                            background: 'linear-gradient(to left, rgba(0,0,0,0.15) 0%, transparent 40%, rgba(255,255,255,0.15) 60%, rgba(0,0,0,0.1) 100%)'
                          }}
                        />
                      </div>

                      {/* Back Face: toRightImg (lands on right half, upright and unmirrored) */}
                      <div 
                        className="absolute inset-0 bg-white overflow-hidden flex items-center justify-center"
                        style={{ 
                          backfaceVisibility: 'hidden', 
                          WebkitBackfaceVisibility: 'hidden',
                          transform: 'rotateY(-180deg)',
                          WebkitTransform: 'rotateY(-180deg)'
                        }}
                      >
                        {flipData.toRightImg ? (
                          <img src={flipData.toRightImg} alt="" className="w-full h-full object-contain" />
                        ) : (
                          <div className="flex flex-col items-center justify-center bg-[#0d1217] text-slate-500 p-8 w-full h-full select-none">
                            <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center mb-3">
                              <span className="text-[#00c2ff] text-lg font-mono font-bold">Ω</span>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">End of Volume</span>
                          </div>
                        )}
                        <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black/30 via-black/10 to-transparent pointer-events-none" />
                        <div className="absolute inset-y-0 right-0 w-4 bg-gradient-to-l from-black/15 to-transparent pointer-events-none" />
                        <div 
                          className="absolute inset-0 pointer-events-none transition-opacity duration-500"
                          style={{ 
                            opacity: flipData.active ? 0 : 0.15,
                            background: 'linear-gradient(to right, rgba(0,0,0,0.15) 0%, transparent 40%, rgba(255,255,255,0.15) 60%, rgba(0,0,0,0.1) 100%)'
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}
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

