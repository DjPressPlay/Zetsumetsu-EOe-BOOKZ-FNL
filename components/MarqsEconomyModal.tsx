import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Flame, 
  TrendingUp, 
  BookOpen, 
  UploadCloud, 
  Eye, 
  MessageSquare, 
  Share2, 
  ShoppingBag, 
  Check, 
  CreditCard, 
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  History,
  Lock,
  Unlock,
  KeyRound,
  User,
  Shield,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { BookMetadata, UserProfile, BUY_BACK_BOOSTS, MARQS_EARNING_RATES } from '../types';
import { 
  getUserProfile, 
  saveUserProfile, 
  applyBuyBackBoost, 
  MARQS_PER_USD, 
  getAllMetadata,
  setWalletPassword,
  verifyWalletPassword,
  isWalletUnlocked,
  unlockWalletSession,
  lockWalletSession,
  setAuthorName
} from '../services/db';
import { getDeviceId } from '../services/deviceId';
import MarqsLogo from './MarqsLogo';

interface MarqsEconomyModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'wallet' | 'author' | 'boost' | 'earn' | 'history' | 'security';
  defaultTab?: 'wallet' | 'author' | 'boost' | 'earn' | 'history' | 'security';
  preselectedBookId?: string;
  availableBooks?: BookMetadata[];
}

const MarqsEconomyModal: React.FC<MarqsEconomyModalProps> = ({
  isOpen,
  onClose,
  initialTab,
  defaultTab,
  preselectedBookId,
  availableBooks
}) => {
  const [activeTab, setActiveTab] = useState<'wallet' | 'author' | 'boost' | 'earn' | 'history' | 'security'>(defaultTab || initialTab || 'wallet');
  const [profile, setProfile] = useState<UserProfile>(getUserProfile());
  const [books, setAllBooks] = useState<BookMetadata[]>(availableBooks || []);
  const [selectedBookId, setSelectedBookId] = useState<string>(preselectedBookId || '');
  const [selectedTier, setSelectedTier] = useState<'X3' | 'X4' | 'X5' | 'X10'>('X3');
  const [isBoosting, setIsBoosting] = useState(false);
  const [boostSuccessMsg, setBoostSuccessMsg] = useState<string | null>(null);
  const [boostErrorMsg, setBoostErrorMsg] = useState<string | null>(null);

  // Security / Unlock State
  const [unlocked, setUnlocked] = useState<boolean>(isWalletUnlocked());
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);

  // Password Setup / Change Form
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newAuthorName, setNewAuthorName] = useState(profile.authorName || '');
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState<string | null>(null);
  const [passwordErrorMsg, setPasswordErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const p = getUserProfile();
      setProfile(p);
      setNewAuthorName(p.authorName || '');
      setUnlocked(isWalletUnlocked());

      getAllMetadata().then(all => {
        setAllBooks(all);
        if (!selectedBookId && all.length > 0) {
          setSelectedBookId(preselectedBookId || all[0].id);
        }
      });
      if (preselectedBookId) {
        setSelectedBookId(preselectedBookId);
        setActiveTab('boost');
      }
    }
  }, [isOpen, preselectedBookId]);

  useEffect(() => {
    const handleProfileUpdate = () => {
      const p = getUserProfile();
      setProfile(p);
      setUnlocked(isWalletUnlocked());
    };
    const handleUnlockChange = (e: CustomEvent) => {
      setUnlocked(!!e.detail);
    };

    window.addEventListener('zetsu-profile-updated', handleProfileUpdate);
    window.addEventListener('zetsu-marqs-updated', handleProfileUpdate);
    window.addEventListener('zetsu-wallet-unlocked' as any, handleUnlockChange);

    return () => {
      window.removeEventListener('zetsu-profile-updated', handleProfileUpdate);
      window.removeEventListener('zetsu-marqs-updated', handleProfileUpdate);
      window.removeEventListener('zetsu-wallet-unlocked' as any, handleUnlockChange);
    };
  }, []);

  const handleUnlockWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnlockError(null);
    setIsUnlocking(true);

    try {
      const isValid = await verifyWalletPassword(unlockPassword);
      if (isValid) {
        setUnlocked(true);
        setUnlockPassword('');
      } else {
        setUnlockError('Incorrect wallet password. Access denied.');
      }
    } catch (err: any) {
      setUnlockError(err?.message || 'Error unlocking wallet.');
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleLockWallet = () => {
    lockWalletSession();
    setUnlocked(false);
  };

  const handleSaveSecuritySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordErrorMsg(null);
    setPasswordSuccessMsg(null);

    if (newPassword) {
      if (newPassword.length < 4) {
        setPasswordErrorMsg('Password must be at least 4 characters.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setPasswordErrorMsg('Passwords do not match.');
        return;
      }
    }

    try {
      if (newPassword) {
        await setWalletPassword(newPassword, newAuthorName);
      } else if (newAuthorName) {
        setAuthorName(newAuthorName);
      }
      setProfile(getUserProfile());
      setPasswordSuccessMsg('Profile and wallet security updated & synced to Supabase!');
      setNewPassword('');
      setConfirmPassword('');
      setUnlocked(true);
    } catch (err: any) {
      setPasswordErrorMsg(err?.message || 'Failed to update security credentials.');
    }
  };

  const handleBoostWithMarqs = async () => {
    if (!selectedBookId) {
      setBoostErrorMsg('Please select a book archive to boost.');
      return;
    }
    const book = books.find(b => b.id === selectedBookId);
    setIsBoosting(true);
    setBoostErrorMsg(null);
    setBoostSuccessMsg(null);

    try {
      const res = applyBuyBackBoost(selectedBookId, selectedTier, book?.title);
      if (!res.success) {
        setBoostErrorMsg(res.error || 'Failed to apply boost.');
      } else {
        setBoostSuccessMsg(`Success! "${book?.title || 'Book'}" received ${selectedTier} Boost and moved +${res.spotsMoved} spots up in the feed!`);
        setProfile(getUserProfile());
      }
    } catch (err: any) {
      setBoostErrorMsg(err?.message || 'Boost deployment error.');
    } finally {
      setIsBoosting(false);
    }
  };

  const handleBoostWithStripe = async () => {
    if (!selectedBookId) return;
    const book = books.find(b => b.id === selectedBookId);
    const boostOption = BUY_BACK_BOOSTS.find(b => b.tier === selectedTier);
    if (!boostOption) return;

    try {
      const deviceId = getDeviceId();
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: deviceId,
          type: 'boost',
          bookTitle: book?.title || 'Archive',
          bookId: selectedBookId,
          boostTier: selectedTier,
          spotsMoved: boostOption.spots,
          amount: boostOption.priceUsd
        })
      });
      const session = await response.json();
      if (session.url) window.location.href = session.url;
    } catch (err: any) {
      console.error('Boost checkout failed:', err);
      setBoostErrorMsg('Failed to initiate Stripe Checkout.');
    }
  };

  const currentBoostOption = BUY_BACK_BOOSTS.find(b => b.tier === selectedTier) || BUY_BACK_BOOSTS[0];
  const canAffordBoost = profile.marqsBalance >= currentBoostOption.marqs;

  // Find author's uploaded books
  const myUploadedBooks = books.filter(b => 
    (profile.uploadedBooks && profile.uploadedBooks.some(ub => ub.id === b.id)) ||
    (profile.authorName && b.author.toLowerCase() === profile.authorName.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-xl" 
            onClick={onClose} 
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative bg-[#090d12] w-full max-w-4xl rounded-[2rem] sm:rounded-[2.5rem] border border-amber-400/30 shadow-[0_0_80px_rgba(255,230,0,0.15)] overflow-hidden my-auto max-h-[92vh] flex flex-col"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-white/10 flex justify-between items-center bg-black/40">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(255,230,0,0.2)]">
                  <MarqsLogo size={22} glow />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black uppercase italic tracking-tight text-white flex items-center gap-2">
                    MARQ'S <span className="text-amber-400">ENGINE</span>
                  </h2>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    ZETSU EOE BOOKZ — Reader & Author Rewards Wallet
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {profile.hasPassword && (
                  <button
                    onClick={unlocked ? handleLockWallet : () => setUnlocked(false)}
                    className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 border transition-all ${
                      unlocked 
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20' 
                        : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                    }`}
                    title={unlocked ? "Click to lock wallet" : "Wallet is locked"}
                  >
                    {unlocked ? <Unlock size={12} /> : <Lock size={12} />}
                    <span>{unlocked ? 'Unlocked' : 'Locked'}</span>
                  </button>
                )}

                <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Nav Tabs */}
            <div className="px-6 pt-3 border-b border-white/5 flex gap-2 sm:gap-4 overflow-x-auto no-scrollbar bg-black/20">
              {[
                { id: 'wallet', label: 'Marq Wallet', renderIcon: () => <MarqsLogo size={14} /> },
                { id: 'author', label: 'Author Footprint', renderIcon: () => <User size={14} /> },
                { id: 'boost', label: 'Buy Book Boost', renderIcon: () => <Flame size={14} /> },
                { id: 'earn', label: 'Earning Table', renderIcon: () => <TrendingUp size={14} /> },
                { id: 'history', label: 'Ledger History', renderIcon: () => <History size={14} /> },
                { id: 'security', label: 'Security & Password', renderIcon: () => <ShieldCheck size={14} /> }
              ].map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`pb-3 px-3 sm:px-4 text-[10px] sm:text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
                      isActive 
                        ? 'border-amber-400 text-amber-300' 
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab.renderIcon()}
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
              {/* PASSWORD UNLOCK OVERLAY (If locked & trying to perform wallet/author operations) */}
              {!unlocked && profile.hasPassword && activeTab !== 'earn' && activeTab !== 'security' ? (
                <div className="p-8 rounded-3xl bg-black/80 border border-amber-400/30 text-center max-w-md mx-auto my-6 space-y-5 shadow-[0_0_50px_rgba(255,230,0,0.1)]">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-amber-300 mx-auto shadow-[0_0_25px_rgba(255,230,0,0.2)]">
                    <Lock size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight text-white">Wallet Locked</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                      Enter your wallet password to access your balance & Author tools
                    </p>
                  </div>

                  <form onSubmit={handleUnlockWallet} className="space-y-3">
                    <input
                      type="password"
                      placeholder="Enter Wallet Password"
                      value={unlockPassword}
                      onChange={e => setUnlockPassword(e.target.value)}
                      className="w-full bg-[#12161f] border border-white/10 px-4 py-3 rounded-2xl text-sm text-center text-white focus:outline-none focus:border-amber-400 font-medium"
                      autoFocus
                    />
                    {unlockError && (
                      <p className="text-xs text-red-400 font-bold">{unlockError}</p>
                    )}
                    <button
                      type="submit"
                      disabled={isUnlocking}
                      className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-[0_0_20px_rgba(255,230,0,0.25)]"
                    >
                      {isUnlocking ? 'Unlocking...' : 'Unlock Wallet'}
                    </button>
                  </form>

                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                    Secured by SHA-256 Cloud Sync on Supabase
                  </p>
                </div>
              ) : (
                <>
                  {/* TAB 1: WALLET & OVERVIEW */}
                  {activeTab === 'wallet' && (
                    <div className="space-y-6">
                      {/* Balance Hero Card */}
                      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#14120a] via-[#0d0f14] to-black border border-amber-400/30 shadow-[0_10px_40px_rgba(255,230,0,0.1)] relative overflow-hidden">
                        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                        
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                          <div>
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-amber-400 block mb-1">
                              Active Marq's Balance
                            </span>
                            <div className="flex items-center gap-3">
                              <MarqsLogo size={28} glow />
                              <span className="text-3xl sm:text-4xl md:text-5xl font-black text-white font-mono tracking-tight">
                                {profile.marqsBalance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                              </span>
                              <span className="text-sm sm:text-base font-black text-amber-400 uppercase tracking-wider">
                                MARQ'S
                              </span>
                            </div>
                          </div>

                          <div className="sm:text-right bg-white/5 border border-white/10 px-4 py-2.5 rounded-2xl">
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">
                              Real Dollar Value
                            </span>
                            <span className="text-lg sm:text-xl font-mono font-black text-emerald-400">
                              ${(profile.marqsBalance / MARQS_PER_USD).toFixed(3)} USD
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-white/10 text-[9px] font-black uppercase">
                          <div>
                            <span className="text-slate-500 block mb-0.5">Author Alias</span>
                            <span className="text-white font-mono text-xs">{profile.authorName}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block mb-0.5">Total Reinvested</span>
                            <span className="text-amber-400 font-mono text-xs">{profile.totalSpent.toLocaleString()} Marq's</span>
                          </div>
                          <div className="col-span-2 sm:col-span-1">
                            <span className="text-slate-500 block mb-0.5">Exchange Benchmark</span>
                            <span className="text-amber-300 font-mono text-xs">1,000 Marq's = $1.00 USD</span>
                          </div>
                        </div>
                      </div>

                      {/* Password Protection Callout if unprotected */}
                      {!profile.hasPassword && (
                        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <Shield className="text-amber-400 shrink-0" size={24} />
                            <div>
                              <p className="text-xs font-black uppercase text-amber-300 tracking-wider">
                                Your Marq's Wallet is Currently Unprotected
                              </p>
                              <p className="text-[10px] text-slate-300 font-medium">
                                Set a private password so only you can spend your balance and manage your manuscripts.
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => setActiveTab('security')}
                            className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-black rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all shadow-[0_0_15px_rgba(255,230,0,0.2)]"
                          >
                            Protect Wallet
                          </button>
                        </div>
                      )}

                      {/* Core Value Proposition */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-5 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                          <div className="flex items-center gap-2 text-amber-400">
                            <Flame size={16} />
                            <h4 className="text-xs font-black uppercase tracking-wider">1. Push Book Momentum</h4>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            Spend Marq's on <span className="text-amber-300 font-bold">Buy Book Boosts</span> to move your favorite book or your own uploaded works up to +10 spots higher on the archive shelves.
                          </p>
                        </div>

                        <div className="p-5 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                          <div className="flex items-center gap-2 text-amber-400">
                            <ShoppingBag size={16} />
                            <h4 className="text-xs font-black uppercase tracking-wider">2. 100% Book Print Redemption</h4>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            Use your accumulated Marq's to cover the complete retail price of physical print-on-demand books. Stripe Checkout handles the shipping receipt only.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: AUTHOR FOOTPRINT */}
                  {activeTab === 'author' && (
                    <div className="space-y-6">
                      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#12161f] to-black border border-white/10 space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-white/10">
                          <div>
                            <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest block">Author Profile</span>
                            <h3 className="text-2xl font-black uppercase italic text-white">{profile.authorName}</h3>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                              IP Node: {profile.ipAddress || 'Resolving...'} | Cloud Sync: Supabase Active
                            </p>
                          </div>
                          <button
                            onClick={() => setActiveTab('security')}
                            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-300 transition-all"
                          >
                            Edit Author Alias
                          </button>
                        </div>

                        <div>
                          <h4 className="text-xs font-black uppercase tracking-widest text-white mb-3 flex items-center justify-between">
                            <span>My Uploaded Manuscripts ({myUploadedBooks.length})</span>
                            <span className="text-[9px] text-slate-500 font-mono">Synced Across Sessions</span>
                          </h4>

                          {myUploadedBooks.length === 0 ? (
                            <div className="p-8 rounded-2xl bg-black/40 border border-white/5 text-center space-y-2">
                              <BookOpen className="text-slate-600 mx-auto" size={32} />
                              <p className="text-xs font-bold text-slate-400 uppercase">No manuscripts published under this profile yet</p>
                              <p className="text-[10px] text-slate-500">
                                Upload a PDF from the navigation bar to automatically link it to your author profile and earn +10 Marq's!
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {myUploadedBooks.map(book => (
                                <div 
                                  key={book.id}
                                  className="p-4 rounded-2xl bg-black/60 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-amber-400/40 transition-all"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-12 h-16 rounded-lg overflow-hidden bg-black shrink-0 border border-white/10">
                                      <img src={book.thumbnail} alt={book.title} className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                      <h5 className="text-sm font-black uppercase text-white italic">{book.title}</h5>
                                      <p className="text-[9px] text-slate-400 uppercase font-bold">
                                        Genre: {book.genre} • {book.pages} Pages • {book.upvotes || 0} Upvotes
                                      </p>
                                      {book.boostScore ? (
                                        <span className="inline-block mt-1 px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded text-[8px] font-black uppercase tracking-wider">
                                          🔥 Active Boost (+{book.boostScore} spots)
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>

                                  <button
                                    onClick={() => {
                                      setSelectedBookId(book.id);
                                      setActiveTab('boost');
                                    }}
                                    className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-black text-[10px] font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(255,230,0,0.2)] hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
                                  >
                                    <Flame size={13} />
                                    <span>Push Momentum (+3 Spots)</span>
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: BUY BOOK BOOST */}
                  {activeTab === 'boost' && (
                    <div className="space-y-6">
                      {/* Clear Plain-Language Explanation */}
                      <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border border-amber-400/20 space-y-2">
                        <div className="flex items-center gap-2 text-amber-400">
                          <Flame size={16} />
                          <span className="text-[10px] font-black uppercase tracking-widest">How Buy Book Boost Works</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Books load in order on the shelf. A <strong className="text-white font-bold">Buy Book Boost</strong> simply pushes your selected book up the list by <strong className="text-amber-400 font-bold">+3, +4, +5, or +10 spots</strong> so it sits higher in the feed.
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          No complex rules or timers — pick a book, choose how many spots to bump it up, and redeem with Marq's or Stripe.
                        </p>
                      </div>

                      {boostSuccessMsg && (
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-emerald-300">
                          <CheckCircle2 size={18} className="shrink-0" />
                          <p className="text-xs font-bold">{boostSuccessMsg}</p>
                        </div>
                      )}
                      {boostErrorMsg && (
                        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-3 text-red-300">
                          <AlertCircle size={18} className="shrink-0" />
                          <p className="text-xs font-bold">{boostErrorMsg}</p>
                        </div>
                      )}

                      {/* Select Target Book */}
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                          1. Select Book Archive to Promote
                        </label>
                        <select
                          value={selectedBookId}
                          onChange={e => setSelectedBookId(e.target.value)}
                          className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-xs font-bold text-white focus:outline-none focus:border-amber-400 transition-all uppercase"
                        >
                          {books.map(b => (
                            <option key={b.id} value={b.id} className="bg-black text-white">
                              {b.title} — by {b.author} {b.boostScore ? `(🔥 Boosted +${b.boostScore})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Boost Tiers */}
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                          2. Choose Boost Tier (Ranking Multiplier)
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {BUY_BACK_BOOSTS.map(boost => {
                            const isSelected = selectedTier === boost.tier;
                            return (
                              <button
                                key={boost.tier}
                                type="button"
                                onClick={() => setSelectedTier(boost.tier)}
                                className={`p-4 rounded-2xl border text-left transition-all relative ${
                                  isSelected
                                    ? 'bg-gradient-to-b from-amber-500/20 to-orange-500/20 border-amber-400 text-white shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                                    : 'bg-black/40 border-white/10 text-slate-300 hover:border-white/20'
                                }`}
                              >
                                {isSelected && (
                                  <div className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]" />
                                )}
                                <span className="block text-lg font-black italic tracking-tight text-amber-400">
                                  {boost.tier}
                                </span>
                                <span className="block text-[9px] font-bold text-white uppercase tracking-widest mt-1">
                                  +{boost.spots} Spots Moved
                                </span>
                                <div className="mt-3 pt-2 border-t border-white/10 flex justify-between items-center text-[8px] font-mono">
                                  <span className="text-amber-300 font-bold">{boost.marqs.toLocaleString()} M</span>
                                  <span className="text-slate-400">${boost.priceUsd.toFixed(2)}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Pricing / Payment Action Box */}
                      <div className="p-5 rounded-2xl bg-black/60 border border-white/10 space-y-4">
                        <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider">
                          <span className="text-slate-400">Selected Boost:</span>
                          <span className="text-amber-400 font-black">{currentBoostOption.label}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider">
                          <span className="text-slate-400">Cost in Marq's:</span>
                          <span className="text-amber-300 font-mono font-black">{currentBoostOption.marqs.toLocaleString()} Marq's</span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider">
                          <span className="text-slate-400">Your Current Balance:</span>
                          <span className={`font-mono font-black ${canAffordBoost ? 'text-emerald-400' : 'text-red-400'}`}>
                            {profile.marqsBalance.toLocaleString()} Marq's {canAffordBoost ? '(Sufficient)' : '(Insufficient)'}
                          </span>
                        </div>

                        <div className="pt-2 flex flex-col sm:flex-row gap-3">
                          <button
                            onClick={handleBoostWithMarqs}
                            disabled={isBoosting || !canAffordBoost}
                            className={`flex-1 py-4 px-6 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all ${
                              canAffordBoost 
                                ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black shadow-[0_0_25px_rgba(245,158,11,0.3)]' 
                                : 'bg-white/5 border border-white/10 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            <Flame size={16} />
                            {isBoosting ? 'Applying Boost...' : `Pay ${currentBoostOption.marqs.toLocaleString()} Marq's`}
                          </button>

                          <button
                            onClick={handleBoostWithStripe}
                            className="py-4 px-6 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all"
                            title="Stripe Checkout"
                          >
                            <CreditCard size={15} />
                            Stripe Checkout (${currentBoostOption.priceUsd.toFixed(2)})
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: EARNING TABLE */}
                  {activeTab === 'earn' && (
                    <div className="space-y-6">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-white/10 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                              <th className="pb-3">Action</th>
                              <th className="pb-3">Reward in Marq's</th>
                              <th className="pb-3">USD Value Benchmark</th>
                              <th className="pb-3 text-right">Cadence</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 text-xs">
                            <tr className="hover:bg-white/5 transition-colors">
                              <td className="py-3 font-bold text-white flex items-center gap-2">
                                <BookOpen size={14} className="text-amber-400" /> Read Page
                              </td>
                              <td className="py-3 font-mono font-black text-amber-300">+0.25 Marq</td>
                              <td className="py-3 font-mono text-emerald-400">$0.00025 USD</td>
                              <td className="py-3 text-right text-slate-400 font-mono text-[10px]">Per verified page turn</td>
                            </tr>
                            <tr className="hover:bg-white/5 transition-colors">
                              <td className="py-3 font-bold text-white flex items-center gap-2">
                                <UploadCloud size={14} className="text-amber-400" /> Upload Manuscript
                              </td>
                              <td className="py-3 font-mono font-black text-amber-300">+10.00 Marq's</td>
                              <td className="py-3 font-mono text-emerald-400">$0.01000 USD</td>
                              <td className="py-3 text-right text-slate-400 font-mono text-[10px]">Per approved PDF</td>
                            </tr>
                            <tr className="hover:bg-white/5 transition-colors">
                              <td className="py-3 font-bold text-white flex items-center gap-2">
                                <Eye size={14} className="text-amber-400" /> View Archive
                              </td>
                              <td className="py-3 font-mono font-black text-amber-300">+5.00 Marq's</td>
                              <td className="py-3 font-mono text-emerald-400">$0.00500 USD</td>
                              <td className="py-3 text-right text-slate-400 font-mono text-[10px]">Unique book session</td>
                            </tr>
                            <tr className="hover:bg-white/5 transition-colors">
                              <td className="py-3 font-bold text-white flex items-center gap-2">
                                <MessageSquare size={14} className="text-amber-400" /> Comment Note
                              </td>
                              <td className="py-3 font-mono font-black text-amber-300">+5.00 Marq's</td>
                              <td className="py-3 font-mono text-emerald-400">$0.00500 USD</td>
                              <td className="py-3 text-right text-slate-400 font-mono text-[10px]">Per constructive comment</td>
                            </tr>
                            <tr className="hover:bg-white/5 transition-colors">
                              <td className="py-3 font-bold text-white flex items-center gap-2">
                                <Share2 size={14} className="text-amber-400" /> Share Deep Link
                              </td>
                              <td className="py-3 font-mono font-black text-amber-300">+5.00 Marq's</td>
                              <td className="py-3 font-mono text-emerald-400">$0.00500 USD</td>
                              <td className="py-3 text-right text-slate-400 font-mono text-[10px]">Per social share</td>
                            </tr>
                            <tr className="hover:bg-white/5 transition-colors">
                              <td className="py-3 font-bold text-white flex items-center gap-2">
                                <ShoppingBag size={14} className="text-amber-400" /> Buy Physical Copies
                              </td>
                              <td className="py-3 font-mono font-black text-amber-300">+25.00 Marq's</td>
                              <td className="py-3 font-mono text-emerald-400">$0.02500 USD</td>
                              <td className="py-3 text-right text-slate-400 font-mono text-[10px]">Per checkout order</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* TAB 5: LEDGER HISTORY */}
                  {activeTab === 'history' && (
                    <div className="space-y-4">
                      {profile.transactions.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 font-bold uppercase text-xs">
                          No transactions recorded yet
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {profile.transactions.map(tx => (
                            <div 
                              key={tx.id} 
                              className="p-3.5 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between gap-4"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                  tx.amount > 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                                }`}>
                                  {tx.amount > 0 ? <ArrowUpRight size={14} /> : <Flame size={14} />}
                                </div>
                                <div>
                                  <p className="text-xs font-black uppercase text-white">{tx.details}</p>
                                  <p className="text-[9px] text-slate-500 font-mono">{new Date(tx.timestamp).toLocaleString()}</p>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <span className={`text-xs font-mono font-black block ${
                                  tx.amount > 0 ? 'text-emerald-400' : 'text-amber-400'
                                }`}>
                                  {tx.amount > 0 ? `+${tx.amount}` : tx.amount} MARQ'S
                                </span>
                                <span className="text-[8px] font-mono text-slate-500">
                                  ${(Math.abs(tx.amount) / MARQS_PER_USD).toFixed(4)} USD
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 6: SECURITY & PASSWORD SETTINGS */}
                  {activeTab === 'security' && (
                    <div className="space-y-6">
                      {passwordSuccessMsg && (
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-emerald-300">
                          <CheckCircle2 size={18} className="shrink-0" />
                          <p className="text-xs font-bold">{passwordSuccessMsg}</p>
                        </div>
                      )}
                      {passwordErrorMsg && (
                        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-3 text-red-300">
                          <AlertCircle size={18} className="shrink-0" />
                          <p className="text-xs font-bold">{passwordErrorMsg}</p>
                        </div>
                      )}

                      <form onSubmit={handleSaveSecuritySettings} className="p-6 rounded-3xl bg-black/60 border border-white/10 space-y-4">
                        <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                          <ShieldCheck className="text-amber-400" size={24} />
                          <div>
                            <h4 className="text-sm font-black uppercase tracking-wider text-white">
                              Author Profile & Wallet Password Setup
                            </h4>
                            <p className="text-[10px] text-slate-400">
                              Data persists in Supabase Cloud Database synced to your device & IP.
                            </p>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                            Author Alias / Pen Name
                          </label>
                          <input
                            type="text"
                            value={newAuthorName}
                            onChange={e => setNewAuthorName(e.target.value)}
                            placeholder="e.g. Master Archivist"
                            className="w-full bg-[#12161f] border border-white/10 px-4 py-3 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 font-medium"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                              {profile.hasPassword ? 'Change Wallet Password' : 'Set New Wallet Password'}
                            </label>
                            <input
                              type="password"
                              value={newPassword}
                              onChange={e => setNewPassword(e.target.value)}
                              placeholder="New password (min 4 chars)"
                              className="w-full bg-[#12161f] border border-white/10 px-4 py-3 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 font-medium"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                              Confirm Password
                            </label>
                            <input
                              type="password"
                              value={confirmPassword}
                              onChange={e => setConfirmPassword(e.target.value)}
                              placeholder="Confirm new password"
                              className="w-full bg-[#12161f] border border-white/10 px-4 py-3 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 font-medium"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full mt-4 py-3.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(255,230,0,0.25)]"
                        >
                          Save Credentials & Sync to Cloud
                        </button>
                      </form>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default MarqsEconomyModal;
