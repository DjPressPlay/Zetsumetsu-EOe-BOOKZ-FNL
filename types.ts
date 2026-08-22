
export interface BookMetadata {
  id: string;
  title: string;
  author: string;
  genre: string;
  pages: number;
  thumbnail: string; // Base64 of Page 1
  uploadDate: number;
  reads: number;
  upvotes: number;
  boostScore?: number;
  boostTier?: 'X3' | 'X4' | 'X5' | 'X10' | null;
  boostExpires?: number;
}

export interface Comment {
  id: string;
  bookId: string;
  author: string;
  text: string;
  timestamp: number;
  userId?: string;
}

export interface BookData {
  id: string;
  pdfData: ArrayBuffer;
}

export type MarqsAction = 
  | 'read_page' 
  | 'upload' 
  | 'view' 
  | 'comment' 
  | 'share' 
  | 'buy_copies'
  | 'boost'
  | 'purchase_book'
  | 'bonus';

export type LedgerActionType = 
  | 'join'
  | 'newsletter_signup'
  | 'read_page'
  | 'upload'
  | 'view'
  | 'comment'
  | 'share'
  | 'buy_copies'
  | 'boost'
  | 'post';

export interface LedgerEntry {
  id: string;
  action: LedgerActionType;
  title: string;
  actor: string;
  targetTitle?: string;
  targetId?: string;
  targetPath: string;
  timestamp: number;
  metadata?: {
    page?: number;
    totalPages?: number;
    genre?: string;
    tier?: string;
    copies?: number;
    format?: string;
    marqsAmount?: number;
    usdValue?: number;
    details?: string;
  };
}

export interface MarqsTransaction {
  id: string;
  action: MarqsAction;
  amount: number; // positive for earn, negative for spend
  usdValue: number;
  timestamp: number;
  details: string;
  bookId?: string;
}

export interface UploadedBookRef {
  id: string;
  title: string;
  genre: string;
  uploadDate: number;
  pages: number;
  reads?: number;
  upvotes?: number;
}

export interface UserProfile {
  id: string;
  deviceId: string;
  ipAddress?: string;
  authorName: string;
  walletPasswordHash?: string;
  hasPassword?: boolean;
  marqsBalance: number;
  totalEarned: number;
  totalSpent: number;
  uploadedBooks: UploadedBookRef[];
  transactions: MarqsTransaction[];
  createdAt: number;
  lastActive: number;
}

export interface UserMarqsProfile {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  transactions: MarqsTransaction[];
  authorName?: string;
  hasPassword?: boolean;
  uploadedBooks?: UploadedBookRef[];
}

export interface BoostOption {
  tier: 'X3' | 'X4' | 'X5' | 'X10';
  spots: number;
  marqs: number;
  priceUsd: number;
  label: string;
}

export const MARQS_PER_USD = 1000;

export const MARQS_EARNING_RATES: Record<string, { marqs: number; usd: number; label: string }> = {
  read_page: { marqs: 0.25, usd: 0.00025, label: 'Read page' },
  upload: { marqs: 10, usd: 0.01, label: 'Upload' },
  view: { marqs: 5, usd: 0.005, label: 'View' },
  comment: { marqs: 5, usd: 0.005, label: 'Comment' },
  share: { marqs: 5, usd: 0.005, label: 'Share' },
  buy_copies: { marqs: 25, usd: 0.025, label: 'Buy copies' },
};

export const BUY_BACK_BOOSTS: BoostOption[] = [
  { tier: 'X3', spots: 3, marqs: 1500, priceUsd: 1.50, label: 'X3 Boost (+3 spots)' },
  { tier: 'X4', spots: 4, marqs: 2000, priceUsd: 2.00, label: 'X4 Boost (+4 spots)' },
  { tier: 'X5', spots: 5, marqs: 2500, priceUsd: 2.50, label: 'X5 Boost (+5 spots)' },
  { tier: 'X10', spots: 10, marqs: 5000, priceUsd: 5.00, label: 'X10 Boost (+10 spots)' },
];

export const BOOK_PRICING: Record<string, { name: string; priceUsd: number; marqs: number; description: string; specs: string[] }> = {
  coloring: {
    name: 'Coloring Book',
    priceUsd: 15.00,
    marqs: 15000,
    description: '8.5" x 11" Standard Coloring Size with 26 Premium White Sheets',
    specs: [
      '8.5" x 11" Standard Size',
      '26 Premium White Sheets',
      'Ideal for Crayons, Markers & Watercolors',
      'Flexible Matte Softcover'
    ]
  },
  board: {
    name: 'Board Book',
    priceUsd: 24.99,
    marqs: 24990,
    description: '1/16" Thick Chipboard with Anti-Fingerprint Matte Lamination',
    specs: [
      '1/16" Thick White Chipboard',
      'Matte Lamination Finish',
      'Safe Rounded Corners',
      'Durable Ultra-Sturdy Pages'
    ]
  },
  soft_photo: {
    name: 'Softcover Book',
    priceUsd: 34.99,
    marqs: 34990,
    description: '8" x 8" Square Format with 100 lb Archival Semi-Gloss Paper',
    specs: [
      '8" x 8" Square Format',
      '100 lb Archival Semi-Gloss Paper',
      'Vibrant HD Full-Color Printing',
      'Perfect Bound Softcover'
    ]
  },
  hard_photo: {
    name: 'Hardcover Book',
    priceUsd: 49.99,
    marqs: 49990,
    description: '11" x 8.5" or 8" x 8" with Professional Library-Grade Hardcover Binding',
    specs: [
      '11" x 8.5" / 8" x 8" Format',
      'Premium Glossy or Matte Boards',
      'Professional Library-Grade Binding',
      'Archival High-Definition Pages'
    ]
  }
};

export interface PdfCompressionStats {
  originalSize: number;
  compressedSize: number;
  savedBytes: number;
  savedPercent: number;
  ratio: string;
  preset: 'ebook' | 'screen' | 'printer' | 'prepress';
  isCompressed: boolean;
  executionTimeMs?: number;
  engine: string;
}


