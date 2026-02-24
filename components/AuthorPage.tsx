
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BookMetadata } from '../types';
import { getAllMetadata } from '../services/db';
import Footer from './Footer';
import { ArrowLeft, Library, Globe, Database } from 'lucide-react';

const AuthorPage: React.FC = () => {
  const { name } = useParams<{ name: string }>();
  const [authorBooks, setAuthorBooks] = useState<BookMetadata[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const decodedName = decodeURIComponent(name || '');
    getAllMetadata().then(allBooks => {
      const filtered = allBooks.filter(b => b.author === decodedName);
      setAuthorBooks(filtered);
      setLoading(false);
    });
    window.scrollTo(0, 0);
  }, [name]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="w-12 h-12 border-2 border-[#00c2ff]/20 border-t-[#00c2ff] rounded-full animate-spin" />
    </div>
  );

  const decodedName = decodeURIComponent(name || 'Unknown Author');
  const initial = decodedName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-[#020202] text-white selection:bg-[#00c2ff] selection:text-black">
      <div className="max-w-[1600px] mx-auto p-6 flex items-center justify-between relative z-10">
        <Link to="/" className="bg-[#0a0f14] p-3 rounded-2xl border border-white/5 hover:bg-[#111] transition-all flex items-center gap-3">
          <ArrowLeft size={20} />
          <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Return to Global Archive</span>
        </Link>
        <div className="flex items-center gap-3 bg-[#0a0f14] p-3 rounded-2xl border border-white/5">
           <Database size={14} className="text-slate-600" />
           <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white">AUTHOR CORE STORAGE</span>
        </div>
      </div>

      <main className="max-w-[1600px] mx-auto px-6 py-12 md:py-24 mb-24">
        <div className="flex flex-col md:flex-row items-center gap-12 mb-32">
          <div className="relative group shrink-0">
             <div className="w-48 h-48 md:w-64 md:h-64 rounded-full bg-gradient-to-br from-[#00c2ff]/20 to-[#00c2ff]/5 border border-[#00c2ff]/30 flex items-center justify-center text-8xl md:text-9xl font-black italic text-white/20 select-none shadow-[0_0_50px_rgba(0,194,255,0.1)] group-hover:shadow-[0_0_80px_rgba(0,194,255,0.2)] transition-all duration-700 overflow-hidden relative">
                {initial}
                <div className="absolute inset-0 bg-[linear-gradient(transparent_0%,rgba(0,194,255,0.05)_50%,transparent_100%)] bg-[length:100%_4px] animate-[scan_4s_linear_infinite]" />
             </div>
             <div className="absolute -inset-4 bg-[#00c2ff]/5 blur-3xl rounded-full -z-10 group-hover:bg-[#00c2ff]/10 transition-all" />
          </div>

          <div className="text-center md:text-left space-y-6 max-w-2xl">
            <div>
              <span className="text-[10px] font-black text-[#00c2ff] tracking-[0.6em] uppercase mb-4 block">NEURAL ID: AUTHOR ENTITY</span>
              <h1 className="text-5xl md:text-8xl font-black italic uppercase tracking-tighter leading-none mb-4">{decodedName}</h1>
            </div>
            <div className="flex flex-wrap justify-center md:justify-start gap-4">
               <div className="bg-[#0a0a0a] border border-white/5 px-6 py-3 rounded-2xl flex items-center gap-3">
                  <Library size={18} className="text-[#00c2ff]" />
                  <span className="text-[10px] font-black uppercase tracking-widest">{authorBooks.length} ARCHIVES</span>
               </div>
               <div className="bg-[#0a0a0a] border border-white/5 px-6 py-3 rounded-2xl flex items-center gap-3">
                  <Globe size={18} className="text-[#00c2ff]" />
                  <span className="text-[10px] font-black uppercase tracking-widest">LIVE ON NETWORK</span>
               </div>
            </div>
          </div>
        </div>

        <section>
          <div className="flex items-center gap-6 mb-12">
            <span className="text-[11px] font-black uppercase tracking-[0.5em] text-[#00c2ff] italic">AUTHOR DATA SET</span>
            <div className="h-[1px] flex-1 bg-white/10" />
            <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest font-mono">ENTRIES // {authorBooks.length.toString().padStart(3, '0')}</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-x-8 gap-y-12">
            {authorBooks.map((book) => (
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
                      <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">{book.genre}</span>
                      <div className="w-1 h-1 rounded-full bg-[#00c2ff] animate-pulse" />
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
      <style>{`@keyframes scan { 0% { transform: translateY(-100%); } 100% { transform: translateY(100%); } }`}</style>
    </div>
  );
};

export default AuthorPage;
