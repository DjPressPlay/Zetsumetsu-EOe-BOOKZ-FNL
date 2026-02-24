
import React, { useState, useEffect, useMemo } from 'react';
import { HashRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { BookMetadata } from './types';
import Navbar from './components/Navbar';
import BookCard from './components/BookCard';
import SocialPage from './components/SocialPage';
import BookViewer from './components/BookViewer';
import AuthorPage from './components/AuthorPage';
import UploadModal from './components/UploadModal';
import Footer from './components/Footer';
import Walkthrough from './components/Walkthrough';
import { getAllMetadata } from './services/db';
import { getSupabase } from './services/supabase';
import { AlertCircle, Copy, Check, Search } from 'lucide-react';

const CATEGORIES = [
  "LIGHTHEARTED COMEDY", "NEON NOIR DETECTIVE", "DARK SCI-FI", "HIGH FANTASY", 
  "CLASSIC HORROR", "WASTELAND APOCALYPSE", "SUPERHERO ACTION", "TEEN DRAMA / SLICE OF LIFE"
];

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
  upload_date TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE bookz ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read" ON bookz FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON bookz FOR INSERT WITH CHECK (true);`;

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

const HomePage: React.FC<{ books: BookMetadata[], error: string | null, searchQuery: string, setSearchQuery: (q: string) => void }> = ({ books, error, searchQuery, setSearchQuery }) => {
  const filteredBooks = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return books;
    return books.filter(b => 
      b.title.toLowerCase().includes(q) || 
      b.author.toLowerCase().includes(q) || 
      b.genre.toLowerCase().includes(q)
    );
  }, [books, searchQuery]);

  return (
    <div className="min-h-screen bg-[#020202] text-white">
      <Navbar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      <Walkthrough />
      
      <div className="pt-24">
        <section className="max-w-[1600px] mx-auto px-6 py-10 overflow-hidden" id="featured-archives">
          <div className="flex overflow-x-auto gap-4 pb-8 no-scrollbar snap-x snap-mandatory md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 md:gap-6 md:overflow-visible md:pb-0">
            {filteredBooks.slice(0, 5).map((book) => (
              <div key={book.id} className="min-w-[280px] w-[85vw] md:w-auto md:min-w-0 snap-center">
                <BookCard book={book} />
              </div>
            ))}
          </div>
        </section>

        <div className="bg-black border-y border-white/5 py-4">
          <div className="max-w-[1600px] mx-auto px-6 flex items-center gap-10 overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest shrink-0 border-r border-white/10 pr-6">FLOOR LEVELS:</span>
            {CATEGORIES.map(cat => (
              <button 
                key={cat} 
                onClick={() => setSearchQuery(cat === searchQuery ? "" : cat)}
                className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap ${searchQuery === cat ? 'text-[#00c2ff]' : 'text-slate-400 hover:text-[#00c2ff]'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <section className="py-24 md:py-32 px-4 text-center">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-[8vw] md:text-[7vw] font-black tracking-tighter leading-none italic uppercase select-none text-white drop-shadow-2xl">
              Zetsumetsu <span className="text-[#00c2ff] drop-shadow-[0_0_30px_rgba(0,194,255,0.4)]">EOe</span> BOOKZ
            </h1>
            <div className="flex items-center justify-center gap-6 mt-6">
              <div className={`h-[1px] w-12 md:w-32 bg-gradient-to-r from-transparent ${searchQuery ? 'to-[#00c2ff]' : 'to-[#00c2ff]/40'} transition-all duration-300`} />
              <span className={`text-[10px] md:text-[12px] font-black uppercase tracking-[0.5em] md:tracking-[1em] whitespace-nowrap transition-all duration-300 ${searchQuery ? 'text-[#00c2ff] animate-pulse' : 'text-slate-600'}`}>
                {searchQuery ? `SYNCING SEARCH PROTOCOL ${searchQuery.length}` : 'NEURAL DIGITAL ARCHIVES'}
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

const App: React.FC = () => {
  const [books, setBooks] = useState<BookMetadata[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const refreshBooks = async () => {
    const supabase = getSupabase();
    if (!supabase) {
      setShowSetup(true);
      return;
    }
    try {
      const data = await getAllMetadata();
      setBooks(data);
      setError(null);
      setShowSetup(false);
    } catch (err: any) {
      setError(err.message || 'Error');
      if (err.message?.includes('does not exist')) setShowSetup(true);
    }
  };

  useEffect(() => {
    refreshBooks();
    window.addEventListener('show-setup-guide', () => setShowSetup(true));
  }, []);

  if (showSetup) return <SetupGuide error={error || undefined} />;

  return (
    <Router>
      <div className="min-h-screen bg-black flex flex-col font-sans selection:bg-[#00c2ff] selection:text-black">
        <Routes>
          <Route path="/" element={<HomePage books={books} error={error} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />} />
          <Route path="/book/:id" element={<SocialPage />} />
          <Route path="/read/:id" element={<BookViewer />} />
          <Route path="/author/:name" element={<AuthorPage />} />
        </Routes>
        <UploadModal onUploadComplete={refreshBooks} />
      </div>
    </Router>
  );
};

export default App;
