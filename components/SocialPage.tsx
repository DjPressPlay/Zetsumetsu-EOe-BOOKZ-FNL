
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BookMetadata } from '../types';
import { getBookMetadata } from '../services/db';
import Footer from './Footer';
import { 
  Heart, 
  Share2, 
  BookOpen, 
  ArrowLeft, 
  Check,
  Link as LinkIcon,
  AlertCircle
} from 'lucide-react';

const SocialPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [book, setBook] = useState<BookMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    if (id) {
      setLoading(true);
      getBookMetadata(id)
        .then(data => {
          setBook(data);
          setLoading(false);
        })
        .catch(err => {
          setError(err.message);
          setLoading(false);
        });
    }
    window.scrollTo(0, 0);
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="w-12 h-12 border-2 border-t-[#00c2ff] rounded-full animate-spin" />
    </div>
  );

  if (error || !book) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-black text-white">
        <AlertCircle size={64} className="text-red-600 mb-6" />
        <h2 className="text-2xl font-black mb-4 uppercase">Book Not Found</h2>
        <Link to="/" className="text-[#00c2ff] font-bold underline uppercase">Return Home</Link>
      </div>
    );
  }

  const copyUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-[1600px] mx-auto p-6 flex justify-between items-center">
        <Link to="/" className="p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-all flex items-center gap-2">
          <ArrowLeft size={18} />
          <span className="text-[10px] font-black uppercase tracking-widest">Back</span>
        </Link>
        <button onClick={copyUrl} className="bg-[#00c2ff] text-black px-6 py-3 rounded-xl font-black flex items-center gap-2 uppercase text-[10px] tracking-widest">
          {copied ? <Check size={16} /> : <LinkIcon size={16} />}
          {copied ? 'Copied' : 'Copy Link'}
        </button>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-12 md:py-24 grid md:grid-cols-2 gap-20 items-center">
        <div className="relative">
          <div className="aspect-[3/4] rounded-3xl overflow-hidden border border-white/10 bg-[#0a0a0a] flex items-center justify-center">
            <img src={book.thumbnail} alt={book.title} className="max-w-full max-h-full object-contain p-12" />
          </div>
          <div className="mt-8 flex justify-center gap-10">
            <button onClick={() => setLiked(!liked)} className={`flex flex-col items-center gap-2 ${liked ? 'text-[#00c2ff]' : 'text-slate-500'}`}>
              <Heart size={28} fill={liked ? 'currentColor' : 'none'} />
              <span className="text-[10px] font-black uppercase">Like</span>
            </button>
            <button onClick={copyUrl} className="flex flex-col items-center gap-2 text-slate-500">
              <Share2 size={28} />
              <span className="text-[10px] font-black uppercase">Share</span>
            </button>
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <span className="px-3 py-1 bg-[#00c2ff]/10 text-[#00c2ff] border border-[#00c2ff]/20 rounded-md text-[10px] font-black uppercase tracking-widest mb-4 inline-block">
              {book.genre}
            </span>
            <h1 className="text-5xl font-black uppercase italic mb-2">{book.title}</h1>
            <p className="text-slate-500 font-bold text-xl uppercase">by {book.author}</p>
          </div>

          <div className="p-8 bg-[#0a0a0a] rounded-3xl border border-white/5 space-y-4">
            <div className="flex justify-between border-b border-white/5 pb-3">
              <span className="text-slate-500 text-[10px] font-black uppercase">ID</span>
              <span className="text-white text-[10px] font-mono">{book.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 text-[10px] font-black uppercase">Length</span>
              <span className="text-white text-[10px] font-black uppercase">{book.pages} Pages</span>
            </div>
          </div>

          <Link to={`/read/${book.id}`} className="w-full bg-[#00c2ff] text-black py-5 rounded-2xl font-black text-center text-xl flex items-center justify-center gap-3 uppercase">
            <BookOpen size={24} />
            Read Book
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SocialPage;
