
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BookMetadata, Comment } from '../types';
import { getBookMetadata, incrementBookReads, incrementBookUpvotes, getComments, addComment, checkUserUpvote, checkUserCommented } from '../services/db';
import Footer from './Footer';
import { 
  Eye, 
  Share2, 
  BookOpen, 
  ArrowLeft, 
  Check,
  Link as LinkIcon,
  AlertCircle,
  ChevronUp,
  MessageSquare,
  Send,
  User,
  Zap
} from 'lucide-react';

const getDeviceId = () => {
  let id = localStorage.getItem('ZETSU_DEVICE_ID');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('ZETSU_DEVICE_ID', id);
  }
  return id;
};

const SocialPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [book, setBook] = useState<BookMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [reads, setReads] = useState(0);
  const [upvotes, setUpvotes] = useState(0);
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [hasCommented, setHasCommented] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentAuthor, setCommentAuthor] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  useEffect(() => {
    if (id) {
      setLoading(true);
      const deviceId = getDeviceId();
      Promise.all([
        getBookMetadata(id),
        getComments(id),
        checkUserUpvote(id, deviceId),
        checkUserCommented(id, deviceId)
      ])
        .then(([bookData, commentData, upvoted, commented]) => {
          setBook(bookData);
          if (bookData) {
            setReads(bookData.reads || 0);
            setUpvotes(bookData.upvotes || 0);
          }
          setComments(commentData);
          setHasUpvoted(upvoted);
          setHasCommented(commented);
          setLoading(false);
        })
        .catch(err => {
          setError(err.message);
          setLoading(false);
        });
    }
    window.scrollTo(0, 0);
  }, [id]);

  const handleUpvote = async () => {
    if (!id || hasUpvoted) return;
    const deviceId = getDeviceId();
    const success = await incrementBookUpvotes(id, deviceId);
    if (success) {
      setUpvotes(prev => prev + 1);
      setHasUpvoted(true);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newComment.trim() || !commentAuthor.trim() || hasCommented) return;

    const deviceId = getDeviceId();
    setIsSubmittingComment(true);
    try {
      await addComment(id, commentAuthor, newComment, deviceId);
      const updatedComments = await getComments(id);
      setComments(updatedComments);
      setNewComment('');
      setHasCommented(true);
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

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
            <div className="flex flex-col items-center gap-2 text-[#00c2ff]">
              <Eye size={28} />
              <span className="text-[10px] font-black uppercase">{reads} Reads</span>
            </div>
            <button 
              onClick={handleUpvote}
              disabled={hasUpvoted}
              className={`flex flex-col items-center gap-2 transition-all group ${hasUpvoted ? 'text-[#FFD700]' : 'text-white hover:text-[#00c2ff]'}`}
            >
              <div className="relative">
                <ChevronUp size={28} className={hasUpvoted ? '' : 'group-hover:-translate-y-1 transition-transform'} />
                <div className={`absolute -top-1 -right-1 w-2 h-2 rounded-full animate-pulse ${hasUpvoted ? 'bg-[#FFD700]' : 'bg-[#00c2ff]'}`} />
              </div>
              <span className="text-[10px] font-black uppercase">{upvotes} Momentum</span>
            </button>
            <button onClick={copyUrl} className="flex flex-col items-center gap-2 text-slate-500 hover:text-[#00c2ff] transition-colors">
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
            <p className="text-slate-500 font-bold text-xl uppercase">NEURAL_ID: {book.author}</p>
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

          <Link 
            to={`/read/${book.id}`} 
            onClick={() => incrementBookReads(book.id)}
            className="w-full bg-[#00c2ff] text-black py-5 rounded-2xl font-black text-center text-xl flex items-center justify-center gap-3 uppercase hover:scale-[1.02] transition-transform"
          >
            <BookOpen size={24} />
            Read Book
          </Link>
        </div>
      </main>

      {/* Leave Comment (Comments) */}
      <section className="max-w-4xl mx-auto px-6 py-20 border-t border-white/5">
        <div className="flex items-center gap-4 mb-12">
          <MessageSquare size={24} className="text-[#00c2ff]" />
          <h2 className="text-2xl font-black uppercase italic tracking-tight">Leave Comment</h2>
          <div className="h-[1px] flex-1 bg-white/5" />
          <span className="text-[10px] font-mono text-slate-500">{comments.length} ENTRIES</span>
        </div>

        <div className="grid md:grid-cols-[300px_1fr] gap-12">
          {/* Comment Form */}
          <div className="space-y-6">
            <div className={`p-6 bg-[#0a0a0a] rounded-2xl border border-white/5 ${hasCommented ? 'opacity-50' : ''}`}>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[#00c2ff] mb-4">
                {hasCommented ? 'ENTRY_LOCKED' : 'Initialize Entry'}
              </h3>
              {hasCommented ? (
                <div className="text-center py-4">
                  <Check size={24} className="text-[#00c2ff] mx-auto mb-2" />
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Archival entry already recorded for this sector.</p>
                </div>
              ) : (
                <form onSubmit={handleCommentSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-600 uppercase tracking-widest ml-1">Neural ID</label>
                    <div className="relative">
                      <User size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input 
                        required
                        value={commentAuthor}
                        onChange={e => setCommentAuthor(e.target.value)}
                        placeholder="GUEST_ARCHIVIST"
                        className="w-full bg-black border border-white/10 py-2 pl-8 pr-4 rounded-xl text-[10px] font-bold text-white focus:outline-none focus:border-[#00c2ff]/50 transition-all uppercase"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-600 uppercase tracking-widest ml-1">Bitstream</label>
                    <textarea 
                      required
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      placeholder="Enter technical critique..."
                      rows={4}
                      className="w-full bg-black border border-white/10 p-4 rounded-xl text-[10px] font-mono text-slate-300 focus:outline-none focus:border-[#00c2ff]/50 transition-all uppercase resize-none"
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={isSubmittingComment}
                    className="w-full bg-white text-black py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-[#00c2ff] transition-all disabled:opacity-50"
                  >
                    {isSubmittingComment ? 'Syncing...' : <><Send size={12} /> Deploy Entry</>}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Comment List */}
          <div className="space-y-6">
            {comments.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-white/5 rounded-3xl">
                <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.3em]">No discourse detected in this sector.</p>
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="group p-6 bg-[#0a0a0a] rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#00c2ff]/10 flex items-center justify-center">
                        <User size={12} className="text-[#00c2ff]" />
                      </div>
                      <span className="text-[10px] font-black text-white uppercase tracking-tight">{comment.author}</span>
                    </div>
                    <span className="text-[8px] font-mono text-slate-600 uppercase">
                      {new Date(comment.timestamp).toLocaleDateString()} // {new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-slate-400 leading-relaxed uppercase">
                    {comment.text}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default SocialPage;
