import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BookMetadata, Comment } from '../types';
import { getBookMetadata, incrementBookReads, incrementBookUpvotes, getComments, addComment, checkUserUpvote, checkUserCommented, awardMarqs, recordLedgerAction } from '../services/db';
import { getDeviceId } from '../services/deviceId';
import { normalizeSectorName } from '../services/categories';
import Footer from './Footer';
import MarqsEconomyModal from './MarqsEconomyModal';
import MarqsLogo from './MarqsLogo';
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
  Zap,
  Flame,
  Coins
} from 'lucide-react';

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
  const [commentError, setCommentError] = useState<string | null>(null);
  const [isBoostModalOpen, setIsBoostModalOpen] = useState(false);
  
  const viewedRef = useRef(false);

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
            
            // Award view marqs once per session per book
            if (!viewedRef.current) {
              viewedRef.current = true;
              awardMarqs('view', `Viewed "${bookData.title}"`);
              recordLedgerAction({
                action: 'view',
                targetTitle: bookData.title,
                targetId: bookData.id,
                targetPath: `/book/${bookData.id}`,
                metadata: {
                  genre: bookData.genre,
                  marqsAmount: 5
                }
              }).catch(() => {});
            }
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
    setCommentError(null);
    try {
      await addComment(id, commentAuthor, newComment, deviceId);
      const updatedComments = await getComments(id);
      setComments(updatedComments);
      setNewComment('');
      setHasCommented(true);

      // Award Marqs for comment
      awardMarqs('comment', `Comment on "${book?.title || 'Archive'}"`);

      // Record to The Ledger
      recordLedgerAction({
        action: 'comment',
        actor: commentAuthor,
        targetTitle: book?.title || 'Book',
        targetId: id,
        targetPath: `/book/${id}`,
        title: `${commentAuthor} commented on "${book?.title || 'Archive'}"`,
        metadata: {
          marqsAmount: 5,
          details: newComment.substring(0, 80)
        }
      }).catch(() => {});
    } catch (err: any) {
      console.error('Failed to add comment:', err);
      setCommentError(err?.message || 'Comment could not be posted.');
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
    awardMarqs('share', `Shared link for "${book.title}"`);
    recordLedgerAction({
      action: 'share',
      targetTitle: book.title,
      targetId: book.id,
      targetPath: `/book/${book.id}`,
      metadata: {
        marqsAmount: 5
      }
    }).catch(() => {});
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white flex flex-col">
      {/* Top Header Navigation */}
      <div className="max-w-[1600px] w-full mx-auto px-4 py-3 sm:px-6 sm:py-4 flex justify-between items-center border-b border-white/5">
        <Link 
          to="/" 
          className="px-3 py-2 sm:px-4 sm:py-2.5 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all flex items-center gap-2"
        >
          <ArrowLeft size={16} className="text-[#00c2ff]" />
          <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Back to Archives</span>
        </Link>
        
        <div className="flex items-center gap-2 sm:gap-3">
          <button 
            onClick={() => setIsBoostModalOpen(true)}
            className="bg-gradient-to-r from-amber-500 to-orange-500 text-black px-3 py-2 sm:px-5 sm:py-2.5 rounded-xl font-black flex items-center gap-1.5 sm:gap-2 uppercase text-[9px] sm:text-[10px] tracking-widest hover:brightness-110 transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)]"
          >
            <Flame size={14} className="fill-black" />
            <span>Buy Back Boost</span>
          </button>

          <button 
            onClick={copyUrl} 
            className="bg-[#00c2ff] text-black px-3 py-2 sm:px-5 sm:py-2.5 rounded-xl font-black flex items-center gap-1.5 sm:gap-2 uppercase text-[9px] sm:text-[10px] tracking-widest hover:bg-[#38d4ff] transition-all shadow-[0_0_15px_rgba(0,194,255,0.25)]"
          >
            {copied ? <Check size={14} /> : <LinkIcon size={14} />}
            <span>{copied ? 'Copied (+5 Marqs)' : 'Share Link (+5 Marqs)'}</span>
          </button>
        </div>
      </div>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 md:py-16 grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 md:gap-16 items-start">
        {/* Left Column: Book Cover / Preview Showcase */}
        <div className="flex flex-col items-center w-full max-w-sm sm:max-w-md mx-auto">
          <div className="relative w-full aspect-[3/4] max-h-[460px] sm:max-h-[520px] rounded-2xl sm:rounded-3xl overflow-hidden border border-white/10 bg-[#0a0f14] shadow-[0_15px_45px_rgba(0,0,0,0.85)] flex items-center justify-center p-3 sm:p-4 group">
            {/* Ambient Blurred Backdrop */}
            <img 
              src={book.thumbnail} 
              alt="" 
              aria-hidden="true" 
              className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-20 scale-125 pointer-events-none" 
            />
            
            {/* Main Cover Image */}
            <img 
              src={book.thumbnail} 
              alt={book.title} 
              className="relative z-10 max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-transform duration-500 group-hover:scale-[1.02]" 
            />
            
            {/* Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none z-20" />
            <div className="absolute top-3 left-3 z-30">
              <span className="px-2.5 py-1 bg-black/70 backdrop-blur-md text-[#00c2ff] border border-[#00c2ff]/30 rounded-lg text-[8px] font-black uppercase tracking-widest">
                {normalizeSectorName(book.genre)}
              </span>
            </div>
          </div>

          {/* Social Interactions Strip */}
          <div className="mt-4 sm:mt-6 w-full bg-[#0a0f14]/80 backdrop-blur-md border border-white/5 rounded-2xl p-2.5 sm:p-3 flex justify-around items-center">
            <div className="flex flex-col items-center gap-1 text-[#00c2ff]">
              <Eye size={20} className="sm:w-6 sm:h-6" />
              <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-slate-300">{reads} Reads</span>
            </div>

            <div className="w-[1px] h-6 bg-white/10" />

            <button 
              onClick={handleUpvote}
              disabled={hasUpvoted}
              className={`flex flex-col items-center gap-1 transition-all group ${hasUpvoted ? 'text-[#FFD700]' : 'text-white hover:text-[#00c2ff]'}`}
            >
              <div className="relative">
                <ChevronUp size={20} className={`sm:w-6 sm:h-6 ${hasUpvoted ? '' : 'group-hover:-translate-y-0.5 transition-transform'}`} />
                <div className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full animate-pulse ${hasUpvoted ? 'bg-[#FFD700]' : 'bg-[#00c2ff]'}`} />
              </div>
              <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider">{upvotes} Momentum</span>
            </button>

            <div className="w-[1px] h-6 bg-white/10" />

            <button 
              onClick={copyUrl} 
              className="flex flex-col items-center gap-1 text-slate-400 hover:text-[#00c2ff] transition-colors"
            >
              <Share2 size={20} className="sm:w-6 sm:h-6" />
              <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider">{copied ? 'Copied' : 'Share'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Book Info, Stats & Primary Action */}
        <div className="flex flex-col justify-center space-y-4 sm:space-y-6 w-full">
          <div>
            <span className="px-2.5 py-1 bg-[#00c2ff]/10 text-[#00c2ff] border border-[#00c2ff]/20 rounded-md text-[8px] sm:text-[9px] font-black uppercase tracking-widest mb-2 sm:mb-3 inline-block">
              {normalizeSectorName(book.genre)}
            </span>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black uppercase italic tracking-tight leading-tight text-white mb-2">
              {book.title}
            </h1>
            <Link 
              to={`/author/${encodeURIComponent(book.author)}`}
              className="text-slate-400 hover:text-[#00c2ff] font-bold text-xs sm:text-sm md:text-base uppercase tracking-wide inline-flex items-center gap-1.5 transition-colors"
            >
              <span>NEURAL_ID:</span>
              <span className="text-[#00c2ff]">{book.author}</span>
            </Link>
          </div>

          {/* Quick Details Card */}
          <div className="p-4 sm:p-5 bg-[#0a0f14] rounded-2xl border border-white/5 space-y-3">
            <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
              <span className="text-slate-500 text-[9px] font-black uppercase tracking-wider">Sector Identifier</span>
              <span className="text-white text-[9px] sm:text-[10px] font-mono truncate max-w-[180px] sm:max-w-none">{book.id}</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
              <span className="text-slate-500 text-[9px] font-black uppercase tracking-wider">Archival Length</span>
              <span className="text-[#00c2ff] text-[9px] sm:text-[10px] font-black uppercase">{book.pages} Pages</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-[9px] font-black uppercase tracking-wider">Bitstream Format</span>
              <span className="text-slate-300 text-[9px] sm:text-[10px] font-mono uppercase">Interactive PDF</span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="space-y-3">
            <Link 
              to={`/read/${book.id}`} 
              onClick={() => incrementBookReads(book.id)}
              className="w-full bg-[#00c2ff] text-black py-3.5 sm:py-4 md:py-5 rounded-2xl font-black text-center text-sm sm:text-base md:text-lg flex items-center justify-center gap-2.5 sm:gap-3 uppercase hover:bg-[#38d4ff] hover:scale-[1.01] active:scale-[0.99] transition-all shadow-[0_0_25px_rgba(0,194,255,0.3)]"
            >
              <BookOpen size={20} className="sm:w-5 sm:h-5" />
              <span>Read Book (+0.25 Marq/Page)</span>
            </Link>

            <button
              onClick={() => setIsBoostModalOpen(true)}
              className="w-full bg-gradient-to-r from-amber-500/15 to-orange-500/15 hover:from-amber-500/25 hover:to-orange-500/25 border border-amber-500/40 text-amber-300 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(245,158,11,0.15)]"
            >
              <MarqsLogo size={14} glow />
              <span>Push Momentum: Buy Back Boost</span>
            </button>
          </div>
        </div>
      </main>

      {/* Leave Comment (Comments) */}
      <section className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 sm:py-16 border-t border-white/5">
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
              <h3 className="text-[10px] font-black uppercase tracking-widest text-amber-300 mb-4 flex items-center gap-2">
                <MarqsLogo size={12} />
                <span>{hasCommented ? 'ENTRY_LOCKED' : "Initialize Entry (+5 Marq's)"}</span>
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
                  {commentError && (
                    <p className="text-[9px] font-bold text-red-400 uppercase tracking-wide leading-normal">{commentError}</p>
                  )}
                  <button 
                    type="submit" 
                    disabled={isSubmittingComment}
                    className="w-full bg-[#00c2ff] text-black py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-[#38d4ff] transition-all disabled:opacity-50"
                  >
                    {isSubmittingComment ? 'Transmitting...' : <><Send size={12} /> Transmit (+5 Marqs)</>}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Comment List */}
          <div className="space-y-6">
            {comments.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-white/5 rounded-3xl">
                <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.3em]">No discourse detected in this sector. Be the first to comment!</p>
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

      {/* Boost Modal Integration */}
      <MarqsEconomyModal 
        isOpen={isBoostModalOpen} 
        onClose={() => setIsBoostModalOpen(false)} 
        initialTab="boost" 
        preselectedBookId={book.id} 
      />
    </div>
  );
};

export default SocialPage;
