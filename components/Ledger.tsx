import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { 
  History, 
  ArrowLeft, 
  Search, 
  BookOpen, 
  UploadCloud, 
  Eye, 
  MessageSquare, 
  Share2, 
  ShoppingBag, 
  Flame, 
  UserPlus, 
  Mail, 
  ExternalLink, 
  RefreshCw, 
  Radio,
  Send,
  Sparkles,
  Zap,
  Activity,
  CheckCircle2,
  Clock,
  Database
} from 'lucide-react';
import { LedgerEntry, LedgerActionType } from '../types';
import { 
  getLedgerEntries, 
  getLedgerStats, 
  recordLedgerAction, 
  postShortLedgerMessage,
  subscribeToLedgerUpdates 
} from '../services/ledger';
import { getUserProfile } from '../services/userProfile';
import Navbar from './Navbar';
import Footer from './Footer';
import MarqsLogo from './MarqsLogo';

const ACTION_CONFIG: Record<LedgerActionType, {
  label: string;
  icon: React.ElementType;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  accentColor: string;
  description: string;
}> = {
  post: {
    label: 'Short Post',
    icon: Radio,
    badgeBg: 'bg-pink-500/10',
    badgeBorder: 'border-pink-500/30',
    badgeText: 'text-pink-400',
    accentColor: '#ec4899',
    description: 'Direct Broadcast'
  },
  join: {
    label: 'Profile / Join',
    icon: UserPlus,
    badgeBg: 'bg-emerald-500/10',
    badgeBorder: 'border-emerald-500/30',
    badgeText: 'text-emerald-400',
    accentColor: '#10b981',
    description: 'Archivist Identity'
  },
  newsletter_signup: {
    label: 'Newsletter',
    icon: Mail,
    badgeBg: 'bg-purple-500/10',
    badgeBorder: 'border-purple-500/30',
    badgeText: 'text-purple-400',
    accentColor: '#a855f7',
    description: 'Promo Network'
  },
  read_page: {
    label: 'Read Page',
    icon: BookOpen,
    badgeBg: 'bg-[#00c2ff]/10',
    badgeBorder: 'border-[#00c2ff]/30',
    badgeText: 'text-[#00c2ff]',
    accentColor: '#00c2ff',
    description: 'Bitstream Streamed'
  },
  upload: {
    label: 'Upload',
    icon: UploadCloud,
    badgeBg: 'bg-blue-500/10',
    badgeBorder: 'border-blue-500/30',
    badgeText: 'text-blue-400',
    accentColor: '#3b82f6',
    description: 'New Book Minted'
  },
  view: {
    label: 'View',
    icon: Eye,
    badgeBg: 'bg-sky-500/10',
    badgeBorder: 'border-sky-500/30',
    badgeText: 'text-sky-400',
    accentColor: '#38bdf8',
    description: 'Catalog Inspection'
  },
  comment: {
    label: 'Comment',
    icon: MessageSquare,
    badgeBg: 'bg-indigo-500/10',
    badgeBorder: 'border-indigo-500/30',
    badgeText: 'text-indigo-400',
    accentColor: '#6366f1',
    description: 'Public Discussion'
  },
  share: {
    label: 'Share',
    icon: Share2,
    badgeBg: 'bg-teal-500/10',
    badgeBorder: 'border-teal-500/30',
    badgeText: 'text-teal-400',
    accentColor: '#14b8a6',
    description: 'Public Node Broadcast'
  },
  buy_copies: {
    label: 'Buy Copies',
    icon: ShoppingBag,
    badgeBg: 'bg-amber-500/10',
    badgeBorder: 'border-amber-500/30',
    badgeText: 'text-amber-400',
    accentColor: '#f59e0b',
    description: 'Print Fulfillment'
  },
  boost: {
    label: 'Buy Back Boost',
    icon: Flame,
    badgeBg: 'bg-orange-500/10',
    badgeBorder: 'border-orange-500/30',
    badgeText: 'text-orange-400',
    accentColor: '#f97316',
    description: 'Algorithmic Bump'
  }
};

const FILTER_OPTIONS: { id: string; label: string; action?: LedgerActionType }[] = [
  { id: 'all', label: 'All Operations' },
  { id: 'post', label: 'Short Posts', action: 'post' },
  { id: 'read_page', label: 'Read Pages', action: 'read_page' },
  { id: 'upload', label: 'Uploads', action: 'upload' },
  { id: 'view', label: 'Views', action: 'view' },
  { id: 'comment', label: 'Comments', action: 'comment' },
  { id: 'share', label: 'Shares', action: 'share' },
  { id: 'buy_copies', label: 'Print Copies', action: 'buy_copies' },
  { id: 'boost', label: 'Boosts', action: 'boost' },
  { id: 'join', label: 'New Archivists', action: 'join' },
  { id: 'newsletter_signup', label: 'Newsletter', action: 'newsletter_signup' }
];

const Ledger: React.FC = () => {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    totalEntries: 0,
    recentHourVelocity: 0,
    actionsPerMinute: '0.0'
  });
  const [livePulse, setLivePulse] = useState(false);

  // Short Post state
  const [shortPostText, setShortPostText] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [postSuccess, setPostSuccess] = useState(false);

  const loaderRef = useRef<HTMLDivElement>(null);

  // Fetch entries strictly from Supabase
  const fetchEntries = useCallback(async (pageNum: number, filter: string, append: boolean = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      const result = await getLedgerEntries(pageNum, 25, filter);
      
      setEntries(prev => {
        if (append) {
          const map = new Map<string, LedgerEntry>();
          prev.forEach(e => map.set(e.id, e));
          result.entries.forEach(e => map.set(e.id, e));
          return Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
        }
        return result.entries;
      });
      setHasMore(result.hasMore);
      
      const statsData = await getLedgerStats();
      setStats({
        totalEntries: statsData.totalEntries,
        recentHourVelocity: statsData.recentHourVelocity,
        actionsPerMinute: statsData.actionsPerMinute
      });
    } catch (err) {
      console.error('Failed to load ledger entries from Supabase:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    fetchEntries(1, activeFilter, false);
  }, [activeFilter, fetchEntries]);

  // Real-time Supabase listener & local window event broadcast
  useEffect(() => {
    const handleIncomingEntry = (newEntry: LedgerEntry) => {
      if (!newEntry) return;

      setLivePulse(true);
      setTimeout(() => setLivePulse(false), 1200);

      setEntries(prev => {
        if (prev.some(item => item.id === newEntry.id)) return prev;
        if (activeFilter === 'all' || activeFilter === newEntry.action) {
          return [newEntry, ...prev];
        }
        return prev;
      });

      setStats(prev => ({
        ...prev,
        totalEntries: prev.totalEntries + 1,
        recentHourVelocity: prev.recentHourVelocity + 1
      }));
    };

    // 1. Supabase Postgres Realtime changes subscription
    const unsubscribeSupabase = subscribeToLedgerUpdates((entry) => {
      handleIncomingEntry(entry);
    });

    // 2. Window event for immediate in-tab feedback
    const handleLocalEvent = (e: CustomEvent<LedgerEntry>) => {
      handleIncomingEntry(e.detail);
    };

    window.addEventListener('zetsu-ledger-entry-added' as any, handleLocalEvent);

    return () => {
      unsubscribeSupabase();
      window.removeEventListener('zetsu-ledger-entry-added' as any, handleLocalEvent);
    };
  }, [activeFilter]);

  const loadMore = () => {
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchEntries(nextPage, activeFilter, true);
  };

  // Submit short post to Supabase
  const handleShortPostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = shortPostText.trim();
    if (!text || isPosting) return;

    setIsPosting(true);
    try {
      const profile = getUserProfile();
      const author = profile?.authorName || 'Archivist';
      await postShortLedgerMessage(text, author, '/ledger');
      setShortPostText('');
      setPostSuccess(true);
      setTimeout(() => setPostSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to post to Supabase ledger:', err);
    } finally {
      setIsPosting(false);
    }
  };

  // Filter by search query
  const filteredEntries = entries.filter(entry => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      entry.title.toLowerCase().includes(q) ||
      entry.actor.toLowerCase().includes(q) ||
      (entry.targetTitle && entry.targetTitle.toLowerCase().includes(q)) ||
      entry.action.toLowerCase().includes(q) ||
      entry.targetPath.toLowerCase().includes(q)
    );
  });

  const formatTimeAgo = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${Math.max(1, seconds)}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white flex flex-col selection:bg-[#00c2ff] selection:text-black">
      <Navbar />

      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 pt-28 sm:pt-32 pb-20">
        {/* Header Breadcrumbs & Title */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between">
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 text-[10px] font-black text-[#00c2ff] hover:text-white uppercase tracking-widest transition-colors group"
            >
              <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
              Return to Catalog Nexus
            </Link>

            <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
              <span className={`w-2 h-2 rounded-full ${livePulse ? 'bg-emerald-400 scale-125 shadow-[0_0_10px_#10b981]' : 'bg-[#00c2ff] animate-pulse'}`} />
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-300 font-mono">
                SUPABASE_LIVE_LEDGER
              </span>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <span className="px-2 py-0.5 bg-[#00c2ff]/10 border border-[#00c2ff]/30 text-[#00c2ff] text-[8px] font-black uppercase tracking-widest rounded">
                  DIRECT SUPABASE STORAGE
                </span>
                <span className="text-[9px] font-mono text-slate-500 font-bold uppercase tracking-widest">
                  IMMUTABLE OPERATIONS STREAM
                </span>
              </div>
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-black italic tracking-tighter uppercase leading-none">
                THE <span className="text-[#00c2ff]">LEDGER</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 font-medium max-w-2xl mt-3 leading-relaxed">
                Directly synchronized with the Supabase database. Every reader session, short post, author upload, comment, share, boost, and print fulfillment is written directly to Supabase without local browser storage.
              </p>
            </div>

            {/* Metrics Strip */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-4 shrink-0">
              <div className="bg-[#0a0f14] border border-white/10 rounded-2xl p-3 sm:p-4 text-center">
                <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-1">
                  SUPABASE TOTAL
                </span>
                <span className="text-lg sm:text-2xl font-black font-mono text-white">
                  {stats.totalEntries > 0 ? stats.totalEntries.toLocaleString() : entries.length}
                </span>
              </div>

              <div className="bg-[#0a0f14] border border-white/10 rounded-2xl p-3 sm:p-4 text-center">
                <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-1">
                  LAST HOUR
                </span>
                <span className="text-lg sm:text-2xl font-black font-mono text-[#00c2ff]">
                  +{stats.recentHourVelocity}
                </span>
              </div>

              <div className="bg-[#0a0f14] border border-white/10 rounded-2xl p-3 sm:p-4 text-center">
                <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-1">
                  INDEX RATE
                </span>
                <span className="text-lg sm:text-2xl font-black font-mono text-emerald-400">
                  {stats.actionsPerMinute}/m
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Short Post Input Form */}
        <div className="bg-[#090d12] border border-[#00c2ff]/30 rounded-2xl p-4 sm:p-5 mb-8 shadow-[0_0_30px_rgba(0,194,255,0.06)]">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Radio size={16} className="text-pink-400 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider text-white">
                TRANSMIT SHORT POST TO SUPABASE LEDGER
              </span>
            </div>
            <span className="text-[9px] font-mono text-slate-500 uppercase">
              DIRECT SUPABASE INSERT
            </span>
          </div>

          <form onSubmit={handleShortPostSubmit} className="space-y-3">
            <div className="relative">
              <textarea
                value={shortPostText}
                onChange={(e) => setShortPostText(e.target.value)}
                maxLength={280}
                rows={2}
                placeholder="Write a short update, note, or announcement to append directly to the Supabase Ledger..."
                className="w-full bg-[#030609] border border-white/10 focus:border-[#00c2ff]/60 rounded-xl p-3 text-xs sm:text-sm font-sans text-white placeholder:text-slate-600 focus:outline-none transition-all resize-none"
              />
              <div className="absolute right-3 bottom-3 text-[9px] font-mono text-slate-500">
                {280 - shortPostText.length} chars
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="text-[9px] font-mono text-slate-500">
                {postSuccess ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    SUCCESSFULLY BROADCAST TO SUPABASE LEDGER
                  </span>
                ) : (
                  <span>Short posts are published instantly to the global ledger stream.</span>
                )}
              </div>

              <button
                type="submit"
                disabled={!shortPostText.trim() || isPosting}
                className="px-5 py-2 bg-[#00c2ff] hover:bg-[#38bdf8] text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all duration-200 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(0,194,255,0.2)]"
              >
                {isPosting ? (
                  <>
                    <RefreshCw size={12} className="animate-spin" />
                    <span>TRANSMITTING...</span>
                  </>
                ) : (
                  <>
                    <Send size={12} />
                    <span>POST TO SUPABASE</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Filter Chips & Search Bar */}
        <div className="space-y-4 mb-6">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="FILTER LEDGER BY TITLE, ARCHIVIST, OR PATH (E.G. 'KEVIN', 'READ', 'POST', 'GUIDES')..."
              className="w-full bg-[#0a0f14] border border-white/10 focus:border-[#00c2ff]/60 rounded-2xl py-3 pl-11 pr-10 text-xs font-mono font-bold text-white placeholder:text-slate-600 focus:outline-none transition-all uppercase tracking-wider"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs font-bold"
              >
                CLEAR
              </button>
            )}
          </div>

          {/* Action Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
            {FILTER_OPTIONS.map((f) => {
              const isSelected = activeFilter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                    isSelected
                      ? 'bg-[#00c2ff] text-black border-[#00c2ff] shadow-[0_0_15px_rgba(0,194,255,0.3)]'
                      : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20 hover:text-white'
                  }`}
                >
                  <span>{f.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* The Ledger Feed List */}
        <section aria-label="Append-only Ledger Stream">
          {loading && entries.length === 0 ? (
            <div className="py-24 text-center space-y-4">
              <div className="w-10 h-10 border-2 border-[#00c2ff]/20 border-t-[#00c2ff] rounded-full animate-spin mx-auto" />
              <p className="text-xs font-mono font-bold uppercase tracking-widest text-slate-500">
                SYNCHRONIZING DIRECTLY WITH SUPABASE LEDGER...
              </p>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="py-20 text-center bg-[#0a0f14] border border-white/10 rounded-3xl p-8 space-y-3">
              <Database size={32} className="text-slate-600 mx-auto" />
              <h3 className="text-base font-black uppercase tracking-tight text-white">No Matching Ledger Entries</h3>
              <p className="text-xs text-slate-500 font-medium">No logged operations matched your filter query from Supabase.</p>
              <button 
                onClick={() => { setActiveFilter('all'); setSearchQuery(''); }}
                className="mt-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredEntries.map((entry) => {
                const config = ACTION_CONFIG[entry.action] || ACTION_CONFIG.view;
                const IconComponent = config.icon;
                const formattedDate = new Date(entry.timestamp).toLocaleString();

                return (
                  <article 
                    key={entry.id} 
                    id={`entry-${entry.id}`}
                    className="group relative bg-[#090d12] hover:bg-[#0d131a] border border-white/10 hover:border-[#00c2ff]/40 rounded-2xl p-3.5 sm:p-4 transition-all duration-200 shadow-sm hover:shadow-[0_0_25px_rgba(0,194,255,0.08)] flex flex-col sm:flex-row sm:items-center justify-between gap-3.5"
                  >
                    {/* Left: Badge & Description */}
                    <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                      {/* Action Icon Badge */}
                      <div className={`p-2.5 rounded-xl border ${config.badgeBg} ${config.badgeBorder} shrink-0 mt-0.5 sm:mt-0`}>
                        <IconComponent size={16} className={config.badgeText} />
                      </div>

                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${config.badgeBg} ${config.badgeText} border ${config.badgeBorder}`}>
                            {config.label}
                          </span>
                          <span className="text-[8px] font-mono text-slate-500 font-bold uppercase tracking-wider">
                            ACTOR: {entry.actor}
                          </span>
                          <span className="text-[8px] font-mono text-slate-600">
                            •
                          </span>
                          <time 
                            dateTime={new Date(entry.timestamp).toISOString()}
                            className="text-[8px] font-mono text-slate-400"
                            title={formattedDate}
                          >
                            {formatTimeAgo(entry.timestamp)}
                          </time>
                        </div>

                        {/* Clickable Title & Details */}
                        <div className="flex items-center gap-2">
                          <Link 
                            to={entry.targetPath}
                            className="text-xs sm:text-sm font-black text-white hover:text-[#00c2ff] transition-colors leading-snug truncate"
                            title={entry.title}
                          >
                            {entry.title}
                          </Link>
                        </div>

                        {/* Optional Meta Tags */}
                        {entry.metadata && (
                          <div className="flex flex-wrap items-center gap-2 text-[8px] font-mono text-slate-500 pt-0.5">
                            {entry.metadata.page && (
                              <span className="bg-black/50 px-1.5 py-0.5 rounded border border-white/5 text-slate-300">
                                PAGE {entry.metadata.page}{entry.metadata.totalPages ? ` / ${entry.metadata.totalPages}` : ''}
                              </span>
                            )}
                            {entry.metadata.genre && (
                              <span className="bg-black/50 px-1.5 py-0.5 rounded border border-white/5 text-[#00c2ff]/80">
                                SECTOR: {entry.metadata.genre}
                              </span>
                            )}
                            {entry.metadata.tier && (
                              <span className="bg-amber-500/10 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30 font-black">
                                {entry.metadata.tier} BOOST
                              </span>
                            )}
                            {entry.metadata.copies && (
                              <span className="bg-emerald-500/10 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">
                                {entry.metadata.copies}x PRINT COPIES
                              </span>
                            )}
                            {entry.metadata.marqsAmount && (
                              <span className="text-amber-400 font-bold flex items-center gap-1">
                                <MarqsLogo size={8} glow={false} />
                                {entry.metadata.marqsAmount} MARQS
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Crawlable Direct Link */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5 shrink-0">
                      <span className="text-[8px] font-mono text-slate-600 uppercase tracking-widest sm:hidden">
                        {formattedDate.split(',')[0]}
                      </span>

                      <Link
                        to={entry.targetPath}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-[#00c2ff] text-slate-300 hover:text-black border border-white/10 hover:border-[#00c2ff] rounded-xl text-[9px] font-black uppercase tracking-wider transition-all duration-200 group-hover:border-[#00c2ff]/40 shadow-xs"
                      >
                        <span>Inspect Page</span>
                        <ExternalLink size={11} />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Infinite Pager / Load More */}
          {hasMore && !loading && (
            <div className="mt-8 text-center" ref={loaderRef}>
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-8 py-3.5 bg-[#0a0f14] hover:bg-[#111822] text-[#00c2ff] hover:text-white border border-[#00c2ff]/40 hover:border-[#00c2ff] rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300 shadow-[0_0_20px_rgba(0,194,255,0.15)] flex items-center gap-2 mx-auto disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>FETCHING NEXT SUPABASE BLOCK...</span>
                  </>
                ) : (
                  <>
                    <History size={14} />
                    <span>LOAD MORE HISTORICAL SUPABASE NODES</span>
                  </>
                )}
              </button>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Ledger;
