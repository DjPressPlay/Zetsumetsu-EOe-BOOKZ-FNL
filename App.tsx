
import React, { useState, useEffect, useMemo } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { BookMetadata } from './types';
import Navbar from './components/Navbar';
import BookCard from './components/BookCard';
import SocialPage from './components/SocialPage';
import BookViewer from './components/BookViewer';
import AuthorPage from './components/AuthorPage';
import JessicaChat from './components/JessicaChat';
import Footer from './components/Footer';
import Walkthrough from './components/Walkthrough';
import { getAllMetadata, trackVisit, getNetworkStats, NetworkStats } from './services/db';
import { getSupabase } from './services/supabase';
import { AlertCircle, Copy, Check, Search, Activity, Zap } from 'lucide-react';

const CATEGORIES = [
  "GUIDES & PROTOCOLS", "NEURAL FICTION", "ACADEMIC NODES", "SYSTEM SCHEMATICS",
  "HISTORICAL TRACES", "VISUAL ARTIFACTS", "PHILOSOPHICAL CODES", "RAW DATA STREAMS"
];

const SECTOR_HIERARCHY: Record<string, string[]> = {
  "GUIDES & PROTOCOLS": ["MANUALS", "TECHNICAL DOCS", "HOW-TO", "TUTORIALS"],
  "NEURAL FICTION": ["NOVELS", "CREATIVE WRITING", "SCRIPTS", "POETRY"],
  "ACADEMIC NODES": ["RESEARCH PAPERS", "SCIENCE", "THEORY", "JOURNALS"],
  "SYSTEM SCHEMATICS": ["BLUEPRINTS", "ENGINEERING", "TECH SPECS", "DIAGRAMS"],
  "HISTORICAL TRACES": ["HISTORY", "RECORDS", "MEMOIRS", "ARCHIVES"],
  "VISUAL ARTIFACTS": ["ART", "PORTFOLIOS", "DESIGN", "PHOTOGRAPHY"],
  "PHILOSOPHICAL CODES": ["PHILOSOPHY", "ESSAYS", "MANIFESTOS", "ETHICS"],
  "RAW DATA STREAMS": ["LOGS", "DATABASES", "UNCATEGORIZED", "METADATA"]
};

const SetupGuide: React.FC<{ error?: string }> = ({ error }) => {
  const [copied, setCopied] = useState(false);
  const sqlCode = `-- Run this in Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS bookz (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  genre TEXT NOT NULL,
  pages INTEGER NOT NULL,
  thumbnail TEXT NOT NULL,
  upload_date TIMESTAMPTZ DEFAULT NOW(),
  reads INTEGER DEFAULT 0,
  upvotes INTEGER DEFAULT 0,
  user_id TEXT
);

CREATE TABLE IF NOT EXISTS user_credits (
  user_id TEXT PRIMARY KEY,
  credits INTEGER DEFAULT 10,
  is_premium BOOLEAN DEFAULT FALSE,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id TEXT REFERENCES bookz(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  text TEXT NOT NULL,
  user_id TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS upvotes_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id TEXT REFERENCES bookz(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  UNIQUE(book_id, user_id)
);

CREATE TABLE IF NOT EXISTS site_metrics (
  id TEXT PRIMARY KEY,
  count INTEGER DEFAULT 0
);

-- Optional: Function to increment count atomically
CREATE OR REPLACE FUNCTION increment_visitor_count()
RETURNS void AS $$
BEGIN
  INSERT INTO site_metrics (id, count)
  VALUES ('global', 1)
  ON CONFLICT (id)
  DO UPDATE SET count = site_metrics.count + 1;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE bookz ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read" ON bookz FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON bookz FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Read Metrics" ON site_metrics FOR SELECT USING (true);
CREATE POLICY "Public Update Metrics" ON site_metrics FOR ALL USING (true);`;

  const copySql = () => {
    navigator.clipboard.writeText(sqlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 font-mono">
      <div className="max-w-3xl w-full bg-[#0a0a0a] rounded-3xl shadow-2xl overflow-hidden border border-white/10 p-12">
        <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-8">System Initializer</h1>
        {error && <div className="bg-red-950/30 p-4 border border-red-900/50 text-red-500 text-xs mb-8">{error}</div>}
        <button onClick={copySql} className="text-[#00c2ff] text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
          {copied ? <Check size={14} /> : <Copy size={14} />} Copy Archival SQL
        </button>
        <pre className="bg-black/50 p-6 rounded-xl border border-white/5 text-[10px] text-indigo-400 overflow-x-auto mb-8">{sqlCode}</pre>
        <button onClick={() => window.location.reload()} className="w-full bg-[#00c2ff] text-black py-4 rounded-xl font-black uppercase tracking-widest text-sm">Initialize Archive</button>
      </div>
    </div>
  );
};

const SystemMetrics: React.FC<{ stats: NetworkStats | null }> = ({ stats }) => {
  if (!stats) return null;

  const items = [
    { label: 'NETWORK_VISITS', value: stats.visits.toString().padStart(6, '0') },
    { label: 'ARCHIVES_MINTED', value: stats.books.toString().padStart(4, '0') },
    { label: 'GENRE_SECTORS', value: stats.genres.toString().padStart(2, '0') },
    { label: 'AUTHORS', value: stats.authors.toString().padStart(3, '0') },
    { label: 'PAGES_PRESERVED', value: stats.pages.toLocaleString() },
  ];

  return (
    <div className="bg-black/40 border-b border-white/5 py-3 overflow-hidden">
      <div className="max-w-[1600px] mx-auto px-6 flex items-center justify-between gap-8">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00c2ff] animate-pulse" />
          <span className="text-[9px] font-black text-[#00c2ff] uppercase tracking-[0.3em]">LIVE_FEED</span>
        </div>
        <div className="flex items-center gap-8 md:gap-12 overflow-x-auto no-scrollbar">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-3 shrink-0">
              <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">{item.label}</span>
              <span className="text-[10px] font-mono text-white bg-white/5 px-2 py-0.5 rounded border border-white/5 tracking-tighter">
                [{item.value}]
              </span>
            </div>
          ))}
        </div>
        <div className="hidden lg:flex items-center gap-2 shrink-0">
          <span className="text-[8px] font-black text-slate-800 uppercase tracking-widest">SYNC_STATUS: OPTIMAL</span>
        </div>
      </div>
    </div>
  );
};

const HomePage: React.FC<{ books: BookMetadata[], error: string | null, searchQuery: string, setSearchQuery: (q: string) => void, stats: NetworkStats | null }> = ({ books, error, searchQuery, setSearchQuery, stats }) => {
  const [activeParentSector, setActiveParentSector] = useState<string | null>(null);

  const momentumBooks = useMemo(() => {
    return [...books].sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0)).slice(0, 5);
  }, [books]);

  const dynamicCategories = useMemo(() => {
    // If a parent sector is active, show its sub-sectors
    if (activeParentSector && SECTOR_HIERARCHY[activeParentSector]) {
      return SECTOR_HIERARCHY[activeParentSector];
    }

    // Otherwise, use the "Top 7" trending logic
    const top7Books = books.slice(0, 7);
    const topGenres = Array.from(new Set(top7Books.map(b => b.genre.toUpperCase())));
    
    let finalCategories = [...topGenres];
    
    if (finalCategories.length < 7) {
      const remainingSlots = 7 - finalCategories.length;
      const availableDefaults = CATEGORIES.filter(cat => !finalCategories.includes(cat));
      const shuffled = [...availableDefaults].sort(() => 0.5 - Math.random());
      finalCategories = [...finalCategories, ...shuffled.slice(0, remainingSlots)];
    }
    
    return finalCategories.slice(0, 8);
  }, [books, activeParentSector]);

  const filteredBooks = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return books;
    
    // Multi-term search logic (Intersection)
    const terms = q.split(/\s+/);
    return books.filter(b => 
      terms.every(term => 
        b.title.toLowerCase().includes(term) || 
        b.author.toLowerCase().includes(term) || 
        b.genre.toLowerCase().includes(term)
      )
    );
  }, [books, searchQuery]);

  const handleSectorClick = (cat: string) => {
    if (activeParentSector) {
      // If we are in a sub-sector view, clicking a sub-sector refines the search
      setSearchQuery(cat);
    } else {
      // Clicking a top-level sector enters its hierarchy and sets search
      setActiveParentSector(cat);
      setSearchQuery(cat);
    }
  };

  const resetHierarchy = () => {
    setActiveParentSector(null);
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white">
      <Navbar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      <Walkthrough />
      
      <div className="pt-24">
        <section className="max-w-[1600px] mx-auto px-6 py-10 overflow-hidden" id="featured-archives">
          <div className="flex items-center gap-4 mb-8">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-[#00c2ff]" />
              <span className="text-[11px] font-black uppercase tracking-[0.4em] text-white italic">Daily Momentum</span>
            </div>
            <div className="h-[1px] flex-1 bg-white/5" />
            <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Top Bitstreams Today</span>
          </div>
          <div className="flex overflow-x-auto gap-4 pb-8 no-scrollbar snap-x snap-mandatory md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 md:gap-6 md:overflow-visible md:pb-0">
            {momentumBooks.map((book, index) => (
              <div key={book.id} className="min-w-[280px] w-[85vw] md:w-auto md:min-w-0 snap-center relative">
                <div className="absolute -top-2 -left-2 z-20 w-8 h-8 bg-black border border-[#00c2ff]/30 rounded-lg flex items-center justify-center text-[#00c2ff] font-black italic text-xs shadow-[0_0_15px_rgba(0,194,255,0.2)]">
                  {index + 1}
                </div>
                <BookCard book={book} />
              </div>
            ))}
          </div>
        </section>

        <div className="bg-black border-y border-white/5 py-4">
          <div className="max-w-[1600px] mx-auto px-6 flex items-center gap-10 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-4 shrink-0 border-r border-white/10 pr-6">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">FLOOR LEVELS:</span>
              {activeParentSector && (
                <button 
                  onClick={resetHierarchy}
                  className="text-[8px] font-black text-[#00c2ff] bg-[#00c2ff]/10 px-2 py-0.5 rounded border border-[#00c2ff]/20 uppercase tracking-widest hover:bg-[#00c2ff] hover:text-black transition-all"
                >
                  [BACK_TO_ROOT]
                </button>
              )}
            </div>
            
            {dynamicCategories.map(cat => (
              <button 
                key={cat} 
                onClick={() => handleSectorClick(cat)}
                className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap ${searchQuery.includes(cat) ? 'text-[#00c2ff]' : 'text-slate-400 hover:text-[#00c2ff]'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <SystemMetrics stats={stats} />

        <section className="py-24 md:py-32 px-4 text-center">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-[8vw] md:text-[7vw] font-black tracking-tighter leading-none italic uppercase select-none text-white drop-shadow-2xl">
              Zetsumetsu <span className="text-[#00c2ff] drop-shadow-[0_0_30px_rgba(0,194,255,0.4)]">EOe</span> BOOKZ
            </h1>
            <div className="flex items-center justify-center gap-6 mt-6">
              <div className={`h-[1px] w-12 md:w-32 bg-gradient-to-r from-transparent ${searchQuery ? 'to-[#00c2ff]' : 'to-[#00c2ff]/40'} transition-all duration-300`} />
              <span className={`text-[10px] md:text-[12px] font-black uppercase tracking-[0.5em] md:tracking-[1em] whitespace-nowrap transition-all duration-300 ${searchQuery ? 'text-[#00c2ff] animate-pulse' : 'text-slate-600'}`}>
                {searchQuery ? `SYNCING SEARCH PROTOCOL ${searchQuery.length}` : 'THE INTERNET ARCHIVE, THE ZETSU WAY'}
              </span>
              <div className={`h-[1px] w-12 md:w-32 bg-gradient-to-l from-transparent ${searchQuery ? 'to-[#00c2ff]' : 'to-[#00c2ff]/40'} transition-all duration-300`} />
            </div>
          </div>
        </section>

        <section className="max-w-[1600px] mx-auto px-6 pb-40" id="global-shelf">
          <div className="flex items-center gap-6 mb-12">
            <span className={`text-[11px] font-black uppercase tracking-[0.5em] italic transition-colors ${searchQuery ? 'text-[#00c2ff]' : 'text-[#00c2ff]/60'}`}>DATA INDEX 01</span>
            <div className={`h-[1px] flex-1 ${searchQuery ? 'bg-[#00c2ff]/20' : 'bg-white/10'} transition-colors duration-300`} />
            <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest font-mono">ENTRIES // {filteredBooks.length.toString().padStart(3, '0')}</span>
          </div>

          {error ? (
            <div className="text-center py-40 border border-red-900/20 rounded-3xl bg-red-950/5">
              <AlertCircle className="mx-auto text-red-500 mb-4" />
              <h3 className="text-xl font-black uppercase tracking-widest">Archive Error</h3>
              <p className="text-slate-500 text-xs mt-2 uppercase tracking-widest">{error}</p>
            </div>
          ) : filteredBooks.length === 0 ? (
            <div className="text-center py-40 border border-white/5 rounded-[2.5rem] bg-[#050505] shadow-inner">
              <Search className="mx-auto text-slate-900 mb-6" size={64} />
              <h3 className="text-2xl font-black uppercase tracking-widest opacity-20 italic">NO MATCHING DATA FOUND</h3>
              <button onClick={() => setSearchQuery("")} className="mt-6 text-[10px] font-black text-[#00c2ff] uppercase tracking-widest hover:underline">Clear Search Protocol</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-x-8 gap-y-12">
              {filteredBooks.map((book) => (
                <div key={book.id} className="group relative">
                  <Link to={`/book/${book.id}`} className="block">
                    <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-[#0a0a0a] border border-white/5 mb-4 group-hover:border-[#00c2ff]/40 transition-all duration-300 shadow-2xl group-hover:shadow-[0_0_40px_rgba(0,194,255,0.15)] flex items-center justify-center">
                      <img src={book.thumbnail} className="absolute inset-0 w-full h-full object-cover blur-xl opacity-20 scale-110" aria-hidden="true" />
                      <img src={book.thumbnail} className="relative z-10 max-w-full max-h-full object-contain grayscale opacity-90 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700 group-hover:scale-105" alt={book.title} />
                      <div className="absolute top-3 left-3 z-20 px-2 py-0.5 bg-black/70 backdrop-blur-md rounded text-[7px] font-black text-white/70 border border-white/10 uppercase tracking-widest">{book.pages}P</div>
                    </div>
                    <div className="px-1">
                      <h4 className="text-[11px] font-black uppercase tracking-tight text-white/80 truncate mb-1 group-hover:text-[#00c2ff] transition-colors">{book.title}</h4>
                      <div className="flex justify-between items-center">
                        <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">v.ARCHIVE</span>
                        <div className="w-1 h-1 rounded-full bg-[#00c2ff] animate-pulse" />
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
        <Footer />
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const [books, setBooks] = useState<BookMetadata[]>([]);
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const location = useLocation();

  const refreshBooks = async () => {
    const supabase = getSupabase();
    if (!supabase) {
      setShowSetup(true);
      return;
    }
    try {
      const data = await getAllMetadata();
      setBooks(data);
      
      // Fetch stats
      const networkStats = await getNetworkStats(data);
      setStats(networkStats);
      
      setError(null);
      setShowSetup(false);
    } catch (err: any) {
      setError(err.message || 'Error');
      if (err.message?.includes('does not exist')) setShowSetup(true);
    }
  };

  useEffect(() => {
    trackVisit();
    refreshBooks();
    window.addEventListener('show-setup-guide', () => setShowSetup(true));
  }, []);

  // Re-fetch when returning to home page to ensure momentum is synced
  useEffect(() => {
    if (location.pathname === '/') {
      refreshBooks();
    }
  }, [location.pathname]);

  if (showSetup) return <SetupGuide error={error || undefined} />;

  return (
    <div className="min-h-screen bg-black flex flex-col font-sans selection:bg-[#00c2ff] selection:text-black">
      <Routes>
        <Route path="/" element={<HomePage books={books} error={error} searchQuery={searchQuery} setSearchQuery={setSearchQuery} stats={stats} />} />
        <Route path="/book/:id" element={<SocialPage />} />
        <Route path="/read/:id" element={<BookViewer />} />
        <Route path="/author/:name" element={<AuthorPage />} />
      </Routes>
      <JessicaChat books={books} />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;
