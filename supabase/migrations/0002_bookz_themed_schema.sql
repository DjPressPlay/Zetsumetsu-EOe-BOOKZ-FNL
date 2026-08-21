-- ==============================================================================
-- ZETSU EOE BOOKZ — THEMED ECOSYSTEM MIGRATION (BOOKZ SUITE)
-- ==============================================================================
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query).
--
-- This script provisions the complete suite of Bookz-themed tables:
--   1. public.bookz               (Archival manuscript catalog, metadata, boost stats)
--   2. public.bookz_user_profiles (Archivist & author identity, Marq's wallet, SHA-256 lock)
--   3. public.bookz_upvotes_log   (Anti-spam archival vote verification)
--   4. public.bookz_boosts_log    (Buy Back Boost audit records)
--   5. public.bookz_orders        (Physical print-on-demand & Stripe checkout manifests)
--   6. public.bookz_subscribers   (Archival newsletter & drop notification list)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. PRIMARY ARCHIVES TABLE: public.bookz
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bookz (
  id TEXT PRIMARY KEY,                                      -- Unique book identifier (UUID or timestamped slug)
  title TEXT NOT NULL,                                      -- Manuscript title
  author TEXT NOT NULL,                                     -- Author / Archivist pen name
  genre TEXT DEFAULT 'Archival',                            -- Literary genre / classification
  pages INTEGER DEFAULT 1 NOT NULL,                         -- Total verified page count
  thumbnail TEXT,                                           -- Cover thumbnail data URL or CDN link
  upload_date TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  reads INTEGER DEFAULT 0 NOT NULL,                         -- Cumulative verified reads
  upvotes INTEGER DEFAULT 0 NOT NULL,                       -- Community upvote score
  user_id TEXT NOT NULL,                                    -- Author device ID or creator UUID
  boost_score INTEGER DEFAULT 0 NOT NULL,                   -- Active Buy Back Boost ranking score
  boost_tier TEXT,                                          -- Active boost multiplier (X3, X4, X5, X10)
  boost_expires TIMESTAMPTZ                                 -- Boost expiry timestamp
);

CREATE INDEX IF NOT EXISTS idx_bookz_upload_date ON public.bookz (upload_date DESC);
CREATE INDEX IF NOT EXISTS idx_bookz_author ON public.bookz (author);
CREATE INDEX IF NOT EXISTS idx_bookz_genre ON public.bookz (genre);
CREATE INDEX IF NOT EXISTS idx_bookz_user_id ON public.bookz (user_id);
CREATE INDEX IF NOT EXISTS idx_bookz_boost_score ON public.bookz (boost_score DESC);

-- ------------------------------------------------------------------------------
-- 2. USER & MARQ'S WALLET PROFILES: public.bookz_user_profiles
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bookz_user_profiles (
  id TEXT PRIMARY KEY,                                      -- Device ID / User UUID
  device_id TEXT UNIQUE NOT NULL,                          -- Persistent client device UUID
  ip_address TEXT,                                         -- Client IP address for archival security
  author_name TEXT DEFAULT 'Anonymous Archivist',          -- Author alias / display name
  wallet_password_hash TEXT,                               -- SHA-256 password hash for wallet security
  marqs_balance NUMERIC(14, 2) DEFAULT 50.00 NOT NULL,     -- Active Marq's balance (includes 50 M welcome grant)
  total_earned NUMERIC(14, 2) DEFAULT 50.00 NOT NULL,      -- Lifetime Marq's earned across engagement
  total_spent NUMERIC(14, 2) DEFAULT 0.00 NOT NULL,        -- Lifetime Marq's spent on boosts/redemptions
  uploaded_books JSONB DEFAULT '[]'::jsonb NOT NULL,       -- Array of manuscript references authored by user
  transactions JSONB DEFAULT '[]'::jsonb NOT NULL,         -- Ledger records of Marq's transactions
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_active TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bookz_user_profiles_device_id ON public.bookz_user_profiles (device_id);
CREATE INDEX IF NOT EXISTS idx_bookz_user_profiles_author_name ON public.bookz_user_profiles (author_name);
CREATE INDEX IF NOT EXISTS idx_bookz_user_profiles_ip ON public.bookz_user_profiles (ip_address);

-- ------------------------------------------------------------------------------
-- 3. UPVOTES LOG: public.bookz_upvotes_log
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bookz_upvotes_log (
  id BIGSERIAL PRIMARY KEY,
  book_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT uq_bookz_upvote UNIQUE (book_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_bookz_upvotes_book_id ON public.bookz_upvotes_log (book_id);
CREATE INDEX IF NOT EXISTS idx_bookz_upvotes_user_id ON public.bookz_upvotes_log (user_id);

-- ------------------------------------------------------------------------------
-- 4. BUY BACK BOOST AUDIT LOG: public.bookz_boosts_log
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bookz_boosts_log (
  id BIGSERIAL PRIMARY KEY,
  book_id TEXT NOT NULL,
  book_title TEXT,
  user_id TEXT NOT NULL,
  boost_tier TEXT NOT NULL,                                -- 'X3', 'X4', 'X5', 'X10'
  spots_moved INTEGER NOT NULL,                            -- +3, +4, +5, +10 spots
  marqs_cost NUMERIC(14, 2) DEFAULT 0.00,
  usd_cost NUMERIC(10, 2) DEFAULT 0.00,
  payment_method TEXT DEFAULT 'marqs',                     -- 'marqs' or 'stripe'
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bookz_boosts_book_id ON public.bookz_boosts_log (book_id);
CREATE INDEX IF NOT EXISTS idx_bookz_boosts_user_id ON public.bookz_boosts_log (user_id);

-- ------------------------------------------------------------------------------
-- 5. PRINT-ON-DEMAND ORDERS: public.bookz_orders
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bookz_orders (
  id TEXT PRIMARY KEY,                                      -- Order ID / Stripe Session ID
  user_id TEXT NOT NULL,                                    -- Purchaser device ID
  book_id TEXT NOT NULL,                                    -- Selected manuscript
  book_title TEXT NOT NULL,                                 -- Book title
  format TEXT NOT NULL,                                     -- 'soft_photo', 'hard_photo', 'board', 'coloring'
  quantity INTEGER DEFAULT 1 NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  shipping_price NUMERIC(10, 2) NOT NULL,
  total_price NUMERIC(10, 2) NOT NULL,
  marqs_redeemed NUMERIC(14, 2) DEFAULT 0.00,
  payment_method TEXT DEFAULT 'stripe',                     -- 'stripe' or 'marqs'
  status TEXT DEFAULT 'completed' NOT NULL,                 -- 'pending', 'paid', 'printing', 'shipped'
  shipping_address JSONB,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bookz_orders_user_id ON public.bookz_orders (user_id);
CREATE INDEX IF NOT EXISTS idx_bookz_orders_book_id ON public.bookz_orders (book_id);

-- ------------------------------------------------------------------------------
-- 6. SUBSCRIBERS / NEWSLETTER: public.bookz_subscribers
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bookz_subscribers (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  source TEXT DEFAULT 'footer',
  order_info TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bookz_subscribers_email ON public.bookz_subscribers (email);

-- ------------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES FOR ALL BOOKZ TABLES
-- ------------------------------------------------------------------------------

ALTER TABLE public.bookz ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookz_user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookz_upvotes_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookz_boosts_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookz_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookz_subscribers ENABLE ROW LEVEL SECURITY;

-- 1. public.bookz policies
DROP POLICY IF EXISTS "Public bookz read access" ON public.bookz;
CREATE POLICY "Public bookz read access" ON public.bookz FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public bookz insert access" ON public.bookz;
CREATE POLICY "Public bookz insert access" ON public.bookz FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public bookz update access" ON public.bookz;
CREATE POLICY "Public bookz update access" ON public.bookz FOR UPDATE USING (true) WITH CHECK (true);

-- 2. public.bookz_user_profiles policies
DROP POLICY IF EXISTS "Public bookz_user_profiles read access" ON public.bookz_user_profiles;
CREATE POLICY "Public bookz_user_profiles read access" ON public.bookz_user_profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public bookz_user_profiles insert access" ON public.bookz_user_profiles;
CREATE POLICY "Public bookz_user_profiles insert access" ON public.bookz_user_profiles FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public bookz_user_profiles update access" ON public.bookz_user_profiles;
CREATE POLICY "Public bookz_user_profiles update access" ON public.bookz_user_profiles FOR UPDATE USING (true) WITH CHECK (true);

-- 3. public.bookz_upvotes_log policies
DROP POLICY IF EXISTS "Public bookz_upvotes_log read access" ON public.bookz_upvotes_log;
CREATE POLICY "Public bookz_upvotes_log read access" ON public.bookz_upvotes_log FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public bookz_upvotes_log insert access" ON public.bookz_upvotes_log;
CREATE POLICY "Public bookz_upvotes_log insert access" ON public.bookz_upvotes_log FOR INSERT WITH CHECK (true);

-- 4. public.bookz_boosts_log policies
DROP POLICY IF EXISTS "Public bookz_boosts_log read access" ON public.bookz_boosts_log;
CREATE POLICY "Public bookz_boosts_log read access" ON public.bookz_boosts_log FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public bookz_boosts_log insert access" ON public.bookz_boosts_log;
CREATE POLICY "Public bookz_boosts_log insert access" ON public.bookz_boosts_log FOR INSERT WITH CHECK (true);

-- 5. public.bookz_orders policies
DROP POLICY IF EXISTS "Public bookz_orders read access" ON public.bookz_orders;
CREATE POLICY "Public bookz_orders read access" ON public.bookz_orders FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public bookz_orders insert access" ON public.bookz_orders;
CREATE POLICY "Public bookz_orders insert access" ON public.bookz_orders FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public bookz_orders update access" ON public.bookz_orders;
CREATE POLICY "Public bookz_orders update access" ON public.bookz_orders FOR UPDATE USING (true) WITH CHECK (true);

-- 6. public.bookz_subscribers policies
DROP POLICY IF EXISTS "Public bookz_subscribers read access" ON public.bookz_subscribers;
CREATE POLICY "Public bookz_subscribers read access" ON public.bookz_subscribers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public bookz_subscribers insert access" ON public.bookz_subscribers;
CREATE POLICY "Public bookz_subscribers insert access" ON public.bookz_subscribers FOR INSERT WITH CHECK (true);
