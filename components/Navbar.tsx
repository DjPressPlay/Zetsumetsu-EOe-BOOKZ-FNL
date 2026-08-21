
import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Info, 
  X, 
  Send, 
  ChevronDown, 
  Fingerprint, 
  Cpu, 
  Zap, 
  FileText, 
  Sparkles, 
  Loader2, 
  Image as ImageIcon, 
  ShoppingBag, 
  Truck, 
  Package, 
  CreditCard, 
  Minus, 
  Plus, 
  Crown,
  HardDrive,
  UploadCloud,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Flame,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { processPdfForStore } from '../services/pdfService';
import { 
  saveBook, 
  getUserUploadCount, 
  getUserCredits, 
  getAllMetadata, 
  saveOrderToArchive, 
  getUserQuota, 
  UserQuota, 
  FREE_UPLOAD_LIMIT 
} from '../services/db';
import { getDeviceId, getDeviceIdHistory } from '../services/deviceId';
import { BookMetadata, BookData } from '../types';
import PricingModal from './PricingModal';

interface NavbarProps {
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
}

const CATEGORIES = [
  "GUIDES & PROTOCOLS", "NEURAL FICTION", "ACADEMIC NODES", "SYSTEM SCHEMATICS",
  "HISTORICAL TRACES", "VISUAL ARTIFACTS", "PHILOSOPHICAL CODES", "RAW DATA STREAMS"
];

const Navbar: React.FC<NavbarProps> = ({ searchQuery = "", setSearchQuery }) => {
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [isQuotaPopoverOpen, setIsQuotaPopoverOpen] = useState(false);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [shopSearch, setShopSearch] = useState("");
  const [selectedBook, setSelectedBook] = useState<BookMetadata | null>(null);
  const [orderStep, setOrderStep] = useState<'selection' | 'form'>('selection');
  const [allBooks, setAllBooks] = useState<BookMetadata[]>([]);
  const [orderData, setOrderData] = useState({ 
    name: '', 
    email: '', 
    address: '', 
    format: 'coloring' as 'coloring' | 'board' | 'soft_photo' | 'hard_photo',
    quantity: 1
  });
  const [shippingCost, setShippingCost] = useState(0);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [quota, setQuota] = useState<UserQuota>({
    uploadCount: 0,
    maxFreeUploads: FREE_UPLOAD_LIMIT,
    remainingUploads: FREE_UPLOAD_LIMIT,
    isPremium: false,
    credits: 10
  });
  const [toastNotification, setToastNotification] = useState<{
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
  } | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'processing' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pdfInfo, setPdfInfo] = useState<any>(null);
  const [formData, setFormData] = useState({ title: '', author: '', genre: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const showToast = (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    setToastNotification({ id: Date.now().toString(), title, message, type });
  };

  const refreshUserData = async () => {
    try {
      const quotaData = await getUserQuota();
      setQuota(quotaData);
      setIsPremium(quotaData.isPremium);
    } catch (err) {
      console.error('Failed to load quota:', err);
    }
  };

  // Fetch premium status, quota and books
  useEffect(() => {
    refreshUserData();
    getAllMetadata().then(setAllBooks);

    const handleQuotaUpdate = () => {
      refreshUserData();
    };

    window.addEventListener('zetsu-quota-updated', handleQuotaUpdate);
    window.addEventListener('show-quota-modal', () => setIsQuotaPopoverOpen(true));

    return () => {
      window.removeEventListener('zetsu-quota-updated', handleQuotaUpdate);
      window.removeEventListener('show-quota-modal', () => setIsQuotaPopoverOpen(true));
    };
  }, []);

  // Auto-dismiss toast after 6 seconds
  useEffect(() => {
    if (!toastNotification) return;
    const timer = setTimeout(() => {
      setToastNotification(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [toastNotification]);

  // Close quota popover on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsQuotaPopoverOpen(false);
      }
    };
    if (isQuotaPopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isQuotaPopoverOpen]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const currentQuota = await getUserQuota();
    setQuota(currentQuota);

    if (!currentQuota.isPremium && currentQuota.remainingUploads <= 0) {
      setUploadStatus('error');
      setUploadError("Your archival sector is full (0/5 free slots remaining). Upgrade to PREMIUM for unlimited uploads.");
      showToast("Archival Quota Reached", "Free archivists receive 5 books. Upgrade to Premium for unlimited storage.", "warning");
      return;
    }

    setUploadStatus('processing');
    setUploadError(null);
    try {
      const info = await processPdfForStore(file);
      setPdfInfo(info);
      const initialTitle = file.name.replace('.pdf', '');
      setFormData(prev => ({ ...prev, title: initialTitle }));
      setUploadStatus('idle');
    } catch (err) {
      console.error('Failed to read PDF:', err);
      setUploadStatus('error');
      setUploadError("That PDF could not be read. Try re-exporting it, or pick a different file.");
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfInfo || !formData.title || !formData.author || !formData.genre) return;
    
    setUploadStatus('uploading');
    setUploadError(null);
    try {
      const deviceId = getDeviceId();
      const id = crypto.randomUUID().split('-')[0];
      const metadata: BookMetadata = {
        id,
        thumbnail: pdfInfo.thumbnail,
        title: formData.title,
        author: formData.author,
        genre: formData.genre,
        pages: pdfInfo.pageCount,
        uploadDate: Date.now(),
        reads: 0,
        upvotes: 0
      };
      const data: BookData = { id, pdfData: pdfInfo.pdfData };
      await saveBook(metadata, data, deviceId);
      
      // Refresh quota immediately
      const newQuota = await getUserQuota();
      setQuota(newQuota);
      window.dispatchEvent(new CustomEvent('zetsu-quota-updated', { detail: newQuota }));
      
      setUploadStatus('success');
      setAllBooks(prev => [metadata, ...prev]);

      if (!newQuota.isPremium) {
        if (newQuota.remainingUploads === 0) {
          showToast(
            "Archive Node Minted!",
            "You have used all 5 free archival slots. Upgrade to Premium for unlimited uploads.",
            "warning"
          );
        } else {
          showToast(
            "Archive Node Minted!",
            `Deployment successful. You have ${newQuota.remainingUploads} of 5 free uploads remaining.`,
            "success"
          );
        }
      } else {
        showToast(
          "Archive Node Minted!",
          "Deployment complete. Premium unlimited storage active.",
          "success"
        );
      }
      
      // Refresh the page or trigger a global refresh after viewing success
      setTimeout(() => {
        window.location.reload();
      }, 2400);
    } catch (err: any) {
      console.error('Upload failed:', err);
      setUploadStatus('error');
      setUploadError(err?.message || "Upload failed. The archive rejected the deployment.");
    }
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBook) return;

    try {
      const deviceId = getDeviceId();
      // Save order info to newsletter_emails archive
      const orderInfo = `ORDER: ${selectedBook.title} (${orderData.format}) | Name: ${orderData.name} | Address: ${orderData.address} | Shipping: $${shippingCost.toFixed(2)}`;
      await saveOrderToArchive(orderData.email, orderInfo);

      // Redirect to Stripe
      const priceMap = {
        coloring: 1500,
        board: 2499,
        soft_photo: 3499,
        hard_photo: 4999
      };
      const bookPrice = priceMap[orderData.format];
      const subtotal = bookPrice * orderData.quantity;
      const totalAmount = subtotal + Math.round(shippingCost * 100);
      
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: deviceId,
          type: 'pod',
          bookTitle: selectedBook.title,
          format: orderData.format,
          amount: totalAmount,
          quantity: orderData.quantity
        }),
      });
      const session = await response.json();
      if (session.url) window.location.href = session.url;
    } catch (err: any) {
      console.error('Order failed:', err);
      alert(`Order initialization failed: ${err?.message || 'Bitstream unstable.'}`);
    }
  };

  // Shipping Calculator Logic
  useEffect(() => {
    if (!orderData.address.trim()) {
      setShippingCost(0);
      return;
    }

    // Heuristic shipping calculation
    let cost = 5.99; // Base shipping
    const addr = orderData.address.toLowerCase();
    
    // Simulate international shipping detection
    const internationalKeywords = ['uk', 'united kingdom', 'canada', 'australia', 'germany', 'france', 'japan', 'europe', 'asia', 'africa'];
    const isInternational = internationalKeywords.some(k => addr.includes(k)) || 
                           (addr.length > 10 && !/\d{5}/.test(addr)); // Simple check for US Zip code

    if (isInternational) {
      cost = 19.99;
    }

    // Add a small variable based on address length to simulate "distance"
    cost += (orderData.address.length % 5) * 0.5;

    setShippingCost(cost);
  }, [orderData.address]);

  const filteredShopBooks = allBooks.filter(b => 
    b.title.toLowerCase().includes(shopSearch.toLowerCase()) ||
    b.author.toLowerCase().includes(shopSearch.toLowerCase())
  );

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-[1600px] mx-auto px-3 md:px-6">
          <div className="flex justify-between items-center h-20 gap-2">
            {/* Logo Section */}
            {!isMobileSearchOpen && (
              <Link to="/" className="flex items-center gap-2 group shrink-0">
                <div className="flex flex-col">
                  <span className="text-[13px] md:text-2xl font-black tracking-tight text-white leading-none uppercase">
                    Zetsumetsu <span className="text-[#00c2ff] italic">EOe</span> <span className="hidden min-[480px]:inline">BOOKZ</span>
                  </span>
                  <span className="text-[6px] md:text-[9px] font-bold text-[#00c2ff] tracking-[0.4em] uppercase opacity-80 mt-1 flex items-center gap-1.5">
                    <span className="inline-block w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-[#00c2ff] animate-pulse" />
                    NEXUS
                  </span>
                </div>
              </Link>
            )}
            
            {/* Search Bar - Desktop & Mobile Toggle */}
            <div className={`flex-1 max-w-[180px] lg:max-w-[240px] mx-4 md:mx-8 ${isMobileSearchOpen ? 'block' : 'hidden md:block'}`} id="nav-search-container">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#00c2ff] transition-colors" size={16} />
                <input 
                  type="text" 
                  autoFocus={isMobileSearchOpen}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery?.(e.target.value)}
                  placeholder="SEARCH ARCHIVES..." 
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-full py-2.5 md:py-3 pl-10 md:pl-12 pr-10 text-[10px] md:text-sm font-mono text-slate-300 focus:outline-none focus:border-[#00c2ff]/50 transition-all uppercase tracking-widest placeholder:text-slate-700 shadow-inner"
                />
                <button 
                  onClick={() => {
                    if (isMobileSearchOpen) {
                      setIsMobileSearchOpen(false);
                      setSearchQuery?.("");
                    } else {
                      setSearchQuery?.("");
                    }
                  }} 
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Actions Section */}
            {!isMobileSearchOpen && (
              <div className="flex items-center gap-2 md:gap-4">
                <button 
                  onClick={() => setIsMobileSearchOpen(true)}
                  className="md:hidden p-2 text-slate-400 hover:text-[#00c2ff] transition-colors"
                  title="Search Archives"
                >
                  <Search size={18} />
                </button>
                
                {/* Live Upload Quota Badge & Dropdown */}
                <div className="relative" ref={popoverRef}>
                  {quota.isPremium ? (
                    <button 
                      onClick={() => setIsQuotaPopoverOpen(prev => !prev)}
                      className="flex items-center gap-1.5 px-3 py-1.5 md:py-2 bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-indigo-500/10 hover:from-amber-500/20 hover:to-indigo-500/20 border border-amber-400/30 rounded-full transition-all group shadow-[0_0_15px_rgba(251,191,36,0.15)]"
                      title="Archival Status: Premium Unlimited"
                    >
                      <Crown size={13} className="text-amber-400 fill-amber-400 shrink-0" />
                      <span className="text-[9px] md:text-[10px] font-black text-amber-300 tracking-wider">
                        UNLIMITED
                      </span>
                      <span className="hidden xl:inline text-[8px] font-bold text-slate-400 uppercase tracking-widest pl-1 border-l border-white/10">
                        PRO
                      </span>
                    </button>
                  ) : (
                    <button 
                      onClick={() => setIsQuotaPopoverOpen(prev => !prev)}
                      className={`flex items-center gap-2 px-2.5 sm:px-3.5 py-1.5 md:py-2 rounded-full border transition-all ${
                        quota.remainingUploads === 0
                          ? 'bg-red-950/40 border-red-500/40 text-red-300 hover:bg-red-900/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                          : quota.remainingUploads === 1
                          ? 'bg-amber-950/40 border-amber-500/40 text-amber-300 hover:bg-amber-900/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                          : 'bg-[#0a0f14] border-[#00c2ff]/30 text-white hover:border-[#00c2ff]/60 hover:bg-[#00c2ff]/5'
                      }`}
                      title={`Upload Allowance: ${quota.remainingUploads} of ${quota.maxFreeUploads} slots remaining`}
                    >
                      {/* Segmented Slot Indicators */}
                      <div className="flex items-center gap-1">
                        {[0, 1, 2, 3, 4].map(idx => (
                          <div 
                            key={idx}
                            className={`w-1.5 h-1.5 rounded-full transition-all ${
                              idx < quota.uploadCount 
                                ? quota.remainingUploads === 0 ? 'bg-red-500' : 'bg-[#00c2ff] shadow-[0_0_6px_#00c2ff]' 
                                : 'bg-white/10 border border-white/20'
                            }`}
                          />
                        ))}
                      </div>

                      <div className="flex items-center gap-1 text-[9px] sm:text-[10px] font-mono font-black tracking-wider">
                        <span className={quota.remainingUploads === 0 ? 'text-red-400' : quota.remainingUploads === 1 ? 'text-amber-400' : 'text-[#00c2ff]'}>
                          {quota.remainingUploads}/{quota.maxFreeUploads}
                        </span>
                        <span className="hidden sm:inline uppercase text-slate-400 text-[8px] font-bold tracking-widest">
                          {quota.remainingUploads === 1 ? 'SLOT' : 'SLOTS'}
                        </span>
                      </div>

                      {quota.remainingUploads === 0 && (
                        <span className="hidden sm:inline bg-red-500 text-black text-[7px] font-black uppercase px-1.5 py-0.5 rounded tracking-widest ml-0.5">
                          MAX
                        </span>
                      )}
                    </button>
                  )}

                  {/* Interactive Quota Breakdown Popover */}
                  <AnimatePresence>
                    {isQuotaPopoverOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-[#0c0c0e] border border-white/15 rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(0,194,255,0.1)] z-50 backdrop-blur-xl"
                      >
                        <div className="flex items-center justify-between pb-3 border-b border-white/10">
                          <div className="flex items-center gap-2">
                            <HardDrive size={14} className="text-[#00c2ff]" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-white">Archival Storage</span>
                          </div>
                          <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                            quota.isPremium ? 'bg-amber-400/10 text-amber-300 border border-amber-400/20' : 'bg-white/5 text-slate-400 border border-white/10'
                          }`}>
                            {quota.isPremium ? '👑 PREMIUM TIER' : 'FREE TIER'}
                          </span>
                        </div>

                        <div className="py-3.5 space-y-3">
                          {quota.isPremium ? (
                            <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/10 to-purple-500/10 border border-amber-500/20">
                              <div className="flex items-center gap-2 mb-1">
                                <Crown size={14} className="text-amber-400 fill-amber-400" />
                                <span className="text-[11px] font-black uppercase tracking-wide text-white">Unlimited Storage</span>
                              </div>
                              <p className="text-[9px] text-slate-300 font-medium leading-relaxed">
                                You have unlocked unlimited PDF uploads to the Zetsu network with permanent global hosting.
                              </p>
                            </div>
                          ) : (
                            <>
                              {/* Slot Meter Bar */}
                              <div className="space-y-1.5">
                                <div className="flex justify-between items-center text-[9px] font-mono font-bold uppercase">
                                  <span className="text-slate-400">Slots Used</span>
                                  <span className="text-white">{quota.uploadCount} of {quota.maxFreeUploads} Books</span>
                                </div>
                                
                                {/* Visual 5-block row */}
                                <div className="grid grid-cols-5 gap-1.5 py-1">
                                  {[0, 1, 2, 3, 4].map(idx => {
                                    const isUsed = idx < quota.uploadCount;
                                    return (
                                      <div 
                                        key={idx}
                                        className={`h-7 rounded-lg border flex flex-col items-center justify-center transition-all ${
                                          isUsed 
                                            ? 'bg-[#00c2ff]/15 border-[#00c2ff]/50 text-[#00c2ff]' 
                                            : 'bg-white/5 border-dashed border-white/15 text-slate-600'
                                        }`}
                                      >
                                        <span className="text-[8px] font-mono font-black">{idx + 1}</span>
                                        <span className="text-[6px] uppercase font-bold tracking-tighter">
                                          {isUsed ? 'USED' : 'FREE'}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              <div className={`p-2.5 rounded-xl border text-[9px] leading-relaxed font-bold ${
                                quota.remainingUploads === 0
                                  ? 'bg-red-500/10 border-red-500/30 text-red-200'
                                  : quota.remainingUploads === 1
                                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                                  : 'bg-[#00c2ff]/10 border-[#00c2ff]/20 text-slate-300'
                              }`}>
                                {quota.remainingUploads === 0 ? (
                                  <p className="flex items-center gap-1.5">
                                    <AlertTriangle size={14} className="text-red-400 shrink-0" />
                                    <span>All 5 free slots filled. Upgrade to publish more.</span>
                                  </p>
                                ) : quota.remainingUploads === 1 ? (
                                  <p className="flex items-center gap-1.5">
                                    <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                                    <span>1 upload slot remaining on your free tier.</span>
                                  </p>
                                ) : (
                                  <p className="flex items-center gap-1.5">
                                    <CheckCircle2 size={14} className="text-[#00c2ff] shrink-0" />
                                    <span>You have {quota.remainingUploads} free uploads left.</span>
                                  </p>
                                )}
                              </div>
                            </>
                          )}
                        </div>

                        <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
                          {!quota.isPremium && (
                            <button
                              onClick={() => {
                                setIsQuotaPopoverOpen(false);
                                setIsPricingOpen(true);
                              }}
                              className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)]"
                            >
                              <Crown size={12} className="fill-white" />
                              Upgrade to Unlimited ($19.99)
                            </button>
                          )}
                          
                          <button
                            onClick={() => {
                              setIsQuotaPopoverOpen(false);
                              setIsRequestOpen(true);
                            }}
                            className="w-full py-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-1.5 border border-white/10 transition-all"
                          >
                            <Send size={11} />
                            Open Upload Terminal
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex items-center gap-2 md:gap-4">
                  {!isPremium && (
                    <button 
                      onClick={() => setIsPricingOpen(true)}
                      className="hidden sm:flex px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_35px_rgba(168,85,247,0.6)] transition-all items-center gap-2 border border-white/10"
                    >
                      <Crown size={12} className="fill-white" />
                      GO PREMIUM
                    </button>
                  )}
                  <button 
                    onClick={() => setIsRequestOpen(true)}
                    className="px-4 md:px-8 py-2.5 md:py-3 bg-[#00c2ff] text-black hover:bg-white text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300 flex items-center gap-2 rounded-full shadow-[0_0_25px_rgba(0,194,255,0.3)] hover:shadow-[0_0_45px_rgba(0,194,255,0.6)] active:scale-95 group"
                  >
                    <Send size={14} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    <span className="hidden min-[540px]:inline">SUBMIT DATA</span>
                  </button>

                  <button 
                    onClick={() => setIsShopOpen(true)}
                    className="px-4 md:px-6 py-2.5 md:py-3 bg-[#00f2c3] text-black hover:bg-white text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300 flex items-center gap-2 rounded-full shadow-[0_0_25px_rgba(0,242,195,0.3)] hover:shadow-[0_0_45px_rgba(0,242,195,0.6)] active:scale-95 group"
                  >
                    <ShoppingBag size={14} className="group-hover:scale-110 transition-transform" />
                    <span className="hidden md:inline">Shop</span>
                  </button>

                  <button 
                    onClick={() => setIsAboutOpen(true)}
                    className="flex items-center gap-2 p-2 md:px-4 md:py-2 text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-[0.2em] transition-all"
                  >
                    <Info size={14} />
                    <span className="hidden md:inline">About</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {isRequestOpen && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 backdrop-blur-xl" 
              onClick={() => setIsRequestOpen(false)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative bg-[#0a0a0a] w-full max-w-4xl rounded-[2rem] md:rounded-[2.5rem] shadow-[0_0_100px_rgba(0,194,255,0.1)] border border-white/10 my-auto overflow-hidden"
            >
              <div className="grid md:grid-cols-2 max-h-[90vh] md:max-h-none overflow-y-auto md:overflow-visible">
                
                {/* Protocol Instructions Panel */}
                <div className="p-8 md:p-12 bg-black/40 border-b md:border-b-0 md:border-r border-white/5">
                  <div className="mb-10">
                    <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-2">Archival Sync</h2>
                    <div className="h-1 w-12 bg-[#00c2ff]" />
                    <p className="mt-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                      Upload your books directly to the Zetsu network.
                    </p>
                  </div>

                  <div className="space-y-8">
                    <div className="flex gap-4">
                      <div className="w-10 h-10 shrink-0 bg-[#00c2ff]/5 border border-[#00c2ff]/20 rounded-xl flex items-center justify-center text-[#00c2ff]">
                        <FileText size={18} />
                      </div>
                      <div>
                        <h4 className="text-[11px] font-black text-white uppercase tracking-wider mb-1">01. Select Artifact</h4>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight leading-normal">
                          Upload your PDF directly. It will be added to the public library instantly.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="w-10 h-10 shrink-0 bg-[#00c2ff]/5 border border-[#00c2ff]/20 rounded-xl flex items-center justify-center text-[#00c2ff]">
                        <ImageIcon size={18} />
                      </div>
                      <div>
                        <h4 className="text-[11px] font-black text-[#00c2ff] uppercase tracking-wider mb-1">CRITICAL: PAGE_01 COVER</h4>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight leading-normal">
                          The first page of your PDF must be the book cover for the thumbnail to look correct.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="w-10 h-10 shrink-0 bg-[#00c2ff]/5 border border-[#00c2ff]/20 rounded-xl flex items-center justify-center text-[#00c2ff]">
                        <Sparkles size={18} />
                      </div>
                      <div>
                        <h4 className="text-[11px] font-black text-white uppercase tracking-wider mb-1">02. Categorization</h4>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight leading-normal">
                          Choose the best genre sector for your book to help others find it.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="w-10 h-10 shrink-0 bg-[#00c2ff]/5 border border-[#00c2ff]/20 rounded-xl flex items-center justify-center text-[#00c2ff]">
                        <Cpu size={18} />
                      </div>
                      <div>
                        <h4 className="text-[11px] font-black text-white uppercase tracking-wider mb-1">03. Global Deployment</h4>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight leading-normal">
                          Your book becomes a permanent part of the Zetsumetsu library.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-12 p-4 rounded-xl bg-[#00c2ff]/5 border border-[#00c2ff]/10">
                     <p className="text-[8px] font-black text-[#00c2ff] uppercase tracking-[0.2em] text-center">
                       NOTICE: DIRECT UPLOAD PROTOCOL ACTIVE.
                     </p>
                  </div>
                </div>

                {/* Form Panel */}
                <div className="p-8 md:p-12 flex flex-col justify-center">
                  <div className="flex justify-end md:absolute md:top-6 md:right-6 mb-8 md:mb-0">
                    <button onClick={() => setIsRequestOpen(false)} className="p-2 hover:bg-white/5 rounded-full text-slate-500 transition-colors">
                      <X size={20} />
                    </button>
                  </div>

                  {/* Live Capacity Monitor Box */}
                  <div className="mb-6 p-4 rounded-2xl bg-black/60 border border-white/10 space-y-3 shadow-inner">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <HardDrive size={14} className="text-[#00c2ff]" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-white">Archival Quota</span>
                      </div>
                      <span className={`text-[8px] font-black font-mono uppercase px-2.5 py-0.5 rounded-full ${
                        quota.isPremium 
                          ? 'bg-amber-400/10 text-amber-300 border border-amber-400/20' 
                          : quota.remainingUploads === 0 
                          ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                          : quota.remainingUploads === 1
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-[#00c2ff]/10 text-[#00c2ff] border border-[#00c2ff]/30'
                      }`}>
                        {quota.isPremium 
                          ? '👑 UNLIMITED STORAGE' 
                          : `${quota.remainingUploads} OF ${quota.maxFreeUploads} SLOTS REMAINING`}
                      </span>
                    </div>

                    {/* 5-slot visual progress nodes */}
                    {!quota.isPremium && (
                      <div className="space-y-1.5">
                        <div className="grid grid-cols-5 gap-1.5">
                          {[0, 1, 2, 3, 4].map(idx => {
                            const isUsed = idx < quota.uploadCount;
                            return (
                              <div 
                                key={idx}
                                className={`py-1.5 rounded-lg border text-center transition-all flex flex-col items-center justify-center ${
                                  isUsed
                                    ? 'bg-[#00c2ff]/15 border-[#00c2ff]/40 text-[#00c2ff]'
                                    : 'bg-white/5 border-dashed border-white/15 text-slate-500'
                                }`}
                              >
                                <span className="text-[8px] font-mono font-bold">SLOT {idx + 1}</span>
                                <span className="text-[6px] font-black uppercase tracking-tight">
                                  {isUsed ? 'OCCUPIED' : 'OPEN'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex justify-between items-center text-[8px] font-bold uppercase tracking-widest text-slate-500 pt-0.5">
                          <span>Free Tier (5 Books Max)</span>
                          <span className={quota.remainingUploads === 0 ? 'text-red-400 font-black' : quota.remainingUploads === 1 ? 'text-amber-400 font-black' : 'text-slate-400'}>
                            {quota.remainingUploads === 0 ? 'Quota Depleted' : `${quota.remainingUploads} Left`}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {uploadError && (
                    <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30">
                      <p className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-1">Deployment Rejected</p>
                      <p className="text-[10px] text-red-200/80 font-bold leading-normal">{uploadError}</p>
                    </div>
                  )}

                  <AnimatePresence mode="wait">
                    {uploadStatus === 'success' ? (
                      <motion.div 
                        key="success"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="py-12 text-center space-y-4"
                      >
                        <div className="w-16 h-16 bg-[#00c2ff]/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(0,194,255,0.2)]">
                          <Zap className="text-[#00c2ff]" size={32} />
                        </div>
                        <h3 className="text-xl font-black text-white uppercase italic">Archive Synced</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest max-w-[240px] mx-auto">
                          {quota.isPremium 
                            ? "Deployment complete. Premium unlimited storage active."
                            : `Deployment complete. ${quota.remainingUploads} of ${quota.maxFreeUploads} free upload slots remaining.`}
                        </p>
                      </motion.div>
                    ) : (!quota.isPremium && quota.remainingUploads <= 0 && !pdfInfo) ? (
                      <motion.div 
                        key="limit-reached"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="border-2 border-red-500/30 rounded-[2rem] p-8 text-center bg-red-950/20 backdrop-blur-md space-y-4"
                      >
                        <div className="w-14 h-14 mx-auto rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shadow-[0_0_25px_rgba(239,68,68,0.2)]">
                          <ShieldAlert size={28} />
                        </div>
                        <div>
                          <h4 className="font-black text-white uppercase tracking-wider text-sm mb-1.5">Free Archival Limit Reached</h4>
                          <p className="text-[10px] text-slate-400 font-medium leading-relaxed max-w-sm mx-auto">
                            You have uploaded the maximum of 5 free books allowed on this node. Upgrade to a Premium Archivist to publish unlimited books, unlock priority indexing, and obtain a verified badge.
                          </p>
                        </div>
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setIsRequestOpen(false);
                              setIsPricingOpen(true);
                            }}
                            className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-[0_0_30px_rgba(168,85,247,0.4)] transition-all flex items-center justify-center gap-2"
                          >
                            <Crown size={14} className="fill-white" />
                            Unlock Unlimited Uploads ($19.99)
                          </button>
                        </div>
                      </motion.div>
                    ) : uploadStatus === 'uploading' ? (
                      <motion.div 
                        key="uploading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="py-20 text-center"
                      >
                        <div className="relative w-24 h-24 mx-auto mb-8">
                          <Loader2 className="w-full h-full text-[#00c2ff] animate-spin" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-12 h-12 bg-[#00c2ff]/20 rounded-full animate-ping" />
                          </div>
                        </div>
                        <p className="text-xl font-black text-white uppercase italic animate-pulse">Syncing Bitstream...</p>
                        <div className="mt-4 w-48 h-1 bg-white/5 mx-auto rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-[#00c2ff]"
                            initial={{ width: "0%" }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 2, repeat: Infinity }}
                          />
                        </div>
                      </motion.div>
                    ) : !pdfInfo ? (
                      <motion.div 
                        key="idle"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-white/10 rounded-[2rem] p-12 text-center cursor-pointer hover:border-[#00c2ff]/50 transition-all bg-black/40 group"
                      >
                        <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={handleFileSelect} />
                        <FileText size={48} className="mx-auto mb-4 text-slate-700 group-hover:text-[#00c2ff] transition-colors" />
                        <p className="font-black text-white uppercase tracking-widest text-xs mb-2">Select PDF Artifact</p>
                        <p className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">Max 50MB per node • {quota.remainingUploads} slots remaining</p>
                      </motion.div>
                    ) : (
                      <motion.form 
                        key="form"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        onSubmit={handleUploadSubmit} 
                        className="space-y-6"
                      >
                        <div className="space-y-4">
                          <div className="flex gap-4 p-4 bg-black rounded-2xl border border-white/5 items-center">
                            <img src={pdfInfo.thumbnail} className="w-12 aspect-[3/4] object-cover rounded shadow-2xl" alt="thumb" />
                            <div className="min-w-0">
                              <p className="text-[10px] font-black text-white uppercase italic truncate">{formData.title}</p>
                              <p className="text-[8px] text-slate-500 font-bold uppercase">{pdfInfo.pageCount} Pages Detected</p>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Archive Title</label>
                            <input 
                              required
                              value={formData.title}
                              onChange={e => setFormData({...formData, title: e.target.value})}
                              placeholder="Project name"
                              className="w-full bg-black border border-white/10 py-4 px-6 rounded-2xl text-xs font-bold text-white focus:outline-none focus:border-[#00c2ff]/50 transition-all uppercase"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Author ID</label>
                            <input 
                              required
                              value={formData.author}
                              onChange={e => setFormData({...formData, author: e.target.value})}
                              placeholder="Your NEURAL_ID"
                              className="w-full bg-black border border-white/10 py-4 px-6 rounded-2xl text-xs font-bold text-white focus:outline-none focus:border-[#00c2ff]/50 transition-all uppercase"
                            />
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Genre Sector</label>
                            </div>
                            <div className="relative">
                              <select
                                required
                                value={formData.genre}
                                onChange={(e) => setFormData({...formData, genre: e.target.value})}
                                className="w-full bg-black border border-white/10 py-4 px-6 rounded-2xl text-xs font-bold text-white focus:outline-none focus:border-[#00c2ff]/50 transition-all appearance-none uppercase cursor-pointer"
                              >
                                <option value="" disabled>Select Sector</option>
                                {CATEGORIES.map((cat) => (
                                  <option key={cat} value={cat} className="bg-[#0a0a0a] text-white">
                                    {cat}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-[#00c2ff] pointer-events-none" size={16} />
                            </div>
                          </div>
                        </div>
                        <button type="submit" className="w-full bg-[#00c2ff] text-black py-4 rounded-2xl font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-[0_0_30px_rgba(0,194,255,0.2)] mt-4">
                          Initiate Deployment
                        </button>
                      </motion.form>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isShopOpen && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/95 backdrop-blur-3xl" 
              onClick={() => {
                setIsShopOpen(false);
                setSelectedBook(null);
                setOrderStep('selection');
              }} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-[#0a0a0a] w-full max-w-5xl rounded-[2.5rem] shadow-2xl border border-white/10 my-auto overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* 1. HEADER */}
              <div className="p-4 md:p-6 border-b border-white/5 bg-black/60 backdrop-blur-md sticky top-0 z-10 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00c2ff]/10 border border-[#00c2ff]/20">
                    <ShoppingBag size={12} className="text-[#00c2ff]" />
                    <span className="text-[9px] font-black text-[#00c2ff] uppercase tracking-widest">Zetsu Bookstore</span>
                  </div>
                  <h2 className="text-lg md:text-xl font-black text-white uppercase italic tracking-tighter">Order Physical Books</h2>
                </div>
                <button 
                  onClick={() => {
                    setIsShopOpen(false);
                    setSelectedBook(null);
                    setOrderStep('selection');
                  }} 
                  className="p-2 hover:bg-white/5 rounded-full text-slate-500 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Shop Content - Scrollable */}
              <div className="flex-1 overflow-y-auto p-6 md:p-10">
                <AnimatePresence mode="wait">
                  {orderStep === 'selection' ? (
                    <motion.div 
                      key="selection"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-8"
                    >
                      {/* 2. SEARCH BAR */}
                      <div className="relative max-w-2xl mx-auto">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input 
                          type="text"
                          value={shopSearch}
                          onChange={(e) => setShopSearch(e.target.value)}
                          placeholder="SEARCH THE BOOKSTORE..."
                          className="w-full bg-black border border-white/10 rounded-2xl py-4 pl-16 pr-6 text-xs font-bold text-white focus:outline-none focus:border-[#00c2ff]/50 transition-all uppercase tracking-widest"
                        />
                      </div>

                      {/* 3. DESCRIPTION (Bulleted) */}
                      <div className="max-w-3xl mx-auto">
                        <ul className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] leading-relaxed space-y-2 list-none text-center">
                          <li className="flex items-center justify-center gap-2">
                            <span className="w-1 h-1 bg-[#00c2ff] rounded-full" />
                            High-fidelity print-on-demand process initiated upon order
                          </li>
                          <li className="flex items-center justify-center gap-2">
                            <span className="w-1 h-1 bg-[#00c2ff] rounded-full" />
                            Professionally printed, bound, and finished to your selection
                          </li>
                          <li className="flex items-center justify-center gap-2">
                            <span className="w-1 h-1 bg-[#00c2ff] rounded-full" />
                            Secure checkout via Stripe directly to our printing facility
                          </li>
                          <li className="flex items-center justify-center gap-2">
                            <span className="w-1 h-1 bg-[#00c2ff] rounded-full" />
                            Manufactured and shipped globally to your coordinates
                          </li>
                        </ul>
                      </div>

                      {/* 4. PRICES & SPECS (Consolidated) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-5xl mx-auto">
                        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl group hover:border-[#00c2ff]/50 transition-all">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                              <Sparkles size={12} className="text-[#00c2ff]" />
                              <span className="text-[9px] font-black text-white uppercase tracking-widest">Coloring Book style</span>
                            </div>
                            <span className="text-sm font-black text-[#00c2ff]">$15</span>
                          </div>
                          <div className="space-y-1 opacity-60 group-hover:opacity-100 transition-opacity">
                            <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">• 8.5" x 11" Standard Size</p>
                            <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">• 26 Premium White Sheets</p>
                            <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">• Ideal for Crayons/Markers</p>
                          </div>
                        </div>

                        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl group hover:border-purple-500/50 transition-all">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                              <Crown size={12} className="text-purple-400" />
                              <span className="text-[9px] font-black text-white uppercase tracking-widest">Board Book style</span>
                            </div>
                            <span className="text-sm font-black text-purple-400">$24.99</span>
                          </div>
                          <div className="space-y-1 opacity-60 group-hover:opacity-100 transition-opacity">
                            <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">• 1/16” Thick Chipboard</p>
                            <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">• Matte Lamination Finish</p>
                            <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">• Safe Rounded Corners</p>
                          </div>
                        </div>

                        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl group hover:border-emerald-500/50 transition-all">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                              <FileText size={12} className="text-emerald-400" />
                              <span className="text-[9px] font-black text-white uppercase tracking-widest">Softcover Book style</span>
                            </div>
                            <span className="text-sm font-black text-emerald-400">$34.99</span>
                          </div>
                          <div className="space-y-1 opacity-60 group-hover:opacity-100 transition-opacity">
                            <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">• 8'' x 8'' Square Format</p>
                            <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">• 100 lb Semi-Gloss Paper</p>
                            <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">• Vibrant HD Full-Color</p>
                          </div>
                        </div>

                        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl group hover:border-indigo-500/50 transition-all">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                              <Zap size={12} className="text-indigo-400" />
                              <span className="text-[9px] font-black text-white uppercase tracking-widest">Hardcover Book style</span>
                            </div>
                            <span className="text-sm font-black text-indigo-400">$49.99</span>
                          </div>
                          <div className="space-y-1 opacity-60 group-hover:opacity-100 transition-opacity">
                            <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">• 11'' x 8.5'' / 8'' x 8''</p>
                            <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">• Glossy or Matte Finish</p>
                            <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">• Professional Binding</p>
                          </div>
                        </div>
                      </div>

                      {/* 5. BOOKS GRID */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 pt-4 border-t border-white/5">
                        {filteredShopBooks.map((book) => (
                          <motion.div 
                            key={book.id}
                            whileHover={{ y: -5 }}
                            onClick={() => {
                              setSelectedBook(book);
                              setOrderStep('form');
                            }}
                            className="group cursor-pointer"
                          >
                            <div className="relative aspect-[3/4] rounded-2xl overflow-hidden mb-3 border border-white/5 group-hover:border-[#00c2ff]/50 transition-all shadow-xl">
                              <img src={book.thumbnail} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={book.title} />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                                <span className="text-[9px] font-black text-[#00c2ff] uppercase tracking-widest">Order Now</span>
                              </div>
                            </div>
                            <h4 className="text-[10px] font-black text-white uppercase truncate mb-1">{book.title}</h4>
                            <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">{book.author}</p>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="form"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="max-w-2xl mx-auto"
                    >
                      <button 
                        onClick={() => setOrderStep('selection')}
                        className="text-[9px] font-black text-[#00c2ff] uppercase tracking-widest mb-8 flex items-center gap-2 hover:translate-x-[-4px] transition-transform"
                      >
                        ← Back to Bookstore
                      </button>

                      <div className="grid md:grid-cols-2 gap-10">
                        {/* Book Preview */}
                        <div className="space-y-6">
                          <div className="aspect-[3/4] rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                            <img src={selectedBook?.thumbnail} className="w-full h-full object-cover" alt="preview" />
                          </div>
                          <div>
                            <h3 className="text-xl font-black text-white uppercase italic mb-2">{selectedBook?.title}</h3>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">By {selectedBook?.author}</p>
                          </div>
                        </div>

                        {/* Order Form */}
                        <form onSubmit={handleOrderSubmit} className="space-y-6">
                          <div className="space-y-4">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                              Choose your format and enter your shipping details below.
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                              <button 
                                type="button"
                                onClick={() => setOrderData({...orderData, format: 'coloring'})}
                                className={`p-3 rounded-xl border transition-all text-left ${orderData.format === 'coloring' ? 'bg-[#00c2ff] border-[#00c2ff] text-black' : 'bg-black border-white/10 text-white hover:border-white/20'}`}
                              >
                                <span className="block text-[8px] font-black uppercase tracking-widest">Coloring Book style</span>
                                <span className="block text-[11px] font-black mt-0.5">$15.00</span>
                              </button>
                              <button 
                                type="button"
                                onClick={() => setOrderData({...orderData, format: 'board'})}
                                className={`p-3 rounded-xl border transition-all text-left ${orderData.format === 'board' ? 'bg-[#00c2ff] border-[#00c2ff] text-black' : 'bg-black border-white/10 text-white hover:border-white/20'}`}
                              >
                                <span className="block text-[8px] font-black uppercase tracking-widest">Board Book style</span>
                                <span className="block text-[11px] font-black mt-0.5">$24.99</span>
                              </button>
                              <button 
                                type="button"
                                onClick={() => setOrderData({...orderData, format: 'soft_photo'})}
                                className={`p-3 rounded-xl border transition-all text-left ${orderData.format === 'soft_photo' ? 'bg-[#00c2ff] border-[#00c2ff] text-black' : 'bg-black border-white/10 text-white hover:border-white/20'}`}
                              >
                                <span className="block text-[8px] font-black uppercase tracking-widest">Softcover Book style</span>
                                <span className="block text-[11px] font-black mt-0.5">$34.99</span>
                              </button>
                              <button 
                                type="button"
                                onClick={() => setOrderData({...orderData, format: 'hard_photo'})}
                                className={`p-3 rounded-xl border transition-all text-left ${orderData.format === 'hard_photo' ? 'bg-[#00c2ff] border-[#00c2ff] text-black' : 'bg-black border-white/10 text-white hover:border-white/20'}`}
                              >
                                <span className="block text-[8px] font-black uppercase tracking-widest">Hardcover Book style</span>
                                <span className="block text-[11px] font-black mt-0.5">$49.99</span>
                              </button>
                            </div>

                            {/* Format Specifications */}
                            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                              <h4 className="text-[9px] font-black text-[#00c2ff] uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Info size={12} />
                                Product Specifications
                              </h4>
                              <div className="space-y-2">
                                {orderData.format === 'coloring' && (
                                  <>
                                    <p className="text-[9px] text-slate-300 font-bold uppercase leading-relaxed">• Size: 8.5" x 11" (Standard Coloring Size)</p>
                                    <p className="text-[9px] text-slate-300 font-bold uppercase leading-relaxed">• Pages: 26 Premium White Sheets</p>
                                    <p className="text-[9px] text-slate-300 font-bold uppercase leading-relaxed">• Quality: Ideal for crayons, markers, watercolors</p>
                                    <p className="text-[9px] text-slate-300 font-bold uppercase leading-relaxed">• Cover: Flexible Soft Cover</p>
                                  </>
                                )}
                                {orderData.format === 'board' && (
                                  <>
                                    <p className="text-[9px] text-slate-300 font-bold uppercase leading-relaxed">• Material: 1/16” Thick White Chipboard</p>
                                    <p className="text-[9px] text-slate-300 font-bold uppercase leading-relaxed">• Finish: Matte Lamination (Anti-Fingerprint)</p>
                                    <p className="text-[9px] text-slate-300 font-bold uppercase leading-relaxed">• Safety: Rounded Corners Design</p>
                                    <p className="text-[9px] text-slate-300 font-bold uppercase leading-relaxed">• Limit: Max 20 Pages</p>
                                  </>
                                )}
                                {orderData.format === 'soft_photo' && (
                                  <>
                                    <p className="text-[9px] text-slate-300 font-bold uppercase leading-relaxed">• Size: 8'' x 8'' Square Format</p>
                                    <p className="text-[9px] text-slate-300 font-bold uppercase leading-relaxed">• Binding: Sturdy Hardcover (Glossy or Matte)</p>
                                    <p className="text-[9px] text-slate-300 font-bold uppercase leading-relaxed">• Paper: 100 lb Archival Semi-Gloss</p>
                                    <p className="text-[9px] text-slate-300 font-bold uppercase leading-relaxed">• Print: Vibrant Full-Color High-Definition</p>
                                  </>
                                )}
                                {orderData.format === 'hard_photo' && (
                                  <>
                                    <p className="text-[9px] text-slate-300 font-bold uppercase leading-relaxed">• Size: 11'' x 8.5'' or 8'' x 8''</p>
                                    <p className="text-[9px] text-slate-300 font-bold uppercase leading-relaxed">• Finish: Premium Glossy or Matte Boards</p>
                                    <p className="text-[9px] text-slate-300 font-bold uppercase leading-relaxed">• Binding: Professional Library-Grade Binding</p>
                                    <p className="text-[9px] text-slate-300 font-bold uppercase leading-relaxed">• Limit: Max 24 Pages</p>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                              <div className="col-span-2 space-y-1">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Shipping Name</label>
                                <input 
                                  required
                                  value={orderData.name}
                                  onChange={e => setOrderData({...orderData, name: e.target.value})}
                                  placeholder="Full Name"
                                  className="w-full bg-black border border-white/10 py-3 px-5 rounded-xl text-[10px] font-bold text-white focus:outline-none focus:border-[#00c2ff]/50 transition-all uppercase"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Quantity</label>
                                <div className="flex items-center bg-black border border-white/10 rounded-xl overflow-hidden">
                                  <button 
                                    type="button"
                                    onClick={() => setOrderData({...orderData, quantity: Math.max(1, orderData.quantity - 1)})}
                                    className="p-3 hover:bg-white/5 text-slate-400"
                                  >
                                    <Minus size={12} />
                                  </button>
                                  <span className="flex-1 text-center text-[10px] font-black text-white">{orderData.quantity}</span>
                                  <button 
                                    type="button"
                                    onClick={() => setOrderData({...orderData, quantity: orderData.quantity + 1})}
                                    className="p-3 hover:bg-white/5 text-[#00c2ff]"
                                  >
                                    <Plus size={12} />
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                              <input 
                                required
                                type="email"
                                value={orderData.email}
                                onChange={e => setOrderData({...orderData, email: e.target.value})}
                                placeholder="your@email.com"
                                className="w-full bg-black border border-white/10 py-4 px-6 rounded-2xl text-xs font-bold text-white focus:outline-none focus:border-[#00c2ff]/50 transition-all uppercase"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Shipping Address</label>
                              <textarea 
                                required
                                value={orderData.address}
                                onChange={e => setOrderData({...orderData, address: e.target.value})}
                                placeholder="Street, City, Zip, Country"
                                className="w-full bg-black border border-white/10 py-4 px-6 rounded-2xl text-xs font-bold text-white focus:outline-none focus:border-[#00c2ff]/50 transition-all uppercase min-h-[100px] resize-none"
                              />
                            </div>

                            {/* Price Summary */}
                            <div className="mt-6 p-6 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                <span className="text-slate-500">Unit Price</span>
                                <span className="text-white">
                                  ${orderData.format === 'coloring' ? '15.00' : 
                                    orderData.format === 'board' ? '24.99' : 
                                    orderData.format === 'soft_photo' ? '34.99' : '49.99'}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                <span className="text-slate-500">Quantity</span>
                                <span className="text-white">x{orderData.quantity}</span>
                              </div>
                              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                <span className="text-slate-500">Shipping</span>
                                <span className={shippingCost > 0 ? "text-[#00c2ff]" : "text-slate-600"}>
                                  {shippingCost > 0 ? `$${shippingCost.toFixed(2)}` : 'Enter Address'}
                                </span>
                              </div>
                              <div className="h-px bg-white/10 my-2" />
                              <div className="flex justify-between items-center">
                                <div className="space-y-1">
                                  <span className="block text-[11px] font-black text-white uppercase tracking-widest">Total</span>
                                  <span className="block text-[8px] text-emerald-400 font-black uppercase tracking-widest">
                                    Est. Delivery: 1 Week Min.
                                  </span>
                                </div>
                                <span className="text-xl font-black text-[#00c2ff]">
                                  ${(
                                    (orderData.format === 'coloring' ? 15.00 : 
                                     orderData.format === 'board' ? 24.99 : 
                                     orderData.format === 'soft_photo' ? 34.99 : 49.99) * orderData.quantity + shippingCost
                                  ).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <button type="submit" className="w-full bg-[#00c2ff] text-black py-5 rounded-2xl font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-[0_0_30px_rgba(0,194,255,0.2)] flex items-center justify-center gap-3">
                            <CreditCard size={18} />
                            Buy Now
                          </button>
                          <p className="text-[8px] text-slate-600 font-bold uppercase tracking-widest text-center">
                            Your order will be processed and shipped directly to you.
                          </p>
                        </form>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAboutOpen && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 backdrop-blur-xl" 
              onClick={() => setIsAboutOpen(false)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative bg-[#0a0a0a] w-full max-w-2xl rounded-[2rem] md:rounded-[2.5rem] shadow-2xl border border-white/10 my-auto overflow-hidden"
            >
              <div className="p-8 md:p-12 text-white max-h-[90vh] overflow-y-auto">
                <h2 className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase mb-4 md:mb-6">System_Manifesto</h2>
                <div className="h-1 w-20 md:w-24 bg-[#00c2ff] mt-2 md:mt-4 mb-6 md:mb-8 shadow-[0_0_15px_rgba(0,194,255,0.5)]" />
                <div className="space-y-8 text-slate-400 text-xs md:text-sm leading-relaxed mb-8 md:mb-12">
                  <p className="text-white font-bold uppercase tracking-tight">
                    Zetsumetsu EOe BOOKZ is a high-fidelity neural archive designed to transform static PDF documentation into immersive digital experiences. It functions as a decentralized storage nexus where creative intelligence is preserved.
                  </p>
                  
                  <div className="space-y-6">
                    <p className="text-[#00c2ff] font-black uppercase tracking-widest text-[9px] md:text-[10px]">Integrated_Features:</p>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 list-none">
                      <li className="flex gap-3">
                        <span className="text-[#00c2ff] font-black mt-1">●</span>
                        <span><strong className="text-white">NEURAL ARCHIVE:</strong> Instant PDF-to-Digital transformation with automated thumbnails and interactive reading.</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="text-[#00c2ff] font-black mt-1">●</span>
                        <span><strong className="text-white">ZETSU BOOKSTORE:</strong> Physical Print-on-Demand in Coloring, Board, Softcover, and Hardcover styles.</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="text-[#00c2ff] font-black mt-1">●</span>
                        <span><strong className="text-white">PROMO PROTOCOL:</strong> Gamified badge collection for free 2-day global broadcast runs across 6 platforms.</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="text-[#00c2ff] font-black mt-1">●</span>
                        <span><strong className="text-white">ZETSU EDU:</strong> Educational nexus for creators to master archival arts and scale their reach.</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="text-[#00c2ff] font-black mt-1">●</span>
                        <span><strong className="text-white">COMMUNITY RESPONSE:</strong> Trending feed, open discourse via comments, and author profile preservation.</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="text-[#00c2ff] font-black mt-1">●</span>
                        <span><strong className="text-white">ADVANCED SEARCH:</strong> Multi-term intersection logic for deep discovery across titles, authors, and genre sectors.</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="text-[#00c2ff] font-black mt-1">●</span>
                        <span><strong className="text-white">PREMIUM TIER:</strong> Unlimited archival storage and priority broadcast slots for verified creators.</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="text-[#00c2ff] font-black mt-1">●</span>
                        <span><strong className="text-white">GLOBAL LOGISTICS:</strong> Secure Stripe checkout with worldwide shipping directly from our printing facilities.</span>
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-4 pt-6 border-t border-white/5">
                    <p className="text-[#00c2ff] font-black uppercase tracking-widest text-[9px] md:text-[10px]">Tech_Stack:</p>
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-1 h-1 bg-white/20 rounded-full" />
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">React 19 / Vite</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-1 h-1 bg-white/20 rounded-full" />
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Supabase DB</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-1 h-1 bg-white/20 rounded-full" />
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Tailwind CSS</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-1 h-1 bg-white/20 rounded-full" />
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Motion / Lucide</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-1 h-1 bg-white/20 rounded-full" />
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Stripe Nexus</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex flex-col gap-1">
                      <span className="text-[8px] font-black text-slate-700 uppercase tracking-[0.3em]">Build_Version: 2.8.5-STABLE</span>
                      <span className="text-[8px] font-black text-slate-800 uppercase tracking-[0.3em]">Status: All Systems Nominal</span>
                    </div>
                    <p className="text-[10px] font-black text-white italic uppercase tracking-widest">
                      Digital Archiving, The Zetsu Way.
                    </p>
                  </div>
                </div>
                <button onClick={() => setIsAboutOpen(false)} className="w-full bg-white text-black py-3 md:py-4 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-xs md:text-base hover:bg-[#00c2ff] transition-colors">Close_Link</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Live Floating Toast Notification */}
      <AnimatePresence>
        {toastNotification && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-[120] max-w-md w-[calc(100vw-3rem)] bg-[#0c0c10]/95 border border-white/15 rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_30px_rgba(0,194,255,0.15)] backdrop-blur-2xl"
          >
            <div className="flex items-start gap-3.5">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                toastNotification.type === 'error'
                  ? 'bg-red-500/10 border-red-500/30 text-red-400'
                  : toastNotification.type === 'warning'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : toastNotification.type === 'success'
                  ? 'bg-[#00c2ff]/10 border-[#00c2ff]/30 text-[#00c2ff]'
                  : 'bg-white/10 border-white/20 text-white'
              }`}>
                {toastNotification.type === 'error' && <AlertTriangle size={18} />}
                {toastNotification.type === 'warning' && <AlertTriangle size={18} />}
                {toastNotification.type === 'success' && <CheckCircle2 size={18} />}
                {toastNotification.type === 'info' && <HardDrive size={18} />}
              </div>
              <div className="flex-1 min-w-0">
                <h5 className="text-[11px] font-black uppercase tracking-wider text-white mb-0.5">
                  {toastNotification.title}
                </h5>
                <p className="text-[10px] text-slate-400 font-bold leading-normal">
                  {toastNotification.message}
                </p>
              </div>
              <button
                onClick={() => setToastNotification(null)}
                className="p-1 text-slate-500 hover:text-white rounded-lg transition-colors"
                title="Dismiss Notification"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <PricingModal 
        isOpen={isPricingOpen} 
        onClose={() => setIsPricingOpen(false)} 
        deviceId={getDeviceId()} 
      />
    </>
  );
};

export default Navbar;
