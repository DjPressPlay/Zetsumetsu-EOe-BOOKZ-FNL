
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
  ArrowRight,
  Coins,
  KeyRound,
  BookOpen,
  Users
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
  FREE_UPLOAD_LIMIT,
  getUserMarqs,
  spendMarqs,
  awardMarqs,
  MARQS_PER_USD
} from '../services/db';
import { getDeviceId, getDeviceIdHistory } from '../services/deviceId';
import { BookMetadata, BookData, UserMarqsProfile } from '../types';
import PricingModal from './PricingModal';
import MarqsEconomyModal from './MarqsEconomyModal';
import MarqsToast from './MarqsToast';
import MarqsLogo from './MarqsLogo';

interface NavbarProps {
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
}

const CATEGORIES = [
  "GUIDES & HOW-TOS",
  "FICTION & STORIES",
  "RESEARCH & PAPERS",
  "REFERENCE & NONFICTION",
  "ART & ILLUSTRATION",
  "OTHER DOCUMENTS"
];

const Navbar: React.FC<NavbarProps> = ({ searchQuery = "", setSearchQuery }) => {
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [isQuotaPopoverOpen, setIsQuotaPopoverOpen] = useState(false);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isMarqsModalOpen, setIsMarqsModalOpen] = useState(false);
  const [marqsModalTab, setMarqsModalTab] = useState<'wallet' | 'boost' | 'earn' | 'history'>('wallet');
  const [userMarqs, setUserMarqs] = useState<UserMarqsProfile>(getUserMarqs());
  const [shopSearch, setShopSearch] = useState("");
  const [selectedBook, setSelectedBook] = useState<BookMetadata | null>(null);
  const [orderStep, setOrderStep] = useState<'selection' | 'form'>('selection');
  const [paymentMethod, setPaymentMethod] = useState<'usd' | 'marqs'>('usd');
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
    maxUploads: FREE_UPLOAD_LIMIT,
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
      setUserMarqs(getUserMarqs());
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

    const handleMarqsUpdate = () => {
      setUserMarqs(getUserMarqs());
    };

    const handleOpenMarqs = (e: any) => {
      if (e.detail?.tab) setMarqsModalTab(e.detail.tab);
      setIsMarqsModalOpen(true);
    };

    const handleOpenShop = () => {
      setIsShopOpen(true);
    };

    window.addEventListener('zetsu-quota-updated', handleQuotaUpdate);
    window.addEventListener('zetsu-marqs-updated', handleMarqsUpdate);
    window.addEventListener('show-quota-modal', () => setIsQuotaPopoverOpen(true));
    window.addEventListener('open-marqs-modal', handleOpenMarqs);
    window.addEventListener('open-shop-modal', handleOpenShop);

    return () => {
      window.removeEventListener('zetsu-quota-updated', handleQuotaUpdate);
      window.removeEventListener('zetsu-marqs-updated', handleMarqsUpdate);
      window.removeEventListener('show-quota-modal', () => setIsQuotaPopoverOpen(true));
      window.removeEventListener('open-marqs-modal', handleOpenMarqs);
      window.removeEventListener('open-shop-modal', handleOpenShop);
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

    if (currentQuota.remainingUploads <= 0) {
      setUploadStatus('error');
      const maxSlots = currentQuota.maxUploads || (currentQuota.isPremium ? 20 : 5);
      const msg = currentQuota.isPremium
        ? `Your archival sector is full (${currentQuota.uploadCount}/${maxSlots} books stored). Maximum quota reached.`
        : `Your archival sector is full (${currentQuota.uploadCount}/${maxSlots} free slots remaining). Upgrade to PREMIUM for 20 uploads.`;
      setUploadError(msg);
      showToast("Archival Quota Reached", msg, "warning");
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

      // Award 10 Marqs for uploading a book to the archives
      awardMarqs('upload', `Uploaded "${formData.title}" to archives`);

      if (!newQuota.isPremium) {
        if (newQuota.remainingUploads === 0) {
          showToast(
            "Archive Node Minted!",
            "You have used all 5 free archival slots. Upgrade to Premium for 20 book uploads.",
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
        if (newQuota.remainingUploads === 0) {
          showToast(
            "Archive Node Minted!",
            "You have reached the maximum 20/20 premium book capacity.",
            "warning"
          );
        } else {
          showToast(
            "Archive Node Minted!",
            `Deployment complete. ${newQuota.remainingUploads} of 20 premium slots remaining.`,
            "success"
          );
        }
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
      const priceMap = {
        coloring: 15.00,
        board: 24.99,
        soft_photo: 34.99,
        hard_photo: 49.99
      };
      const unitPriceUsd = priceMap[orderData.format];
      const shippingCents = Math.round(shippingCost * 100);

      if (paymentMethod === 'marqs') {
        const marqsNeeded = Math.round(unitPriceUsd * MARQS_PER_USD * orderData.quantity);
        const currentProfile = getUserMarqs();

        if (currentProfile.balance < marqsNeeded) {
          showToast(
            "Insufficient Marqs",
            `You need ${marqsNeeded.toLocaleString()} Marqs but currently hold ${currentProfile.balance.toLocaleString()} Marqs. You can earn more by reading, sharing, and commenting!`,
            "warning"
          );
          return;
        }

        // Deduct Marqs from user wallet
        const spendResult = spendMarqs(
          marqsNeeded,
          `Physical Print Edition: ${selectedBook.title} (${orderData.format}) x${orderData.quantity}`
        );

        if (!spendResult.success) {
          showToast("Payment Failed", spendResult.error || "Unable to spend Marqs", "error");
          return;
        }

        // Save order info to newsletter_emails archive
        const orderInfo = `ORDER [MARQS REDEEMED]: ${selectedBook.title} (${orderData.format}) x${orderData.quantity} | Marqs Spent: ${marqsNeeded} | Name: ${orderData.name} | Address: ${orderData.address} | Shipping: $${shippingCost.toFixed(2)}`;
        await saveOrderToArchive(orderData.email, orderInfo);

        // Award 25 marqs for copy purchase engagement
        awardMarqs('buy_copies', `Copy purchase reward for "${selectedBook.title}"`);

        // If shipping is $0 (rare), notify directly
        if (shippingCents <= 0) {
          showToast(
            "Order Placed!",
            `Successfully redeemed ${marqsNeeded.toLocaleString()} Marqs for ${selectedBook.title}. Free Shipping applied!`,
            "success"
          );
          setIsShopOpen(false);
          return;
        }

        // Create Stripe checkout session for shipping receipt only
        const response = await fetch('/api/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: deviceId,
            type: 'pod_marqs',
            bookTitle: selectedBook.title,
            format: orderData.format,
            shippingAmount: shippingCents,
            marqsSpent: marqsNeeded,
            shippingName: orderData.name,
            shippingAddress: orderData.address,
            quantity: orderData.quantity
          }),
        });
        const session = await response.json();
        if (session.url) window.location.href = session.url;
      } else {
        // Full USD Checkout
        const subtotalCents = Math.round(unitPriceUsd * 100) * orderData.quantity;
        const totalAmountCents = subtotalCents + shippingCents;

        const orderInfo = `ORDER [USD]: ${selectedBook.title} (${orderData.format}) x${orderData.quantity} | Total: $${(totalAmountCents / 100).toFixed(2)} | Name: ${orderData.name} | Address: ${orderData.address} | Shipping: $${shippingCost.toFixed(2)}`;
        await saveOrderToArchive(orderData.email, orderInfo);

        // Award 25 marqs for buying copies
        awardMarqs('buy_copies', `Copy purchase reward for "${selectedBook.title}"`);

        const response = await fetch('/api/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: deviceId,
            type: 'pod',
            bookTitle: selectedBook.title,
            format: orderData.format,
            amount: totalAmountCents,
            quantity: orderData.quantity
          }),
        });
        const session = await response.json();
        if (session.url) window.location.href = session.url;
      }
    } catch (err: any) {
      console.error('Order failed:', err);
      showToast('Order Initialization Failed', err?.message || 'Bitstream unstable.', 'error');
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
        <div className="max-w-[1600px] mx-auto px-2 sm:px-4 md:px-6">
          <div className="flex justify-between items-center h-16 md:h-20 gap-1.5 sm:gap-3 md:gap-4">
            {/* Logo Section */}
            {!isMobileSearchOpen && (
              <Link to="/" className="flex items-center gap-1.5 md:gap-2 group shrink-0" id="nav-brand-logo">
                <div className="flex flex-col">
                  <span className="text-[12px] sm:text-base md:text-2xl font-black tracking-tight text-white leading-none uppercase">
                    Zetsumetsu <span className="text-[#00c2ff] italic">EOe</span> <span className="hidden lg:inline">BOOKZ</span>
                  </span>
                  <span className="text-[5.5px] sm:text-[7px] md:text-[9px] font-bold text-[#00c2ff] tracking-[0.25em] md:tracking-[0.4em] uppercase opacity-80 mt-0.5 flex items-center gap-1">
                    <span className="inline-block w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-[#00c2ff] animate-pulse" />
                    NEXUS
                  </span>
                </div>
              </Link>
            )}
            
            {/* Search Bar - Desktop & Mobile Toggle */}
            <div className={`flex-1 max-w-[160px] lg:max-w-[240px] mx-2 md:mx-6 ${isMobileSearchOpen ? 'block' : 'hidden md:block'}`} id="nav-search-container">
              <div className="relative group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#00c2ff] transition-colors" size={15} />
                <input 
                  type="text" 
                  autoFocus={isMobileSearchOpen}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery?.(e.target.value)}
                  placeholder="SEARCH ARCHIVES..." 
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-full py-2 md:py-2.5 pl-9 md:pl-11 pr-9 text-[10px] md:text-xs font-mono text-slate-300 focus:outline-none focus:border-[#00c2ff]/50 transition-all uppercase tracking-wider placeholder:text-slate-700 shadow-inner"
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
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Actions Section */}
            {!isMobileSearchOpen && (
              <div className="flex items-center gap-1 sm:gap-2 md:gap-3 shrink-0">
                <button 
                  onClick={() => setIsMobileSearchOpen(true)}
                  className="md:hidden p-1.5 text-slate-400 hover:text-[#00c2ff] transition-colors rounded-full bg-white/5 border border-white/10 shrink-0"
                  title="Search Archives"
                >
                  <Search size={14} />
                </button>
                
                {/* Live Upload Quota Badge & Dropdown */}
                <div className="relative shrink-0" ref={popoverRef}>
                  {quota.isPremium ? (
                    <button 
                      onClick={() => setIsQuotaPopoverOpen(prev => !prev)}
                      className="flex items-center gap-1 px-2 sm:px-3 py-1.5 md:py-2 bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-indigo-500/10 hover:from-amber-500/20 hover:to-indigo-500/20 border border-amber-400/30 rounded-full transition-all group shadow-[0_0_15px_rgba(251,191,36,0.15)] shrink-0"
                      title={`Archival Status: Premium Tier (${quota.remainingUploads} of ${quota.maxUploads || 20} slots remaining)`}
                    >
                      <Crown size={11} className="text-amber-400 fill-amber-400 shrink-0" />
                      <span className="text-[8px] sm:text-[9px] md:text-[10px] font-black text-amber-300 tracking-wider">
                        {quota.remainingUploads}/{quota.maxUploads || 20}
                      </span>
                      <span className="hidden min-[480px]:inline text-[7px] md:text-[8px] font-bold text-slate-400 uppercase tracking-widest pl-0.5 border-l border-white/10">
                        PRO
                      </span>
                    </button>
                  ) : (
                    <button 
                      onClick={() => setIsQuotaPopoverOpen(prev => !prev)}
                      className={`flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 md:px-3 py-1.5 md:py-2 rounded-full border transition-all shrink-0 ${
                        quota.remainingUploads === 0
                          ? 'bg-red-950/40 border-red-500/40 text-red-300 hover:bg-red-900/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                          : quota.remainingUploads === 1
                          ? 'bg-amber-950/40 border-amber-500/40 text-amber-300 hover:bg-amber-900/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                          : 'bg-[#0a0f14] border-[#00c2ff]/30 text-white hover:border-[#00c2ff]/60 hover:bg-[#00c2ff]/5'
                      }`}
                      title={`Upload Allowance: ${quota.remainingUploads} of ${quota.maxFreeUploads} slots remaining`}
                    >
                      {/* Segmented Slot Indicators */}
                      <div className="hidden min-[440px]:flex items-center gap-0.5 sm:gap-1">
                        {[0, 1, 2, 3, 4].map(idx => (
                          <div 
                            key={idx}
                            className={`w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full transition-all ${
                              idx < quota.uploadCount 
                                ? quota.remainingUploads === 0 ? 'bg-red-500' : 'bg-[#00c2ff] shadow-[0_0_6px_#00c2ff]' 
                                : 'bg-white/10 border border-white/20'
                            }`}
                          />
                        ))}
                      </div>

                      <div className="flex items-center gap-0.5 text-[8px] sm:text-[9px] md:text-[10px] font-mono font-black tracking-wider">
                        <span className={quota.remainingUploads === 0 ? 'text-red-400' : quota.remainingUploads === 1 ? 'text-amber-400' : 'text-[#00c2ff]'}>
                          {quota.remainingUploads}/{quota.maxFreeUploads}
                        </span>
                        <span className="hidden sm:inline uppercase text-slate-400 text-[7px] md:text-[8px] font-bold tracking-widest">
                          {quota.remainingUploads === 1 ? 'SLOT' : 'SLOTS'}
                        </span>
                      </div>

                      {quota.remainingUploads === 0 && (
                        <span className="hidden sm:inline bg-red-500 text-black text-[6.5px] font-black uppercase px-1 py-0.5 rounded tracking-widest ml-0.5">
                          MAX
                        </span>
                      )}
                    </button>
                  )}

                  {/* Interactive Quota Breakdown Popover */}
                  <AnimatePresence>
                    {isQuotaPopoverOpen && (
                      <>
                        {/* Mobile Backdrop Overlay */}
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={() => setIsQuotaPopoverOpen(false)}
                          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[100] sm:hidden"
                        />

                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.18 }}
                          className="fixed left-3 right-3 top-20 z-[105] sm:z-50 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-84 max-w-[390px] sm:max-w-none mx-auto bg-[#0c0c10] border border-white/20 rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_35px_rgba(0,194,255,0.2)] backdrop-blur-2xl max-h-[85vh] overflow-y-auto"
                        >
                          <div className="flex items-center justify-between pb-3 border-b border-white/10">
                            <div className="flex items-center gap-2">
                              <HardDrive size={14} className="text-[#00c2ff]" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-white">Archival Storage</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                                quota.isPremium ? 'bg-amber-400/10 text-amber-300 border border-amber-400/20' : 'bg-white/5 text-slate-400 border border-white/10'
                              }`}>
                                {quota.isPremium ? '👑 PREMIUM (20 SLOTS)' : 'FREE TIER (5 SLOTS)'}
                              </span>
                              <button
                                onClick={() => setIsQuotaPopoverOpen(false)}
                                className="p-1 hover:bg-white/10 text-slate-400 hover:text-white rounded-full transition-colors sm:hidden"
                                aria-label="Close popover"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>

                          <div className="py-3.5 space-y-3">
                            {quota.isPremium ? (
                              <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/10 to-purple-500/10 border border-amber-500/20 space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Crown size={14} className="text-amber-400 fill-amber-400" />
                                    <span className="text-[11px] font-black uppercase tracking-wide text-white">Premium Tier Active</span>
                                  </div>
                                  <span className="text-[10px] font-mono font-bold text-amber-300">
                                    {quota.uploadCount}/{quota.maxUploads || 20} USED
                                  </span>
                                </div>
                                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-amber-400 to-purple-500 rounded-full transition-all"
                                    style={{ width: `${Math.min(100, (quota.uploadCount / (quota.maxUploads || 20)) * 100)}%` }}
                                  />
                                </div>
                                <p className="text-[9px] text-slate-300 font-medium leading-relaxed">
                                  {quota.remainingUploads} of {quota.maxUploads || 20} book archival slots remaining with permanent hosting.
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
                                      <span>All 5 free slots filled. Upgrade to publish up to 20 books.</span>
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
                                className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] active:scale-95"
                              >
                                <Crown size={12} className="fill-white" />
                                Upgrade to 20 Books ($19.99)
                              </button>
                            )}
                            
                            <button
                              onClick={() => {
                                setIsQuotaPopoverOpen(false);
                                setIsRequestOpen(true);
                              }}
                              className="w-full py-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-1.5 border border-white/10 transition-all active:scale-95"
                            >
                              <Send size={11} />
                              Open Upload Terminal
                            </button>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                {/* Marq's Native Economy Button */}
                <button 
                  onClick={() => {
                    setMarqsModalTab('wallet');
                    setIsMarqsModalOpen(true);
                  }}
                  className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 md:px-3 py-1.5 md:py-2 bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-yellow-500/30 border border-amber-400/50 rounded-full transition-all group shadow-[0_0_18px_rgba(255,230,0,0.25)] active:scale-95 shrink-0"
                  title="Zetsu EOE Bookz Marq's: Click to open wallet"
                >
                  <MarqsLogo size={11} glow />
                  <span className="text-[8px] sm:text-[9px] md:text-[10px] font-mono font-black text-amber-300 tracking-wider">
                    {userMarqs.balance.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                  </span>
                  <span className="hidden min-[540px]:inline text-[7px] md:text-[8px] font-black text-amber-400 uppercase tracking-widest pl-0.5">
                    MARQ'S
                  </span>
                </button>

                {/* Premium Upgrade Button - Visible & Compact on Mobile */}
                {!isPremium && (
                  <button 
                    id="nav-premium-btn"
                    onClick={() => setIsPricingOpen(true)}
                    className="flex px-2 sm:px-3 md:px-4 py-1.5 md:py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[8px] sm:text-[9px] md:text-[10px] font-black uppercase tracking-wider rounded-full shadow-[0_0_18px_rgba(168,85,247,0.4)] hover:shadow-[0_0_35px_rgba(168,85,247,0.6)] transition-all items-center gap-1 sm:gap-1.5 border border-white/20 shrink-0 active:scale-95"
                    title="Upgrade to Premium 20-Book Archival Tier"
                  >
                    <Crown size={11} className="fill-white shrink-0" />
                    <span className="hidden min-[430px]:inline">PREMIUM</span>
                    <span className="min-[430px]:hidden">PRO</span>
                  </button>
                )}

                {/* Submit Data Button - Always visible with icon and text */}
                <button 
                  id="nav-submit-btn"
                  onClick={() => setIsRequestOpen(true)}
                  className="px-2.5 sm:px-4 md:px-6 py-1.5 md:py-2.5 bg-[#00c2ff] text-black hover:bg-white text-[8px] sm:text-[9px] md:text-[11px] font-black uppercase tracking-wider md:tracking-[0.15em] transition-all duration-300 flex items-center gap-1 sm:gap-1.5 rounded-full shadow-[0_0_20px_rgba(0,194,255,0.35)] hover:shadow-[0_0_40px_rgba(0,194,255,0.6)] active:scale-95 group shrink-0"
                  title="Submit Book or Document to Zetsu Archive"
                >
                  <Send size={11} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
                  <span className="hidden min-[480px]:inline">SUBMIT DATA</span>
                  <span className="min-[480px]:hidden">SUBMIT</span>
                </button>

                {/* Desktop Print Shop Button */}
                <button 
                  onClick={() => setIsShopOpen(true)}
                  className="hidden md:flex px-4 md:px-6 py-2 md:py-2.5 bg-[#00f2c3] text-black hover:bg-white text-[10px] md:text-[11px] font-black uppercase tracking-[0.15em] transition-all duration-300 items-center gap-1.5 rounded-full shadow-[0_0_20px_rgba(0,242,195,0.3)] hover:shadow-[0_0_35px_rgba(0,242,195,0.6)] active:scale-95 group shrink-0"
                  title="Open Zetsu Print Shop"
                >
                  <ShoppingBag size={13} className="group-hover:scale-110 transition-transform shrink-0" />
                  <span>Shop</span>
                </button>

                {/* About Button */}
                <button 
                  onClick={() => setIsAboutOpen(true)}
                  className="flex items-center gap-1 p-1.5 sm:p-2 text-slate-400 hover:text-white text-[9px] md:text-[10px] font-black uppercase tracking-wider transition-all shrink-0"
                  title="About Zetsu EOE Bookz"
                >
                  <Info size={13} className="shrink-0" />
                  <span className="hidden xl:inline">About</span>
                </button>
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
                          ? `${quota.remainingUploads} OF ${quota.maxUploads || 20} SLOTS REMAINING (PRO)` 
                          : `${quota.remainingUploads} OF ${quota.maxFreeUploads} SLOTS REMAINING`}
                      </span>
                    </div>

                    {/* Visual progress nodes */}
                    {!quota.isPremium ? (
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
                    ) : (
                      <div className="space-y-1.5">
                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-amber-400 to-purple-500 rounded-full transition-all"
                            style={{ width: `${Math.min(100, (quota.uploadCount / (quota.maxUploads || 20)) * 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[8px] font-bold uppercase tracking-widest text-slate-400 pt-0.5">
                          <span>Premium Tier ({quota.maxUploads || 20} Books Max)</span>
                          <span className="text-amber-300 font-mono font-bold">{quota.uploadCount}/{quota.maxUploads || 20} Used</span>
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
                            ? `Deployment complete. ${quota.remainingUploads} of ${quota.maxUploads || 20} premium slots remaining.`
                            : `Deployment complete. ${quota.remainingUploads} of ${quota.maxFreeUploads} free upload slots remaining.`}
                        </p>
                      </motion.div>
                    ) : (quota.remainingUploads <= 0 && !pdfInfo) ? (
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
                          <h4 className="font-black text-white uppercase tracking-wider text-sm mb-1.5">
                            {quota.isPremium ? 'Premium Archival Limit Reached' : 'Free Archival Limit Reached'}
                          </h4>
                          <p className="text-[10px] text-slate-400 font-medium leading-relaxed max-w-sm mx-auto">
                            {quota.isPremium 
                              ? `You have reached the maximum allowance of ${quota.maxUploads || 20} books for this node.`
                              : 'You have uploaded the maximum of 5 free books allowed on this node. Upgrade to Premium to unlock 20 book slots, priority indexing, and obtain a verified badge.'}
                          </p>
                        </div>
                        {!quota.isPremium && (
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
                              Upgrade to 20 Books ($19.99)
                            </button>
                          </div>
                        )}
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
          <div className="fixed inset-0 z-[100] flex items-start justify-center p-3 sm:p-5 md:p-8 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" 
              onClick={() => {
                setIsShopOpen(false);
                setSelectedBook(null);
                setOrderStep('selection');
              }} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              className="relative bg-[#f4efe6] text-stone-800 w-full max-w-5xl rounded-3xl sm:rounded-[2.25rem] shadow-2xl border border-stone-300/90 my-auto overflow-hidden flex flex-col max-h-[92vh]"
            >
              {/* 1. HEADER (Warm, inviting bookstore aesthetic) */}
              <div className="px-6 py-4 md:px-8 md:py-5 border-b border-stone-300/80 bg-[#ebe3d5] sticky top-0 z-20 flex justify-between items-center shadow-xs">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-amber-600/15 border border-amber-600/30 flex items-center justify-center text-amber-800 shadow-inner">
                    <ShoppingBag size={20} className="stroke-[2.2]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold tracking-[0.2em] text-amber-800 uppercase">
                        Zetsu Bookstore
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-200/70 text-amber-900 border border-amber-300">
                        Print Fulfillment
                      </span>
                    </div>
                    <h2 className="text-base sm:text-xl font-extrabold text-stone-900 tracking-tight">
                      Author Print Fulfillment — Order Your Copies
                    </h2>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setIsShopOpen(false);
                    setSelectedBook(null);
                    setOrderStep('selection');
                  }} 
                  className="p-2.5 hover:bg-stone-300/60 rounded-full text-stone-600 hover:text-stone-900 transition-colors"
                  aria-label="Close Bookstore"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Shop Content - Scrollable */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-7 md:p-9 space-y-8">
                <AnimatePresence mode="wait">
                  {orderStep === 'selection' ? (
                    <motion.div 
                      key="selection"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-8"
                    >
                      {/* SEARCH BAR */}
                      <div className="relative max-w-2xl mx-auto">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-500" size={18} />
                        <input 
                          type="text"
                          value={shopSearch}
                          onChange={(e) => setShopSearch(e.target.value)}
                          placeholder="SEARCH YOUR TITLE..."
                          className="w-full bg-[#fdfbf7] border-2 border-stone-300 rounded-2xl py-3.5 pl-13 pr-5 text-xs font-bold text-stone-900 placeholder-stone-400 focus:outline-none focus:border-amber-600 focus:ring-4 focus:ring-amber-600/15 shadow-xs transition-all uppercase tracking-wider"
                        />
                      </div>

                      {/* SECTION 1: HOW IT WORKS */}
                      <div className="bg-[#ebe3d5] border border-stone-300/90 rounded-2xl p-5 md:p-6 shadow-xs max-w-4xl mx-auto">
                        <div className="flex items-center justify-center gap-2 mb-4">
                          <Sparkles size={16} className="text-amber-700" />
                          <h3 className="text-xs sm:text-sm font-black text-stone-900 uppercase tracking-[0.18em]">
                            HOW IT WORKS
                          </h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          {[
                            { num: "1", title: "Print On-Demand", desc: "Initiated the moment you submit your order" },
                            { num: "2", title: "Pro Finish & Binding", desc: "Professionally printed, bound, and finished to spec" },
                            { num: "3", title: "Secure Checkout", desc: "Direct Stripe / Marq's routing to printing facility" },
                            { num: "4", title: "Global Delivery", desc: "Manufactured & shipped directly to your door" }
                          ].map((step, idx) => (
                            <div key={idx} className="bg-[#f8f4ec] border border-stone-300/80 rounded-xl p-3.5 text-center shadow-2xs">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-600 text-stone-50 text-[11px] font-black mb-1.5 shadow-2xs">
                                {step.num}
                              </span>
                              <h4 className="text-[10.5px] font-black text-stone-900 uppercase tracking-tight mb-0.5">{step.title}</h4>
                              <p className="text-[9px] font-medium text-stone-600 leading-snug">{step.desc}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* SECTION 2: SELECT YOUR PRINT FORMAT */}
                      <div className="max-w-5xl mx-auto">
                        <div className="text-center mb-4">
                          <h3 className="text-xs sm:text-sm font-black text-stone-900 uppercase tracking-[0.18em]">
                            SELECT YOUR PRINT FORMAT
                          </h3>
                          <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mt-0.5">
                            Choose how your book gets printed
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                          {/* Coloring Book */}
                          <div className="p-4 bg-[#f8f4ec] border-2 border-stone-300 hover:border-sky-500 rounded-2xl transition-all shadow-xs hover:shadow-md flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between items-start mb-2.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="p-1.5 rounded-lg bg-sky-100 text-sky-700 border border-sky-300">
                                    <Sparkles size={13} />
                                  </span>
                                  <span className="text-[10px] font-black text-stone-900 uppercase tracking-wider">Coloring Book</span>
                                </div>
                                <span className="text-base font-black text-sky-700">$15</span>
                              </div>
                              <p className="text-[9.5px] font-semibold text-stone-700 leading-relaxed mb-3">
                                8.5"×11", 26 sheets, crayon/marker-ready uncoated interior.
                              </p>
                            </div>
                            <div className="space-y-1 pt-2 border-t border-stone-300/60 text-[8.5px] font-bold text-stone-500 uppercase tracking-wider">
                              <p>• Standard Coloring Size</p>
                              <p>• Flexible Soft Cover</p>
                            </div>
                          </div>

                          {/* Board Book */}
                          <div className="p-4 bg-[#f8f4ec] border-2 border-stone-300 hover:border-purple-500 rounded-2xl transition-all shadow-xs hover:shadow-md flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between items-start mb-2.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="p-1.5 rounded-lg bg-purple-100 text-purple-700 border border-purple-300">
                                    <Crown size={13} />
                                  </span>
                                  <span className="text-[10px] font-black text-stone-900 uppercase tracking-wider">Board Book</span>
                                </div>
                                <span className="text-base font-black text-purple-700">$24.99</span>
                              </div>
                              <p className="text-[9.5px] font-semibold text-stone-700 leading-relaxed mb-3">
                                1/16" chipboard, matte lam, rounded child-safe corners.
                              </p>
                            </div>
                            <div className="space-y-1 pt-2 border-t border-stone-300/60 text-[8.5px] font-bold text-stone-500 uppercase tracking-wider">
                              <p>• Heavy Duty Chipboard</p>
                              <p>• Fingerprint-Resistant</p>
                            </div>
                          </div>

                          {/* Softcover */}
                          <div className="p-4 bg-[#f8f4ec] border-2 border-stone-300 hover:border-emerald-600 rounded-2xl transition-all shadow-xs hover:shadow-md flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between items-start mb-2.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-300">
                                    <FileText size={13} />
                                  </span>
                                  <span className="text-[10px] font-black text-stone-900 uppercase tracking-wider">Softcover</span>
                                </div>
                                <span className="text-base font-black text-emerald-700">$34.99</span>
                              </div>
                              <p className="text-[9.5px] font-semibold text-stone-700 leading-relaxed mb-3">
                                8"×8", 100lb semi-gloss, HD full-color rich print.
                              </p>
                            </div>
                            <div className="space-y-1 pt-2 border-t border-stone-300/60 text-[8.5px] font-bold text-stone-500 uppercase tracking-wider">
                              <p>• Vibrant Full Color</p>
                              <p>• Archival Quality Paper</p>
                            </div>
                          </div>

                          {/* Hardcover */}
                          <div className="p-4 bg-[#f8f4ec] border-2 border-stone-300 hover:border-amber-600 rounded-2xl transition-all shadow-xs hover:shadow-md flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between items-start mb-2.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800 border border-amber-300">
                                    <Zap size={13} />
                                  </span>
                                  <span className="text-[10px] font-black text-stone-900 uppercase tracking-wider">Hardcover</span>
                                </div>
                                <span className="text-base font-black text-amber-700">$49.99</span>
                              </div>
                              <p className="text-[9.5px] font-semibold text-stone-700 leading-relaxed mb-3">
                                11"×8.5" / 8"×8", glossy or matte, pro library binding.
                              </p>
                            </div>
                            <div className="space-y-1 pt-2 border-t border-stone-300/60 text-[8.5px] font-bold text-stone-500 uppercase tracking-wider">
                              <p>• Casebound Hardcover</p>
                              <p>• Long-Lasting Durability</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* SECTION 3: TITLES */}
                      <div className="pt-6 border-t border-stone-300">
                        <div className="mb-4 flex items-baseline justify-between">
                          <div>
                            <h3 className="text-sm sm:text-base font-black text-stone-900 uppercase tracking-[0.16em]">
                              TITLES
                            </h3>
                            <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                              Titles currently live in the system — Click to configure order
                            </p>
                          </div>
                          <span className="text-[10px] font-extrabold text-stone-800 bg-[#ebe3d5] px-2.5 py-1 rounded-full border border-stone-300">
                            {filteredShopBooks.length} Available
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
                          {filteredShopBooks.map((book) => (
                            <motion.div 
                              key={book.id}
                              whileHover={{ y: -4 }}
                              onClick={() => {
                                setSelectedBook(book);
                                setOrderStep('form');
                              }}
                              className="group cursor-pointer bg-[#f8f4ec] rounded-2xl p-2.5 border border-stone-300 hover:border-amber-600 hover:shadow-lg transition-all"
                            >
                              <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-2.5 bg-stone-200 shadow-xs">
                                <img 
                                  src={book.thumbnail} 
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                                  alt={book.title} 
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-stone-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                                  <span className="text-[9px] font-black text-white bg-amber-600 px-2.5 py-1 rounded-lg uppercase tracking-wider shadow-sm">
                                    Order Print
                                  </span>
                                </div>
                              </div>
                              <h4 className="text-[11px] font-extrabold text-stone-900 uppercase truncate mb-0.5" title={book.title}>
                                {book.title}
                              </h4>
                              <p className="text-[9px] text-amber-800 font-bold uppercase tracking-wide truncate">
                                {book.author}
                              </p>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="form"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="max-w-3xl mx-auto bg-[#f8f4ec] border border-stone-300 rounded-3xl p-6 sm:p-8 shadow-md"
                    >
                      <button 
                        onClick={() => setOrderStep('selection')}
                        className="text-[10px] font-extrabold text-amber-800 hover:text-amber-900 uppercase tracking-widest mb-6 flex items-center gap-2 hover:translate-x-[-3px] transition-transform"
                      >
                        ← Back to Titles Selection
                      </button>

                      <div className="grid md:grid-cols-2 gap-8 items-start">
                        {/* Book Preview */}
                        <div className="space-y-4 bg-[#ebe3d5] p-4 rounded-2xl border border-stone-300">
                          <div className="aspect-[3/4] rounded-xl overflow-hidden border border-stone-300 shadow-md">
                            <img src={selectedBook?.thumbnail} className="w-full h-full object-cover" alt="preview" />
                          </div>
                          <div>
                            <span className="text-[9px] font-extrabold uppercase tracking-widest text-amber-800">Selected Title</span>
                            <h3 className="text-lg font-black text-stone-900 uppercase tracking-tight mt-0.5">{selectedBook?.title}</h3>
                            <p className="text-[10px] text-stone-600 font-bold uppercase tracking-wider">By {selectedBook?.author}</p>
                          </div>
                        </div>

                        {/* Order Form */}
                        <form onSubmit={handleOrderSubmit} className="space-y-5">
                          <div className="space-y-4">
                            {/* Payment Method Selector */}
                            <div className="p-1 bg-[#ebe3d5] border border-stone-300 rounded-2xl grid grid-cols-2 gap-1">
                              <button
                                type="button"
                                onClick={() => setPaymentMethod('usd')}
                                className={`py-2.5 px-3 rounded-xl font-extrabold text-[9px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                                  paymentMethod === 'usd'
                                    ? 'bg-[#f8f4ec] text-stone-900 shadow-xs border border-stone-300'
                                    : 'text-stone-600 hover:text-stone-900'
                                }`}
                              >
                                <CreditCard size={13} className="text-stone-800" />
                                <span>Stripe Checkout</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setPaymentMethod('marqs')}
                                className={`py-2.5 px-3 rounded-xl font-extrabold text-[9px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                                  paymentMethod === 'marqs'
                                    ? 'bg-amber-600 text-stone-50 shadow-xs'
                                    : 'text-stone-600 hover:text-amber-800'
                                }`}
                              >
                                <MarqsLogo size={13} />
                                <span>Pay with Marq's</span>
                              </button>
                            </div>

                            {paymentMethod === 'marqs' && (
                              <div className="p-3 bg-[#ebe3d5] border border-amber-600/40 rounded-2xl flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5">
                                  <MarqsLogo size={18} />
                                  <div>
                                    <p className="text-[9.5px] font-black text-amber-900 uppercase tracking-wider">
                                      Marq's Balance Payment
                                    </p>
                                    <p className="text-[8.5px] text-stone-600 font-medium">
                                      Book cost covered 100% by Marq's. Stripe processes shipping only.
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="text-[8px] font-bold text-stone-500 uppercase tracking-widest block">Wallet</span>
                                  <span className="text-[10px] font-mono font-black text-amber-900">{userMarqs.balance.toLocaleString()} MARQS</span>
                                </div>
                              </div>
                            )}

                            <div>
                              <label className="block text-[9.5px] font-extrabold text-stone-700 uppercase tracking-wider mb-2">
                                Select Format
                              </label>
                              <div className="grid grid-cols-2 gap-2">
                                {[
                                  { id: 'coloring', name: 'Coloring Book', price: '$15.00', marqs: '15,000' },
                                  { id: 'board', name: 'Board Book', price: '$24.99', marqs: '24,990' },
                                  { id: 'soft_photo', name: 'Softcover', price: '$34.99', marqs: '34,990' },
                                  { id: 'hard_photo', name: 'Hardcover', price: '$49.99', marqs: '49,990' },
                                ].map((fmt) => (
                                  <button 
                                    key={fmt.id}
                                    type="button"
                                    onClick={() => setOrderData({...orderData, format: fmt.id as any})}
                                    className={`p-2.5 rounded-xl border text-left transition-all ${
                                      orderData.format === fmt.id 
                                        ? 'bg-amber-600 border-amber-700 text-stone-50 shadow-xs font-black' 
                                        : 'bg-[#ebe3d5] border-stone-300 text-stone-700 hover:border-stone-400'
                                    }`}
                                  >
                                    <span className="block text-[8.5px] uppercase tracking-wider">{fmt.name}</span>
                                    <span className="block text-[10.5px] mt-0.5">
                                      {paymentMethod === 'marqs' ? `${fmt.marqs} MARQS` : fmt.price}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Format Specs Callout */}
                            <div className="p-3 bg-[#ebe3d5] border border-stone-300 rounded-xl text-[9px] text-stone-700 space-y-1">
                              {orderData.format === 'coloring' && (
                                <>
                                  <p className="font-bold text-amber-900">• Size: 8.5" × 11" Standard Coloring Size</p>
                                  <p>• Pages: 26 Premium Sheets for crayons & markers</p>
                                </>
                              )}
                              {orderData.format === 'board' && (
                                <>
                                  <p className="font-bold text-amber-900">• Material: 1/16” Chipboard with Matte Lam</p>
                                  <p>• Features: Rounded child-safe corners, smudge-resistant</p>
                                </>
                              )}
                              {orderData.format === 'soft_photo' && (
                                <>
                                  <p className="font-bold text-amber-900">• Size: 8'' × 8'' Square Format</p>
                                  <p>• Paper: 100 lb Archival Semi-Gloss Full-Color</p>
                                </>
                              )}
                              {orderData.format === 'hard_photo' && (
                                <>
                                  <p className="font-bold text-amber-900">• Size: 11'' × 8.5'' or 8'' × 8''</p>
                                  <p>• Binding: Professional Library-Grade Casebound Hardcover</p>
                                </>
                              )}
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                              <div className="col-span-2 space-y-1">
                                <label className="text-[9px] font-extrabold text-stone-700 uppercase tracking-wider">Shipping Name</label>
                                <input 
                                  required
                                  value={orderData.name}
                                  onChange={e => setOrderData({...orderData, name: e.target.value})}
                                  placeholder="Full Name"
                                  className="w-full bg-[#ebe3d5] border border-stone-300 py-2.5 px-3.5 rounded-xl text-xs font-medium text-stone-800 focus:bg-[#fdfbf7] focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-600/10 transition-all"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-extrabold text-stone-700 uppercase tracking-wider">Qty</label>
                                <div className="flex items-center bg-[#ebe3d5] border border-stone-300 rounded-xl overflow-hidden">
                                  <button 
                                    type="button"
                                    onClick={() => setOrderData({...orderData, quantity: Math.max(1, orderData.quantity - 1)})}
                                    className="p-2.5 hover:bg-stone-300 text-stone-600 transition-colors"
                                  >
                                    <Minus size={12} />
                                  </button>
                                  <span className="flex-1 text-center text-xs font-extrabold text-stone-800">{orderData.quantity}</span>
                                  <button 
                                    type="button"
                                    onClick={() => setOrderData({...orderData, quantity: orderData.quantity + 1})}
                                    className="p-2.5 hover:bg-stone-300 text-amber-800 transition-colors"
                                  >
                                    <Plus size={12} />
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[9px] font-extrabold text-stone-700 uppercase tracking-wider">Email Address</label>
                              <input 
                                required
                                type="email"
                                value={orderData.email}
                                onChange={e => setOrderData({...orderData, email: e.target.value})}
                                placeholder="your@email.com"
                                className="w-full bg-[#ebe3d5] border border-stone-300 py-2.5 px-3.5 rounded-xl text-xs font-medium text-stone-800 focus:bg-[#fdfbf7] focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-600/10 transition-all"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[9px] font-extrabold text-stone-700 uppercase tracking-wider">Shipping Address</label>
                              <textarea 
                                required
                                value={orderData.address}
                                onChange={e => setOrderData({...orderData, address: e.target.value})}
                                placeholder="Street, Apt, City, Zip, Country"
                                className="w-full bg-[#ebe3d5] border border-stone-300 py-2.5 px-3.5 rounded-xl text-xs font-medium text-stone-800 focus:bg-[#fdfbf7] focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-600/10 transition-all min-h-[75px] resize-none"
                              />
                            </div>

                            {/* Summary Box */}
                            <div className="p-4 bg-[#ebe3d5] rounded-2xl border border-stone-300 space-y-2">
                              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                                <span className="text-stone-600">Unit Price</span>
                                <span className="text-stone-900 font-extrabold">
                                  {paymentMethod === 'marqs' ? (
                                    <span className="text-emerald-800 font-black">
                                      $0.00 USD <span className="text-[8.5px] text-amber-800">({(
                                        orderData.format === 'coloring' ? 15000 : 
                                        orderData.format === 'board' ? 24990 : 
                                        orderData.format === 'soft_photo' ? 34990 : 49990
                                      ).toLocaleString()} MARQS)</span>
                                    </span>
                                  ) : (
                                    `$${(orderData.format === 'coloring' ? '15.00' : 
                                        orderData.format === 'board' ? '24.99' : 
                                        orderData.format === 'soft_photo' ? '34.99' : '49.99')}`
                                  )}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                                <span className="text-stone-600">Quantity</span>
                                <span className="text-stone-900 font-extrabold">x{orderData.quantity}</span>
                              </div>

                              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                                <span className="text-stone-600">Shipping (Stripe Receipt)</span>
                                <span className={shippingCost > 0 ? "text-amber-800 font-extrabold" : "text-stone-500"}>
                                  {shippingCost > 0 ? `$${shippingCost.toFixed(2)}` : 'Enter Address'}
                                </span>
                              </div>

                              <div className="h-px bg-stone-300 my-1" />
                              <div className="flex justify-between items-center">
                                <span className="text-[11px] font-black text-stone-900 uppercase tracking-wider">
                                  {paymentMethod === 'marqs' ? 'Due Today (Shipping)' : 'Total Due'}
                                </span>
                                <span className="text-lg font-black text-amber-700">
                                  ${(
                                    paymentMethod === 'marqs' 
                                      ? shippingCost 
                                      : ((orderData.format === 'coloring' ? 15.00 : 
                                          orderData.format === 'board' ? 24.99 : 
                                          orderData.format === 'soft_photo' ? 34.99 : 49.99) * orderData.quantity + shippingCost)
                                  ).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <button 
                            type="submit" 
                            className="w-full py-4 rounded-2xl font-black uppercase tracking-wider bg-amber-600 hover:bg-amber-700 text-stone-50 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-xs"
                          >
                            {paymentMethod === 'marqs' ? <Coins size={16} /> : <CreditCard size={16} />}
                            {paymentMethod === 'marqs' 
                              ? `Redeem Marq's & Pay Shipping ($${shippingCost.toFixed(2)})`
                              : `Proceed to Checkout ($${(
                                  ((orderData.format === 'coloring' ? 15.00 : 
                                    orderData.format === 'board' ? 24.99 : 
                                    orderData.format === 'soft_photo' ? 34.99 : 49.99) * orderData.quantity + shippingCost)
                                ).toFixed(2)})`
                            }
                          </button>
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
          <div className="fixed inset-0 z-[100] flex items-start justify-center p-3 sm:p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/85 backdrop-blur-xl" 
              onClick={() => setIsAboutOpen(false)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="relative bg-[#0c0f14] w-full max-w-3xl rounded-[2rem] shadow-[0_25px_70px_rgba(0,0,0,0.85),0_0_50px_rgba(0,194,255,0.15)] border border-white/15 my-auto overflow-hidden text-white"
            >
              <div className="p-6 sm:p-8 md:p-10 max-h-[90vh] overflow-y-auto space-y-6 sm:space-y-8">
                
                {/* Header */}
                <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#00c2ff]/15 text-[#00c2ff] border border-[#00c2ff]/30">
                        Platform Overview
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">v2.9 Stable</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white uppercase">
                      About Zetsumetsu <span className="text-[#00c2ff]">EOe</span> BOOKZ
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1">
                      An open digital library, creator community, and physical book publishing platform.
                    </p>
                  </div>
                  <button 
                    onClick={() => setIsAboutOpen(false)}
                    className="p-2 rounded-full bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-colors shrink-0"
                    aria-label="Close About Dialog"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Plain-English Mission */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5">
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                    <strong className="text-white font-bold">Zetsumetsu EOe BOOKZ</strong> makes reading, publishing, and archiving simple for everyone. Upload any PDF document to create an interactive digital book with cover previews, read titles instantly in your browser, earn community rewards, and even order real printed copies delivered straight to your door.
                  </p>
                </div>

                {/* "Why No Log-In?" Highlight Card */}
                <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-cyan-950/20 to-black border border-emerald-500/30 space-y-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0">
                      <KeyRound size={15} />
                    </div>
                    <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-emerald-300">
                      Why Is There No Login or Password?
                    </h3>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                    We believe in <strong className="text-white">frictionless, privacy-first access</strong>. You don’t need to remember passwords, verify emails, or fill out sign-up forms:
                  </p>
                  <ul className="grid sm:grid-cols-2 gap-2.5 pt-1 text-xs text-slate-300">
                    <li className="flex items-start gap-2 bg-black/40 p-2.5 rounded-xl border border-white/5">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span><strong className="text-white">Linked to Your Device:</strong> Your free 5-book archival quota, uploaded titles, and preferences are automatically connected to your device ID.</span>
                    </li>
                    <li className="flex items-start gap-2 bg-black/40 p-2.5 rounded-xl border border-white/5">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span><strong className="text-white">Instant Marq’s Rewards:</strong> Tokens you earn from reading and engaging are saved immediately to your local device wallet.</span>
                    </li>
                  </ul>
                </div>

                {/* Key Features Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-widest text-[#00c2ff]">
                      What You Can Do On BOOKZ
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Feature 1 */}
                    <div className="p-4 rounded-2xl bg-[#11161d] border border-white/10 hover:border-[#00c2ff]/30 transition-all space-y-1.5">
                      <div className="flex items-center gap-2 text-[#00c2ff]">
                        <BookOpen size={16} />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-white">Interactive Digital Reader</h4>
                      </div>
                      <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed">
                        Upload any PDF to instantly generate clean page-turn viewing, automatic cover art, page count stats, and fullscreen reading mode.
                      </p>
                    </div>

                    {/* Feature 2 */}
                    <div className="p-4 rounded-2xl bg-[#11161d] border border-white/10 hover:border-amber-400/30 transition-all space-y-1.5">
                      <div className="flex items-center gap-2 text-amber-400">
                        <Coins size={16} />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-white">Marq’s Reward Tokens</h4>
                      </div>
                      <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed">
                        Earn reward tokens simply by reading books, uploading content, upvoting, and commenting. Redeem them for book promotions or discounts on physical prints.
                      </p>
                    </div>

                    {/* Feature 3 */}
                    <div className="p-4 rounded-2xl bg-[#11161d] border border-white/10 hover:border-[#00f2c3]/30 transition-all space-y-1.5">
                      <div className="flex items-center gap-2 text-[#00f2c3]">
                        <ShoppingBag size={16} />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-white">Physical Print-on-Demand</h4>
                      </div>
                      <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed">
                        Turn digital books into real physical copies in 4 formats: Coloring Books, Board Books, Softcovers, and Hardcovers with secure Stripe checkout.
                      </p>
                    </div>

                    {/* Feature 4 */}
                    <div className="p-4 rounded-2xl bg-[#11161d] border border-white/10 hover:border-purple-400/30 transition-all space-y-1.5">
                      <div className="flex items-center gap-2 text-purple-400">
                        <Users size={16} />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-white">Community & Creator Hub</h4>
                      </div>
                      <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed">
                        Discover trending titles, join discussions in public comment sections, follow author profiles, and explore curated genres.
                      </p>
                    </div>

                    {/* Feature 5 */}
                    <div className="p-4 rounded-2xl bg-[#11161d] border border-white/10 hover:border-blue-400/30 transition-all space-y-1.5">
                      <div className="flex items-center gap-2 text-blue-400">
                        <HardDrive size={16} />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-white">Free Archival Storage</h4>
                      </div>
                      <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed">
                        Every visitor gets 5 free book storage slots with permanent cloud hosting. High-volume creators can upgrade to 20 slots anytime.
                      </p>
                    </div>

                    {/* Feature 6 */}
                    <div className="p-4 rounded-2xl bg-[#11161d] border border-white/10 hover:border-indigo-400/30 transition-all space-y-1.5">
                      <div className="flex items-center gap-2 text-indigo-400">
                        <Search size={16} />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-white">Curated Sectors & Search</h4>
                      </div>
                      <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed">
                        Organized across 6 distinct sectors: Guides & How-Tos, Fiction, Research & Papers, Nonfiction, Art & Illustration, and Other Documents.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Attribution & Footer Info */}
                <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-[10px] text-slate-400">
                  <div>
                    <p className="font-bold text-white uppercase tracking-wider">
                      Created by Kevin Suber (Artworqq)
                    </p>
                    <p className="text-slate-400">
                      © 2024–2026 Zetsumetsu Corporation™ · Zetsu EDU™
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => {
                        setIsAboutOpen(false);
                        setIsRequestOpen(true);
                      }}
                      className="px-4 py-2 bg-[#00c2ff] text-black font-black uppercase tracking-wider rounded-xl hover:bg-white transition-colors text-[10px]"
                    >
                      Upload a Book
                    </button>
                    <button 
                      onClick={() => setIsAboutOpen(false)}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold uppercase tracking-wider rounded-xl transition-colors text-[10px]"
                    >
                      Close
                    </button>
                  </div>
                </div>

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

      <MarqsEconomyModal
        isOpen={isMarqsModalOpen}
        onClose={() => setIsMarqsModalOpen(false)}
        defaultTab={marqsModalTab}
        availableBooks={allBooks}
      />

      <MarqsToast />

      {/* Mobile Floating Shop Quick Action Button (Option 1 - Mobile Only) */}
      <motion.button
        id="mobile-floating-shop-btn"
        initial={{ scale: 0.85, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => setIsShopOpen(true)}
        className="md:hidden fixed bottom-5 right-4 z-[90] flex items-center gap-2.5 pl-2.5 pr-4 py-2.5 bg-[#080d12]/95 hover:bg-black text-[#00f2c3] border-2 border-[#00f2c3] rounded-full shadow-[0_0_30px_rgba(0,242,195,0.45),0_10px_25px_rgba(0,0,0,0.85)] backdrop-blur-xl transition-all group active:shadow-[0_0_40px_rgba(0,242,195,0.8)]"
        aria-label="Open Zetsu Bookstore Print Shop"
      >
        <div className="relative flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-[#00f2c3] text-black flex items-center justify-center shadow-[0_0_12px_rgba(0,242,195,0.7)] group-hover:scale-105 transition-transform">
            <ShoppingBag size={15} className="stroke-[2.5]" />
          </div>
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#00c2ff] border-2 border-black animate-pulse" />
        </div>
        <div className="flex flex-col text-left">
          <span className="text-[11px] font-black uppercase tracking-wider text-white group-hover:text-[#00f2c3] transition-colors leading-tight">
            SHOP
          </span>
          <span className="text-[7.5px] font-mono font-bold text-[#00f2c3] tracking-widest leading-none">
            PRINTS
          </span>
        </div>
      </motion.button>
    </>
  );
};

export default Navbar;
